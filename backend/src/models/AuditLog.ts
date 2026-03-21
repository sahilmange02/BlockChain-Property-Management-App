/*
 * AUDIT LOG: Synced from blockchain events by blockchain.service.ts
 *
 * BLOCKCHAIN EXPLAINED: Every action on the smart contract emits an "event".
 * Those events are permanently stored on the blockchain.
 * We ALSO save them to MongoDB here so they're easy to search and display.
 *
 * This is like having two copies:
 * - Blockchain copy: tamper-proof, but hard to query
 * - MongoDB copy: easy to search/filter, but just a cache (blockchain is truth)
 */
import mongoose, { Schema, Document } from "mongoose";

export type AuditEventType =
    | "PropertyRegistered"
    | "PropertyVerified"
    | "PropertyRejected"
    | "OwnershipTransferred"
    | "TransferInitiated"
    | "TransferRejected";

export interface IAuditLog extends Document {
    eventType: AuditEventType;
    propertyId: number;
    fromAddress?: string;
    toAddress?: string;
    txHash: string;
    blockNumber: number;
    timestamp: Date;
    metadata?: Record<string, unknown>;
}

const AuditLogSchema = new Schema<IAuditLog>(
    {
        eventType: { type: String, required: true, index: true },
        propertyId: { type: Number, required: true, index: true },
        fromAddress: { type: String, index: true },
        toAddress: String,
        txHash: { type: String, required: true, unique: true },
        blockNumber: { type: Number, required: true },
        timestamp: { type: Date, required: true },
        metadata: Schema.Types.Mixed,
    },
    { timestamps: true }
);

export default mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
