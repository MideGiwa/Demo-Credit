import { Request, Response, NextFunction } from "express";
import {
  registerUser,
  loginUser,
  refreshUserToken,
  revokeUserToken,
} from "../service/authService";

export async function register(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await registerUser(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userAgent = req.headers["user-agent"];
    const ipAddress =
      (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress;

    const { accessToken, refreshToken, refreshExpires } = await loginUser(
      req.body,
      userAgent,
      ipAddress
    );

    res
      .cookie("refresh_token", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: refreshExpires,
      })
      .json({ accessToken });
  } catch (err) {
    next(err);
  }
}

export async function refresh(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token =
      (req.cookies && req.cookies.refresh_token) || req.body.refresh_token;

    const result = await refreshUserToken(token);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function logout(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token =
      (req.cookies && req.cookies.refresh_token) || req.body.refresh_token;

    await revokeUserToken(token);

    res.clearCookie("refresh_token").status(204).send();
  } catch (err) {
    next(err);
  }
}



