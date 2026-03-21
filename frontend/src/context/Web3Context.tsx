/*
 * WEB3 CONTEXT: The bridge between your React app and MetaMask/Blockchain
 * ========================================================================
 * BLOCKCHAIN EXPLAINED:
 *
 * "Web3" = everything related to blockchain interactions in the browser.
 *
 * MetaMask is a browser extension that:
 * - Holds the user's Ethereum wallet (private key never leaves the browser)
 * - Shows a popup when a transaction needs the user's approval
 * - Signs transactions with the user's private key
 * - Connects to the blockchain network (Hardhat local or Sepolia testnet)
 *
 * window.ethereum: MetaMask injects this object into the browser window.
 * Your React app uses it to talk to MetaMask.
 *
 * ethers.js OBJECTS:
 * - BrowserProvider: wraps window.ethereum into a usable provider object
 * - Signer: the user's wallet — can sign (authorize) transactions
 * - Contract: your smart contract, connected to the signer
 *
 * CONTRACT EXPLAINED:
 * We create the Contract object with three things:
 * 1. The contract ADDRESS (where it lives on the blockchain)
 * 2. The ABI (instruction manual — what functions the contract has)
 * 3. The SIGNER (the user's wallet — so they can sign transactions)
 *
 * Once created, calling contract.registerProperty(...) will:
 * - Show a MetaMask popup with the transaction details and gas cost
 * - If user approves → the transaction is sent to the blockchain
 * - If user rejects → nothing happens
 */
import React, { createContext, useContext, useEffect, useState } from "react";
import { BrowserProvider, Contract, Signer } from "ethers";
import type { Web3ContextType } from "@/types";
import contractAbi from "@/contracts/PropertyRegistry.json";

const HARDHAT_NETWORK_CONFIG = {
  chainId: "0x7A69", // 31337 in hex
  chainName: "Hardhat Local",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: ["http://127.0.0.1:8545"],
  blockExplorerUrls: [] as string[],
};

const SEPOLIA_NETWORK_CONFIG = {
  chainId: "0xAA36A7",
  chainName: "Sepolia Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://rpc.sepolia.org"],
  blockExplorerUrls: ["https://sepolia.etherscan.io"],
};

const TARGET_CHAIN_ID = parseInt(import.meta.env.VITE_CHAIN_ID || "31337", 10);
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "";

const Web3Context = createContext<Web3ContextType | null>(null);

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<Signer | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);

  const isConnected = !!account;
  const isWrongNetwork = chainId !== null && chainId !== TARGET_CHAIN_ID;

  const switchNetwork = async () => {
    const ethereum = (window as unknown as { ethereum?: { request: (args: unknown) => Promise<unknown> } }).ethereum;
    if (!ethereum) return;

    const config = TARGET_CHAIN_ID === 11155111 ? SEPOLIA_NETWORK_CONFIG : HARDHAT_NETWORK_CONFIG;

    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: config.chainId }],
      });
    } catch (switchErr: unknown) {
      const err = switchErr as { code?: number };
      if (err.code === 4902) {
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [config],
        });
      }
    }
  };

  const connect = async () => {
    const ethereum = (window as unknown as { ethereum?: { request: (args: unknown) => Promise<unknown[]> } }).ethereum;
    if (!ethereum) {
      window.open("https://metamask.io/download/", "_blank");
      return;
    }

    const accounts = (await ethereum.request({ method: "eth_requestAccounts" })) as string[];
    setAccount(accounts[0] || null);

    const chainIdHex = String(await ethereum.request({ method: "eth_chainId" }));
    const parsedChainId = parseInt(chainIdHex, 16);
    setChainId(parsedChainId);

    if (parsedChainId !== TARGET_CHAIN_ID) {
      await switchNetwork();
      const newChainIdHex = String(await ethereum.request({ method: "eth_chainId" }));
      setChainId(parseInt(newChainIdHex, 16));
    }

    const prov = new BrowserProvider(ethereum);
    setProvider(prov);
    const sig = await prov.getSigner();
    setSigner(sig);

    if (CONTRACT_ADDRESS) {
      setContract(new Contract(CONTRACT_ADDRESS, contractAbi.abi, sig));
    }
  };

  const disconnect = () => {
    setAccount(null);
    setChainId(null);
    setProvider(null);
    setSigner(null);
    setContract(null);
    localStorage.removeItem("web3_connected");
  };

  useEffect(() => {
    if (account && chainId === TARGET_CHAIN_ID && provider && signer && CONTRACT_ADDRESS) {
      setContract(new Contract(CONTRACT_ADDRESS, contractAbi.abi, signer));
    }
  }, [account, chainId, provider, signer]);

  useEffect(() => {
    const stored = localStorage.getItem("web3_connected");
    if (stored === "true") connect();
  }, []);

  useEffect(() => {
    if (account) localStorage.setItem("web3_connected", "true");
  }, [account]);

  const ethereum = typeof window !== "undefined" ? (window as unknown as { ethereum?: { on: (e: string, cb: () => void) => void } }).ethereum : undefined;

  useEffect(() => {
    if (!ethereum) return;
    const handleAccountsChanged = () => connect();
    const handleChainChanged = () => window.location.reload();
    ethereum.on("accountsChanged", handleAccountsChanged);
    ethereum.on("chainChanged", handleChainChanged);
    return () => {
      ethereum.on("accountsChanged", handleAccountsChanged);
      ethereum.on("chainChanged", handleChainChanged);
    };
  }, []);

  const value: Web3ContextType = {
    connect,
    disconnect,
    account,
    chainId,
    isConnected,
    provider,
    signer,
    contract,
    switchNetwork,
    isWrongNetwork,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
}

export function useWeb3() {
  const ctx = useContext(Web3Context);
  if (!ctx) throw new Error("useWeb3 must be used within Web3Provider");
  return ctx;
}
