import { Request, Response, NextFunction, RequestHandler } from "express";
import type { Role } from "../models/User.js";

export function requireRole(...roles: Role[]): RequestHandler {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ success: false, message: "Authentication required." });
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json({ success: false, message: "Insufficient permissions." });
            return;
        }
        next();
    };
}

export function requireWalletLinked(req: Request, res: Response, next: NextFunction): void {
    if (!req.user) {
        res.status(401).json({ success: false, message: "Authentication required." });
        return;
    }
    if (!req.user.walletAddress || req.user.walletAddress.trim() === "") {
        res.status(400).json({
            success: false,
            message: "Wallet not linked. Please link your wallet first.",
        });
        return;
    }
    next();
}
