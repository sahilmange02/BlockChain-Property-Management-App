/*
 * BLOCKCHAIN SERVICE
 * ===================
 * Connects the backend to the Ethereum blockchain for:
 * - Reading property data (getPropertyDetails, getOwnerProperties)
 * - Verifying transactions (getTransactionReceipt)
 * - Syncing blockchain events to MongoDB (syncEventToDatabase)
 *
 * Events are parsed using contract.interface.parseLog() and dispatched
 * to update AuditLog and Property collections.
 */
import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import AuditLog from "../models/AuditLog.js";
import Property from "../models/Property.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const contractPath = path.join(__dirname, "../contracts/PropertyRegistry.json");
const contractArtifact = JSON.parse(fs.readFileSync(contractPath, "utf-8"));

export interface PropertyDetails {
  propertyId: string;
  surveyNumber: string;
  location: string;
  areaInSqFt: string;
  currentOwner: string;
  ipfsDocumentHash: string;
  isVerified: boolean;
  registrationTimestamp: Date;
  propertyType: string;
}

export class BlockchainService {
  private provider!: ethers.JsonRpcProvider;
  private contract!: ethers.Contract;
  private isListening = false;

  constructor() {
    this.connect();
  }

  private connect(): void {
    const rpcUrl = process.env.LOCAL_RPC_URL || process.env.SEPOLIA_RPC_URL || "http://127.0.0.1:8545";
    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    const contractAddress = process.env.CONTRACT_ADDRESS_LOCAL || process.env.CONTRACT_ADDRESS_SEPOLIA || "";

    if (!contractAddress) {
      console.warn("⚠️  No contract address set! Run deploy:local and sync-abi first.");
      return;
    }

    this.contract = new ethers.Contract(contractAddress, contractArtifact.abi, this.provider);
    console.log(`⛓️  Blockchain service connected to: ${rpcUrl}`);
    console.log(`📜 Contract address: ${contractAddress}`);
  }

  async getPropertyDetails(id: number): Promise<PropertyDetails> {
    if (!this.contract) throw new Error("Contract not initialized");
    const result = await this.contract.getPropertyDetails(id);
    return {
      propertyId: result.propertyId.toString(),
      surveyNumber: result.surveyNumber,
      location: result.location,
      areaInSqFt: result.areaInSqFt.toString(),
      currentOwner: result.currentOwner,
      ipfsDocumentHash: result.ipfsDocumentHash,
      isVerified: result.isVerified,
      registrationTimestamp: new Date(Number(result.registrationTimestamp) * 1000),
      propertyType: ["RESIDENTIAL", "COMMERCIAL", "AGRICULTURAL", "INDUSTRIAL"][Number(result.propertyType)] ?? "RESIDENTIAL",
    };
  }

  async getOwnerProperties(address: string): Promise<number[]> {
    if (!this.contract) throw new Error("Contract not initialized");
    const ids = await this.contract.getOwnerProperties(address);
    return ids.map((id: bigint) => Number(id));
  }

  async getTransactionReceipt(txHash: string): Promise<ethers.TransactionReceipt | null> {
    try {
      return await this.provider.getTransactionReceipt(txHash);
    } catch {
      return null;
    }
  }

