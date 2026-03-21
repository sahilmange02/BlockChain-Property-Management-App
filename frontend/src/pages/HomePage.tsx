import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import api from "@/services/api";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { PropertyCard } from "@/components/PropertyCard";
import { Shield, FileCheck, Zap, ScrollText } from "lucide-react";
import type { Property } from "@/types";

export function HomePage() {
  const { data: propsData } = useQuery({
    queryKey: ["home-props"],
    queryFn: async () => {
      const { data } = await api.get<{ total: number }>("/properties?page=1&limit=1");
      return data;
    },
  });

  const { data: recent } = useQuery({
    queryKey: ["home-recent"],
    queryFn: async () => {
      const { data } = await api.get<{ properties: unknown[] }>("/properties?status=VERIFIED&page=1&limit=5");
      return data.properties;
    },
  });

  const total = propsData?.total ?? 0;
  const transfers = 0;

  return (
    <div className="min-h-screen">
      <nav className="border-b border-gray-800 bg-primary/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="text-xl font-bold text-white">
            PropertyChain
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/properties" className="text-gray-400 hover:text-white">
              Properties
            </Link>
            <Link to="/login" className="text-gray-400 hover:text-white">
              Login
            </Link>
            <Link to="/register" className="text-gray-400 hover:text-white">
              Register
            </Link>
            <WalletConnectButton />
          </div>
        </div>
      </nav>

      <section className="max-w-6xl mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-5xl font-bold text-white mb-4">
            Blockchain-Powered Land Registry
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-12">
            Immutable property records. Zero fraud. Instant verification.
          </p>
          <div className="flex justify-center gap-8 mb-16">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <p className="text-4xl font-bold text-accent">{total}</p>
              <p className="text-gray-500">Properties Registered</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <p className="text-4xl font-bold text-accent">{transfers}</p>
              <p className="text-gray-500">Transfers</p>
            </motion.div>
          </div>
          <div className="flex gap-4 justify-center">
            <Link
              to="/register"
              className="px-6 py-3 bg-accent hover:bg-emerald-500 text-primary font-semibold rounded-lg"
            >
              Register
            </Link>
            <WalletConnectButton />
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-24">
          {[
            { icon: Shield, title: "Immutable Records", desc: "Stored on blockchain, tamper-proof forever" },
            { icon: FileCheck, title: "Zero Fraud", desc: "Cryptographic verification of ownership" },
            { icon: Zap, title: "Instant Verification", desc: "Government approval in minutes" },
            { icon: ScrollText, title: "Transparent Audit", desc: "Full history of every transaction" },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              className="p-6 bg-surface rounded-xl border border-gray-800"
            >
              <item.icon className="w-10 h-10 text-accent mb-3" />
              <h3 className="font-semibold text-white mb-2">{item.title}</h3>
              <p className="text-gray-500 text-sm">{item.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-24"
        >
          <h2 className="text-2xl font-bold text-white mb-6">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {["Register", "Upload Docs", "Verify", "Transfer"].map((step, i) => (
              <div key={step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-accent/20 text-accent flex items-center justify-center mx-auto mb-2 font-bold">
                  {i + 1}
                </div>
                <p className="font-medium text-white">{step}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {recent && Array.isArray(recent) && recent.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-24"
          >
            <h2 className="text-2xl font-bold text-white mb-6">Recent Verified Properties</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(recent as Property[]).slice(0, 5).map((p) => (
                <PropertyCard key={p._id || p.blockchainPropertyId} property={p} />
              ))}
            </div>
          </motion.div>
        )}
      </section>
    </div>
  );
}
