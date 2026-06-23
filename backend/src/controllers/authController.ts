import type { Request, Response } from "express";
import User from "../models/User";
import { hashPassword, verifyPassword, signToken, COOKIE_NAME } from "../lib/auth";
import { config } from "../lib/config";

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: config.nodeEnv === "production",
  maxAge: 60 * 60 * 24 * 7 * 1000, // 7 days, in ms (Express cookie maxAge differs from Next.js's seconds-based one)
  path: "/",
};

export async function register(req: Request, res: Response) {
  try {
    const { email, password, name } = req.body || {};

    if (!email || !password || !name) {
      res.status(400).json({ error: "Name, email, and password are all required." });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters." });
      return;
    }

    const existing = await User.findOne({ email: String(email).toLowerCase() });
    if (existing) {
      res.status(409).json({ error: "An account with this email already exists." });
      return;
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({ email, passwordHash, name });

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
    });

    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
    res.json({ user: { id: user._id.toString(), email: user.email, name: user.name } });
  } catch (err) {
    console.error("[register]", err);
    res.status(500).json({ error: "Something went wrong creating your account." });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required." });
      return;
    }

    const user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
    });

    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
    res.json({ user: { id: user._id.toString(), email: user.email, name: user.name } });
  } catch (err) {
    console.error("[login]", err);
    res.status(500).json({ error: "Something went wrong logging you in." });
  }
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie(COOKIE_NAME, { path: "/" });
  res.json({ success: true });
}

export async function me(req: Request, res: Response) {
  if (!req.session) {
    res.json({ user: null });
    return;
  }
  res.json({
    user: { id: req.session.userId, email: req.session.email, name: req.session.name },
  });
}
