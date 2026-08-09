import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, GenerateVideosOperation, ThinkingLevel } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Endpoint to classify memory
app.post("/api/classify", async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: "Content is required" });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview", // Complex thinking for categories
      contents: `Analyze the following memory/information and classify it into a single, concise category (e.g., "Work", "Ideas", "Recipes", "Personal", "Random"). Make it creative if appropriate, but short (max 2-3 words). Memory: "${content}"`,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: {
              type: Type.STRING,
              description: "The category for the memory."
            }
          },
          required: ["category"]
        }
      }
    });

    const jsonStr = response.text?.trim() || '{"category": "Uncategorized"}';
    const result = JSON.parse(jsonStr);
    res.json({ category: result.category });
  } catch (error) {
    console.error("Classification error:", error);
    res.status(500).json({ error: "Failed to classify memory" });
  }
});

// Endpoint to start video generation
app.post("/api/generate-video", async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: "Content is required" });
    }

    const prompt = `A ridiculous, funny, and highly memorable visual representation of this information: "${content}". Make it extreme, absurd, or bizarre to serve as a memory palace mnemonic.`;
    
    const operation = await ai.models.generateVideos({
      model: "veo-3.1-fast-generate-preview",
      prompt,
      config: {
        numberOfVideos: 1,
        resolution: "1080p",
        aspectRatio: "16:9"
      }
    });
    
    res.json({ operationName: operation.name });
  } catch (error) {
    console.error("Video generation error:", error);
    res.status(500).json({ error: "Failed to generate video" });
  }
});

// Endpoint to poll video status
app.post("/api/video-status", async (req, res) => {
  try {
    const { operationName } = req.body;
    if (!operationName) {
      return res.status(400).json({ error: "operationName is required" });
    }
    
    const op = new GenerateVideosOperation();
    op.name = operationName;
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

// Endpoint to download/stream video
app.get("/api/video-download", async (req, res) => {
  try {
    const operationName = req.query.operationName as string;
    if (!operationName) {
      return res.status(400).json({ error: "operationName is required" });
    }
    
    const op = new GenerateVideosOperation();
    op.name = operationName;
    const updated = await ai.operations.getVideosOperation({ operation: op });
    
    if (!updated.done) {
      return res.status(400).json({ error: "Video not ready yet" });
    }
    
    const uri = updated.response?.generatedVideos?.[0]?.video?.uri;
    if (!uri) {
      return res.status(404).json({ error: "Video URI not found in response" });
    }
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "API Key is missing" });
    }
    
    const videoRes = await fetch(uri, {
      headers: { "x-goog-api-key": apiKey }
    });
    
    if (!videoRes.ok) {
      return res.status(videoRes.status).json({ error: "Failed to fetch video from remote" });
    }
    
    res.setHeader("Content-Type", "video/mp4");
    
    // Node.js doesn't natively support Web Stream pipeTo res easily without converting.
    // Instead, use web stream reader.
    if (videoRes.body) {
      const reader = videoRes.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    } else {
      res.status(500).json({ error: "Video body empty" });
    }
  } catch (error) {
    console.error("Video download error:", error);
    res.status(500).json({ error: "Failed to download video" });
  }
});

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
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
