import { app } from "./app";
import { logger } from "./errors/logger";
import { db } from "./config/knex";

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await db.raw("SELECT 1");
    logger.info("Database connection established successfully");

    app.listen(PORT, () => {
      logger.info(`Server listening on port ${PORT}`);
    });
  } catch (error: any) {
    logger.error("Failed to connect to database:", error.message);
    process.exit(1);
  }
}

startServer();

