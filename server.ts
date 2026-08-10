import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, GenerateVideosOperation } from "@google/genai";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

app.use(express.json({ limit: "10kb" }));

// -------------------------------------------------------------------
// Rate Limiting
// -------------------------------------------------------------------
const videoLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60,
  message: { error: "Too many requests. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", generalLimiter);

// -------------------------------------------------------------------
// Firebase Admin Auth Middleware
// -------------------------------------------------------------------
// NOTE: In production, initialize firebase-admin and verify ID tokens.
// For this setup, we validate the Authorization header format.
// To fully enable: npm install firebase-admin, then:
//   import { initializeApp as initAdminApp, cert } from 'firebase-admin/app';
//   import { getAuth as getAdminAuth } from 'firebase-admin/auth';
//   const adminApp = initAdminApp({ credential: cert(serviceAccount) });
//   const adminAuth = getAdminAuth(adminApp);
async function verifyAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing or invalid token" });
  }

  // In production, verify the token:
  // try {
  //   const token = authHeader.split("Bearer ")[1];
  //   const decoded = await adminAuth.verifyIdToken(token);
  //   (req as any).uid = decoded.uid;
  //   next();
  // } catch {
  //   return res.status(401).json({ error: "Unauthorized: Invalid token" });
  // }

  // For now, just extract the token (assumes valid Firebase ID token is sent)
  const token = authHeader.split("Bearer ")[1];
  if (!token || token.length < 10) {
    return res.status(401).json({ error: "Unauthorized: Token too short" });
  }
  next();
}

// -------------------------------------------------------------------
// Input Validation Helpers
// -------------------------------------------------------------------
function validateContent(content: unknown): { valid: boolean; error?: string; value?: string } {
  if (typeof content !== "string") {
    return { valid: false, error: "Content must be a string" };
  }
  const trimmed = content.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: "Content cannot be empty" };
  }
  if (trimmed.length > 10000) {
    return { valid: false, error: "Content exceeds maximum length of 10000 characters" };
  }
  return { valid: true, value: trimmed };
}

function validateOperationName(name: unknown): { valid: boolean; error?: string; value?: string } {
  if (typeof name !== "string") {
    return { valid: false, error: "operationName must be a string" };
  }
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: "operationName cannot be empty" };
  }
  if (trimmed.length > 500) {
    return { valid: false, error: "operationName exceeds maximum length" };
  }
  // Basic path-traversal prevention
  if (trimmed.includes("..") || trimmed.includes("//")) {
    return { valid: false, error: "Invalid operationName format" };
  }
  return { valid: true, value: trimmed };
}

// -------------------------------------------------------------------
// Initialize Google GenAI (supports both Vertex AI & Gemini API)
// -------------------------------------------------------------------
const useVertexAI = process.env.USE_VERTEX_AI === "true" || !!process.env.GOOGLE_CLOUD_PROJECT;
const gcpProject = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID;
const gcpLocation = process.env.GOOGLE_CLOUD_LOCATION || process.env.GCP_LOCATION || "us-central1";
const geminiApiKey = process.env.GEMINI_API_KEY;

if (useVertexAI) {
  console.log(`[AI Init] Using Vertex AI on GCP (Project: ${gcpProject}, Location: ${gcpLocation})`);
} else if (!geminiApiKey) {
  console.warn("WARNING: Neither GOOGLE_CLOUD_PROJECT (Vertex AI) nor GEMINI_API_KEY is set. Video generation will fail.");
}

const ai = new GoogleGenAI(
  useVertexAI
    ? {
        vertexai: true,
        project: gcpProject,
        location: gcpLocation,
      }
    : {
        apiKey: geminiApiKey || "",
      }
);

// -------------------------------------------------------------------
// Video Generation Endpoints (requires auth + rate limit)
// -------------------------------------------------------------------

// Start video generation
app.post("/api/generate-video", verifyAuth, videoLimiter, async (req, res) => {
  try {
    if (!useVertexAI && !geminiApiKey) {
      return res.status(500).json({ error: "Server AI configuration missing: Neither GEMINI_API_KEY nor GOOGLE_CLOUD_PROJECT is set in .env" });
    }

    const validation = validateContent(req.body?.content);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Sanitized prompt
    const systemInstruction = "You are a visual memory aid generator. Create a ridiculous, funny, and highly memorable visual representation of the given information. Make it extreme, absurd, or bizarre to serve as a memory palace mnemonic. Keep it safe and appropriate.";
    const userPrompt = `Create a visual mnemonic for this information: ${validation.value}`;
    const fullPrompt = `${systemInstruction}\n\n${userPrompt}`;

    const veoModels = ["veo-3.1-generate-001", "veo-2.0-generate-001", "veo-3.1-fast-generate-preview"];
    let operation: any = null;
    let lastError: any = null;

    for (const model of veoModels) {
      try {
        operation = await ai.models.generateVideos({
          model,
          prompt: fullPrompt,
          config: {
            numberOfVideos: 1,
            resolution: "720p",
            aspectRatio: "16:9",
          },
        });
        if (operation?.name) break;
      } catch (err: any) {
        console.warn(`[Veo Gen] Model ${model} failed, trying next:`, err?.message || err);
        lastError = err;
      }
    }

    if (!operation?.name) {
      throw lastError || new Error("All Veo video models failed.");
    }

    res.json({ operationName: operation.name });
  } catch (error: any) {
    console.error("Video generation error:", error);
    res.status(500).json({ error: error?.message || "Failed to generate video" });
  }
});

// Poll video status
app.post("/api/video-status", verifyAuth, async (req, res) => {
  try {
    const validation = validateOperationName(req.body?.operationName);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const op = new GenerateVideosOperation();
    op.name = validation.value!;
    const updated = await ai.operations.getVideosOperation({ operation: op });

    let isError = false;
    if (updated.done && (!updated.response?.generatedVideos || updated.response.generatedVideos.length === 0)) {
      isError = true;
    }

    res.json({ done: updated.done, isError });
  } catch (error) {
    console.error("Video status error:", error);
    res.status(500).json({ error: "Failed to get video status" });
  }
});

// Download/stream video
app.get("/api/video-download", verifyAuth, async (req, res) => {
  try {
    const validation = validateOperationName(req.query.operationName);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const op = new GenerateVideosOperation();
    op.name = validation.value!;
    const updated = await ai.operations.getVideosOperation({ operation: op });

    if (!updated.done) {
      return res.status(202).json({ error: "Video not ready yet" });
    }

    const uri = updated.response?.generatedVideos?.[0]?.video?.uri;
    if (!uri) {
      return res.status(404).json({ error: "Video URI not found in response" });
    }

    if (!geminiApiKey) {
      return res.status(500).json({ error: "Server configuration error" });
    }

    const videoRes = await fetch(uri, {
      headers: { "x-goog-api-key": geminiApiKey },
    });

    if (!videoRes.ok) {
      return res.status(videoRes.status).json({ error: "Failed to fetch video from remote" });
    }

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Cache-Control", "private, max-age=3600");

    if (videoRes.body) {
      const reader = videoRes.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
      } finally {
        reader.releaseLock();
        res.end();
      }
    } else {
      res.status(500).json({ error: "Video body empty" });
    }
  } catch (error) {
    console.error("Video download error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to download video" });
    }
  }
});

// -------------------------------------------------------------------
// Health Check
// -------------------------------------------------------------------
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// -------------------------------------------------------------------
// Vite Dev Server / Static Production
// -------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
