import api from "./axios";
import type { User } from "../types";

export const authApi = {
  register: async (data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    aadhaarNumber: string;
    panNumber: string;
  }) => {
    const res = await api.post("/auth/register", data);
    return res.data as { success: boolean; message: string; userId: string };
  },

  login: async (data: { email: string; password: string }) => {
    const res = await api.post("/auth/login", data);
    return res.data as { success: boolean; token: string; user: User };
  },

  // IMPORTANT: message must be exactly "Link wallet to Land Registry: " + userId
  linkWallet: async (data: { walletAddress: string; signature: string }) => {
    const res = await api.post("/auth/link-wallet", data);
    return res.data as { success: boolean; message: string; walletAddress: string };
  },

  checkWallet: async (address: string) => {
    const res = await api.get(`/auth/check-wallet/${address}`);
    return res.data as { success: boolean; exists: boolean; user?: Partial<User> };
  },

  me: async () => {
    const res = await api.get("/auth/me");
    return res.data.user as User;
  },
};

