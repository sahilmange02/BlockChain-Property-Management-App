/*
 * BLOCKCHAIN EXPLAINED: seed.ts
 * =================================
 * SEED SCRIPT = Creates sample properties on the local blockchain for testing.
 *
 * "Seeding" means pre-loading the blockchain with example data so you can test
 * the UI without manually registering properties.
 *
 * IMPORTANT:
 * - Only run this on the LOCAL Hardhat blockchain (chainId 31337)
 * - Never run on Sepolia/Mainnet, because you'd permanently spam a public chain
 */
import { ethers } from "hardhat";
import LocalDeployment from "../deployments/localhost.json";

async function main() {
  if ((await ethers.provider.getNetwork()).chainId !== 31337n) {
    throw new Error("Seed script only runs on local network (chainId 31337)");
  }

  const [government, citizen1, citizen2] = await ethers.getSigners();
  const contract = await ethers.getContractAt("PropertyRegistry", LocalDeployment.proxyAddress);

  console.log("🌱 Seeding local blockchain with sample data...\n");

  // Register property as citizen1
  const tx1 = await contract.connect(citizen1).registerProperty(
    "MH/GK/2025/001",
    "Flat 4B, Sunshine Towers, Ghatkopar East, Mumbai 400077",
    850,
    "QmTEST1234567890abcdefghijklmnopqrstuvwxyz12345",
    0, // RESIDENTIAL
    "2BHK apartment on 4th floor with parking",
  );
  await tx1.wait();
  console.log("✅ Property 1 registered by citizen1");

  // Government verifies property 1
  const tx2 = await contract.connect(government).verifyProperty(1);
  await tx2.wait();
  console.log("✅ Property 1 verified by government");

  // Register another property as citizen2
  const tx3 = await contract.connect(citizen2).registerProperty(
    "MH/GK/2025/002",
    "Shop 12, Ground Floor, Link Road, Andheri West, Mumbai 400053",
    1200,
    "QmTEST9876543210zyxwvutsrqponmlkjihgfedcba54321",
    1, // COMMERCIAL
    "Commercial shop unit with mezzanine floor",
  );
  await tx3.wait();
  console.log("✅ Property 2 registered by citizen2 (pending verification)");

  console.log("\n🌱 Seeding complete! Test wallet addresses:");
  console.log(`Government: ${government.address}`);
  console.log(`Citizen 1:  ${citizen1.address}`);
  console.log(`Citizen 2:  ${citizen2.address}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

