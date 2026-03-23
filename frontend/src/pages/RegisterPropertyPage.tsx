import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { AlertCircle, CheckCircle, Loader, Upload } from "lucide-react";
import { useWeb3 } from "../context/Web3Context";
import { useAuth } from "../context/AuthContext";
import { propertyApi } from "../api/property.api";
import { useIPFSUpload } from "../hooks/useIPFSUpload";
import type { PropertyType } from "../types";

const PROPERTY_TYPES = ["RESIDENTIAL", "COMMERCIAL", "AGRICULTURAL", "INDUSTRIAL"] as const;

const typeToIndex: Record<PropertyType, number> = {
  RESIDENTIAL: 0,
  COMMERCIAL: 1,
  AGRICULTURAL: 2,
  INDUSTRIAL: 3,
};

const detailsSchema = z.object({
  surveyNumber: z.string().min(3).max(50),
  area: z.coerce.number().positive("Area must be positive"),
  propertyType: z.enum(PROPERTY_TYPES),
  description: z.string().max(1000).optional(),
  locAddress: z.string().min(1, "Address required"),
  city: z.string().min(1, "City required"),
  state: z.string().min(1, "State required"),
  pincode: z.string().min(6, "Pincode required"),
});

type DetailsForm = z.infer<typeof detailsSchema>;
type TxStatus = "idle" | "uploading" | "signing" | "confirming" | "saving" | "done";

