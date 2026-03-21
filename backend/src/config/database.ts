/*
 * DATABASE EXPLAINED: database.ts
 * =================================
 * MongoDB stores the "regular" data that doesn't need to be on the blockchain:
 * - User profiles (email, phone, KYC status)
 * - Property metadata (photos, descriptions, search index)
 * - Notifications
 * - Audit log (synced from blockchain events)
 *
 * WHY NOT PUT EVERYTHING ON BLOCKCHAIN?
 * - Blockchain storage is EXPENSIVE (you pay gas per byte stored)
 * - Blockchain can't do complex searches ("find all properties in Mumbai")
 * - Blockchain data is public — user emails/phones should stay private
 *
 * HYBRID MODEL:
 * - Blockchain: ownership proof, tamper-proof records (immutable)
 * - MongoDB: searchable metadata, user data (flexible, updatable)
 */
import mongoose from "mongoose";

const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY_MS = 1000;

export async function connectDB(retryCount = 0): Promise<void> {
    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/land_registry";

    mongoose.connection.on("connected", () => {
        console.log("🍃 MongoDB connected:", uri.replace(/\/\/[^:]+:[^@]+@/, "//***:***@"));
    });

    mongoose.connection.on("error", (err) => {
        console.error("❌ MongoDB connection error:", err.message);
    });

    mongoose.connection.on("disconnected", () => {
        console.warn("⚠️  MongoDB disconnected");
    });

    mongoose.connection.on("reconnected", () => {
        console.log("✅ MongoDB reconnected");
    });

    try {
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
    } catch (error: unknown) {
        const err = error as Error;
        console.error(`❌ MongoDB connection failed (attempt ${retryCount + 1}/${MAX_RETRIES}):`, err.message);

        if (retryCount < MAX_RETRIES) {
            const delayMs = INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount);
            console.log(`🔄 Retrying in ${delayMs / 1000}s (exponential backoff)...`);
            await new Promise((r) => setTimeout(r, delayMs));
            return connectDB(retryCount + 1);
        }
        throw new Error(`MongoDB connection failed after ${MAX_RETRIES} attempts`);
    }
}

export async function closeDB(): Promise<void> {
    await mongoose.connection.close();
    console.log("🍃 MongoDB connection closed");
}

process.on("SIGTERM", async () => {
    console.log("SIGTERM received, closing database...");
    await closeDB();
    process.exit(0);
});

process.on("SIGINT", async () => {
    console.log("SIGINT received, closing database...");
    await closeDB();
    process.exit(0);
});
