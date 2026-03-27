/*
 * USER MODEL: Stores user data that doesn't belong on the blockchain.
 * The blockchain stores property ownership (wallet address).
 * MongoDB stores personal data (email, phone, KYC info).
 * The link between them is the walletAddress field.
 */
import mongoose, { Schema, Document, Model } from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export type Role = "CITIZEN" | "GOVERNMENT" | "ADMIN";
export type KycStatus = "PENDING" | "VERIFIED" | "REJECTED";

export interface IUser extends Document {
    name: string;
    email: string;
    phone: number;
    passwordHash: string;
    role: Role;
    aadhaarHash: string;
    panHash: string;
    last4Aadhaar?: string; // Last 4 digits of Aadhaar for display
    last4Pan?: string; // Last 4 chars of PAN for display
    walletAddress?: string;
    isVerified: boolean;
    emailVerificationToken?: string; // For email verification
    emailVerificationTokenExpiry?: Date;
    kycStatus: KycStatus;
    kycRejectionReason?: string; // Reason if KYC is rejected
    failedLoginAttempts: number;
    lockUntil?: Date;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(plain: string): Promise<boolean>;
}

export interface IUserModel extends Model<IUser> {
    findByEmail(email: string): Promise<IUser | null>;
}

const UserSchema = new Schema<IUser>(
    {
        name: { type: String, required: true, trim: true, maxlength: 100 },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
        phone: { type: Number, required: true, unique: false, index: false },
        passwordHash: { type: String, required: true },
        role: { type: String, enum: ["CITIZEN", "GOVERNMENT", "ADMIN"], default: "CITIZEN" },
        aadhaarHash: { type: String, required: true, unique: true, index: true },
        panHash: { type: String, required: true, unique: true, index: true },
        last4Aadhaar: { type: String },
        last4Pan: { type: String },
        walletAddress: { type: String, unique: true, sparse: true, index: true },
        isVerified: { type: Boolean, default: false },
        emailVerificationToken: { type: String },
        emailVerificationTokenExpiry: { type: Date },
        kycStatus: { type: String, enum: ["PENDING", "VERIFIED", "REJECTED"], default: "PENDING" },
        kycRejectionReason: { type: String },
        failedLoginAttempts: { type: Number, default: 0 },
        lockUntil: { type: Date },
    },
    { timestamps: true }
);

UserSchema.pre("save", async function (next) {
    if (!this.isModified("passwordHash")) return next();
    this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
    next();
});

UserSchema.methods.comparePassword = async function (plain: string): Promise<boolean> {
    return bcrypt.compare(plain, this.passwordHash);
};

UserSchema.statics.findByEmail = function (email: string) {
    return this.findOne({ email: email.toLowerCase() });
};

export function hashSensitiveData(value: string): string {
    const salt = process.env.KYC_HASH_SALT || "default-salt-change-in-production";
    return crypto.createHash("sha256").update(value + salt).digest("hex");
}

export default mongoose.model<IUser, IUserModel>("User", UserSchema);
