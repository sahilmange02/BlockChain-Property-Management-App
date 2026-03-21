/*
 * ROUTE EXPLAINED: property.routes.ts
 * ====================================
 * Handles property document upload to IPFS, property registration,
 * and public property listing/search.
 * Authentication: JWT token in Authorization header ("Bearer <token>").
 */
import { Router, Request, Response } from "express";
import multer from "multer";
import { z } from "zod";
import Property from "../models/Property.js";
import AuditLog from "../models/AuditLog.js";
import { blockchainService } from "../services/blockchain.service.js";
import { uploadToIPFS, getGatewayUrl } from "../config/ipfs.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { requireWalletLinked } from "../middleware/rbac.middleware.js";
import { validate } from "../middleware/validate.middleware.js";

const router = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
        if (allowed.includes(file.mimetype)) cb(null, true);
        else cb(new Error("Only PDF, JPG, PNG allowed"));
    },
});

const locationSchema = z.object({
    address: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    pincode: z.string().min(6),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
});

const registerSchema = z.object({
    surveyNumber: z.string().min(3).max(50),
    location: locationSchema,
    area: z.number().positive(),
    propertyType: z.enum(["RESIDENTIAL", "COMMERCIAL", "AGRICULTURAL", "INDUSTRIAL"]),
    description: z.string().max(1000).optional().default(""),
    ipfsCid: z.string().min(1),
    ipfsGatewayUrl: z.string().optional(),
    blockchainPropertyId: z.number().int().positive(),
    blockchainTxHash: z.string().min(1),
});

// POST /api/properties/upload-document
router.post(
    "/upload-document",
    verifyJWT,
    upload.single("document"),
    async (req: Request, res: Response) => {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file uploaded." });
        }
        const result = await uploadToIPFS(
            req.file.buffer,
            req.file.originalname,
            req.file.mimetype
        );
        res.json({
            success: true,
            cid: result.cid,
            ipfsUrl: result.gatewayUrl,
        });
    }
);

// POST /api/properties/register
router.post(
    "/register",
    verifyJWT,
    requireWalletLinked,
    validate({ body: registerSchema }),
    async (req: Request, res: Response) => {
        const { surveyNumber, location, area, propertyType, description, ipfsCid, ipfsGatewayUrl, blockchainPropertyId, blockchainTxHash } = req.body;
        const ownerWallet = req.user!.walletAddress!;

        const existing = await Property.findOne({ surveyNumber });
        if (existing) {
            return res.status(400).json({ success: false, message: "Survey number already registered." });
        }

        const existingId = await Property.findOne({ blockchainPropertyId });
        if (existingId) {
            return res.status(400).json({ success: false, message: "Property ID already exists." });
        }

        const gatewayUrl = ipfsGatewayUrl || getGatewayUrl(ipfsCid);

        const prop = await Property.create({
            blockchainPropertyId,
            surveyNumber,
            location,
            area,
            propertyType,
            description,
            ipfsCid,
            ipfsGatewayUrl: gatewayUrl,
            ownerWallet,
            status: "PENDING_VERIFICATION",
            images: [],
            blockchainTxHash,
        });

        res.status(201).json({
            success: true,
            propertyId: prop.blockchainPropertyId,
            message: "Property registered. Pending government verification.",
        });
    }
);

// GET /api/properties
router.get("/", async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(String(req.query.page)) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit)) || 10));
    const status = req.query.status as string | undefined;
    const type = req.query.type as string | undefined;
    const city = req.query.city as string | undefined;

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (type) filter.propertyType = type;
    if (city) filter["location.city"] = new RegExp(city, "i");

    const [properties, total] = await Promise.all([
        Property.find(filter).sort({ registrationDate: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        Property.countDocuments(filter),
    ]);

    res.json({
        success: true,
        properties,
        total,
        page,
        pages: Math.ceil(total / limit),
    });
});

// GET /api/properties/search
router.get("/search", async (req: Request, res: Response) => {
    const surveyNumber = req.query.surveyNumber as string;
    if (!surveyNumber) {
        return res.status(400).json({ success: false, message: "surveyNumber query param required." });
    }
    const prop = await Property.findOne({ surveyNumber }).lean();
    if (!prop) {
        return res.status(404).json({ success: false, message: "Property not found." });
    }
    res.json({ success: true, property: prop });
});

// GET /api/properties/owner/:walletAddress
router.get("/owner/:walletAddress", verifyJWT, async (req: Request, res: Response) => {
    const { walletAddress } = req.params;
    const properties = await Property.find({ ownerWallet: walletAddress }).lean();
    res.json({ success: true, properties });
});

// GET /api/properties/:id
router.get("/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return res.status(400).json({ success: false, message: "Invalid property ID." });
    }

    const prop = await Property.findOne({ blockchainPropertyId: id }).lean();
    if (!prop) {
        return res.status(404).json({ success: false, message: "Property not found." });
    }

    let onChain: Record<string, unknown> | null = null;
    try {
        onChain = await blockchainService.getPropertyDetails(id) as unknown as Record<string, unknown>;
    } catch {
        // Blockchain might not be available
    }

    const auditEntries = await AuditLog.find({ propertyId: id }).sort({ timestamp: -1 }).limit(20).lean();

    res.json({
        success: true,
        property: prop,
        onChain,
        audit: auditEntries,
    });
});

export default router;
