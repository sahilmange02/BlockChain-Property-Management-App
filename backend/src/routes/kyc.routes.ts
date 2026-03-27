/*
 * KYC ROUTES: kyc.routes.ts
 * =========================
 * Handles KYC verification workflow by government authorities.
 * - Get pending KYC users
 * - Approve/Reject KYC with reasoning
 */
import { Router, Request, Response } from "express";
import { z } from "zod";
import User from "../models/User.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/rbac.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { emailService } from "../config/email.js";

const router = Router();

// GET /api/kyc/pending-users
// Get list of users with pending KYC verification
router.get("/pending-users", verifyJWT, requireRole("GOVERNMENT", "ADMIN"), async (_req: Request, res: Response) => {
    try {
        const pendingUsers = await User.find({
            kycStatus: "PENDING",
        })
            .select("_id name email phone last4Aadhaar last4Pan role createdAt")
            .sort({ createdAt: -1 })
            .lean();

        res.json({
            success: true,
            count: pendingUsers.length,
            users: pendingUsers,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch pending KYC users.",
        });
    }
});

// GET /api/kyc/user/:userId
// Get KYC details for a specific user (without sensitive info)
router.get("/user/:userId", verifyJWT, requireRole("GOVERNMENT", "ADMIN"), async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId).select(
            "_id name email phone last4Aadhaar last4Pan kycStatus kycRejectionReason createdAt role"
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        res.json({
            success: true,
            user,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch user KYC details.",
        });
    }
});

// POST /api/kyc/approve/:userId
// Approve KYC for a user
router.post("/approve/:userId", verifyJWT, requireRole("GOVERNMENT", "ADMIN"), async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        if (user.kycStatus === "VERIFIED") {
            return res.status(400).json({
                success: false,
                message: "KYC already verified for this user.",
            });
        }

        user.kycStatus = "VERIFIED";
        user.kycRejectionReason = undefined;
        await user.save();

        // Send approval email
        await emailService.sendKycApprovalEmail(user.email, user.name);

        res.json({
            success: true,
            message: `KYC approved for ${user.name}.`,
            user: {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                kycStatus: user.kycStatus,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to approve KYC.",
        });
    }
});

// POST /api/kyc/reject/:userId
// Reject KYC for a user with reason
router.post(
    "/reject/:userId",
    verifyJWT,
    requireRole("GOVERNMENT", "ADMIN"),
    validate({
        body: z.object({
            reason: z.string().min(5).max(500),
        }),
    }),
    async (req: Request, res: Response) => {
        try {
            const { userId } = req.params;
            const { reason } = req.body;

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "User not found.",
                });
            }

            if (user.kycStatus === "REJECTED" && user.kycRejectionReason === reason) {
                return res.status(400).json({
                    success: false,
                    message: "KYC already rejected with this reason.",
                });
            }

            user.kycStatus = "REJECTED";
            user.kycRejectionReason = reason;
            await user.save();

            // Send rejection email
            await emailService.sendKycRejectionEmail(user.email, user.name, reason);

            res.json({
                success: true,
                message: `KYC rejected for ${user.name}.`,
                user: {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    kycStatus: user.kycStatus,
                    kycRejectionReason: user.kycRejectionReason,
                },
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to reject KYC.",
            });
        }
    }
);

// POST /api/kyc/reset/:userId
// Reset KYC status back to PENDING (for resubmission)
router.post("/reset/:userId", verifyJWT, requireRole("ADMIN"), async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        user.kycStatus = "PENDING";
        user.kycRejectionReason = undefined;
        await user.save();

        res.json({
            success: true,
            message: `KYC status reset to PENDING for ${user.name}.`,
            user: {
                id: user._id.toString(),
                name: user.name,
                kycStatus: user.kycStatus,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to reset KYC status.",
        });
    }
});

export default router;
