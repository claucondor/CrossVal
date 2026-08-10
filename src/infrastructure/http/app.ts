import cors from "cors";
import express, { type Express, type Request, type Response } from "express";
import helmet from "helmet";
import { env } from "../../config/env";
import { ERROR_STATUS } from "../../application/errors";
import { createAuthService } from "../../application/auth/auth.service";
import { createDocumentService } from "../../application/documents/document.service";
import { createReportService } from "../../application/reports/report.service";
import { MongoDocumentRepository } from "../db/repositories/document.repository";
import { MongoUserRepository } from "../db/repositories/user.repository";
import { createAuthController } from "./controllers/auth.controller";
import { createDocumentController } from "./controllers/document.controller";
import { createReportController } from "./controllers/report.controller";
import { errorHandler } from "./middlewares/error-handler.middleware";
import { createAuthRouter } from "./routes/auth.routes";
import { createDocumentRouter } from "./routes/document.routes";
import { healthRouter } from "./routes/health.routes";
import { createReportRouter } from "./routes/report.routes";

export function createApp(): Express {
  const app = express();

  const documentRepository = new MongoDocumentRepository();
  const userRepository = new MongoUserRepository();

  const documentService = createDocumentService(documentRepository);
  const reportService = createReportService(documentRepository);
  const authService = createAuthService({
    userRepository,
    jwtSecret: env.JWT_SECRET,
    jwtExpiresIn: env.JWT_EXPIRES_IN,
    bcryptRounds: env.BCRYPT_ROUNDS,
  });

  const authController = createAuthController(authService);
  const documentController = createDocumentController(documentService);
  const reportController = createReportController(reportService);

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json({ limit: "100kb" }));

  app.use("/health", healthRouter);
  app.use("/api/v1/auth", createAuthRouter(authController));
  app.use("/api/v1/documents", createDocumentRouter(documentController));
  app.use("/api/v1/reports", createReportRouter(reportController));

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
