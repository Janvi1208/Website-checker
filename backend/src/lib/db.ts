import mongoose from "mongoose";
import { config } from "./config";

let connected = false;

export async function connectToDatabase(): Promise<void> {
  if (connected) return;

  await mongoose.connect(config.mongodbUri, {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
  });

  connected = true;
  console.log("[db] Connected to MongoDB");

  mongoose.connection.on("disconnected", () => {
    connected = false;
    console.warn("[db] MongoDB disconnected");
  });
}
