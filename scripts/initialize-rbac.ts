import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { PusdSpl } from "../target/types/pusd_spl";

/**
 * Helper script to initialize the RBAC system with the first admin
 * Run this after deploying your program for the first time
 */
async function main() {
  // Setup
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  const program = anchor.workspace.PusdSpl as Program<PusdSpl>;
  const admin = provider.wallet;
  
  console.log("=== PUSD SPL RBAC Initialization ===\n");
  console.log("Program ID:", program.programId.toString());
  console.log("Admin Wallet:", admin.publicKey.toString());
  console.log("Cluster:", provider.connection.rpcEndpoint);
  console.log("");
  
  // Derive admin role PDA
  const [adminRolePDA, adminBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_role"), admin.publicKey.toBuffer()],
    program.programId
  );
  
  console.log("Admin Role PDA:", adminRolePDA.toString());
  console.log("Admin Role Bump:", adminBump);
  console.log("");
  
  // Check if already initialized
  try {
    const existingRole = await program.account.userRole.fetch(adminRolePDA);
    console.log("⚠️  Admin role already initialized!");
    console.log("Existing role:", existingRole);
    return;
  } catch (error) {
    // Account doesn't exist, proceed with initialization
    console.log("Initializing admin role...");
  }
  
  // Initialize with admin
  try {
    const tx = await program.methods
      .initialize(admin.publicKey)
      .accounts({
        userRole: adminRolePDA,
        payer: admin.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    
    console.log("✅ Admin role initialized successfully!");
    console.log("Transaction signature:", tx);
    console.log("");
    
    // Verify the initialization
    const adminRole = await program.account.userRole.fetch(adminRolePDA);
    console.log("Verified admin role:");
    console.log("  User:", adminRole.user.toString());
    console.log("  Role:", adminRole.role);
    console.log("  Bump:", adminRole.bump);
    
    console.log("\n=== Next Steps ===");
    console.log("1. Transfer mint authority to PDA (if not done yet)");
    console.log("2. Add authorized contracts using add_role");
    console.log("3. Add operators using add_role");
    console.log("\nSee RBAC_GUIDE.md for more information.");
    
  } catch (error) {
    console.error("❌ Error initializing admin role:");
    console.error(error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
