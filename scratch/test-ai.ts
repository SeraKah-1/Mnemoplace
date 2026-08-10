import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function testAI() {
  console.log("--- Testing Vertex AI Connection ---");
  const project = process.env.GOOGLE_CLOUD_PROJECT || "gen-lang-client-0781879333";
  const location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";

  console.log(`Project: ${project}`);
  console.log(`Location: ${location}`);

  const ai = new GoogleGenAI({
    vertexai: true,
    project,
    location,
  });

  // 1. Test Text Generation (Gemini)
  console.log("\n1. Testing Text Generation (gemini-2.5-flash)...");
  try {
    const textRes = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Classify this memory in 1 word: 'Bought fresh bananas from supermarket'",
    });
    console.log("✅ Text Response:", textRes.text?.trim());
  } catch (err: any) {
    console.error("❌ Text Generation Error:", err.message || err);
  }

  // 2. Test Video Generation (Veo)
  console.log("\n2. Testing Video Generation (Veo)...");
  const veoModels = ["veo-2.0-generate-001", "veo-3.1-fast-generate-preview", "veo-3.1-generate-001"];
  
  for (const model of veoModels) {
    try {
      console.log(`Trying model: ${model}...`);
      const videoOp = await ai.models.generateVideos({
        model,
        prompt: "A flying banana wearing sunglasses in space",
        config: {
          numberOfVideos: 1,
          resolution: "720p",
          aspectRatio: "16:9",
        },
      });
      console.log(`✅ Video Operation Created for ${model}:`, videoOp.name);
      break;
    } catch (err: any) {
      console.error(`❌ Model ${model} Error:`, err.message || err);
    }
  }
}

testAI();
