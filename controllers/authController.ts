import { Response, NextFunction } from "express";
import { ApiRequest, sendResponse } from "../models/api";
import {
  registerUser,
  loginUser,
  refreshUserToken,
  revokeUserToken,
} from "../service/authService";

export async function register(
  req: ApiRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await registerUser(req.body);
    sendResponse(res, 201, "User registered successfully", result);
  } catch (err) {
    next(err);
  }
}

export async function login(
  req: ApiRequest,
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

    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: refreshExpires,
    });
    sendResponse(res, 200, "Login successful", { accessToken });
  } catch (err) {
    next(err);
  }
}

export async function refresh(
  req: ApiRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const token =
      (req.cookies && req.cookies.refresh_token) || req.body.refresh_token;

    const result = await refreshUserToken(token);
    sendResponse(res, 200, "Token refreshed successfully", result);
  } catch (err) {
    next(err);
  }
}

export async function logout(
  req: ApiRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const token =
      (req.cookies && req.cookies.refresh_token) || req.body.refresh_token;

    await revokeUserToken(token);

    res.clearCookie("refresh_token");
    sendResponse(res, 200, "Logout successful");
  } catch (err) {
    next(err);
  }
}



