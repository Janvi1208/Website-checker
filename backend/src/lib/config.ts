import "dotenv/config";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.warn(`[config] ${name} is not set. Set it in backend/.env before running the server.`);
    return "";
  }
  return value;
}

export const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  mongodbUri: requireEnv("MONGODB_URI"),
  jwtSecret: requireEnv("JWT_SECRET"),
  groqApiKey: requireEnv("GROQ_API_KEY"),
  groqModel: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
  voyageApiKey: process.env.VOYAGE_API_KEY || "",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  nodeEnv: process.env.NODE_ENV || "development",
};
