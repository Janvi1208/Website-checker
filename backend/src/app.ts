import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { config } from "./lib/config";
import authRoutes from "./routes/auth";
import siteRoutes from "./routes/sites";

export const app = express();

app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true, // allow the httpOnly session cookie to be sent cross-origin
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/sites", siteRoutes);

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}` });
});

// Central error handler — catches anything thrown/rejected inside route
// handlers that wasn't already caught, so the process never crashes on a
// single bad request.
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: express.NextFunction
  ) => {
    console.error("[unhandled error]", err);
    res.status(500).json({ error: "Something went wrong on our end." });
  }
);