export default function RegisterPropertyPage() {
  const { contract, isConnected } = useWeb3();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { upload, isUploading, progress, result: ipfsResult } = useIPFSUpload();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [formValues, setFormValues] = useState<DetailsForm | null>(null);
  const [txStatus, setTxStatus] = useState<TxStatus>("idle");
  const [txHash, setTxHash] = useState<string>("");
  const [registeredPropertyId, setRegisteredPropertyId] = useState<number | null>(null);

  const { register, handleSubmit, formState } = useForm<DetailsForm>({
    resolver: zodResolver(detailsSchema),
  });

  const walletAddress = user?.walletAddress;
  const needsWallet = !walletAddress;

  const typeIndex = useMemo(() => {
    if (!formValues) return null;
    return typeToIndex[formValues.propertyType];
  }, [formValues]);

  if (needsWallet) {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center">
        <AlertCircle size={48} className="text-yellow-400 mx-auto mb-4" />
        <h2 className="text-white text-xl font-bold">Wallet Not Linked</h2>
        <p className="text-gray-400 mt-2">Please connect and link your MetaMask wallet before registering a property.</p>
      </div>
    );
  }

  const handleStep1 = handleSubmit((data) => {
    setFormValues(data);
    setStep(2);
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const uploadResult = await upload(file);
    if (uploadResult) {
      // If upload succeeded, allow moving to step 3
      setStep(2);
    }
  };

  const handleBlockchainSubmit = async () => {
    if (!ipfsResult) {
      toast.error("Please upload a document first");
      return;
    }
    if (!contract) {
      toast.error("Wallet not connected or contract not loaded");
      return;
    }
    if (!formValues || typeIndex === null) return;

    setTxStatus("signing");
    try {
      const locationStr = `${formValues.locAddress}, ${formValues.city}, ${formValues.state}`;

      const tx = await contract.registerProperty(
        formValues.surveyNumber,
        locationStr,
        formValues.area,
        ipfsResult.cid,
        typeIndex,
        formValues.description || ""
      );

      setTxStatus("confirming");
      setTxHash(tx.hash);
      toast("Transaction submitted, waiting for confirmation...", { icon: "⏳" });

      const receipt = await tx.wait(1);

      let propertyId: number | null = null;
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log as any);
          if (parsed?.name === "PropertyRegistered") {
            propertyId = Number(parsed.args.propertyId);
            break;
          }
        } catch {
          // ignore logs that aren't our event
        }
      }

      if (!propertyId) {
        toast.error("Could not get property ID from transaction");
        setTxStatus("idle");
        return;
      }

      setTxStatus("saving");

      await propertyApi.register({
        surveyNumber: formValues.surveyNumber,
        location: {
          address: formValues.locAddress,
          city: formValues.city,
          state: formValues.state,
          pincode: formValues.pincode,
        },
        area: formValues.area,
        propertyType: formValues.propertyType,
        description: formValues.description || "",
        ipfsCid: ipfsResult.cid,
        ipfsGatewayUrl: ipfsResult.gatewayUrl,
        blockchainPropertyId: propertyId,
        blockchainTxHash: tx.hash,
      });

      setRegisteredPropertyId(propertyId);
      setTxStatus("done");
      toast.success(`Property #${propertyId} registered on blockchain!`);
    } catch (err: any) {
      if (err?.code === 4001 || err?.code === "ACTION_REJECTED") {
        toast.error("Transaction rejected by user");
      } else {
        toast.error(err?.response?.data?.message || err?.message || "Transaction failed");
        console.error(err);
      }
      setTxStatus("idle");
    }
  };

  if (txStatus === "done" && registeredPropertyId) {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center">
        <CheckCircle size={64} className="text-green-400 mx-auto mb-6" />
        <h2 className="text-white text-2xl font-bold">Property Registered!</h2>
        <p className="text-gray-400 mt-2">Property #{registeredPropertyId} is now on the blockchain.</p>

        <div className="mt-4 p-3 bg-gray-800 rounded-lg">
          <p className="text-xs text-gray-500">Transaction Hash</p>
          <p className="text-xs font-mono text-indigo-400 break-all">{txHash}</p>
        </div>

        <p className="text-yellow-400 text-sm mt-4">Status: Pending government verification</p>

        <div className="flex gap-3 mt-6">
          <button onClick={() => navigate("/dashboard")} className="flex-1 btn-secondary">
            My Dashboard
          </button>
          <button onClick={() => navigate(`/properties/${registeredPropertyId}`)} className="flex-1 btn-primary">
            View Property
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-2">Register Property</h1>
      <p className="text-gray-400 mb-8">Step {step} of 3</p>

      <div className="flex gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className={`flex-1 h-1 rounded ${s <= step ? "bg-indigo-500" : "bg-gray-700"}`} />
        ))}
      </div>

      {step === 1 && (
        <form onSubmit={handleStep1} className="space-y-5 bg-gray-900 p-6 rounded-xl border border-gray-800">
          <h2 className="text-white font-semibold">Property Details</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-300">Survey Number</label>
              <input {...register("surveyNumber")} className="input-field mt-1" placeholder="MH/GK/2025/001" />
              {formState.errors.surveyNumber ? <p className="err">{formState.errors.surveyNumber.message}</p> : null}
            </div>
            <div>
              <label className="text-sm text-gray-300">Area (sq ft)</label>
              <input {...register("area")} type="number" className="input-field mt-1" placeholder="850" />
              {formState.errors.area ? <p className="err">{formState.errors.area.message}</p> : null}
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-300">Property Type</label>
            <select {...register("propertyType")} className="input-field mt-1">
              {PROPERTY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-300">Street Address</label>
            <input {...register("locAddress")} className="input-field mt-1" placeholder="Flat 4B, Sunshine Towers" />
            {formState.errors.locAddress ? <p className="err">{formState.errors.locAddress.message}</p> : null}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-gray-300">City</label>
              <input {...register("city")} className="input-field mt-1" placeholder="Mumbai" />
              {formState.errors.city ? <p className="err">{formState.errors.city.message}</p> : null}
            </div>
            <div>
              <label className="text-sm text-gray-300">State</label>
              <input {...register("state")} className="input-field mt-1" placeholder="Maharashtra" />
              {formState.errors.state ? <p className="err">{formState.errors.state.message}</p> : null}
            </div>
            <div>
              <label className="text-sm text-gray-300">Pincode</label>
              <input {...register("pincode")} className="input-field mt-1" placeholder="400077" maxLength={6} />
              {formState.errors.pincode ? <p className="err">{formState.errors.pincode.message}</p> : null}
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-300">Description (optional)</label>
            <textarea {...register("description")} className="input-field mt-1" rows={3} placeholder="2BHK apartment..." />
          </div>

          <button type="submit" className="w-full btn-primary">
            Next: Upload Document →
          </button>
        </form>
      )}

      {step === 2 && (
        <div className="space-y-5 bg-gray-900 p-6 rounded-xl border border-gray-800">
          <h2 className="text-white font-semibold">Upload Property Document</h2>
          <p className="text-gray-400 text-sm">Upload a PDF or image of your title deed / property document.</p>

          <label className="block border-2 border-dashed border-gray-600 hover:border-indigo-500 rounded-xl p-8 text-center cursor-pointer transition-colors">
            <Upload size={32} className="mx-auto text-gray-500 mb-3" />
            <p className="text-gray-400">{ipfsResult ? "Uploaded" : "Click to upload or drag & drop"}</p>
            <p className="text-gray-600 text-xs mt-1">PDF, JPG, PNG — Max 10MB</p>
            <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileSelect} />
          </label>

          {isUploading ? (
            <div>
              <div className="flex justify-between text-sm text-gray-400 mb-1">
                <span>Uploading to IPFS...</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 bg-gray-700 rounded">
                <div className="h-2 bg-indigo-500 rounded transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : null}

          {ipfsResult ? (
            <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-400 font-semibold mb-2">
                <CheckCircle size={16} /> Document uploaded to IPFS
              </div>
              <p className="text-xs text-gray-400 font-mono break-all">CID: {ipfsResult.cid}</p>
              <a href={ipfsResult.gatewayUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:underline mt-1 block">
                View document ↗
              </a>
            </div>
          ) : null}

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(1)} className="flex-1 btn-secondary">
              ← Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={!ipfsResult}
              className="flex-1 btn-primary disabled:opacity-40"
            >
              Next: Submit to Blockchain →
            </button>
          </div>
        </div>
      )}

      {step === 3 && formValues && (
        <div className="space-y-5 bg-gray-900 p-6 rounded-xl border border-gray-800">
          <h2 className="text-white font-semibold">Review & Submit to Blockchain</h2>

          <div className="bg-gray-800 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Survey No.</span>
              <span className="text-white">{formValues.surveyNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Type</span>
              <span className="text-white">{formValues.propertyType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Area</span>
              <span className="text-white">{formValues.area} sq ft</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">City</span>
              <span className="text-white">{formValues.city}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">IPFS CID</span>
              <span className="text-indigo-400 font-mono text-xs">
                {ipfsResult?.cid ? `${ipfsResult.cid.slice(0, 20)}...` : ""}
              </span>
            </div>
          </div>

          {txStatus !== "idle" && txStatus !== "done" ? (
            <div className="flex items-center gap-3 text-yellow-400">
              <Loader size={16} className="animate-spin" />
              <span className="text-sm">
                {txStatus === "signing" ? "Waiting for MetaMask approval..." : null}
                {txStatus === "confirming" ? "Transaction submitted, confirming..." : null}
                {txStatus === "saving" ? "Saving to database..." : null}
              </span>
            </div>
          ) : null}

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(2)} disabled={txStatus !== "idle"} className="flex-1 btn-secondary">
              ← Back
            </button>
            <button
              type="button"
              onClick={handleBlockchainSubmit}
              disabled={txStatus !== "idle" || !isConnected}
              className="flex-1 btn-primary disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {txStatus !== "idle" ? <Loader size={16} className="animate-spin" /> : null}
              Register on Blockchain
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

