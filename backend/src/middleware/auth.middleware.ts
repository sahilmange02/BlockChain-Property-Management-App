import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User, { IUser } from "../models/User.js";

declare global {
    namespace Express {
        interface Request {
            user?: IUser;
        }
    }
}

export function verifyJWT(req: Request, res: Response, next: NextFunction): void {
    console.log("🔍 Auth middleware check:");
    console.log("  - Authorization header:", req.headers.authorization ? "present" : "missing");

    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
        console.log("❌ No token provided");
        res.status(401).json({ success: false, message: "Access denied. No token provided." });
        return;
    }

    console.log("✅ Token found, verifying...");

    try {
        const secret = process.env.JWT_SECRET || "change-me-in-production";
        const decoded = jwt.verify(token, secret) as { userId: string };
        console.log("✅ Token decoded, userId:", decoded.userId);

        User.findById(decoded.userId)
            .then((user) => {
                if (!user) {
                    console.log("❌ User not found for ID:", decoded.userId);
                    res.status(401).json({ success: false, message: "User not found." });
                    return;
                }
                console.log("✅ User found:", user.email);
                req.user = user;
                next();
            })
            .catch((err) => {
                console.error("❌ Database error finding user:", err);
                res.status(401).json({ success: false, message: "Invalid token." });
            });
    } catch (err) {
        console.error("❌ JWT verification error:", err instanceof jwt.TokenExpiredError ? "Token expired" : "Invalid token");
        if (err instanceof jwt.TokenExpiredError) {
            res.status(401).json({ success: false, message: "Token expired. Please log in again." });
        } else {
            res.status(401).json({ success: false, message: "Invalid token." });
        }
    }
}
