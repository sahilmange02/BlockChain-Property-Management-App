import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ethers } from "ethers";
import toast from "react-hot-toast";

declare global {
  interface Window {
    ethereum?: any;
  }
}

// Import the contract ABI — copied here by deploy script
// If this file doesn't exist yet, create an empty one:
// frontend/src/contracts/PropertyRegistry.json = { "abi": [], "address": "" }
import ContractABI from "../contracts/PropertyRegistry.json";

// ============================================================
// NETWORK CONFIGS
// ============================================================

// Hardhat local network (for development)
const HARDHAT_NETWORK = {
  chainId: "0x7A69", // 31337 in hex
  chainName: "Hardhat Local",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: ["http://127.0.0.1:8545"],
  blockExplorerUrls: [],
};

// Sepolia testnet (for staging/demo)
const SEPOLIA_NETWORK = {
  chainId: "0xAA36A7", // 11155111 in hex
  chainName: "Sepolia Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://rpc.sepolia.org"],
  blockExplorerUrls: ["https://sepolia.etherscan.io"],
};

// Which network this app expects — comes from .env
const EXPECTED_CHAIN_ID = parseInt(import.meta.env.VITE_CHAIN_ID || "31337");

// ============================================================
// TYPES
// ============================================================

interface Web3ContextType {
  account: string | null;
  chainId: number | null;
  isConnected: boolean;
  isCorrectNetwork: boolean;
  isConnecting: boolean;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  contract: ethers.Contract | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: () => Promise<void>;
  signMessage: (message: string) => Promise<string>;
}

// ============================================================
// CONTEXT
// ============================================================

const Web3Context = createContext<Web3ContextType | null>(null);

// ============================================================
// PROVIDER
// ============================================================

