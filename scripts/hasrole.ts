import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { PusdSpl } from "../target/types/pusd_spl";
import { execSync } from "child_process";

/**
 * Check if a user has a specific role
 * Usage: ts-node scripts/hasrole.ts <user_pubkey> <role>
 * 
 * Roles: owner, operator, contract
 */

const ROLES = {
  owner: { owner: {} },
  admin: { owner: {} },  // alias
  operator: { operator: {} },
  contract: { authorizedContract: {} },
};

async function main() {
  // Auto-detect Solana wallet and RPC URL if not set in environment
  if (!process.env.ANCHOR_WALLET) {
    try {
      const keypairPath = execSync("solana config get | grep 'Keypair Path' | awk '{print $3}'", {
        encoding: "utf-8",
      }).trim();
      process.env.ANCHOR_WALLET = keypairPath;
      console.log("📁 Auto-detected wallet:", keypairPath);
    } catch (error) {
      console.error("❌ Could not detect Solana wallet. Please set ANCHOR_WALLET or run 'solana config set --keypair <path>'");
      process.exit(1);
    }
  }

  if (!process.env.ANCHOR_PROVIDER_URL) {
    process.env.ANCHOR_PROVIDER_URL = "https://api.devnet.solana.com";
    console.log("🌐 Using default RPC:", process.env.ANCHOR_PROVIDER_URL);
  }

  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log("Usage: ts-node scripts/hasrole.ts <user_pubkey> <role>");
    console.log("");
    console.log("Available roles: owner, operator, contract");
    console.log("Example: ts-node scripts/hasrole.ts AyB64MyXyUsHFaauWspTE1hxN3VPwd7ofDas8D1QFJsR owner");
    process.exit(1);
  }
  
  const userPubkey = new PublicKey(args[0]);
  const roleName = args[1].toLowerCase();
  
  const roleEnum = ROLES[roleName];
  
  if (!roleEnum) {
    console.error(`❌ Invalid role: ${roleName}`);
    console.log("Available roles: owner, operator, contract");
    process.exit(1);
  }
  
  // Setup
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  const program = anchor.workspace.PusdSpl as Program<PusdSpl>;
  
  console.log("=== PUSD SPL Has Role Check ===\n");
  console.log("Program ID:", program.programId.toString());
  console.log("Checking User:", userPubkey.toString());
  console.log("Expected Role:", roleName);
  console.log("");
  
  // Derive user role PDA
  const [userRolePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_role"), userPubkey.toBuffer()],
    program.programId
  );
  
  console.log("User Role PDA:", userRolePDA.toString());
  console.log("");
  
  try {
    // Fetch the user role account
    const userRole = await program.account.userRole.fetch(userRolePDA);
    
    // Check if the role matches
    const actualRoleName = Object.keys(userRole.role)[0];
    const expectedRoleName = Object.keys(roleEnum)[0];
    
    const hasRole = actualRoleName === expectedRoleName;
    
    console.log("Account Details:");
    console.log("  User:", userRole.user.toString());
    console.log("  Actual Role:", actualRoleName);
    console.log("  Role Active Since:", new Date(userRole.roleActiveTime.toNumber() * 1000).toISOString());
    console.log("");
    
    if (hasRole) {
      console.log(`✅ YES - User has ${roleName} role`);
      process.exit(0);
    } else {
      console.log(`❌ NO - User has ${actualRoleName} role (not ${roleName})`);
      process.exit(1);
    }
    
  } catch (error) {
    if (error.message?.includes("Account does not exist")) {
      console.log("❌ NO - User has no role assigned");
      console.log("(Role account does not exist)");
      process.exit(1);
    } else {
      console.error("❌ Error checking role:");
      console.error(error);
      throw error;
    }
  }
}

main()
  .then(() => {})
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
