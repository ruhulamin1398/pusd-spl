import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { PusdSpl } from "../target/types/pusd_spl";

/**
 * Helper script to manage roles (add/remove)
 * Usage: 
 *   - Add role: ts-node scripts/manage-roles.ts add <user_pubkey> <role>
 *   - Remove role: ts-node scripts/manage-roles.ts remove <user_pubkey>
 * 
 * Roles: admin, contract, operator
 */

const ROLES = {
  admin: { admin: {} },
  contract: { authorizedContract: {} },
  operator: { operator: {} },
};

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log("Usage:");
    console.log("  Add role:    ts-node scripts/manage-roles.ts add <user_pubkey> <role>");
    console.log("  Remove role: ts-node scripts/manage-roles.ts remove <user_pubkey>");
    console.log("  Check role:  ts-node scripts/manage-roles.ts check <user_pubkey>");
    console.log("");
    console.log("Available roles: admin, contract, operator");
    process.exit(1);
  }
  
  const action = args[0];
  const userPubkey = new PublicKey(args[1]);
  
  // Setup
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  const program = anchor.workspace.PusdSpl as Program<PusdSpl>;
  const admin = provider.wallet;
  
  console.log("=== PUSD SPL Role Management ===\n");
  console.log("Program ID:", program.programId.toString());
  console.log("Admin:", admin.publicKey.toString());
  console.log("Target User:", userPubkey.toString());
  console.log("");
  
  // Derive PDAs
  const [adminRolePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_role"), admin.publicKey.toBuffer()],
    program.programId
  );
  
  const [userRolePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_role"), userPubkey.toBuffer()],
    program.programId
  );
  
  // Verify admin has admin role
  try {
    const adminRole = await program.account.userRole.fetch(adminRolePDA);
    if (!("admin" in adminRole.role)) {
      console.error("❌ Current wallet does not have admin role!");
      process.exit(1);
    }
    console.log("✓ Admin role verified");
  } catch (error) {
    if (action !== "check") {
      console.error("❌ Admin role not found. Initialize the program first.");
      process.exit(1);
    }
  }
  
  if (action === "check") {
    console.log("Checking role for user...");
    
    try {
      const userRole = await program.account.userRole.fetch(userRolePDA);
      console.log("\n✅ Role found!");
      console.log("  User:", userRole.user.toString());
      console.log("  Role:", Object.keys(userRole.role)[0]);
      console.log("  PDA:", userRolePDA.toString());
    } catch (error) {
      console.log("❌ No role found for this user");
    }
    
  } else if (action === "add") {
    if (args.length < 3) {
      console.error("❌ Please specify a role: admin, contract, or operator");
      process.exit(1);
    }
    
    const roleName = args[2].toLowerCase();
    const roleEnum = ROLES[roleName];
    
    if (!roleEnum) {
      console.error(`❌ Invalid role: ${roleName}`);
      console.log("Available roles: admin, contract, operator");
      process.exit(1);
    }
    
    console.log(`Adding ${roleName} role to user...`);
    
    try {
      const tx = await program.methods
        .addRole(userPubkey, roleEnum)
        .accounts({
          adminRole: adminRolePDA,
          admin: admin.publicKey,
          userRole: userRolePDA,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      
      console.log("✅ Role added successfully!");
      console.log("Transaction signature:", tx);
      
      // Verify
      const userRole = await program.account.userRole.fetch(userRolePDA);
      console.log("\nVerified role:");
      console.log("  User:", userRole.user.toString());
      console.log("  Role:", userRole.role);
      console.log("  PDA:", userRolePDA.toString());
      
    } catch (error) {
      console.error("❌ Error adding role:");
      console.error(error);
      throw error;
    }
    
  } else if (action === "remove") {
    console.log("Removing role from user...");
    
    try {
      const tx = await program.methods
        .removeRole()
        .accounts({
          adminRole: adminRolePDA,
          admin: admin.publicKey,
          userRole: userRolePDA,
        })
        .rpc();
      
      console.log("✅ Role removed successfully!");
      console.log("Transaction signature:", tx);
      console.log("Account closed, rent refunded to admin");
      
    } catch (error) {
      console.error("❌ Error removing role:");
      console.error(error);
      throw error;
    }
    
  } else {
    console.error(`❌ Invalid action: ${action}`);
    console.log("Valid actions: add, remove, check");
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