  async syncEventToDatabase(log: ethers.Log): Promise<void> {
    if (!this.contract) return;

    try {
      const parsed = this.contract.interface.parseLog({
        topics: log.topics as string[],
        data: log.data,
      });

      if (!parsed) return;

      const { name, args } = parsed;

      if (name === "PropertyRegistered") {
        const [propertyId, owner, , propertyType, timestamp] = args;
        await AuditLog.create({
          eventType: "PropertyRegistered",
          propertyId: Number(propertyId),
          fromAddress: owner,
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          timestamp: new Date(Number(timestamp) * 1000),
          metadata: { propertyType: Number(propertyType) },
        });
        console.log(`📝 Synced: PropertyRegistered #${propertyId}`);
      } else if (name === "PropertyVerified") {
        const [propertyId, verifiedBy, timestamp] = args;
        await Property.findOneAndUpdate(
          { blockchainPropertyId: Number(propertyId) },
          { status: "VERIFIED" }
        );
        await AuditLog.create({
          eventType: "PropertyVerified",
          propertyId: Number(propertyId),
          fromAddress: verifiedBy,
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          timestamp: new Date(Number(timestamp) * 1000),
        });
        console.log(`✅ Synced: PropertyVerified #${propertyId}`);
      } else if (name === "OwnershipTransferred") {
        const [transferId, propertyId, oldOwner, newOwner, timestamp] = args;
        await Property.findOneAndUpdate(
          { blockchainPropertyId: Number(propertyId) },
          { ownerWallet: newOwner, status: "VERIFIED" }
        );
        await AuditLog.create({
          eventType: "OwnershipTransferred",
          propertyId: Number(propertyId),
          fromAddress: oldOwner,
          toAddress: newOwner,
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          timestamp: new Date(Number(timestamp) * 1000),
          metadata: { transferId: Number(transferId) },
        });
        console.log(`🔄 Synced: OwnershipTransferred #${propertyId} → ${newOwner}`);
      }
    } catch (err) {
      console.error("Failed to sync event:", err);
    }
  }

  startEventListening(): void {
    if (this.isListening || !this.contract) return;
    this.isListening = true;
    console.log("👂 Listening for blockchain events...");

    this.contract.on(
      "PropertyRegistered",
      async (propertyId: bigint, owner: string, _surveyNumber: string, propertyType: bigint, timestamp: bigint, event: { log: { transactionHash: string; blockNumber: number } }) => {
        await AuditLog.create({
          eventType: "PropertyRegistered",
          propertyId: Number(propertyId),
          fromAddress: owner,
          txHash: event.log.transactionHash,
          blockNumber: event.log.blockNumber,
          timestamp: new Date(Number(timestamp) * 1000),
          metadata: { propertyType: Number(propertyType) },
        }).catch(console.error);
      }
    );

    this.contract.on(
      "PropertyVerified",
      async (propertyId: bigint, verifiedBy: string, timestamp: bigint, event: { log: { transactionHash: string; blockNumber: number } }) => {
        await Property.findOneAndUpdate(
          { blockchainPropertyId: Number(propertyId) },
          { status: "VERIFIED" }
        );
        await AuditLog.create({
          eventType: "PropertyVerified",
          propertyId: Number(propertyId),
          fromAddress: verifiedBy,
          txHash: event.log.transactionHash,
          blockNumber: event.log.blockNumber,
          timestamp: new Date(Number(timestamp) * 1000),
        }).catch(console.error);
      }
    );

    this.contract.on(
      "OwnershipTransferred",
      async (transferId: bigint, propertyId: bigint, oldOwner: string, newOwner: string, timestamp: bigint, event: { log: { transactionHash: string; blockNumber: number } }) => {
        await Property.findOneAndUpdate(
          { blockchainPropertyId: Number(propertyId) },
          { ownerWallet: newOwner, status: "VERIFIED" }
        );
        await AuditLog.create({
          eventType: "OwnershipTransferred",
          propertyId: Number(propertyId),
          fromAddress: oldOwner,
          toAddress: newOwner,
          txHash: event.log.transactionHash,
          blockNumber: event.log.blockNumber,
          timestamp: new Date(Number(timestamp) * 1000),
          metadata: { transferId: Number(transferId) },
        }).catch(console.error);
      }
    );

    this.provider.on("error", () => {
      console.error("⚡ Blockchain provider error. Reconnecting in 5s...");
      this.isListening = false;
      setTimeout(() => {
        this.connect();
        this.startEventListening();
      }, 5000);
    });
  }

  async checkHealth(): Promise<boolean> {
    try {
      const blockNumber = await this.provider.getBlockNumber();
      return blockNumber >= 0;
    } catch {
      return false;
    }
  }
}

export const blockchainService = new BlockchainService();
