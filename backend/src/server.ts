import { app } from "./app";
import { config } from "./lib/config";
import { connectToDatabase } from "./lib/db";

async function start() {
  try {
    await connectToDatabase();
  } catch (err) {
    console.error("[server] Failed to connect to MongoDB on startup:", err);
    console.error("[server] Starting anyway — requests needing the DB will fail until it's reachable.");
  }

  const server = app.listen(config.port, () => {
    console.log(`[server] SiteMind AI backend listening on http://localhost:${config.port}`);
  });

  // The analyze pipeline runs several sequential network + AI calls and can
  // take well over a minute on larger sites — extend the default ~2min
  // socket timeout headroom explicitly so it's not accidentally tightened
  // by a future Node/Express default change.
  server.requestTimeout = 150_000;
  server.headersTimeout = 155_000;
}

start();
