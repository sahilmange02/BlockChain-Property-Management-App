import "dotenv/config";
import crypto from "crypto";

import mongoose from "mongoose";
import { connectDB } from "../config/database.js";
import User, { hashSensitiveData } from "../models/User.js";
import Property from "../models/Property.js";
import Transfer from "../models/Transfer.js";
import AuditLog from "../models/AuditLog.js";

function makeTxHash(seed: string): string {
  // Creates a deterministic 32-byte sha256 -> 0x... string.
  const hex = crypto.createHash("sha256").update(seed).digest("hex");
  return `0x${hex}`;
}

function mockDocDataUrl(title: string): string {
  // Using data: URLs keeps "View document" working without real IPFS/Pinata uploads.
  return `data:text/plain;charset=utf-8,${encodeURIComponent(title)}`;
}

async function upsertCitizen(data: {
  name: string;
  email: string;
  phone: number;
  password: string;
  // Seed values: we will auto-adjust Aadhaar/PAN if hashes collide.
  aadhaarNumberBase: string;
  panPrefix: string;
  panDigitsBase: number;
  panLastBaseIndex?: number; // 0..25
  walletAddress?: string;
  isVerified: boolean;
  kycStatus: "PENDING" | "VERIFIED" | "REJECTED";
}): Promise<{ created: boolean; email: string }> {
  const email = data.email.toLowerCase();
  const existing = await User.findOne({ email }).lean();
  if (existing) return { created: false, email };

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const panLastBaseIndex = data.panLastBaseIndex ?? 0;
  const aadhaarBaseInt = Number(data.aadhaarNumberBase);

  if (!Number.isFinite(aadhaarBaseInt)) {
    throw new Error(`Invalid aadhaarNumberBase for ${email}`);
  }
  if (!/^[A-Z]{5}$/.test(data.panPrefix)) {
    throw new Error(`Invalid panPrefix for ${email}: ${data.panPrefix}`);
  }

  let created = false;
  for (let i = 0; i < 5000; i += 1) {
    const aadhaarNumber = String(aadhaarBaseInt + i).padStart(12, "0");
    const aadhaarHash = hashSensitiveData(aadhaarNumber);
    const aadhaarExists = await User.exists({ aadhaarHash });
    if (aadhaarExists) continue;

    const panDigits = String((data.panDigitsBase + i) % 10000).padStart(4, "0");
    const panLastLetter = alphabet[(panLastBaseIndex + i) % alphabet.length];
    const panNumber = `${data.panPrefix}${panDigits}${panLastLetter}`;
    const panHash = hashSensitiveData(panNumber);
    const panExists = await User.exists({ panHash });
    if (panExists) continue;

    const user = new User({
      name: data.name,
      email,
      phone: data.phone,
      passwordHash: data.password, // model hook hashes this on save
      role: "CITIZEN",
      aadhaarHash,
      panHash,
      walletAddress: data.walletAddress,
      isVerified: data.isVerified,
      kycStatus: data.kycStatus,
    });

    await user.save();
    created = true;
    break;
  }

  if (!created) {
    throw new Error(`Could not find unique Aadhaar/PAN hashes for ${email}`);
  }

  return { created: true, email };
}

async function upsertProperty(data: {
  blockchainPropertyId: number;
  surveyNumber: string;
  ownerWallet: string;
  status: "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED" | "TRANSFER_PENDING";
  propertyType: "RESIDENTIAL" | "COMMERCIAL" | "AGRICULTURAL" | "INDUSTRIAL";
  location: { address: string; city: string; state: string; pincode: string; latitude?: number; longitude?: number };
  area: number;
  description?: string;
  ipfsCid: string;
  ipfsGatewayUrl?: string;
  blockchainTxHash: string;
  registrationDate: Date;
  lastUpdated?: Date;
}): Promise<{ created: boolean; blockchainPropertyId: number }> {
  const existing = await Property.findOne({ blockchainPropertyId: data.blockchainPropertyId }).lean();
  if (existing) return { created: false, blockchainPropertyId: data.blockchainPropertyId };

  await Property.create({
    blockchainPropertyId: data.blockchainPropertyId,
    surveyNumber: data.surveyNumber,
    location: data.location,
    area: data.area,
    propertyType: data.propertyType,
    description: data.description ?? "",
    ipfsCid: data.ipfsCid,
    ipfsGatewayUrl: data.ipfsGatewayUrl,
    ownerWallet: data.ownerWallet,
    status: data.status,
    images: [],
    registrationDate: data.registrationDate,
    lastUpdated: data.lastUpdated ?? data.registrationDate,
    blockchainTxHash: data.blockchainTxHash,
  });

  return { created: true, blockchainPropertyId: data.blockchainPropertyId };
}

