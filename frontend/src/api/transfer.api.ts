import api from "./axios";

export const transferApi = {
  initiate: async (data: {
    propertyId: number;
    newOwnerWallet: string;
    blockchainTxHash: string;
  }) => {
    const res = await api.post("/transfers/initiate", data);
    return res.data as {
      success: boolean;
      message: string;
      propertyId: number;
      transferId: string;
    };
  },

  confirm: async (transferId: string, blockchainTxHash: string) => {
    const res = await api.post(`/transfers/confirm/${transferId}`, { blockchainTxHash });
    return res.data as { success: boolean; message: string; propertyId: number };
  },
};

