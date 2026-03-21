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
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
        res.status(401).json({ success: false, message: "Access denied. No token provided." });
        return;
    }

    try {
        const secret = process.env.JWT_SECRET || "change-me-in-production";
        const decoded = jwt.verify(token, secret) as { userId: string };
        User.findById(decoded.userId)
            .then((user) => {
                if (!user) {
                    res.status(401).json({ success: false, message: "User not found." });
                    return;
                }
                req.user = user;
                next();
            })
            .catch(() => {
                res.status(401).json({ success: false, message: "Invalid token." });
            });
    } catch (err) {
        if (err instanceof jwt.TokenExpiredError) {
            res.status(401).json({ success: false, message: "Token expired. Please log in again." });
        } else {
            res.status(401).json({ success: false, message: "Invalid token." });
        }
    }
}
