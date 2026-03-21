/*
 * IPFS UPLOAD HOOK
 * =================
 * IPFS EXPLAINED:
 * This hook handles the file upload flow:
 * 1. User picks a file (PDF, image)
 * 2. We send it to POST /api/ipfs/upload on our backend
 * 3. Backend forwards it to our local IPFS node (Kubo)
 * 4. IPFS calculates the file's fingerprint (CID) and stores it
 * 5. We get back the CID and gateway URL
 * 6. The user continues filling the form
 * 7. When they submit the blockchain transaction, the CID goes on-chain
 *
 * WHY UPLOAD BEFORE BLOCKCHAIN SUBMISSION?
 * - IPFS upload can take a few seconds
 * - We want the CID ready BEFORE the MetaMask popup appears
 * - Better UX: show upload progress separately from blockchain progress
 */
import { useState } from "react";
import api from "@/services/api";

interface UploadResult {
  cid: string;
  gatewayUrl: string;
  size: number;
}

export function useIPFSUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File): Promise<UploadResult | null> => {
    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("document", file);

      const response = await api.post<{ cid: string; gatewayUrl: string; size: number }>(
        "/ipfs/upload",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            const pct = Math.round(
              (progressEvent.loaded * 100) / (progressEvent.total || 1)
            );
            setUploadProgress(pct);
          },
        }
      );

      const uploadResult = response.data;
      setResult(uploadResult);
      return uploadResult;
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Upload failed. Is IPFS running?";
      setError(msg);
      return null;
    } finally {
      setIsUploading(false);
      setUploadProgress(100);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
    setUploadProgress(0);
  };

  return {
    upload,
    isUploading,
    uploadProgress,
    cid: result?.cid ?? null,
    gatewayUrl: result?.gatewayUrl ?? null,
    result,
    error,
    reset,
  };
}
