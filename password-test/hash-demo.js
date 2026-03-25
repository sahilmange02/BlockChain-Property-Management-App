#!/usr/bin/env node

// Standalone bcrypt password hash demo
// Usage: node password-test/hash-demo.js
// Enter password at prompt (hidden input not implemented, plain input is used for simplicity).\n
import readline from "readline";
import bcrypt from "bcryptjs";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => rl.question(prompt, resolve));
}

(async function main() {
  try {
    console.log("Standalone Password Hash Demo (unconnected to app)");

    const password = (await question("Enter password to hash: ")).trim();
    if (!password) {
      console.log("No password entered, exiting.");
      process.exit(0);
    }

    console.log(`\nOrigin text (original password): ${password}`);

    const saltRounds = 12;
    const hash = await bcrypt.hash(password, saltRounds);

    console.log(`Hashed password: ${hash}`);

    const verify = (await question("Re-enter password to verify: ")).trim();
    const isMatch = await bcrypt.compare(verify, hash);

    console.log(`\nVerification input: ${verify}`);
    console.log(`Match result: ${isMatch ? "✅ matches" : "❌ does not match"}`);

    console.log("\nDone. The script is standalone and not connected to any app DB.");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    rl.close();
  }
})();
