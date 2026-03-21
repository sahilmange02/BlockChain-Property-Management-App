export enum PropertyType {
  RESIDENTIAL = "RESIDENTIAL",
  COMMERCIAL = "COMMERCIAL",
  AGRICULTURAL = "AGRICULTURAL",
  INDUSTRIAL = "INDUSTRIAL",
}

export enum PropertyStatus {
  PENDING_VERIFICATION = "PENDING_VERIFICATION",
  VERIFIED = "VERIFIED",
  REJECTED = "REJECTED",
  TRANSFER_PENDING = "TRANSFER_PENDING",
}

export enum UserRole {
  CITIZEN = "CITIZEN",
  GOVERNMENT = "GOVERNMENT",
  ADMIN = "ADMIN",
}

export interface PropertyLocation {
  address: string;
  city: string;
  state: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
}

export interface PropertyImage {
  cid: string;
  filename: string;
  gatewayUrl?: string;
}

export interface Property {
  _id?: string;
  blockchainPropertyId: number;
  surveyNumber: string;
  location: PropertyLocation;
  area: number;
  propertyType: PropertyType | string;
  description: string;
  ipfsCid: string;
  ipfsGatewayUrl?: string;
  ownerWallet: string;
  status: PropertyStatus | string;
  images: PropertyImage[];
  registrationDate: string;
  lastUpdated?: string;
  blockchainTxHash: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole | string;
  walletAddress?: string;
  isVerified?: boolean;
  kycStatus?: string;
  createdAt?: string;
}

export interface TransferRequest {
  _id: string;
  propertyId: number;
  fromOwnerWallet: string;
  toOwnerWallet: string;
  status: string;
  blockchainTxHash?: string;
  blockchainTransferId?: number;
  createdAt: string;
}

export interface Notification {
  _id: string;
  type: string;
  message: string;
  propertyId?: number;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLog {
  _id: string;
  eventType: string;
  propertyId: number;
  fromAddress?: string;
  toAddress?: string;
  txHash: string;
  blockNumber: number;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  properties?: T[];
  users?: T[];
  transfers?: T[];
  entries?: T[];
  total: number;
  page: number;
  pages: number;
}

export interface Web3ContextType {
  connect: () => Promise<void>;
  disconnect: () => void;
  account: string | null;
  chainId: number | null;
  isConnected: boolean;
  provider: import("ethers").BrowserProvider | null;
  signer: import("ethers").Signer | null;
  contract: import("ethers").Contract | null;
  switchNetwork: () => Promise<void>;
  isWrongNetwork: boolean;
}

export interface AuthContextType {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
