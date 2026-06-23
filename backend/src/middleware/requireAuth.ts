import type { Request, Response, NextFunction } from "express";
import { getSessionFromRequest, type SessionPayload } from "../lib/auth";

// Augment Express's Request type so req.session is typed everywhere it's used.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      session?: SessionPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = getSessionFromRequest(req);
  if (!session) {
    res.status(401).json({ error: "Please sign in to continue." });
    return;
  }
  req.session = session;
  next();
}

/** Attaches the session if present, but never blocks the request. Used for
 * endpoints like /me that need to answer "who, if anyone, is logged in". */
export function attachSessionIfPresent(req: Request, _res: Response, next: NextFunction) {
  const session = getSessionFromRequest(req);
  if (session) req.session = session;
  next();
}
