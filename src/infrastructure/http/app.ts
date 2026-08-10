import cors from "cors";
import express, { type Express, type Request, type Response } from "express";
import helmet from "helmet";
import { env } from "../../config/env";
import { ERROR_STATUS } from "../../application/errors";
import { errorHandler } from "./middlewares/error-handler.middleware";
import { authRouter } from "./routes/auth.routes";
import { documentRouter } from "./routes/document.routes";
import { healthRouter } from "./routes/health.routes";
import { reportRouter } from "./routes/report.routes";

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json({ limit: "100kb" }));

  app.use("/health", healthRouter);
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/documents", documentRouter);
  app.use("/api/v1/reports", reportRouter);

  app.use((req: Request, res: Response) => {
    res.status(ERROR_STATUS.ROUTE_NOT_FOUND).json({
      error: {
        code: "ROUTE_NOT_FOUND",
        message: `No route for ${req.method} ${req.path}`,
      },
    });
  });

  app.use(errorHandler);

  return app;
}