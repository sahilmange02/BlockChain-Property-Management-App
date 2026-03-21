/*
 * ROUTE EXPLAINED: admin.routes.ts
 * =================================
 * Handles government/admin actions: verify/reject properties,
 * user management, analytics, audit log.
 * Role-based: GOVERNMENT for verification, ADMIN for users/audit.
 */
import { Router, Request, Response } from "express";
import { z } from "zod";
import Property from "../models/Property.js";
import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";
import Transfer from "../models/Transfer.js";
import Notification from "../models/Notification.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/rbac.middleware.js";
import { validate } from "../middleware/validate.middleware.js";

const router = Router();

// GET /api/admin/pending-transfers
router.get("/pending-transfers", verifyJWT, requireRole("GOVERNMENT", "ADMIN"), async (_req: Request, res: Response) => {
    const transfers = await Transfer.find({ status: "PENDING" }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, transfers });
});

// GET /api/admin/pending-properties
router.get("/pending-properties", verifyJWT, requireRole("GOVERNMENT", "ADMIN"), async (_req: Request, res: Response) => {
    const properties = await Property.find({ status: "PENDING_VERIFICATION" }).sort({ registrationDate: -1 }).lean();
    res.json({ success: true, properties });
});

const verifyBodySchema = z.object({ blockchainTxHash: z.string().min(1).optional() });
const rejectBodySchema = z.object({ reason: z.string().min(1) });

// POST /api/admin/verify-property/:blockchainPropertyId
router.post(
    "/verify-property/:blockchainPropertyId",
    verifyJWT,
    requireRole("GOVERNMENT"),
    validate({
        body: verifyBodySchema,
        params: z.object({ blockchainPropertyId: z.string().regex(/^\d+$/) }),
    }),
    async (req: Request, res: Response) => {
        const id = parseInt(req.params.blockchainPropertyId, 10);
        const prop = await Property.findOne({ blockchainPropertyId: id });
        if (!prop) {
            return res.status(404).json({ success: false, message: "Property not found." });
        }

        await Property.updateOne(
            { blockchainPropertyId: id },
            { status: "VERIFIED", lastUpdated: new Date() }
        );

        const ownerUser = await User.findOne({ walletAddress: prop.ownerWallet });
        if (ownerUser) {
            await Notification.create({
                userId: ownerUser._id,
                type: "VERIFICATION",
                message: `Property #${id} has been verified.`,
                propertyId: id,
            });
        }

        res.json({
            success: true,
            message: "Property verified.",
            propertyId: id,
        });
    }
);

// POST /api/admin/reject-property/:blockchainPropertyId
router.post(
    "/reject-property/:blockchainPropertyId",
    verifyJWT,
    requireRole("GOVERNMENT"),
    validate({
        body: rejectBodySchema,
        params: z.object({ blockchainPropertyId: z.string().regex(/^\d+$/) }),
    }),
    async (req: Request, res: Response) => {
        const id = parseInt(req.params.blockchainPropertyId, 10);
        const { reason } = req.body;
        const prop = await Property.findOne({ blockchainPropertyId: id });
        if (!prop) {
            return res.status(404).json({ success: false, message: "Property not found." });
        }

        await Property.updateOne(
            { blockchainPropertyId: id },
            { status: "REJECTED", lastUpdated: new Date() }
        );

        const ownerUser = await User.findOne({ walletAddress: prop.ownerWallet });
        if (ownerUser) {
            await Notification.create({
                userId: ownerUser._id,
                type: "VERIFICATION",
                message: `Property #${id} was rejected: ${reason}`,
                propertyId: id,
            });
        }

        res.json({
            success: true,
            message: "Property rejected.",
            propertyId: id,
        });
    }
);

// GET /api/admin/users
router.get("/users", verifyJWT, requireRole("ADMIN"), async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(String(req.query.page)) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit)) || 10));

    const [users, total] = await Promise.all([
        User.find()
            .select("name email role kycStatus isVerified walletAddress createdAt")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        User.countDocuments(),
    ]);

    res.json({
        success: true,
        users,
        total,
        page,
        pages: Math.ceil(total / limit),
    });
});

// GET /api/admin/analytics
router.get("/analytics", verifyJWT, requireRole("ADMIN", "GOVERNMENT"), async (_req: Request, res: Response) => {
    const [
        totalProperties,
        pendingVerifications,
        totalTransfers,
        propertiesByType,
        propertiesByStatus,
        recentActivity,
    ] = await Promise.all([
        Property.countDocuments(),
        Property.countDocuments({ status: "PENDING_VERIFICATION" }),
        Transfer.countDocuments(),
        Property.aggregate([{ $group: { _id: "$propertyType", count: { $sum: 1 } } }]),
        Property.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
        AuditLog.find().sort({ timestamp: -1 }).limit(10).lean(),
    ]);

    res.json({
        success: true,
        totalProperties,
        pendingVerifications,
        totalTransfers,
        propertiesByType: Object.fromEntries(propertiesByType.map((p: { _id: string; count: number }) => [p._id, p.count])),
        propertiesByStatus: Object.fromEntries(propertiesByStatus.map((p: { _id: string; count: number }) => [p._id, p.count])),
        recentActivity,
    });
});

// GET /api/admin/audit-log
router.get("/audit-log", verifyJWT, requireRole("ADMIN"), async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(String(req.query.page)) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit)) || 20));
    const eventType = req.query.eventType as string | undefined;
    const propertyId = req.query.propertyId ? parseInt(String(req.query.propertyId), 10) : undefined;

    const filter: Record<string, unknown> = {};
    if (eventType) filter.eventType = eventType;
    if (propertyId) filter.propertyId = propertyId;

    const [entries, total] = await Promise.all([
        AuditLog.find(filter).sort({ timestamp: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        AuditLog.countDocuments(filter),
    ]);

    res.json({
        success: true,
        entries,
        total,
        page,
        pages: Math.ceil(total / limit),
    });
});

export default router;
