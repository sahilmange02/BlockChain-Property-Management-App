/*
 * IPFS CONFIG — Using Pinata (online IPFS service)
 * =================================================
 * IPFS EXPLAINED:
 * Pinata is an online service that stores files on IPFS for you.
 * Instead of running your own IPFS node, Pinata does it in the cloud.
 *
 * HOW IT WORKS:
 * 1. You upload a file to Pinata via their API
 * 2. Pinata stores the file on IPFS and gives you a CID (fingerprint)
 * 3. You store that CID on the blockchain
 * 4. Anyone can view the file at: https://gateway.pinata.cloud/ipfs/{CID}
 *
 * FREE TIER: 1GB storage, 100 files — more than enough for this project.
 * Sign up at: https://app.pinata.cloud/register
 */

import FormData from "form-data";
import axios from "axios";

// Load Pinata credentials from .env file
const PINATA_API_KEY        = process.env.PINATA_API_KEY || "";
const PINATA_SECRET_API_KEY = process.env.PINATA_SECRET_API_KEY || "";
const GATEWAY_URL           = process.env.IPFS_GATEWAY_URL || "https://gateway.pinata.cloud";

// File validation rules
const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export interface IPFSUploadResult {
  cid:        string;  // The unique fingerprint — this gets stored on the blockchain
  size:       number;  // File size in bytes
  gatewayUrl: string;  // Full URL to view the file in a browser
}

/**
 * Upload a file to Pinata IPFS.
 * Returns the CID (fingerprint) that gets stored on the blockchain.
 */
export async function uploadToIPFS(
  fileBuffer: Buffer,
  filename:   string,
  mimeType:   string
): Promise<IPFSUploadResult> {

  // Validate file type
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error(`File type not allowed: ${mimeType}. Allowed: PDF, JPG, PNG`);
  }

  // Validate file size
  if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File too large: ${(fileBuffer.length / 1024 / 1024).toFixed(2)}MB. Max: 10MB`);
  }

  // Check credentials are set
  if (!PINATA_API_KEY || !PINATA_SECRET_API_KEY) {
    throw new Error("Pinata credentials not set in .env (PINATA_API_KEY, PINATA_SECRET_API_KEY)");
  }

  // Build multipart form data for Pinata API
  const form = new FormData();

  // Append the actual file
  form.append("file", fileBuffer, {
    filename:    filename,
    contentType: mimeType,
  });

  // Append metadata (shows in your Pinata dashboard for easy management)
  form.append(
    "pinataMetadata",
    JSON.stringify({
      name: filename,
      keyvalues: {
        project:   "blockchain-land-registry",
        uploadedAt: new Date().toISOString(),
      },
    })
  );

  // Pinata options — cidVersion 0 gives the classic "Qm..." format
  form.append(
    "pinataOptions",
    JSON.stringify({ cidVersion: 0 })
  );

  try {
    // Send to Pinata API
    const response = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      form,
      {
        headers: {
          ...form.getHeaders(),
          pinata_api_key:        PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_API_KEY,
        },
        maxBodyLength: Infinity, // Allow large files
        maxContentLength: Infinity,
        timeout: 60000, // 60 second timeout
      }
    );

    const cid = response.data.IpfsHash;
    const gatewayUrl = `${GATEWAY_URL}/ipfs/${cid}`;

    console.log(`✅ File uploaded to Pinata IPFS`);
    console.log(`   CID: ${cid}`);
    console.log(`   URL: ${gatewayUrl}`);

    return {
      cid,
      size: fileBuffer.length,
      gatewayUrl,
    };

  } catch (error: any) {
    // Give a helpful error message
    if (error.response?.status === 401) {
      throw new Error("Pinata authentication failed. Check PINATA_API_KEY and PINATA_SECRET_API_KEY in .env");
    }
    if (error.response?.status === 429) {
      throw new Error("Pinata rate limit exceeded. Try again in a moment.");
    }
    throw new Error(`Pinata upload failed: ${error.response?.data?.error || error.message}`);
  }
}

/**
 * Check if Pinata credentials are valid.
 * Used by the /ready health endpoint.
 */
export async function checkIPFSHealth(): Promise<boolean> {
  try {
    if (!PINATA_API_KEY || !PINATA_SECRET_API_KEY) return false;

    const response = await axios.get(
      "https://api.pinata.cloud/data/testAuthentication",
      {
        headers: {
          pinata_api_key:        PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_API_KEY,
        },
        timeout: 5000,
      }
    );

    return response.data.message === "Congratulations! You are communicating with the Pinata API!";
  } catch {
    return false;
  }
}

/**
 * Helper: build a gateway URL from a CID.
 * Use this anywhere you need to display a link to an IPFS file.
 */
export function getGatewayUrl(cid: string): string {
  return `${GATEWAY_URL}/ipfs/${cid}`;
}
