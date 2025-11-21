import fs from "fs";
import path from "path";

type LogLevel = "error" | "warn" | "info" | "debug";

const LOG_DIR = path.join(process.cwd(), "logs");

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function formatLog(level: LogLevel, message: string, meta?: any): string {
  const timestamp = new Date().toISOString();
  const base = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  if (!meta) return base;
  return `${base} | ${JSON.stringify(meta)}`;
}

function writeToFile(filename: string, line: string) {
  const filePath = path.join(LOG_DIR, filename);
  fs.appendFile(filePath, line + "\n", (err) => {
    if (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to write log file", err);
    }
  });
}

export const logger = {
  error(message: string, meta?: any) {
    const line = formatLog("error", message, meta);
    console.error(line);
    writeToFile("error.log", line);
  },
  warn(message: string, meta?: any) {
    const line = formatLog("warn", message, meta);
    console.warn(line);
    writeToFile("app.log", line);
  },
  info(message: string, meta?: any) {
    const line = formatLog("info", message, meta);
    console.log(line);
    writeToFile("app.log", line);
  },
  debug(message: string, meta?: any) {
    if (process.env.NODE_ENV !== "production") {
      const line = formatLog("debug", message, meta);
      console.debug(line);
      writeToFile("app.log", line);
    }
  },
};


