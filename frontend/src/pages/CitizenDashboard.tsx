import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { PropertyCard } from "@/components/PropertyCard";
import { PlusCircle, Bell, ArrowRight } from "lucide-react";
import type { Property } from "@/types";

export function CitizenDashboard() {
  const { user, logout } = useAuth();
  const wallet = user?.walletAddress;

  const { data: properties } = useQuery({
    queryKey: ["owner-properties", wallet],
    queryFn: async () => {
      const { data } = await api.get<{ properties: Property[] }>(`/properties/owner/${wallet}`);
      return data.properties;
    },
    enabled: !!wallet,
  });

  const unread = 0;

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-primary border-r border-gray-800 p-4">
        <h2 className="text-xl font-bold text-white mb-6">PropertyChain</h2>
        <nav className="space-y-2">
          <Link to="/dashboard" className="block py-2 px-3 rounded-lg bg-surface text-accent">
            My Properties
          </Link>
          <Link to="/register-property" className="flex items-center gap-2 py-2 px-3 rounded-lg text-gray-400 hover:bg-surface hover:text-white">
            <PlusCircle size={18} /> Register Property
          </Link>
          <Link to="/dashboard" className="flex items-center gap-2 py-2 px-3 rounded-lg text-gray-400 hover:bg-surface hover:text-white">
            <Bell size={18} /> Notifications
          </Link>
        </nav>
        <div className="mt-auto pt-8">
          <p className="text-gray-500 text-sm">{user?.email}</p>
          <button onClick={logout} className="text-red-400 text-sm hover:underline mt-1">
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold text-white mb-6">My Properties</h1>

        {!wallet && (
          <div className="p-6 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400">
            Link your wallet to view and register properties.
          </div>
        )}

        {wallet && (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(properties ?? []).map((p: Property) => (
                <PropertyCard key={p._id || p.blockchainPropertyId} property={p} />
              ))}
            </div>
            <Link
              to="/register-property"
              className="mt-6 inline-flex items-center gap-2 text-accent hover:underline"
            >
              <PlusCircle size={20} /> Register New Property
              <ArrowRight size={16} />
            </Link>
          </>
        )}
      </main>
    </div>
  );
}
