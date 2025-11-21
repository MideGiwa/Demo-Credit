import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import authRouter from "./router/authRouter";
import walletRouter from "./router/walletRouter";
import { errorHandler } from "./middleware/errorHandler";
import { logger } from "./errors/logger";

dotenv.config();

export const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use((req, _res, next) => {
  logger.info("Incoming request", { method: req.method, path: req.path });
  next();
});

app.use("/auth", authRouter);
app.use("/wallet", walletRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use(errorHandler);


