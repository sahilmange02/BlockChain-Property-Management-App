/*
 * PROPERTY MODEL: Off-chain metadata for properties.
 *
 * IMPORTANT: This is NOT the source of truth for ownership.
 * The blockchain smart contract is the source of truth.
 * This MongoDB document stores SEARCHABLE, DISPLAYABLE metadata.
 *
 * blockchainPropertyId links this document to the on-chain record.
 */
import mongoose, { Schema, Document } from "mongoose";

export type PropertyStatus = "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED" | "TRANSFER_PENDING";
export type PropertyType = "RESIDENTIAL" | "COMMERCIAL" | "AGRICULTURAL" | "INDUSTRIAL";

export interface IProperty extends Document {
    blockchainPropertyId: number;
    surveyNumber: string;
    location: {
        address: string;
        city: string;
        state: string;
        pincode: string;
        latitude?: number;
        longitude?: number;
    };
    area: number;
    propertyType: PropertyType;
    description: string;
    ipfsCid: string;
    ipfsGatewayUrl?: string;
    ownerWallet: string;
    status: PropertyStatus;
    images: Array<{ cid: string; filename: string; gatewayUrl?: string }>;
    registrationDate: Date;
    lastUpdated?: Date;
    blockchainTxHash: string;
}

const PropertySchema = new Schema<IProperty>(
    {
        blockchainPropertyId: { type: Number, unique: true, required: true, index: true },
        surveyNumber: { type: String, required: true, unique: true, index: true },
        location: {
            address: { type: String, required: true },
            city: { type: String, required: true, index: true },
            state: { type: String, required: true },
            pincode: { type: String, required: true },
            latitude: Number,
            longitude: Number,
        },
        area: { type: Number, required: true },
        propertyType: {
            type: String,
            enum: ["RESIDENTIAL", "COMMERCIAL", "AGRICULTURAL", "INDUSTRIAL"],
            index: true,
        },
        description: { type: String, maxlength: 1000 },
        ipfsCid: { type: String, required: true },
        ipfsGatewayUrl: String,
        ownerWallet: { type: String, required: true, index: true },
        status: {
            type: String,
            enum: ["PENDING_VERIFICATION", "VERIFIED", "REJECTED", "TRANSFER_PENDING"],
            default: "PENDING_VERIFICATION",
            index: true,
        },
        images: [{ cid: String, filename: String, gatewayUrl: String }],
        registrationDate: { type: Date, default: Date.now },
        lastUpdated: { type: Date, default: Date.now },
        blockchainTxHash: { type: String, required: true },
    },
    { timestamps: true }
);

export default mongoose.model<IProperty>("Property", PropertySchema);
