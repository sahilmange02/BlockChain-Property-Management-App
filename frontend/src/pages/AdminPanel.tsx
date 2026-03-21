/*
 * ADMIN PANEL
 * ============
 * User management, full audit log, system health.
 * Audit log entries come from blockchain events synced to MongoDB.
 */
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import { BlockchainAddressBadge } from "@/components/BlockchainAddressBadge";
import { Database, Cpu, HardDrive } from "lucide-react";

const blockExplorerUrl = import.meta.env.VITE_BLOCK_EXPLORER_URL || "https://sepolia.etherscan.io";
const isLocal = import.meta.env.VITE_CHAIN_ID === "31337";

export function AdminPanel() {
  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data } = await api.get<{ users: unknown[] }>("/admin/users");
      return data.users;
    },
  });

  const { data: audit } = useQuery({
    queryKey: ["admin-audit"],
    queryFn: async () => {
      const { data } = await api.get<{ entries: unknown[] }>("/admin/audit-log?limit=50");
      return data.entries;
    },
  });

  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const base = import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000";
      const { data } = await fetch(`${base}/ready`).then((r) => r.json());
      return data;
    },
  });

  return (
    <div className="min-h-screen">
      <nav className="border-b border-gray-800 bg-primary p-4">
        <h1 className="text-xl font-bold text-white">Admin Panel</h1>
      </nav>

      <div className="max-w-6xl mx-auto p-6 space-y-8">
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">System Health</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-surface rounded-lg border border-gray-800 flex items-center gap-3">
              <Database className="w-8 h-8 text-accent" />
              <div>
                <p className="text-gray-500 text-sm">MongoDB</p>
                <p className={health?.mongodb === "connected" ? "text-emerald-400" : "text-red-400"}>
                  {health?.mongodb ?? "unknown"}
                </p>
              </div>
            </div>
            <div className="p-4 bg-surface rounded-lg border border-gray-800 flex items-center gap-3">
              <Cpu className="w-8 h-8 text-accent" />
              <div>
                <p className="text-gray-500 text-sm">Ethereum</p>
                <p className={health?.blockchain === "connected" ? "text-emerald-400" : "text-red-400"}>
                  {health?.blockchain ?? "unknown"}
                </p>
              </div>
            </div>
            <div className="p-4 bg-surface rounded-lg border border-gray-800 flex items-center gap-3">
              <HardDrive className="w-8 h-8 text-accent" />
              <div>
                <p className="text-gray-500 text-sm">IPFS</p>
                <p className={health?.ipfs === "ok" ? "text-emerald-400" : "text-red-400"}>
                  {health?.ipfs ?? "unknown"}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-4">User Management</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-500 text-sm border-b border-gray-800">
                  <th className="pb-3">Name</th>
                  <th className="pb-3">Email</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">KYC</th>
                  <th className="pb-3">Wallet</th>
                </tr>
              </thead>
              <tbody>
                {(users ?? []).map((u: unknown) => {
                  const row = u as { _id: string; name: string; email: string; role: string; kycStatus: string; walletAddress?: string };
                  return (
                  <tr key={row._id} className="border-b border-gray-800">
                    <td className="py-4">{row.name}</td>
                    <td className="py-4">{row.email}</td>
                    <td className="py-4">{row.role}</td>
                    <td className="py-4">{row.kycStatus}</td>
                    <td className="py-4">
                      {row.walletAddress ? (
                        <BlockchainAddressBadge address={row.walletAddress} showLink={false} />
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                  </tr>
                ); })}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Audit Log</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-500 text-sm border-b border-gray-800">
                  <th className="pb-3">Event</th>
                  <th className="pb-3">Property</th>
                  <th className="pb-3">From</th>
                  <th className="pb-3">To</th>
                  <th className="pb-3">TxHash</th>
                  <th className="pb-3">Time</th>
                </tr>
              </thead>
              <tbody>
                {(audit ?? []).map((e: unknown) => {
                  const evt = e as { _id: string; eventType: string; propertyId: number; fromAddress?: string; toAddress?: string; txHash: string; timestamp: string };
                  return (
                  <tr key={evt._id} className="border-b border-gray-800">
                    <td className="py-4">{evt.eventType}</td>
                    <td className="py-4">#{evt.propertyId}</td>
                    <td className="py-4 font-mono text-xs">{evt.fromAddress?.slice(0, 10)}...</td>
                    <td className="py-4 font-mono text-xs">{evt.toAddress?.slice(0, 10)}...</td>
                    <td className="py-4">
                      {evt.txHash && (
                        <a
                          href={isLocal ? "#" : `${blockExplorerUrl}/tx/${evt.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:underline font-mono text-xs"
                        >
                          {evt.txHash.slice(0, 10)}...
                        </a>
                      )}
                    </td>
                    <td className="py-4 text-sm text-gray-500">
                      {new Date(evt.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ); })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
