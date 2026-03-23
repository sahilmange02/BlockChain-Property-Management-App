import axios, { AxiosError } from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

// Attach JWT token to every request (when present)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

/**
 * Build a URL to view an IPFS file via Pinata gateway.
 */
export function getIPFSGatewayUrl(cid: string, filename: string = ""): string {
  const gateway = import.meta.env.VITE_IPFS_GATEWAY || "https://gateway.pinata.cloud";
  return filename ? `${gateway}/ipfs/${cid}/${filename}` : `${gateway}/ipfs/${cid}`;
}

export default api;

