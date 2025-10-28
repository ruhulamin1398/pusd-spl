import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PusdSpl } from "../target/types/pusd_spl";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { execSync } from "child_process";

/**
 * Assign a role to a user (only Owner can call this)
 * Usage: ts-node scripts/assignrole.ts <user_pubkey> <role>
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
    console.error("\n❌ Usage: ts-node scripts/assignrole.ts <PUBKEY> <ROLE>");
    console.error("   ROLE options: owner, operator, contract");
    console.error("\nExample:");
    console.error("   make assign-role PUBKEY=5nPDz... ROLE=operator");
    process.exit(1);
  }
  
  const userPubkey = new PublicKey(args[0]);
  const roleName = args[1].toLowerCase();
  
  const roleEnum = ROLES[roleName];
  
  if (!roleEnum) {
    console.error(`\n❌ Invalid role: ${roleName}`);
    console.error("   Available roles: owner, operator, contract");
    process.exit(1);
  }
  
  // Setup
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  const program = anchor.workspace.PusdSpl as Program<PusdSpl>;
  const owner = provider.wallet;
  
  console.log("\n=== PUSD SPL Assign Role ===\n");
  console.log("Program ID:", program.programId.toString());
  console.log("Owner (Caller):", owner.publicKey.toString());
  console.log("Target User:", userPubkey.toString());
  console.log("Role to Assign:", roleName);
  console.log("");
  
  // Derive PDAs
  const [ownerRolePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_role"), owner.publicKey.toBuffer()],
    program.programId
  );
  
  const [userRolePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_role"), userPubkey.toBuffer()],
    program.programId
  );
  
  console.log("Owner Role PDA:", ownerRolePDA.toString());
  console.log("User Role PDA:", userRolePDA.toString());
  console.log("");
  
  // Verify owner has owner role
  try {
    const ownerRole = await program.account.userRole.fetch(ownerRolePDA);
    const ownerRoleName = Object.keys(ownerRole.role)[0];
    
    if (ownerRoleName !== "owner") {
      console.error(`❌ Current wallet does not have owner role!`);
      console.error(`   Current wallet has '${ownerRoleName}' role`);
      process.exit(1);
    }
    console.log("✅ Owner role verified");
  } catch (error) {
    console.error("❌ Owner role not found. The current wallet must have owner role to assign roles.");
    console.error("   Initialize the program first or switch to an owner account.");
    process.exit(1);
  }
  
  // Check if user already has a role
  try {
    const existingRole = await program.account.userRole.fetch(userRolePDA);
    const existingRoleName = Object.keys(existingRole.role)[0];
    console.log(`⚠️  User already has '${existingRoleName}' role`);
    console.log(`   Updating to '${roleName}' role...\n`);
  } catch (error) {
    console.log("📝 User has no existing role, creating new role account...\n");
  }
  
  try {
    console.log("🔄 Sending add_role transaction...");
    
    const tx = await program.methods
      .addRole(userPubkey, roleEnum)
      .accountsStrict({
        ownerRole: ownerRolePDA,
        owner: owner.publicKey,
        userRole: userRolePDA,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    
    console.log("✅ Transaction signature:", tx);
    
    // Verify the role was assigned
    const userRole = await program.account.userRole.fetch(userRolePDA);
    const assignedRoleName = Object.keys(userRole.role)[0];
    
    console.log("\n✅ Role assigned successfully!");
    console.log("\n📋 User Role Details:");
    console.log("  User:", userRole.user.toString());
    console.log("  Role:", assignedRoleName);
    console.log("  Role PDA:", userRolePDA.toString());
    console.log("  Active Since:", new Date(userRole.roleActiveTime.toNumber() * 1000).toISOString());
    
  } catch (error: any) {
    console.error("\n❌ Error assigning role:");
    console.error(error.message || error);
    if (error.logs) {
      console.error("\nProgram Logs:");
      error.logs.forEach((log: string) => console.error(log));
    }
    throw error;
  }
}

main()
  .then(() => {
    console.log("\n✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });
