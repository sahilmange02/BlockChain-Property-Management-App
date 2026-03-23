import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { propertyApi } from "../api/property.api";
import { useAuth } from "../context/AuthContext";
import PropertyCard from "../components/common/PropertyCard";
import LinkWalletButton from "../components/common/LinkWalletButton";

export default function DashboardPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const walletAddress = user?.walletAddress;

  const propsQuery = useQuery({
    queryKey: ["properties", "owner", walletAddress],
    enabled: !!walletAddress,
    queryFn: () => {
      if (!walletAddress) throw new Error("No wallet address");
      return propertyApi.getByOwner(walletAddress);
    },
  });

  if (!user) return null;

  if (!walletAddress) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Shows yellow banner + manual link fallback */}
        <LinkWalletButton />
        <div className="mt-4">
          <p className="text-gray-400">
            Wallet not linked. Connect MetaMask and sign the linking message to save it to your MongoDB account.
          </p>
        </div>
      </div>
    );
  }

  const properties = propsQuery.data?.properties || [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Render first so it appears immediately if wallet is not linked */}
      <LinkWalletButton />
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">My Dashboard</h1>
          <p className="text-gray-400 mt-1">
            KYC: {user.kycStatus || "N/A"} • Verified: {user.isVerified ? "Yes" : "No"}
          </p>
        </div>
        <button onClick={() => navigate("/register-property")} className="btn-primary">
          Register New Property
        </button>
      </div>

      {propsQuery.isLoading ? (
        <div className="text-gray-400">Loading...</div>
      ) : propsQuery.error ? (
        <div className="text-red-400">
          Failed to load properties.
          <button
            className="underline ml-2"
            onClick={() => {
              toast.success("Retrying...");
              refreshUser().catch(() => {});
              propsQuery.refetch();
            }}
          >
            Retry
          </button>
        </div>
      ) : properties.length === 0 ? (
        <div className="text-gray-500">No properties found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {properties.map((p) => (
            <PropertyCard key={p.blockchainPropertyId} property={p} />
          ))}
        </div>
      )}
    </div>
  );
}

