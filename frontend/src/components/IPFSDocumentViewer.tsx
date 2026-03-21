/*
 * IPFS DOCUMENT VIEWER
 * =====================
 * IPFS EXPLAINED:
 * When you click "View Document", we open the IPFS gateway URL in a new tab.
 *
 * The gateway URL format:
 * https://gateway.pinata.cloud/ipfs/{CID}
 *
 * Pinata's public gateway translates the CID into the actual file content.
 * Anyone can view files — no account needed.
 *
 * TAMPER-PROOF VERIFICATION:
 * The CID stored on the blockchain is a cryptographic hash of the file.
 * If anyone changes the file on IPFS, the CID would be different,
 * and it wouldn't match what's stored on the blockchain.
 * This is how we know a document hasn't been tampered with.
 */
import { ExternalLink, FileText } from "lucide-react";
import { getIPFSGatewayUrl } from "@/services/api";

interface Props {
  cid: string;
  filename?: string;
  label?: string;
}

export function IPFSDocumentViewer({
  cid,
  filename = "",
  label = "View Document",
}: Props) {
  const url = getIPFSGatewayUrl(cid, filename);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-md text-sm transition-colors"
      title={`IPFS CID: ${cid}`}
    >
      <FileText size={14} />
      {label}
      <ExternalLink size={12} />
    </a>
  );
}

export function IPFSCIDBadge({ cid }: { cid: string }) {
  const copyToClipboard = () => navigator.clipboard.writeText(cid);
  return (
    <div className="font-mono text-xs text-gray-400 flex items-center gap-2">
      <span title="IPFS Content Identifier — the file's unique fingerprint">
        CID: {cid.slice(0, 20)}...{cid.slice(-6)}
      </span>
      <button onClick={copyToClipboard} className="hover:text-white">
        📋
      </button>
    </div>
  );
}
