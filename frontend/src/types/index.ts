export type Role = "CITIZEN" | "GOVERNMENT" | "ADMIN";
export type KycStatus = "PENDING" | "VERIFIED" | "REJECTED";
export type PropertyStatus = "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED" | "TRANSFER_PENDING";
export type PropertyType = "RESIDENTIAL" | "COMMERCIAL" | "AGRICULTURAL" | "INDUSTRIAL";

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  walletAddress?: string;
  isVerified?: boolean;
  kycStatus?: KycStatus;
  createdAt?: string;
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
  propertyType: PropertyType;
  description: string;
  ipfsCid: string;
  ipfsGatewayUrl?: string;
  ownerWallet: string;
  status: PropertyStatus;
  blockchainTxHash: string;
  registrationDate?: string;
  images?: PropertyImage[];
}

export interface Transfer {
  _id: string;
  propertyId: number;
  fromOwnerWallet: string;
  toOwnerWallet: string;
  blockchainTxHash?: string;
  blockchainTransferId?: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  confirmedAt?: string;
  createdAt?: string;
}

export interface AuditEntry {
  _id?: string;
  eventType: string;
  propertyId: number;
  fromAddress?: string;
  toAddress?: string;
  txHash: string;
  blockNumber: number;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface PropertiesListResponse {
  success: boolean;
  properties: Property[];
  total: number;
  page: number;
  pages: number;
}

export interface PropertySearchResponse {
  success: boolean;
  property: Property;
}

export interface PropertyDetailResponse {
  success: boolean;
  property: Property;
  onChain: unknown;
  audit: AuditEntry[];
}

export interface PaginatedUsersResponse {
  success: boolean;
  users: Array<{ name: string; email: string; role: string; kycStatus?: string; isVerified?: boolean; walletAddress?: string; createdAt?: string }>;
  total: number;
  page: number;
  pages: number;
}

export interface AdminAnalyticsResponse {
  success: boolean;
  totalProperties: number;
  pendingVerifications: number;
  totalTransfers: number;
  propertiesByType: Record<string, number>;
  propertiesByStatus: Record<string, number>;
  recentActivity: AuditEntry[];
}