export function Web3Provider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const isCorrectNetwork = chainId === EXPECTED_CHAIN_ID;
  const hasMetaMask = typeof window !== "undefined" && !!window.ethereum;

  // ──────────────────────────────────────────────────────────
  // SETUP PROVIDER
  // Reads current MetaMask state and populates all context values
  // Returns the values so connect() can use them immediately
  // ──────────────────────────────────────────────────────────
  const setupProvider = async (ethereum: typeof window.ethereum) => {
    const _provider = new ethers.BrowserProvider(ethereum!);
    const _signer = await _provider.getSigner();
    const _account = (await _signer.getAddress()).toLowerCase();
    const network = await _provider.getNetwork();
    const _chainId = Number(network.chainId);

    // Load the smart contract with the user's signer
    const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS || "";
    let _contract: ethers.Contract | null = null;
    if (contractAddress && (ContractABI as any).abi && (ContractABI as any).abi.length > 0) {
      _contract = new ethers.Contract(contractAddress, (ContractABI as any).abi, _signer);
    }

    // Update all state at once
    setProvider(_provider);
    setSigner(_signer);
    setAccount(_account);
    setChainId(_chainId);
    setContract(_contract);

    return { _provider, _signer, _account, _chainId };
  };

  // ──────────────────────────────────────────────────────────
  // AUTO-RECONNECT ON PAGE LOAD
  // If user previously connected, reconnect silently
  // ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasMetaMask) return;

    const wasConnected = localStorage.getItem("walletConnected") === "true";
    if (!wasConnected) return;

    // Check if MetaMask still has an account authorized
    (window.ethereum as any)
      .request({ method: "eth_accounts" })
      .then((accounts: string[]) => {
        if (accounts.length > 0) {
          setupProvider(window.ethereum).catch(console.error);
        } else {
          // MetaMask was disconnected externally
          localStorage.removeItem("walletConnected");
        }
      })
      .catch(console.error);
  }, []);

  // ──────────────────────────────────────────────────────────
  // METAMASK EVENT LISTENERS
  // Handle account switches and network changes
  // ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasMetaMask) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        // User disconnected from MetaMask side
        disconnect();
      } else {
        // User switched accounts — re-setup with new account
        setupProvider(window.ethereum).catch(console.error);
      }
    };

    const handleChainChanged = () => {
      // MetaMask recommends reloading on chain change
      window.location.reload();
    };

    (window.ethereum as any).on("accountsChanged", handleAccountsChanged);
    (window.ethereum as any).on("chainChanged", handleChainChanged);

    return () => {
      (window.ethereum as any).removeListener("accountsChanged", handleAccountsChanged);
      (window.ethereum as any).removeListener("chainChanged", handleChainChanged);
    };
  }, []);

  // ──────────────────────────────────────────────────────────
  // LINK WALLET TO BACKEND
  // Called automatically after connecting if wallet not yet linked.
  // Signs a message to PROVE the user owns this wallet address.
  // Backend verifies the signature and saves walletAddress to MongoDB.
  //
  // THE MESSAGE MUST MATCH EXACTLY what backend expects:
  //   "Link wallet to Land Registry: " + userId
  // ──────────────────────────────────────────────────────────
  const linkWalletToBackend = async (
    walletAddress: string,
    _signer: ethers.JsonRpcSigner,
    userId: string
  ): Promise<void> => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        // User not logged in — skip linking, they can do it after login
        return;
      }

      // CRITICAL: this exact string must match backend verification
      const message = `Link wallet to Land Registry: ${userId}`;

      toast("Sign the message in MetaMask to link your wallet...", {
        icon: "✍️",
        duration: 8000,
      });

      // This triggers the MetaMask "Sign Message" popup
      const signature = await _signer.signMessage(message);

      // Send signed message + address to backend
      const response = await fetch("/api/auth/link-wallet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ walletAddress, signature }),
      });

      const data = await response.json();

      if (data.success) {
        // Update localStorage user object so UI reflects linked wallet immediately
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          parsedUser.walletAddress = walletAddress;
          localStorage.setItem("user", JSON.stringify(parsedUser));
        }

        toast.success("Wallet linked to your account! ✓");
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast.error(data.message || "Could not link wallet.");
      }
    } catch (err: any) {
      if (err?.code === 4001 || err?.code === "ACTION_REJECTED") {
        // User clicked "Reject" on the MetaMask sign popup
        toast.error(
          "You rejected the signature. Wallet not linked. You can link it later from your dashboard."
        );
      } else {
        // Network error, backend down, etc.
        console.error("Wallet link error:", err);
        toast.error("Wallet connected but could not link to account. Try again from dashboard.");
      }
      // IMPORTANT: Don't rethrow — wallet is still connected to browser
    }
  };

  // ──────────────────────────────────────────────────────────
  // CONNECT
  // Main function called when user clicks "Connect MetaMask"
  // ──────────────────────────────────────────────────────────
  const connect = async (): Promise<void> => {
    if (!hasMetaMask) {
      toast.error("MetaMask not installed. Opening download page...");
      window.open("https://metamask.io/download/", "_blank");
      return;
    }

    setIsConnecting(true);
    try {
      // Step 1: Ask MetaMask for permission to see accounts
      await (window.ethereum as any).request({ method: "eth_requestAccounts" });

      // Step 2: Set up provider, signer, contract
      const { _chainId, _account, _signer } = await setupProvider(window.ethereum);

      // Step 3: Check if on correct network, switch if needed
      if (_chainId !== EXPECTED_CHAIN_ID) {
        await switchNetwork();
        // After switchNetwork, page will reload
        return;
      }

      // Step 4: Mark as connected in localStorage for auto-reconnect
      localStorage.setItem("walletConnected", "true");
      toast.success("MetaMask connected!");

      // Step 5: Auto-link wallet to backend account if:
      //   - User is logged in (token exists)
      //   - Wallet is not already linked (no walletAddress in stored user)
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        if (!parsedUser.walletAddress) {
          await linkWalletToBackend(_account, _signer, parsedUser.id);
        } else if (parsedUser.walletAddress.toLowerCase() !== _account.toLowerCase()) {
          toast("Warning: This wallet is different from your linked wallet.", {
            icon: "⚠️",
            duration: 5000,
          });
        }
      }
    } catch (err: any) {
      if (err?.code === 4001) {
        toast.error("Connection rejected. Please allow MetaMask access.");
      } else {
        console.error("Connect error:", err);
        toast.error("Failed to connect MetaMask. See console for details.");
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // ──────────────────────────────────────────────────────────
  // DISCONNECT
  // Clears all local state (MetaMask stays connected on its side,
  // but we forget the connection on our side)
  // ──────────────────────────────────────────────────────────
  const disconnect = (): void => {
    setAccount(null);
    setChainId(null);
    setProvider(null);
    setSigner(null);
    setContract(null);
    localStorage.removeItem("walletConnected");
    toast("Wallet disconnected.", { icon: "👋" });
  };

  // ──────────────────────────────────────────────────────────
  // SWITCH NETWORK
  // Asks MetaMask to switch to the expected network.
  // If network not in MetaMask yet, adds it automatically.
  // ──────────────────────────────────────────────────────────
  const switchNetwork = async (): Promise<void> => {
    if (!hasMetaMask) return;

    const targetNetwork = EXPECTED_CHAIN_ID === 31337 ? HARDHAT_NETWORK : SEPOLIA_NETWORK;

    try {
      // Try switching to existing network
      await (window.ethereum as any).request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: targetNetwork.chainId }],
      });
    } catch (switchError: any) {
      if (switchError?.code === 4902) {
        // Network not in MetaMask — add it first, then switch
        try {
          await (window.ethereum as any).request({
            method: "wallet_addEthereumChain",
            params: [targetNetwork],
          });
        } catch (addError: any) {
          toast.error("Could not add network to MetaMask.");
          throw addError;
        }
      } else if (switchError?.code === 4001) {
        toast.error("Network switch rejected.");
        throw switchError;
      } else {
        throw switchError;
      }
    }
  };

  // ──────────────────────────────────────────────────────────
  // SIGN MESSAGE
  // Used for wallet linking and any other signature needs
  // ──────────────────────────────────────────────────────────
  const signMessage = async (message: string): Promise<string> => {
    if (!signer) {
      throw new Error("Wallet not connected. Please connect MetaMask first.");
    }
    return await signer.signMessage(message);
  };

  // ──────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────
  return (
    <Web3Context.Provider
      value={{
        account,
        chainId,
        isConnected: !!account,
        isCorrectNetwork,
        isConnecting,
        provider,
        signer,
        contract,
        connect,
        disconnect,
        switchNetwork,
        signMessage,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
}

// ============================================================
// HOOK
// ============================================================

export function useWeb3(): Web3ContextType {
  const ctx = useContext(Web3Context);
  if (!ctx) {
    throw new Error("useWeb3 must be used inside <Web3Provider>");
  }
  return ctx;
}