async function upsertTransfer(data: {
  propertyId: number;
  fromOwnerWallet: string;
  toOwnerWallet: string;
  blockchainTxHash?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
}): Promise<{ created: boolean; propertyId: number }> {
  if (data.blockchainTxHash) {
    const existing = await Transfer.findOne({ blockchainTxHash: data.blockchainTxHash }).lean();
    if (existing) return { created: false, propertyId: data.propertyId };
  }

  await Transfer.create({
    propertyId: data.propertyId,
    fromOwnerWallet: data.fromOwnerWallet,
    toOwnerWallet: data.toOwnerWallet,
    blockchainTxHash: data.blockchainTxHash,
    status: data.status,
  });

  return { created: true, propertyId: data.propertyId };
}

async function upsertAuditLog(data: {
  eventType:
    | "PropertyRegistered"
    | "PropertyVerified"
    | "PropertyRejected"
    | "OwnershipTransferred"
    | "TransferInitiated"
    | "TransferRejected";
  propertyId: number;
  txHash: string;
  blockNumber: number;
  timestamp: Date;
  fromAddress?: string;
  toAddress?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ created: boolean; txHash: string }> {
  const existing = await AuditLog.findOne({ txHash: data.txHash }).lean();
  if (existing) return { created: false, txHash: data.txHash };

  await AuditLog.create({
    eventType: data.eventType,
    propertyId: data.propertyId,
    fromAddress: data.fromAddress,
    toAddress: data.toAddress,
    txHash: data.txHash,
    blockNumber: data.blockNumber,
    timestamp: data.timestamp,
    metadata: data.metadata,
  });

  return { created: true, txHash: data.txHash };
}

async function main() {
  await connectDB();

  // Only add new records; do not modify existing users/properties.
  const metamaskWallet = "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199".toLowerCase();

  const existingWallets = new Set<string>(
    (await User.find({ walletAddress: { $exists: true, $ne: null } }).select("walletAddress").lean()).flatMap((u) =>
      u.walletAddress ? [String(u.walletAddress).toLowerCase()] : []
    )
  );

  const walletPool = [
    metamaskWallet,
    "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
    "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc",
    "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  ].filter((w) => /^0x[a-fA-F0-9]{40}$/.test(w)).map((w) => w.toLowerCase());

  let walletPoolIdx = 0;
  const assignWallet = (preferred?: string): string | undefined => {
    if (preferred) {
      const p = preferred.toLowerCase();
      if (!existingWallets.has(p)) {
        existingWallets.add(p);
        return p;
      }
    }

    while (walletPoolIdx < walletPool.length && existingWallets.has(walletPool[walletPoolIdx])) {
      walletPoolIdx += 1;
    }
    const chosen = walletPool[walletPoolIdx];
    if (!chosen) return undefined;
    existingWallets.add(chosen);
    walletPoolIdx += 1;
    return chosen;
  };

  const newCitizens = [
    {
      name: "Aarav Mehta",
      email: "citizen.seed.aarav@example.com",
      phone: 9876543210,
      password: "DemoPassword123!",
      aadhaarNumberBase: "123456789012",
      panPrefix: "ABCDE",
      panDigitsBase: 1234,
      panLastBaseIndex: 5, // 'F'
      walletAddress: assignWallet(metamaskWallet),
      isVerified: true,
      kycStatus: "VERIFIED" as const,
    },
    {
      name: "Neha Sharma",
      email: "citizen.seed.neha@example.com",
      phone: 9876501234,
      password: "DemoPassword123!",
      aadhaarNumberBase: "123456789013",
      panPrefix: "FGHIJ",
      panDigitsBase: 5678,
      panLastBaseIndex: 10, // 'K'
      walletAddress: assignWallet("0x70997970c51812dc3a010c7d01b50e0d17dc79c8"),
      isVerified: true,
      kycStatus: "VERIFIED" as const,
    },
    {
      name: "Rohit Verma",
      email: "citizen.seed.rohit@example.com",
      phone: 9876505678,
      password: "DemoPassword123!",
      aadhaarNumberBase: "123456789014",
      panPrefix: "KLMNO",
      panDigitsBase: 9012,
      panLastBaseIndex: 15, // 'P'
      walletAddress: assignWallet("0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc"),
      isVerified: false,
      kycStatus: "PENDING" as const,
    },
  ];

  let usersCreated = 0;
  for (const c of newCitizens) {
    const r = await upsertCitizen(c);
    if (r.created) usersCreated += 1;
  }

  const now = Date.now();
  const properties = [
    // Pending verification (for government)
    {
      blockchainPropertyId: 101,
      surveyNumber: "MH/GK/2026/001",
      ownerWallet: metamaskWallet,
      status: "PENDING_VERIFICATION" as const,
      propertyType: "RESIDENTIAL" as const,
      location: { address: "Flat 4B, Sunrise Towers", city: "Mumbai", state: "Maharashtra", pincode: "400077" },
      area: 850,
      description: "2BHK apartment with parking slot.",
      ipfsCid: "mock-cid-101",
      ipfsGatewayUrl: mockDocDataUrl("Mock document for MH/GK/2026/001 (CID mock-cid-101)"),
      blockchainTxHash: makeTxHash("property-101-onchain"),
      registrationDate: new Date(now - 1000 * 60 * 60 * 24 * 14),
    },
    {
      blockchainPropertyId: 102,
      surveyNumber: "MH/GK/2026/002",
      ownerWallet: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
      status: "PENDING_VERIFICATION" as const,
      propertyType: "COMMERCIAL" as const,
      location: { address: "Shop 12, Link Road", city: "Mumbai", state: "Maharashtra", pincode: "400053" },
      area: 1200,
      description: "Commercial shop unit with mezzanine.",
      ipfsCid: "mock-cid-102",
      ipfsGatewayUrl: mockDocDataUrl("Mock document for MH/GK/2026/002 (CID mock-cid-102)"),
      blockchainTxHash: makeTxHash("property-102-onchain"),
      registrationDate: new Date(now - 1000 * 60 * 60 * 24 * 10),
    },
    {
      blockchainPropertyId: 103,
      surveyNumber: "MH/GK/2026/003",
      ownerWallet: "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc",
      status: "PENDING_VERIFICATION" as const,
      propertyType: "AGRICULTURAL" as const,
      location: { address: "Survey 7/12 Land Parcel", city: "Pune", state: "Maharashtra", pincode: "411001" },
      area: 5000,
      description: "Agricultural land parcel with boundary stones.",
      ipfsCid: "mock-cid-103",
      ipfsGatewayUrl: mockDocDataUrl("Mock document for MH/GK/2026/003 (CID mock-cid-103)"),
      blockchainTxHash: makeTxHash("property-103-onchain"),
      registrationDate: new Date(now - 1000 * 60 * 60 * 24 * 7),
    },

    // Verified
    {
      blockchainPropertyId: 104,
      surveyNumber: "MH/GK/2026/004",
      ownerWallet: metamaskWallet,
      status: "VERIFIED" as const,
      propertyType: "RESIDENTIAL" as const,
      location: { address: "Block C, River View Residency", city: "Navi Mumbai", state: "Maharashtra", pincode: "410206" },
      area: 950,
      description: "Residential unit on 6th floor.",
      ipfsCid: "mock-cid-104",
      ipfsGatewayUrl: mockDocDataUrl("Mock document for MH/GK/2026/004 (CID mock-cid-104)"),
      blockchainTxHash: makeTxHash("property-104-onchain"),
      registrationDate: new Date(now - 1000 * 60 * 60 * 24 * 22),
    },
    {
      blockchainPropertyId: 105,
      surveyNumber: "MH/GK/2026/005",
      ownerWallet: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
      status: "VERIFIED" as const,
      propertyType: "INDUSTRIAL" as const,
      location: { address: "Industrial Shed 18", city: "Thane", state: "Maharashtra", pincode: "400607" },
      area: 2200,
      description: "Industrial shed with loading bay access.",
      ipfsCid: "mock-cid-105",
      ipfsGatewayUrl: mockDocDataUrl("Mock document for MH/GK/2026/005 (CID mock-cid-105)"),
      blockchainTxHash: makeTxHash("property-105-onchain"),
      registrationDate: new Date(now - 1000 * 60 * 60 * 24 * 28),
    },
    {
      blockchainPropertyId: 106,
      surveyNumber: "MH/GK/2026/006",
      ownerWallet: "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc",
      status: "VERIFIED" as const,
      propertyType: "COMMERCIAL" as const,
      location: { address: "Unit 2A, Market Square", city: "Nagpur", state: "Maharashtra", pincode: "440001" },
      area: 780,
      description: "Retail unit with storage room.",
      ipfsCid: "mock-cid-106",
      ipfsGatewayUrl: mockDocDataUrl("Mock document for MH/GK/2026/006 (CID mock-cid-106)"),
      blockchainTxHash: makeTxHash("property-106-onchain"),
      registrationDate: new Date(now - 1000 * 60 * 60 * 24 * 31),
    },

    // Rejected (for filters)
    {
      blockchainPropertyId: 107,
      surveyNumber: "MH/GK/2026/007",
      ownerWallet: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
      status: "REJECTED" as const,
      propertyType: "RESIDENTIAL" as const,
      location: { address: "Apt 19B, Lakeside Apartments", city: "Mumbai", state: "Maharashtra", pincode: "400090" },
      area: 700,
      description: "Rejected due to document mismatch (mock).",
      ipfsCid: "mock-cid-107",
      ipfsGatewayUrl: mockDocDataUrl("Mock document for MH/GK/2026/007 (CID mock-cid-107)"),
      blockchainTxHash: makeTxHash("property-107-onchain"),
      registrationDate: new Date(now - 1000 * 60 * 60 * 24 * 5),
    },

    // Transfer pending
    {
      blockchainPropertyId: 108,
      surveyNumber: "MH/GK/2026/008",
      ownerWallet: metamaskWallet,
      status: "TRANSFER_PENDING" as const,
      propertyType: "RESIDENTIAL" as const,
      location: { address: "Flat 9C, Cedar Heights", city: "Pune", state: "Maharashtra", pincode: "411027" },
      area: 1020,
      description: "Transfer request initiated (mock).",
      ipfsCid: "mock-cid-108",
      ipfsGatewayUrl: mockDocDataUrl("Mock document for MH/GK/2026/008 (CID mock-cid-108)"),
      blockchainTxHash: makeTxHash("property-108-onchain"),
      registrationDate: new Date(now - 1000 * 60 * 60 * 24 * 3),
    },
  ];

  let propertiesCreated = 0;
  for (const p of properties) {
    const r = await upsertProperty(p);
    if (r.created) propertiesCreated += 1;
  }

  // One pending transfer for government dashboard
  const transfer = {
    propertyId: 108,
    fromOwnerWallet: metamaskWallet,
    toOwnerWallet: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
    blockchainTxHash: makeTxHash("transfer-108-pending"),
    status: "PENDING" as const,
  };

  const transferResult = await upsertTransfer(transfer);

  // Audit timeline entries (admin property detail)
  const auditBase = 1000; // arbitrary mock "blockNumber"
  const auditEntries = [
    { propertyId: 101, eventType: "PropertyRegistered", seed: "101-reg", from: undefined, to: undefined },
    // Property 101 is still pending in Mongo status, so only "registered" is added.

    { propertyId: 102, eventType: "PropertyRegistered", seed: "102-reg", from: undefined, to: undefined },

    { propertyId: 103, eventType: "PropertyRegistered", seed: "103-reg", from: undefined, to: undefined },

    { propertyId: 104, eventType: "PropertyRegistered", seed: "104-reg", from: undefined, to: undefined },
    { propertyId: 104, eventType: "PropertyVerified", seed: "104-verified", from: undefined, to: undefined },

    { propertyId: 105, eventType: "PropertyRegistered", seed: "105-reg", from: undefined, to: undefined },
    { propertyId: 105, eventType: "PropertyVerified", seed: "105-verified", from: undefined, to: undefined },
    { propertyId: 105, eventType: "OwnershipTransferred", seed: "105-transfer", from: metamaskWallet, to: transfer.toOwnerWallet },

    { propertyId: 106, eventType: "PropertyRegistered", seed: "106-reg", from: undefined, to: undefined },
    { propertyId: 106, eventType: "PropertyVerified", seed: "106-verified", from: undefined, to: undefined },

    { propertyId: 107, eventType: "PropertyRegistered", seed: "107-reg", from: undefined, to: undefined },
    { propertyId: 107, eventType: "PropertyRejected", seed: "107-rejected", from: undefined, to: undefined },

    { propertyId: 108, eventType: "PropertyRegistered", seed: "108-reg", from: undefined, to: undefined },
    { propertyId: 108, eventType: "TransferInitiated", seed: "108-transfer-init", from: transfer.fromOwnerWallet, to: transfer.toOwnerWallet },
  ];

  let auditCreated = 0;
  for (const e of auditEntries) {
    const txHash = makeTxHash(e.seed);
    const created = await upsertAuditLog({
      eventType: e.eventType as any,
      propertyId: e.propertyId,
      txHash,
      blockNumber: auditBase + e.propertyId,
      timestamp: new Date(now - 1000 * 60 * 60 * 24 * (auditEntries.length + e.propertyId)),
      fromAddress: e.from,
      toAddress: e.to,
      metadata: { mock: true },
    });
    if (created.created) auditCreated += 1;
  }

  console.log("✅ Mock seed completed");
  console.log(`- Users created: ${usersCreated}`);
  console.log(`- Properties created: ${propertiesCreated}`);
  console.log(`- Transfer created: ${transferResult.created ? "yes" : "no"}`);
  console.log(`- Audit logs created: ${auditCreated}`);
}

main()
  .catch((err) => {
    console.error("❌ Mock seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    // Ensure the script process exits even if server is running.
    await mongoose.connection.close().catch(() => {});
  });

