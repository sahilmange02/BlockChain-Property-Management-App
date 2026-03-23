import api from "./axios";

export const ipfsApi = {
  upload: async (file: File, onProgress?: (pct: number) => void): Promise<{ cid: string; gatewayUrl: string; size: number }> => {
    const formData = new FormData();
    formData.append("document", file);

    const res = await api.post("/ipfs/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (e) => {
        if (!onProgress) return;
        const total = e.total ?? 0;
        if (total > 0) {
          onProgress(Math.round((e.loaded * 100) / total));
        }
      },
    });

    return res.data;
  },
};