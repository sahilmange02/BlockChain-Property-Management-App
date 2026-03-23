import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { adminApi } from "../api/admin.api";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { Loader } from "lucide-react";

type Tab = "users" | "analytics" | "audit";

export default function AdminPanel() {
  const [tab, setTab] = useState<Tab>("users");

  const [auditEventType, setAuditEventType] = useState("");
  const [auditPropertyId, setAuditPropertyId] = useState("");
  const [applied, setApplied] = useState<{ eventType?: string; propertyId?: number; page: number; limit: number }>({
    eventType: undefined,
    propertyId: undefined,
    page: 1,
    limit: 20,
  });

  const usersQuery = useQuery({
    queryKey: ["admin", "users", 1, 10],
    queryFn: () => adminApi.getUsers(1, 10),
    enabled: tab === "users",
  });

  const analyticsQuery = useQuery({
    queryKey: ["admin", "analytics"],
    queryFn: adminApi.getAnalytics,
    enabled: tab === "analytics",
  });

  const auditQuery = useQuery({
    queryKey: ["admin", "audit-log", applied],
    queryFn: () =>
      adminApi.getAuditLog({
        page: applied.page,
        limit: applied.limit,
        eventType: applied.eventType,
        propertyId: applied.propertyId,
      }),
    enabled: tab === "audit",
  });

  const audit = auditQuery.data?.entries || [];

  const analytics = analyticsQuery.data;
  const users = usersQuery.data?.users || [];

  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    if (auditEventType) parts.push(`eventType=${auditEventType}`);
    if (auditPropertyId) parts.push(`propertyId=${auditPropertyId}`);
    return parts.length ? parts.join(" • ") : "No filters";
  }, [auditEventType, auditPropertyId]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
        <p className="text-gray-400 mt-1">Users, analytics, and audit log</p>
      </div>

      <div className="flex gap-1 bg-gray-900 p-1 rounded-lg w-fit mb-6">
        <button
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === "users" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"}`}
          onClick={() => setTab("users")}
        >
          Users
        </button>
        <button
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === "analytics" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"}`}
          onClick={() => setTab("analytics")}
        >
          Analytics
        </button>
        <button
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === "audit" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"}`}
          onClick={() => setTab("audit")}
        >
          Audit Log
        </button>
      </div>

      {tab === "users" ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {usersQuery.isLoading ? (
            <div className="p-8 text-center text-gray-400">
              <LoadingSpinner label="Loading..." />
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No users</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-800 text-gray-400 text-left">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">KYC</th>
                  <th className="px-4 py-3">Wallet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {usersQuery.data?.users.map((u) => (
                  <tr key={u.email} className="text-gray-300 hover:bg-gray-800/50">
                    <td className="px-4 py-3">{u.name}</td>
                    <td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3 font-medium">{u.role}</td>
                    <td className="px-4 py-3 text-xs">{u.kycStatus || "-"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{u.walletAddress ? `${u.walletAddress.slice(0, 10)}...` : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}

      {tab === "analytics" ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          {analyticsQuery.isLoading ? (
            <div className="text-gray-400">
              <Loader className="animate-spin" size={16} />
            </div>
          ) : analyticsQuery.error ? (
            <div className="text-red-400">Failed to load analytics.</div>
          ) : analytics ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 bg-gray-950/30 border border-gray-800 rounded-lg">
                <div className="text-gray-400 text-sm">Total Properties</div>
                <div className="text-2xl font-bold text-white">{analytics.totalProperties}</div>
              </div>
              <div className="p-4 bg-gray-950/30 border border-gray-800 rounded-lg">
                <div className="text-gray-400 text-sm">Pending Verifications</div>
                <div className="text-2xl font-bold text-white">{analytics.pendingVerifications}</div>
              </div>
              <div className="p-4 bg-gray-950/30 border border-gray-800 rounded-lg">
                <div className="text-gray-400 text-sm">Total Transfers</div>
                <div className="text-2xl font-bold text-white">{analytics.totalTransfers}</div>
              </div>

              <div className="sm:col-span-3 mt-2">
                <h2 className="text-white font-semibold mb-2">Recent Activity</h2>
                <div className="space-y-2">
                  {analytics.recentActivity.slice(0, 5).map((e) => (
                    <div key={e.txHash} className="p-3 bg-gray-950/30 border border-gray-800 rounded-lg">
                      <div className="text-white text-sm font-semibold">{e.eventType}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        propertyId={e.propertyId} • tx: <span className="font-mono text-indigo-400">{e.txHash}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "audit" ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <div className="text-gray-200 font-semibold mb-2">Filters: {filterSummary}</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                className="input-field"
                value={auditEventType}
                onChange={(e) => setAuditEventType(e.target.value)}
                placeholder="eventType (optional)"
              />
              <input
                className="input-field"
                value={auditPropertyId}
                onChange={(e) => setAuditPropertyId(e.target.value)}
                placeholder="propertyId (optional)"
              />
              <button
                className="btn-primary"
                onClick={() => {
                  const pid = auditPropertyId.trim() ? Number(auditPropertyId.trim()) : undefined;
                  setApplied({
                    eventType: auditEventType.trim() ? auditEventType.trim() : undefined,
                    propertyId: pid && Number.isFinite(pid) ? pid : undefined,
                    page: 1,
                    limit: 20,
                  });
                  toast.success("Applied filters");
                }}
              >
                Apply
              </button>
            </div>
          </div>

          {auditQuery.isLoading ? (
            <div className="p-8 text-center text-gray-400">
              <LoadingSpinner label="Loading..." />
            </div>
          ) : audit.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No audit entries.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-800 text-gray-400 text-left">
                <tr>
                  <th className="px-4 py-3">Event Type</th>
                  <th className="px-4 py-3">Property ID</th>
                  <th className="px-4 py-3">From</th>
                  <th className="px-4 py-3">To</th>
                  <th className="px-4 py-3">Tx Hash</th>
                  <th className="px-4 py-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {audit.map((e) => (
                  <tr key={e.txHash} className="text-gray-300 hover:bg-gray-800/50">
                    <td className="px-4 py-3 font-medium">{e.eventType}</td>
                    <td className="px-4 py-3 font-mono text-xs">{e.propertyId}</td>
                    <td className="px-4 py-3 font-mono text-xs">{e.fromAddress ? `${e.fromAddress.slice(0, 10)}...` : "-"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{e.toAddress ? `${e.toAddress.slice(0, 10)}...` : "-"}</td>
                    <td className="px-4 py-3 font-mono text-indigo-400 text-xs">{e.txHash.slice(0, 12)}...</td>
                    <td className="px-4 py-3 text-xs">{e.timestamp ? new Date(e.timestamp).toLocaleString() : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}
    </div>
  );
}

