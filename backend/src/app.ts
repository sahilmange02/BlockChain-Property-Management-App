/*
 * APP ENTRY POINT
 * ================
 * This file wires everything together:
 * 1. Creates the Express app
 * 2. Adds security middleware (helmet, cors, rate limiting)
 * 3. Mounts all route files
 * 4. Starts the blockchain event listener (syncs events to MongoDB)
 * 5. Exports the app for testing
 */
import "express-async-errors";
import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import mongoose from "mongoose";
import { connectDB } from "./config/database.js";
import { blockchainService } from "./services/blockchain.service.js";
import { logger } from "./config/logger.js";
import authRoutes from "./routes/auth.routes.js";
import propertyRoutes from "./routes/property.routes.js";
import transferRoutes from "./routes/transfer.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import ipfsRoutes from "./routes/ipfs.routes.js";

const app = express();

app.use(helmet());
app.use(mongoSanitize());
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000", credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
        const duration = Date.now() - start;

        // FIX: use a template string instead of passing a plain object
        logger.info(
            `${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`
        );
    });
    next();
});

app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: "Too many requests" }));
app.use("/api/auth/login", rateLimit({ windowMs: 15 * 60 * 1000, max: 5 }));

app.use("/api/auth", authRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/transfers", transferRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ipfs", ipfsRoutes);

app.get("/health", (_req, res) => res.json({ status: "ok", timestamp: new Date() }));

app.get("/ready", async (_req, res) => {
    const { checkIPFSHealth } = await import("./config/ipfs.js");
    res.json({
        mongodb: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
        blockchain: (await blockchainService.checkHealth()) ? "connected" : "disconnected",
        ipfs: (await checkIPFSHealth()) ? "ok" : "error",
    });
});

app.use((err: Error & { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error("Unhandled error:", err);
    res.status(err.status ?? 500).json({
        success: false,
        message: err.message || "Internal server error",
        ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
});

app.use((_req, res) => res.status(404).json({ success: false, message: "Route not found" }));

export { app };

export async function startServer(): Promise<void> {
    await connectDB();

    blockchainService.startEventListening();

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        logger.info(`Backend running at http://localhost:${PORT}`);
        logger.info(`Health check: http://localhost:${PORT}/health`);
        logger.info(`Readiness: http://localhost:${PORT}/ready`);
    });
}
