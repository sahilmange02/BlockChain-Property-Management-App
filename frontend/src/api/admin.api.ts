import api from "./axios";
import type { AuditEntry, Property, Transfer, User } from "../types";

export const adminApi = {
  getPendingProperties: async () => {
    const res = await api.get("/admin/pending-properties");
    return res.data as { success: boolean; properties: Property[] };
  },

  getPendingTransfers: async () => {
    const res = await api.get("/admin/pending-transfers");
    return res.data as { success: boolean; transfers: Transfer[] };
  },

  verifyProperty: async (blockchainPropertyId: number, blockchainTxHash?: string) => {
    const res = await api.post(`/admin/verify-property/${blockchainPropertyId}`, {
      blockchainTxHash,
    });
    return res.data as { success: boolean; message: string; propertyId: number };
  },

  rejectProperty: async (blockchainPropertyId: number, reason: string) => {
    const res = await api.post(`/admin/reject-property/${blockchainPropertyId}`, { reason });
    return res.data as { success: boolean; message: string; propertyId: number };
  },

  getUsers: async (page = 1, limit = 10) => {
    const res = await api.get("/admin/users", { params: { page, limit } });
    return res.data as { success: boolean; users: User[]; total: number; page: number; pages: number };
  },

  getAnalytics: async () => {
    const res = await api.get("/admin/analytics");
    return res.data as {
      success: boolean;
      totalProperties: number;
      pendingVerifications: number;
      totalTransfers: number;
      propertiesByType: Record<string, number>;
      propertiesByStatus: Record<string, number>;
      recentActivity: AuditEntry[];
    };
  },

  getAuditLog: async (params?: { page?: number; limit?: number; eventType?: string; propertyId?: number }) => {
    const res = await api.get("/admin/audit-log", { params });
    return res.data as { success: boolean; entries: AuditEntry[]; total: number; page: number; pages: number };
  },
};

