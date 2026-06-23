import type { Request, Response } from "express";
import User from "../models/User";
import { hashPassword, verifyPassword, signToken, COOKIE_NAME } from "../lib/auth";

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "none" as const,
  secure: true,
  maxAge: 60 * 60 * 24 * 7 * 1000,
  path: "/",
};

export async function register(req: Request, res: Response) {
  try {
    const { email, password, name } = req.body || {};

    if (!email || !password || !name) {
      return res.status(400).json({
        error: "Name, email, and password are all required.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters.",
      });
    }

    const existing = await User.findOne({
      email: String(email).toLowerCase(),
    });

    if (existing) {
      return res.status(409).json({
        error: "An account with this email already exists.",
      });
    }

    const passwordHash = await hashPassword(password);

    const user = await User.create({
      email: String(email).toLowerCase(),
      passwordHash,
      name,
    });

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
    });

    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);

    return res.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
      },
    });
  } catch (err) {
    console.error("[register]", err);
    return res.status(500).json({
      error: "Something went wrong creating your account.",
    });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required.",
      });
    }

    const user = await User.findOne({
      email: String(email).toLowerCase(),
    });

    if (!user) {
      return res.status(401).json({
        error: "Invalid email or password.",
      });
    }

    const valid = await verifyPassword(password, user.passwordHash);

    if (!valid) {
      return res.status(401).json({
        error: "Invalid email or password.",
      });
    }

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
    });

    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);

    return res.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
      },
    });
  } catch (err) {
    console.error("[login]", err);
    return res.status(500).json({
      error: "Something went wrong logging you in.",
    });
  }
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: "none",
    secure: true,
    path: "/",
  });

  return res.json({ success: true });
}

export async function me(req: Request, res: Response) {
  if (!req.session) {
    return res.json({ user: null });
  }

  return res.json({
    user: {
      id: req.session.userId,
      email: req.session.email,
      name: req.session.name,
    },
  });
}