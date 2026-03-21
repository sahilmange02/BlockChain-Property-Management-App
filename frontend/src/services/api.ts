/*
 * API SERVICE: Handles all HTTP calls to the backend
 * ====================================================
 * This file creates an Axios instance configured to talk to our Express backend.
 * The backend then talks to MongoDB and (for reading) to the blockchain.
 *
 * JWT EXPLAINED:
 * When a user logs in, the backend gives them a JWT token — a signed string
 * that proves who they are. Every request to protected routes includes this
 * token in the Authorization header. The backend verifies it and knows
 * which user is making the request, without hitting the database every time.
 */
import axios, { AxiosError } from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let retryCount = 0;
api.interceptors.response.use(
  (res) => {
    retryCount = 0;
    return res;
  },
  async (err: AxiosError) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    } else if (err.code === "ERR_NETWORK" && retryCount < 1) {
      retryCount++;
      return api.request(err.config!);
    }
    retryCount = 0;
    return Promise.reject(err);
  }
);

/**
 * Build a URL to view an IPFS file via Pinata gateway.
 * IPFS EXPLAINED: The gateway translates a CID into a viewable URL.
 * Pinata's public gateway works for anyone — no account needed to VIEW files.
 */
export function getIPFSGatewayUrl(cid: string, filename: string = ""): string {
  // Use Pinata public gateway — anyone can view files here
  const gateway = import.meta.env.VITE_IPFS_GATEWAY || "https://gateway.pinata.cloud";
  return `${gateway}/ipfs/${cid}`;
}

export default api;
