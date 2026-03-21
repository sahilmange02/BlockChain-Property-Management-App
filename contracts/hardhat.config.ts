/*
 * BLOCKCHAIN EXPLAINED: hardhat.config.ts
 * =========================================
 * This file is like the "settings panel" for your blockchain development.
 *
 * Hardhat is a development tool that lets you:
 *   1. Write smart contracts in Solidity
 *   2. Compile them (turn code into bytecode the blockchain understands)
 *   3. Test them (run automated tests)
 *   4. Deploy them (put them ON the blockchain)
 *
 * NETWORKS EXPLAINED:
 *   - "hardhat" / "localhost": Your own fake blockchain on your computer.
 *     It's instant, free, and resets every time you restart. Perfect for dev.
 *   - "sepolia": A real public test blockchain. Uses fake ETH (free from faucets).
 *     Use this when you want to test with others or show a demo.
 *   - "mainnet": The real Ethereum blockchain. Real money. NEVER use during dev.
 *
 * WHY NO ALCHEMY/INFURA?
 *   For local development, Hardhat IS the blockchain node. You don't need
 *   a third-party service at all. Just run "npx hardhat node" and you have
 *   a full Ethereum node running on your computer for free.
 */

import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-gas-reporter";
import * as dotenv from "dotenv";

// Load environment variables from the root .env file
dotenv.config({ path: "../.env" });

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.22",
    settings: {
      // optimizer: reduces the gas cost when people call your contract functions
      // Think of it as "compressing" the code so it runs cheaper on the blockchain
      optimizer: { enabled: true, runs: 200 },
    },
  },

  networks: {
    // LOCAL NETWORK: Your computer IS the blockchain.
    // Start it with: npx hardhat node
    // This network is automatically available — no config needed.
    hardhat: {
      chainId: 31337, // 31337 is the standard ID for Hardhat local network
      // mining: { auto: true } means a new "block" is created for every transaction
      // On real Ethereum, blocks take ~12 seconds. Locally, it's instant.
      mining: { auto: true, interval: 0 },
    },

    // LOCALHOST: Same as hardhat network but accessed externally
    // (e.g., from your React app or backend via HTTP)
    localhost: {
      url: "http://127.0.0.1:8545", // Hardhat node listens here by default
      chainId: 31337,
    },

    // SEPOLIA TESTNET: Free public test blockchain
    // Uses free ETH — get some at https://sepoliafaucet.com
    // RPC URL is free — no signup needed for https://rpc.sepolia.org
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
      accounts: process.env.SEPOLIA_PRIVATE_KEY ? [process.env.SEPOLIA_PRIVATE_KEY] : [],
      chainId: 11155111,
    },
  },

  // GAS REPORTER: Shows you how much each function costs in gas.
  // Gas is the "fee" for running code on the blockchain.
  // Run with: REPORT_GAS=true npx hardhat test
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
    outputFile: "gas-report.txt",
    noColors: true,
  },

  // ETHERSCAN: Optional. Used to publish your contract's source code
  // publicly so anyone can read and verify it on etherscan.io
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "",
  },
};

export default config;

