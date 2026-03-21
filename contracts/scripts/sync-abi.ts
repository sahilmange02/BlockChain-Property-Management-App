/*
 * SYNC ABI SCRIPT
 * =================
 * Run after deploying: npx hardhat run scripts/sync-abi.ts
 *
 * Copies the compiled PropertyRegistry ABI from Hardhat artifacts to:
 * - backend/src/contracts/PropertyRegistry.json
 * - frontend/src/contracts/PropertyRegistry.json
 *
 * Also updates CONTRACT_ADDRESS_LOCAL in the root .env file.
 * For localhost deployment, reads the address from deployments/localhost.json
 */
import * as fs from "node:fs";
import * as path from "node:path";

const CONTRACTS_DIR = path.join(__dirname, "..");
const ARTIFACT_PATH = path.join(CONTRACTS_DIR, "artifacts/contracts/PropertyRegistry.sol/PropertyRegistry.json");
const DEPLOYMENT_PATH = path.join(CONTRACTS_DIR, "deployments/localhost.json");
const ROOT_DIR = path.join(CONTRACTS_DIR, "..");
const BACKEND_CONTRACTS = path.join(ROOT_DIR, "backend/src/contracts");
const FRONTEND_CONTRACTS = path.join(ROOT_DIR, "frontend/src/contracts");
const ENV_PATH = path.join(ROOT_DIR, ".env");

function main() {
  console.log("\n📋 Syncing PropertyRegistry ABI...\n");

  if (!fs.existsSync(ARTIFACT_PATH)) {
    console.error("❌ Artifact not found. Run 'npx hardhat compile' first.");
    process.exit(1);
  }

  const artifact = JSON.parse(fs.readFileSync(ARTIFACT_PATH, "utf-8")) as { abi: unknown };
  let contractAddress = "";

  if (fs.existsSync(DEPLOYMENT_PATH)) {
    const deployment = JSON.parse(fs.readFileSync(DEPLOYMENT_PATH, "utf-8")) as { proxyAddress?: string };
    contractAddress = deployment.proxyAddress || "";
    console.log(`📜 Contract address from deployment: ${contractAddress}`);
  }

  const output = contractAddress
    ? JSON.stringify({ abi: artifact.abi, address: contractAddress }, null, 2)
    : JSON.stringify({ abi: artifact.abi }, null, 2);

  [BACKEND_CONTRACTS, FRONTEND_CONTRACTS].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const outPath = path.join(dir, "PropertyRegistry.json");
    fs.writeFileSync(outPath, output);
    console.log(`✅ Copied ABI to ${path.relative(ROOT_DIR, outPath)}`);
  });

  if (contractAddress && fs.existsSync(ENV_PATH)) {
    let envContent = fs.readFileSync(ENV_PATH, "utf-8");
    for (const key of ["CONTRACT_ADDRESS_LOCAL", "VITE_CONTRACT_ADDRESS"]) {
      if (new RegExp(`^${key}=`, "m").test(envContent)) {
        envContent = envContent.replace(new RegExp(`^${key}=.*$`, "m"), `${key}=${contractAddress}`);
      } else {
        envContent = `${envContent.trimEnd()}\n${key}=${contractAddress}\n`;
      }
    }
    fs.writeFileSync(ENV_PATH, envContent);
    console.log(`✅ Updated .env: CONTRACT_ADDRESS_LOCAL and VITE_CONTRACT_ADDRESS=${contractAddress}`);
  }

  console.log("\n✨ ABI sync complete.\n");
}

main();
