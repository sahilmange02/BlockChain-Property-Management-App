/*
 * ROUTE EXPLAINED: auth.routes.ts
 * ================================
 * Handles user registration, login, wallet linking, and profile.
 * Authentication: JWT token in Authorization header ("Bearer <token>").
 * The token is issued when the user logs in at POST /api/auth/login.
 */
import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ethers } from "ethers";
import { z } from "zod";
import User, { hashSensitiveData } from "../models/User.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";

const router = Router();

const registerSchema = z.object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
    phone: z.preprocess((value) => {
        if (typeof value === "string") {
            const digits = value.trim();
            if (/^[0-9]{10}$/.test(digits)) {
                return Number(digits);
            }
            return NaN;
        }
        if (typeof value === "number") {
            return value;
        }
        return NaN;
    }, z.number().int().gte(1000000000).lte(9999999999)),
    password: z.string().min(8),
    aadhaarNumber: z.string().min(12).max(14),
    panNumber: z.string().length(10).regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

const linkWalletSchema = z.object({
    walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    signature: z.string().min(1),
});

// POST /api/auth/register
router.post("/register", validate({ body: registerSchema }), async (req: Request, res: Response) => {
    const { name, email, phone, password, aadhaarNumber, panNumber } = req.body;

    const existing = await User.findByEmail(email);
    if (existing) {
        return res.status(400).json({ success: false, message: "Email already registered." });
    }

    const aadhaarHash = hashSensitiveData(aadhaarNumber);
    const panHash = hashSensitiveData(panNumber);

    const existingAadhaar = await User.findOne({ aadhaarHash });
    if (existingAadhaar) {
        return res.status(400).json({ success: false, message: "Aadhaar number already registered." });
    }

    const existingPan = await User.findOne({ panHash });
    if (existingPan) {
        return res.status(400).json({ success: false, message: "PAN number already registered." });
    }

    const user = new User({
        name,
        email,
        phone,
        passwordHash: password,
        aadhaarHash,
        panHash,
    });
    await user.save();

    // Stub: send verification email
    console.log(`[STUB] Verification email would be sent to: ${email}`);

    res.status(201).json({
        success: true,
        message: "Registration successful. Please verify your email.",
        userId: user._id.toString(),
    });
});

// POST /api/auth/login
router.post("/login", validate({ body: loginSchema }), async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
        return res.status(401).json({ success: false, message: "Email is incorrect or not registered." });
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
        return res.status(401).json({ success: false, message: "Password is incorrect." });
    }

    const secret = process.env.JWT_SECRET || "change-me-in-production";
    const token = jwt.sign({ userId: user._id.toString() }, secret, { expiresIn: "7d" });

    res.json({
        success: true,
        token,
        user: {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            walletAddress: user.walletAddress,
        },
    });
});

// POST /api/auth/link-wallet
router.post("/link-wallet", verifyJWT, validate({ body: linkWalletSchema }), async (req: Request, res: Response) => {
    const { walletAddress, signature } = req.body;
    const userId = req.user!._id.toString();
    const message = `Link wallet to Land Registry: ${userId}`;

    let recovered: string;
    try {
        recovered = ethers.verifyMessage(message, signature);
    } catch {
        return res.status(400).json({ success: false, message: "Invalid signature." });
    }

    const normalizedRecovered = recovered.toLowerCase();
    const normalizedClaimed = walletAddress.toLowerCase();
    if (normalizedRecovered !== normalizedClaimed) {
        return res.status(400).json({ success: false, message: "Signature does not match wallet address." });
    }

    const existing = await User.findOne({ walletAddress: normalizedClaimed });
    if (existing && existing._id.toString() !== userId) {
        return res.status(400).json({ success: false, message: "Wallet already linked to another account." });
    }

    req.user!.walletAddress = normalizedClaimed;
    await req.user!.save();

    res.json({
        success: true,
        message: "Wallet linked successfully.",
        walletAddress: normalizedClaimed,
    });
});

// GET /api/auth/check-wallet/:address
router.get("/check-wallet/:address", async (req: Request, res: Response) => {
    const { address } = req.params;
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return res.status(400).json({ success: false, message: "Invalid address." });
    }
    const user = await User.findOne({ walletAddress: address.toLowerCase() })
        .select("name email walletAddress")
        .lean();
    if (!user) {
        return res.json({ success: true, exists: false });
    }
    res.json({
        success: true,
        exists: true,
        user: { name: user.name, email: user.email, walletAddress: user.walletAddress },
    });
});

// GET /api/auth/me
router.get("/me", verifyJWT, (req: Request, res: Response) => {
    const u = req.user!;
    res.json({
        success: true,
        user: {
            id: u._id.toString(),
            name: u.name,
            email: u.email,
            phone: u.phone,
            role: u.role,
            walletAddress: u.walletAddress,
            isVerified: u.isVerified,
            kycStatus: u.kycStatus,
            createdAt: u.createdAt,
        },
    });
});

export default router;
