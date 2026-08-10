/// <reference types="vite/client" />
import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAI, getGenerativeModel, VertexAIBackend, type ModelParams, type GenerationConfig } from "firebase/ai";
import firebaseConfig from "../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
export const auth = getAuth(app);

// Enable local persistence so login state survives page reloads
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn("Firebase Auth persistence initialization warning:", err);
});

// ─── Firebase AI Logic (Vertex AI Backend) ───────────────────────────
let _firebaseAI: ReturnType<typeof getAI> | null = null;

export function getFirebaseAI() {
  if (!_firebaseAI) {
    const vertexLocation =
      (import.meta.env && import.meta.env.VITE_GCP_LOCATION) ||
      "global";
    _firebaseAI = getAI(app, { backend: new VertexAIBackend(vertexLocation) });
  }
  return _firebaseAI;
}

/**
 * Returns a GenerativeModel instance backed by Vertex AI in Firebase.
 * Uses the latest Gemini 3 series model (gemini-3.6-flash).
 */
export function getFirebaseVertexAIModel(
  modelName: string = "gemini-2.5-flash",
  generationConfig?: Partial<GenerationConfig>,
  systemInstruction?: string
) {
  const modelParams: ModelParams = { model: modelName };
  if (generationConfig && Object.keys(generationConfig).length > 0) {
    modelParams.generationConfig = generationConfig;
  }
  if (systemInstruction) {
    modelParams.systemInstruction = systemInstruction;
  }
  return getGenerativeModel(getFirebaseAI(), modelParams);
}

// Default Gemini model instance for memory classification (Vertex AI)
export const geminiModel = getFirebaseVertexAIModel("gemini-2.5-flash");
