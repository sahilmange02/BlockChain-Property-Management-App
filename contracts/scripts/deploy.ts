/*
 * BLOCKCHAIN EXPLAINED: deploy.ts
 * =================================
 * Deployment = publishing your smart contract to the blockchain.
 * Like uploading an app to an app store — once it's there, it runs forever.
 *
 * We use the UUPS Proxy pattern:
 * - Instead of deploying PropertyRegistry directly, we deploy TWO contracts:
 *   1. A "Proxy" contract — this is the permanent address everyone uses
 *   2. The "Implementation" — the actual logic
 * - When we upgrade, we only swap the implementation. The proxy address stays.
 * - Users always interact with the proxy address. They never need to know about impl.
 *
 * WHAT THIS SCRIPT DOES:
 * 1. Gets the "deployer" wallet (from PRIVATE_KEY in .env)
 * 2. Deploys PropertyRegistry via UUPS proxy
 * 3. Saves the proxy address to a JSON file
 * 4. Copies the ABI to backend and frontend so they can talk to the contract
 * 5. Optionally verifies on Etherscan (only for real networks)
 */
import { ethers, upgrades, network } from "hardhat";
import * as fs from "node:fs";
import * as path from "node:path";

async function main() {
  console.log("\n🚀 Starting PropertyRegistry deployment...");
  console.log(`📡 Network: ${network.name} (chainId: ${network.config.chainId})`);

  // Get the deployer wallet
  // BLOCKCHAIN EXPLAINED: "signers" are wallets that can sign transactions.
  // The first signer comes from the PRIVATE_KEY in .env.
  // For local dev, Hardhat provides 20 test wallets automatically.
  const [deployer] = await ethers.getSigners();
  console.log(`👤 Deployer wallet: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Deployer balance: ${ethers.formatEther(balance)} ETH`);

  if (balance === 0n) {
    throw new Error("Deployer has no ETH! For local dev, run 'npx hardhat node' first.");
  }

  // Deploy as UUPS upgradeable proxy
  console.log("\n📦 Deploying PropertyRegistry (UUPS proxy)...");
  const PropertyRegistry = await ethers.getContractFactory("PropertyRegistry");

  // The "deployer" wallet becomes the government authority initially.
  // In production, this would be the government's official wallet address.
  const proxy = await upgrades.deployProxy(PropertyRegistry, [deployer.address], { kind: "uups" });

  await proxy.waitForDeployment();
  const proxyAddress = await proxy.getAddress();
  const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

  console.log(`\n✅ Proxy deployed at:          ${proxyAddress}`);
  console.log(`📋 Implementation deployed at: ${implAddress}`);

  // Save deployment info to a JSON file
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir, { recursive: true });

  const deploymentInfo = {
    network: network.name,
    chainId: network.config.chainId,
    proxyAddress,
    implementationAddress: implAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
  };

  const deploymentFile = path.join(deploymentsDir, `${network.name}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment saved to: ${deploymentFile}`);

  // Copy ABI to backend and frontend
  // BLOCKCHAIN EXPLAINED: ABI (Application Binary Interface) is like
  // an instruction manual — it tells your JS code what functions the
  // contract has and what parameters they take. Without the ABI,
  // your frontend and backend can't talk to the contract.
  const artifactPath = path.join(__dirname, "../artifacts/contracts/PropertyRegistry.sol/PropertyRegistry.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8")) as { abi: unknown };
  const abiData = JSON.stringify({ abi: artifact.abi, address: proxyAddress }, null, 2);

  const backendContractsDir = path.join(__dirname, "../../backend/src/contracts");
  const frontendContractsDir = path.join(__dirname, "../../frontend/src/contracts");

  [backendContractsDir, frontendContractsDir].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "PropertyRegistry.json"), abiData);
  });
  console.log("📋 ABI copied to backend and frontend");

  // Update .env files with the contract address (if you have a real .env)
  const envPath = path.join(__dirname, "../../../.env");
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, "utf-8");
    const envKey = network.name === "localhost" ? "CONTRACT_ADDRESS_LOCAL" : "CONTRACT_ADDRESS_SEPOLIA";

    if (new RegExp(`^${envKey}=.*$`, "m").test(envContent)) {
      envContent = envContent.replace(new RegExp(`^${envKey}=.*$`, "m"), `${envKey}=${proxyAddress}`);
    } else {
      envContent = `${envContent.trimEnd()}\n${envKey}=${proxyAddress}\n`;
    }

    fs.writeFileSync(envPath, envContent);
    console.log(`🔧 Updated .env: ${envKey}=${proxyAddress}`);
  }

  console.log("\n✨ Deployment complete!\n");
  console.log("Next steps:");
  console.log("  1. Your .env has been updated automatically (if it exists)");
  console.log("  2. Restart the backend: cd backend && npm run dev");
  console.log("  3. Update VITE_CONTRACT_ADDRESS in .env for frontend");
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exit(1);
});

