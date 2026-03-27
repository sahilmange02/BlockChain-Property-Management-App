import api from "./axios";

export interface KycUser {
    _id: string;
    name: string;
    email: string;
    phone: number;
    last4Aadhaar?: string;
    last4Pan?: string;
    role: string;
    createdAt: string;
    kycStatus?: string;
    kycRejectionReason?: string;
}

export const kycApi = {
    // Get pending KYC users
    getPendingKycUsers: async () => {
        const res = await api.get("/kyc/pending-users");
        return res.data as { success: boolean; count: number; users: KycUser[] };
    },

    // Get KYC details for a specific user
    getKycUserDetails: async (userId: string) => {
        const res = await api.get(`/kyc/user/${userId}`);
        return res.data as { success: boolean; user: KycUser };
    },

    // Approve KYC for a user
    approveKyc: async (userId: string) => {
        const res = await api.post(`/kyc/approve/${userId}`);
        return res.data as { success: boolean; message: string; user: KycUser };
    },

    // Reject KYC with reason
    rejectKyc: async (userId: string, reason: string) => {
        const res = await api.post(`/kyc/reject/${userId}`, { reason });
        return res.data as { success: boolean; message: string; user: KycUser };
    },

    // Reset KYC status (admin only)
    resetKyc: async (userId: string) => {
        const res = await api.post(`/kyc/reset/${userId}`);
        return res.data as { success: boolean; message: string; user: KycUser };
    },
};
