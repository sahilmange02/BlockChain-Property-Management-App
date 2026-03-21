import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import { PropertyCard } from "@/components/PropertyCard";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import type { Property } from "@/types";

export function PropertyListingPage() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [city, setCity] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["properties", page, type, status, city],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "12" });
      if (type) params.set("type", type);
      if (status) params.set("status", status);
      if (city) params.set("city", city);
      const { data } = await api.get<{ properties: Property[]; total: number; pages: number }>(
        `/properties?${params}`
      );
      return data;
    },
  });

  return (
    <div className="min-h-screen">
      <nav className="border-b border-gray-800 bg-primary/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="text-xl font-bold text-white">
            PropertyChain
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/properties" className="text-accent">Properties</Link>
            <Link to="/login" className="text-gray-400 hover:text-white">Login</Link>
            <WalletConnectButton />
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">Browse Properties</h1>

        <div className="flex flex-wrap gap-4 mb-8">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="px-4 py-2 bg-surface border border-gray-700 rounded-lg text-white"
          >
            <option value="">All Types</option>
            <option value="RESIDENTIAL">Residential</option>
            <option value="COMMERCIAL">Commercial</option>
            <option value="AGRICULTURAL">Agricultural</option>
            <option value="INDUSTRIAL">Industrial</option>
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-4 py-2 bg-surface border border-gray-700 rounded-lg text-white"
          >
            <option value="">All Status</option>
            <option value="VERIFIED">Verified</option>
            <option value="PENDING_VERIFICATION">Pending</option>
          </select>
          <input
            type="text"
            placeholder="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="px-4 py-2 bg-surface border border-gray-700 rounded-lg text-white"
          />
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => <PropertyCard key={i} property={{} as Property} isLoading />)
            : (data?.properties ?? []).map((p: Property) => (
                <PropertyCard key={p._id || p.blockchainPropertyId} property={p} />
              ))}
        </div>

        {data && data.pages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-4 py-2 bg-surface rounded-lg disabled:opacity-50"
            >
              Prev
            </button>
            <span className="py-2 px-4">
              Page {page} of {data.pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
              disabled={page >= data.pages}
              className="px-4 py-2 bg-surface rounded-lg disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
