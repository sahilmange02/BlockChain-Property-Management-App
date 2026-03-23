import { useState } from "react";
import { Link2, Loader, Wallet } from "lucide-react";
import { useWeb3 } from "../../context/Web3Context";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

export default function LinkWalletButton() {
  const { account, isConnected, connect, signMessage } = useWeb3();
  const { user } = useAuth();
  const [isLinking, setIsLinking] = useState(false);

  // If wallet is already linked — don't render anything
  if (user?.walletAddress) return null;

  const handleLink = async () => {
    // If not connected, connect first
    if (!isConnected || !account) {
      await connect();
      return;
    }

    setIsLinking(true);
    try {
      const token = localStorage.getItem("token");
      if (!token || !user) {
        toast.error("Please log in first.");
        return;
      }

      // CRITICAL: message must match backend exactly
      const message = `Link wallet to Land Registry: ${user.id}`;

      toast("Check MetaMask — please sign the message.", { icon: "✍️", duration: 6000 });
      const signature = await signMessage(message);

      const response = await fetch("/api/auth/link-wallet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ walletAddress: account, signature }),
      });

      const data = await response.json();

      if (data.success) {
        // Update localStorage user
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          parsed.walletAddress = account;
          localStorage.setItem("user", JSON.stringify(parsed));
        }
        toast.success("Wallet linked successfully!");
        setTimeout(() => window.location.reload(), 800);
      } else {
        toast.error(data.message || "Linking failed.");
      }
    } catch (err: any) {
      if (err.code === 4001 || err.code === "ACTION_REJECTED") {
        toast.error("Signature rejected. Please try again.");
      } else {
        toast.error("Failed to link wallet.");
        console.error(err);
      }
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <div
      className="bg-yellow-900/30 border border-yellow-700 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6"
    >
      <div>
        <p className="text-yellow-300 font-semibold flex items-center gap-2">
          <Wallet size={16} /> Wallet Not Linked
        </p>
        <p className="text-yellow-600 text-sm mt-1">
          {isConnected && account
            ? `MetaMask connected (${account.slice(0, 6)}...${account.slice(-4)}) — click to link to your account`
            : "Connect your MetaMask wallet to register and manage properties"}
        </p>
      </div>
      <button
        onClick={handleLink}
        disabled={isLinking}
        className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-500
                   text-white font-semibold rounded-lg transition-colors
                   disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
      >
        {isLinking ? (
          <>
            <Loader size={16} className="animate-spin" /> Linking...
          </>
        ) : (
          <>
            <Link2 size={16} /> {isConnected ? "Link Wallet" : "Connect & Link"}
          </>
        )}
      </button>
    </div>
  );
}

