/*
 * PROPERTY REGISTRATION PAGE
 * ===========================
 * BLOCKCHAIN EXPLAINED:
 * Step 3 calls contract.registerProperty() — this opens MetaMask.
 * The user signs the transaction, paying gas. The CID (from IPFS) is stored
 * on-chain. Then we call our backend to store off-chain metadata.
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useWeb3 } from "@/context/Web3Context";
import { useIPFSUpload } from "@/hooks/useIPFSUpload";
import api from "@/services/api";
import { TransactionStatus } from "@/components/TransactionStatus";
import toast from "react-hot-toast";
import { ExternalLink } from "lucide-react";

const PROPERTY_TYPES = ["RESIDENTIAL", "COMMERCIAL", "AGRICULTURAL", "INDUSTRIAL"] as const;

const schema = z.object({
  surveyNumber: z.string().min(3).max(50),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  pincode: z.string().min(6),
  area: z.number().positive(),
  propertyType: z.enum(PROPERTY_TYPES),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function PropertyRegistrationPage() {
  const [step, setStep] = useState(1);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<"idle" | "pending" | "confirmed" | "failed">("idle");
  const [propertyId, setPropertyId] = useState<number | null>(null);
  const { contract } = useWeb3();
  const { upload, isUploading, uploadProgress, cid } = useIPFSUpload();
  const navigate = useNavigate();

  const form = useForm<FormData>({
    // @ts-expect-error zod vs @hookform/resolvers type compatibility
    resolver: zodResolver(schema),
    defaultValues: {
      surveyNumber: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      area: 0,
      propertyType: "RESIDENTIAL",
      description: "",
    },
  });

  /*
   * UPLOAD FLOW EXPLAINED:
   * ========================
   * When user selects a file:
   * 1. useIPFSUpload().upload(file) is called
   * 2. File is sent to backend POST /api/ipfs/upload
   * 3. Backend uploads to LOCAL IPFS node (Kubo, running on localhost:5001)
   * 4. Kubo calculates the file's SHA-256 fingerprint = CID
   * 5. Kubo stores the file and "pins" it (marks it as important, don't delete)
   * 6. Backend returns the CID to frontend
   * 7. We show the user: "✅ Document uploaded. CID: Qm..."
   * 8. The CID is stored in React state until blockchain submission
   *
   * WHY NOT UPLOAD DURING BLOCKCHAIN SUBMISSION?
   * - IPFS upload takes time (1-5 seconds)
   * - Ethereum transactions also take time
   * - Doing both simultaneously causes UX confusion
   * - If IPFS fails after MetaMask is approved, user is in a bad state
   * - Uploading first means blockchain submission is instant after IPFS completes
   */
  const onFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await upload(file);
    if (result) toast.success("Document uploaded to IPFS ✓");
  };

  const onBlockchainSubmit = async () => {
    if (!contract || !cid) {
      toast.error("Upload document first and connect wallet");
      return;
    }

    const values = form.getValues();
    const locationStr = `${values.address}, ${values.city}, ${values.state} ${values.pincode}`;

    try {
      setTxStatus("pending");
      const tx = await contract.registerProperty(
        values.surveyNumber,
        locationStr,
        values.area,
        cid,
        PROPERTY_TYPES.indexOf(values.propertyType),
        values.description || ""
      );

      setTxHash(tx.hash);
      toast.loading("Transaction submitted, awaiting confirmation...", { id: "tx-pending" });

      const receipt = await tx.wait(1);
      toast.dismiss("tx-pending");
      setTxStatus(receipt?.status === 1 ? "confirmed" : "failed");

      if (receipt?.status === 1) {
        let newId = 0;
        for (const log of receipt.logs) {
          const l = log as { topics?: string[] };
          if (l.topics?.[0]?.toLowerCase().includes("propertyregistered")) {
            const idHex = l.topics?.[1];
            if (idHex) newId = parseInt(idHex, 16);
            break;
          }
        }
        setPropertyId(newId);

        await api.post("/properties/register", {
          surveyNumber: values.surveyNumber,
          location: { address: values.address, city: values.city, state: values.state, pincode: values.pincode },
          area: values.area,
          propertyType: values.propertyType,
          description: values.description || "",
          ipfsCid: cid,
          ipfsGatewayUrl: undefined,
          blockchainPropertyId: newId,
          blockchainTxHash: receipt.hash,
        });

        toast.success("Property registered on blockchain ✓");
      }
    } catch (err: unknown) {
      setTxStatus("failed");
      toast.dismiss("tx-pending");
      toast.error((err as Error).message);
    }
  };

  if (txStatus === "confirmed" && propertyId) {
    const blockExplorerUrl = import.meta.env.VITE_BLOCK_EXPLORER_URL || "https://sepolia.etherscan.io";
    const isLocal = import.meta.env.VITE_CHAIN_ID === "31337";
    const explorerLink = txHash && !isLocal ? `${blockExplorerUrl}/tx/${txHash}` : "#";

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-surface rounded-xl p-8 max-w-md w-full text-center border border-emerald-500/20">
          <h2 className="text-2xl font-bold text-emerald-400 mb-2">Property #{propertyId} successfully registered on blockchain</h2>
          <p className="text-gray-400 mb-4">Your property is now permanently recorded.</p>

          {txHash && (
            <div className="mb-6 p-3 bg-background rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Transaction Hash</p>
              {explorerLink !== "#" ? (
                <a
                  href={explorerLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-accent hover:underline font-mono text-sm break-all"
                >
                  {txHash.slice(0, 10)}...{txHash.slice(-8)} <ExternalLink size={14} />
                </a>
              ) : (
                <p className="font-mono text-sm text-gray-400 break-all">{txHash}</p>
              )}
            </div>
          )}

          <div className="space-y-3">
            <Link
              to={`/properties/${propertyId}`}
              className="block w-full py-3 bg-accent hover:bg-emerald-500 text-primary font-semibold rounded-lg transition-colors"
            >
              View Property
            </Link>
            <button
              onClick={() => navigate("/dashboard")}
              className="block w-full py-3 bg-surface border border-gray-700 text-white font-medium rounded-lg hover:bg-gray-800"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-8">Register Property</h1>

      {step === 1 && (
        <form onSubmit={form.handleSubmit(() => setStep(2))} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Survey Number</label>
            <input {...form.register("surveyNumber")} className="w-full px-4 py-3 bg-surface border border-gray-700 rounded-lg text-white" />
            {form.formState.errors.surveyNumber && <p className="text-red-400 text-sm">{form.formState.errors.surveyNumber.message}</p>}
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Address</label>
            <input {...form.register("address")} className="w-full px-4 py-3 bg-surface border border-gray-700 rounded-lg text-white" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">City</label>
              <input {...form.register("city")} className="w-full px-4 py-3 bg-surface border border-gray-700 rounded-lg text-white" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">State</label>
              <input {...form.register("state")} className="w-full px-4 py-3 bg-surface border border-gray-700 rounded-lg text-white" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Pincode</label>
            <input {...form.register("pincode")} className="w-full px-4 py-3 bg-surface border border-gray-700 rounded-lg text-white" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Area (sq ft)</label>
            <input
              type="number"
              {...form.register("area", { valueAsNumber: true })}
              className="w-full px-4 py-3 bg-surface border border-gray-700 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Type</label>
            <select {...form.register("propertyType")} className="w-full px-4 py-3 bg-surface border border-gray-700 rounded-lg text-white">
              {PROPERTY_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <textarea {...form.register("description")} className="w-full px-4 py-3 bg-surface border border-gray-700 rounded-lg text-white" rows={3} />
          </div>
          <button type="submit" className="w-full py-3 bg-accent text-primary font-semibold rounded-lg">
            Next: Upload Document
          </button>
        </form>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) upload(f);
            }}
            className="border-2 border-dashed border-gray-700 rounded-lg p-12 text-center hover:border-accent/50 transition-colors"
          >
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={onFileSelect}
              className="hidden"
              id="doc-upload"
            />
            <label htmlFor="doc-upload" className="cursor-pointer block">
              {isUploading ? (
                <div>
                  <p className="text-accent font-medium">Uploading... {uploadProgress}%</p>
                  <div className="mt-3 h-2 bg-gray-700 rounded-full overflow-hidden max-w-xs mx-auto">
                    <div className="h-full bg-accent transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              ) : cid ? (
                <div>
                  <p className="text-emerald-400 font-medium">Document uploaded ✓</p>
                  <p className="text-sm text-gray-500 mt-1 font-mono">CID: {cid.slice(0, 16)}...{cid.slice(-8)}</p>
                </div>
              ) : (
                <p className="text-gray-400">Drag & drop or click to upload PDF/JPG/PNG (max 10MB)</p>
              )}
            </label>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setStep(1)} className="flex-1 py-3 bg-surface border border-gray-700 rounded-lg text-white">
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={!cid}
              className="flex-1 py-3 bg-accent text-primary font-semibold rounded-lg disabled:opacity-50"
            >
              Next: Submit on Blockchain
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="p-4 bg-surface rounded-lg text-sm text-gray-400 border border-gray-800">
            <p className="text-white font-medium mb-2">Summary</p>
            <p>Survey: {form.watch("surveyNumber")}</p>
            <p>Location: {form.watch("address")}, {form.watch("city")}, {form.watch("state")} {form.watch("pincode")}</p>
            <p>Area: {form.watch("area")} sq ft</p>
            <p>Type: {form.watch("propertyType")}</p>
            <p className="font-mono text-accent mt-2">CID: {cid}</p>
          </div>

          {txStatus !== "idle" && (
            <TransactionStatus txHash={txHash} status={txStatus === "idle" ? "pending" : txStatus} />
          )}

          <button
            onClick={onBlockchainSubmit}
            disabled={!cid || !contract || txStatus === "pending"}
            className="w-full py-3 bg-accent text-primary font-semibold rounded-lg disabled:opacity-50"
          >
            {txStatus === "pending" ? "Transaction submitted, awaiting confirmation..." : "Register on Blockchain"}
          </button>
        </div>
      )}
    </div>
  );
}
