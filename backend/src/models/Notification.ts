import mongoose, { Schema, Document } from "mongoose";

export type NotificationType =
    | "REGISTRATION"
    | "VERIFICATION"
    | "TRANSFER_INITIATED"
    | "TRANSFER_APPROVED"
    | "TRANSFER_REJECTED";

export interface INotification extends Document {
    userId: mongoose.Types.ObjectId;
    type: NotificationType;
    message: string;
    propertyId?: number;
    isRead: boolean;
    createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        type: {
            type: String,
            enum: ["REGISTRATION", "VERIFICATION", "TRANSFER_INITIATED", "TRANSFER_APPROVED", "TRANSFER_REJECTED"],
        },
        message: { type: String, required: true },
        propertyId: Number,
        isRead: { type: Boolean, default: false },
    },
    { timestamps: true }
);

export default mongoose.model<INotification>("Notification", NotificationSchema);
