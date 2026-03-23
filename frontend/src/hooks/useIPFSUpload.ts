import { useState } from "react";
import toast from "react-hot-toast";
import { ipfsApi } from "../api/ipfs.api";

export function useIPFSUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ cid: string; gatewayUrl: string } | null>(null);

  const upload = async (file: File) => {
    setIsUploading(true);
    setProgress(0);
    setResult(null);
    try {
      const data = await ipfsApi.upload(file, setProgress);
      setResult({ cid: data.cid, gatewayUrl: data.gatewayUrl });
      toast.success("Document uploaded to IPFS ✓");
      return data;
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "IPFS upload failed");
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setProgress(0);
  };

  return { upload, isUploading, progress, result, reset };
}

