/*
 * TRANSFER MODEL: Tracks property ownership transfer requests.
 *
 * BLOCKCHAIN EXPLAINED: The actual transfer approval happens on-chain.
 * This MongoDB document tracks the request for our API and notifications.
 * When government approves on blockchain, our event listener updates
 * the Property. This model helps us list pending transfers for the API.
 */
import mongoose, { Schema, Document } from "mongoose";

export type TransferStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface ITransfer extends Document {
    propertyId: number;
    fromOwnerWallet: string;
    toOwnerWallet: string;
    blockchainTxHash?: string;
    blockchainTransferId?: number;
    status: TransferStatus;
    confirmedAt?: Date;
}

const TransferSchema = new Schema<ITransfer>(
    {
        propertyId: { type: Number, required: true, index: true },
        fromOwnerWallet: { type: String, required: true },
        toOwnerWallet: { type: String, required: true },
        blockchainTxHash: String,
        blockchainTransferId: Number,
        status: {
            type: String,
            enum: ["PENDING", "APPROVED", "REJECTED"],
            default: "PENDING",
            index: true,
        },
        confirmedAt: Date,
    },
    { timestamps: true }
);

export default mongoose.model<ITransfer>("Transfer", TransferSchema);
