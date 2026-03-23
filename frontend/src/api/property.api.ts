import api from "./axios";
import type { Property } from "../types";

export const propertyApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
    city?: string;
  }) => {
    const res = await api.get("/properties", { params });
    return res.data as {
      success: boolean;
      properties: Property[];
      total: number;
      page: number;
      pages: number;
    };
  },

  getById: async (id: number) => {
    const res = await api.get(`/properties/${id}`);
    return res.data as { success: boolean; property: Property; onChain: unknown; audit: unknown[] };
  },

  search: async (surveyNumber: string) => {
    const res = await api.get("/properties/search", { params: { surveyNumber } });
    return res.data as { success: boolean; property: Property };
  },

  getByOwner: async (walletAddress: string) => {
    const res = await api.get(`/properties/owner/${walletAddress}`);
    return res.data as { success: boolean; properties: Property[] };
  },

  register: async (data: {
    surveyNumber: string;
    location: { address: string; city: string; state: string; pincode: string };
    area: number;
    propertyType: string;
    description: string;
    ipfsCid: string;
    ipfsGatewayUrl: string;
    blockchainPropertyId: number;
    blockchainTxHash: string;
  }) => {
    const res = await api.post("/properties/register", data);
    return res.data as { success: boolean; propertyId: number; message: string };
  },
};

