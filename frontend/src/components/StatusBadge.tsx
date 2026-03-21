import { PropertyStatus } from "@/types";

const statusStyles: Record<string, string> = {
  PENDING_VERIFICATION: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  VERIFIED: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  REJECTED: "bg-red-500/20 text-red-400 border-red-500/30",
  TRANSFER_PENDING: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

interface Props {
  status: string;
}

export function StatusBadge({ status }: Props) {
  const style = statusStyles[status] || "bg-gray-500/20 text-gray-400 border-gray-500/30";
  const label = status.replace(/_/g, " ");

  return (
    <span
      className={`inline-flex px-2 py-0.5 text-xs font-medium rounded border ${style}`}
    >
      {label}
    </span>
  );
}
