// Minimal ABI (functions + events) required by this frontend.
// This matches the Solidity contract in `contracts/contracts/PropertyRegistry.sol`.
export const propertyRegistryAbi = [
  {
    type: "function",
    name: "registerProperty",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_surveyNumber", type: "string" },
      { name: "_location", type: "string" },
      { name: "_areaInSqFt", type: "uint256" },
      { name: "_ipfsHash", type: "string" },
      { name: "_propertyType", type: "uint8" },
      { name: "_description", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "verifyProperty",
    stateMutability: "nonpayable",
    inputs: [{ name: "_propertyId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "initiateTransfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_propertyId", type: "uint256" },
      { name: "_newOwner", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "approveTransfer",
    stateMutability: "nonpayable",
    inputs: [{ name: "_transferId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getPendingTransfer",
    stateMutability: "view",
    inputs: [{ name: "_propertyId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        name: "",
        components: [
          { name: "transferId", type: "uint256" },
          { name: "propertyId", type: "uint256" },
          { name: "fromOwner", type: "address" },
          { name: "toOwner", type: "address" },
          { name: "requestTimestamp", type: "uint256" },
          { name: "isApproved", type: "bool" },
          { name: "isRejected", type: "bool" },
          { name: "rejectionReason", type: "string" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getPropertyDetails",
    stateMutability: "view",
    inputs: [{ name: "_propertyId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        name: "",
        components: [
          { name: "propertyId", type: "uint256" },
          { name: "surveyNumber", type: "string" },
          { name: "location", type: "string" },
          { name: "areaInSqFt", type: "uint256" },
          { name: "currentOwner", type: "address" },
          { name: "ipfsDocumentHash", type: "string" },
          { name: "isVerified", type: "bool" },
          { name: "registrationTimestamp", type: "uint256" },
          { name: "propertyType", type: "uint8" },
          { name: "description", type: "string" },
        ],
      },
    ],
  },
  {
    type: "event",
    name: "PropertyRegistered",
    anonymous: false,
    inputs: [
      { indexed: true, name: "propertyId", type: "uint256" },
      { indexed: true, name: "owner", type: "address" },
      { indexed: false, name: "surveyNumber", type: "string" },
      { indexed: false, name: "propertyType", type: "uint8" },
      { indexed: false, name: "timestamp", type: "uint256" },
    ],
  },
];

