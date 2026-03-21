/*
 * ROUTE EXPLAINED: transfer.routes.ts
 * ====================================
 * Handles property ownership transfer initiation and confirmation.
 * BLOCKCHAIN: The actual transfer is executed on-chain. This API syncs
 * status to MongoDB and sends notifications.
 */
import { Router, Request, Response } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import Property from "../models/Property.js";
import Transfer from "../models/Transfer.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { requireWalletLinked, requireRole } from "../middleware/rbac.middleware.js";
import { validate } from "../middleware/validate.middleware.js";

const router = Router();

const initiateSchema = z.object({
    propertyId: z.number().int().positive(),
    newOwnerWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    blockchainTxHash: z.string().min(1),
});

const confirmSchema = z.object({
    blockchainTxHash: z.string().min(1),
});

// POST /api/transfers/initiate
router.post(
    "/initiate",
    verifyJWT,
    requireWalletLinked,
    validate({ body: initiateSchema }),
    async (req: Request, res: Response) => {
        const { propertyId, newOwnerWallet, blockchainTxHash } = req.body;
        const fromWallet = req.user!.walletAddress!;

        const prop = await Property.findOne({ blockchainPropertyId: propertyId });
        if (!prop) {
            return res.status(404).json({ success: false, message: "Property not found." });
        }
        if (prop.ownerWallet.toLowerCase() !== fromWallet.toLowerCase()) {
            return res.status(403).json({ success: false, message: "You are not the owner." });
        }
        if (prop.status === "TRANSFER_PENDING") {
            return res.status(400).json({ success: false, message: "Transfer already pending." });
        }

        await Property.updateOne(
            { blockchainPropertyId: propertyId },
            { status: "TRANSFER_PENDING", lastUpdated: new Date() }
        );

        const transfer = await Transfer.create({
            propertyId,
            fromOwnerWallet: fromWallet,
            toOwnerWallet: newOwnerWallet,
            blockchainTxHash,
            status: "PENDING",
        });

        const govUsers = await User.find({ role: "GOVERNMENT" }).select("_id");
        for (const u of govUsers) {
            await Notification.create({
                userId: u._id,
                type: "TRANSFER_INITIATED",
                message: `Property #${propertyId} transfer initiated to ${newOwnerWallet}`,
                propertyId,
            });
        }

        res.status(201).json({
            success: true,
            message: "Transfer initiated. Pending government approval.",
            propertyId,
            transferId: transfer._id.toString(),
        });
    }
);

// POST /api/transfers/confirm/:transferId
router.post(
    "/confirm/:transferId",
    verifyJWT,
    requireRole("GOVERNMENT"),
    validate({
        body: confirmSchema,
        params: z.object({
            transferId: z.string().refine((id) => mongoose.Types.ObjectId.isValid(id), "Invalid transfer ID"),
        }),
    }),
    async (req: Request, res: Response) => {
        const { transferId } = req.params;
        const { blockchainTxHash } = req.body;

        const transfer = await Transfer.findOne({ _id: transferId, status: "PENDING" });
        if (!transfer) {
            return res.status(404).json({ success: false, message: "Transfer not found or already processed." });
        }

        const prop = await Property.findOne({ blockchainPropertyId: transfer.propertyId });
        if (!prop) {
            return res.status(404).json({ success: false, message: "Property not found." });
        }

        const oldOwner = prop.ownerWallet;
        await Property.updateOne(
            { blockchainPropertyId: transfer.propertyId },
            {
                ownerWallet: transfer.toOwnerWallet,
                status: "VERIFIED",
                lastUpdated: new Date(),
            }
        );

        await Transfer.updateOne(
            { _id: transferId },
            { status: "APPROVED", blockchainTxHash, confirmedAt: new Date() }
        );

        const oldOwnerUser = await User.findOne({ walletAddress: oldOwner });
        const newOwnerUser = await User.findOne({ walletAddress: transfer.toOwnerWallet });

        if (oldOwnerUser) {
            await Notification.create({
                userId: oldOwnerUser._id,
                type: "TRANSFER_APPROVED",
                message: `Property #${transfer.propertyId} transferred to ${transfer.toOwnerWallet}`,
                propertyId: transfer.propertyId,
            });
        }
        if (newOwnerUser) {
            await Notification.create({
                userId: newOwnerUser._id,
                type: "TRANSFER_APPROVED",
                message: `You received property #${transfer.propertyId}`,
                propertyId: transfer.propertyId,
            });
        }

        res.json({
            success: true,
            message: "Transfer confirmed.",
            propertyId: transfer.propertyId,
        });
    }
);

export default router;
