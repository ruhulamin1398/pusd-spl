import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PusdSpl } from "../target/types/pusd_spl";
import { PublicKey } from "@solana/web3.js";
import { execSync } from "child_process";

/**
 * Remove a role from a user (only Owner can call this)
 * Usage: ts-node scripts/removerole.ts <user_pubkey>
 * 
 * This will close the user's role account and refund rent to the owner
 */

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
  
  if (args.length < 1) {
    console.error("\n❌ Usage: ts-node scripts/removerole.ts <PUBKEY>");
    console.error("\nExample:");
    console.error("   make remove-role PUBKEY=5nPDz...");
    process.exit(1);
  }
  
  const userPubkey = new PublicKey(args[0]);
  
  // Setup
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  const program = anchor.workspace.PusdSpl as Program<PusdSpl>;
  const owner = provider.wallet;
  
  console.log("\n=== PUSD SPL Remove Role ===\n");
  console.log("Program ID:", program.programId.toString());
  console.log("Owner (Caller):", owner.publicKey.toString());
  console.log("Target User:", userPubkey.toString());
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
    console.error("❌ Owner role not found. The current wallet must have owner role to remove roles.");
    console.error("   Initialize the program first or switch to an owner account.");
    process.exit(1);
  }
  
  // Check if user has a role to remove
  try {
    const existingRole = await program.account.userRole.fetch(userRolePDA);
    const existingRoleName = Object.keys(existingRole.role)[0];
    console.log(`📋 User currently has '${existingRoleName}' role`);
    console.log(`   Role assigned: ${new Date(existingRole.roleActiveTime.toNumber() * 1000).toISOString()}`);
    console.log("");
  } catch (error) {
    console.error("❌ User has no role to remove!");
    console.error("   The user role account does not exist.");
    process.exit(1);
  }
  
  // Confirm removal
  console.log("⚠️  This will:");
  console.log("   • Remove the user's role permanently");
  console.log("   • Close the role account");
  console.log("   • Refund rent to the owner");
  console.log("");
  
  try {
    console.log("🔄 Sending remove_role transaction...");
    
    const tx = await program.methods
      .removeRole()
      .accountsStrict({
        ownerRole: ownerRolePDA,
        owner: owner.publicKey,
        userRole: userRolePDA,
      })
      .rpc();
    
    console.log("✅ Transaction signature:", tx);
    
    // Verify the role was removed by trying to fetch (should fail)
    try {
      await program.account.userRole.fetch(userRolePDA);
      console.log("\n⚠️  Warning: Role account still exists (this shouldn't happen)");
    } catch (error) {
      console.log("\n✅ Role removed successfully!");
      console.log("   Account closed, rent refunded to owner");
      console.log("   User:", userPubkey.toString());
      console.log("   Role PDA:", userRolePDA.toString());
    }
    
  } catch (error: any) {
    console.error("\n❌ Error removing role:");
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
