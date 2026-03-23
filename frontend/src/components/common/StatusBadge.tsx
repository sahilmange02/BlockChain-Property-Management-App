import type { PropertyStatus } from "../../types";

const CONFIG: Record<PropertyStatus, { label: string; className: string }> = {
  PENDING_VERIFICATION: { label: "Pending Verification", className: "bg-yellow-900 text-yellow-300" },
  VERIFIED: { label: "Verified", className: "bg-green-900 text-green-300" },
  REJECTED: { label: "Rejected", className: "bg-red-900 text-red-300" },
  TRANSFER_PENDING: { label: "Transfer Pending", className: "bg-blue-900 text-blue-300" },
};

export default function StatusBadge({ status }: { status: PropertyStatus }) {
  const { label, className } = CONFIG[status] || { label: status, className: "bg-gray-700 text-gray-300" };
  return (
    <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${className}`}>
      {label}
    </span>
  );
}

