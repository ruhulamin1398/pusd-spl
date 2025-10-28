import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PusdSpl } from "../target/types/pusd_spl";
import { PublicKey } from "@solana/web3.js";
import { execSync } from "child_process";

/**
 * Script to mint tokens using the mint_by_operator function
 * 
 * Usage:
 *   ts-node scripts/mint-tokens.ts <recipient_token_account> <amount>
 *   make mint-tokens RECIPIENT=<token_account> AMOUNT=<amount>
 * 
 * The caller must have Operator role
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

  // Configure the client
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.PusdSpl as Program<PusdSpl>;
  const operator = provider.wallet;

  // Get arguments from command line or use defaults
  const args = process.argv.slice(2);
  
  // Default values (can be overridden by command line args)
  const mintAddress = new PublicKey("7X6dcotdgssn6wqkHhVSxGnrGkWoCGq4HddqBX5xeGhg");
  
  let recipientTokenAccount: PublicKey;
  let amountToMint: anchor.BN;

  if (args.length >= 2) {
    recipientTokenAccount = new PublicKey(args[0]);
    amountToMint = new anchor.BN(args[1]);
  } else {
    // Use defaults if no arguments provided
    recipientTokenAccount = new PublicKey("DEht81K4NN6iseyzfYxYD2oEsSbHRL2ZjX121iVCXkPQ");
    amountToMint = new anchor.BN(1000000000); // 1 token with 9 decimals
    console.log("⚠️  No arguments provided, using default values");
  }

  console.log("\n=== PUSD SPL Mint Tokens ===\n");
  console.log("Program ID:", program.programId.toString());
  console.log("Operator (Caller):", operator.publicKey.toString());
  console.log("Mint Address:", mintAddress.toString());
  console.log("Recipient Token Account:", recipientTokenAccount.toString());
  console.log("Amount to Mint:", amountToMint.toString());
  console.log("");

  // Derive PDAs
  const [operatorRolePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_role"), operator.publicKey.toBuffer()],
    program.programId
  );

  const [mintAuthorityPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("mint_authority")],
    program.programId
  );

  console.log("Operator Role PDA:", operatorRolePDA.toString());
  console.log("Mint Authority PDA:", mintAuthorityPDA.toString());
  console.log("");

  // Verify operator has operator role
  try {
    const operatorRole = await program.account.userRole.fetch(operatorRolePDA);
    const roleName = Object.keys(operatorRole.role)[0];
    
    if (roleName !== "operator") {
      console.error(`❌ Current wallet does not have operator role!`);
      console.error(`   Current wallet has '${roleName}' role`);
      console.error("   Only operators can mint tokens");
      process.exit(1);
    }
    console.log("✅ Operator role verified");
  } catch (error) {
    console.error("❌ Operator role not found. The current wallet must have operator role to mint tokens.");
    console.error("   Assign operator role first or switch to an operator account.");
    process.exit(1);
  }

  try {
    console.log("\n🔄 Sending mint_by_operator transaction...");
    
    const tx = await program.methods
      .mintByOperator(amountToMint)
      .accountsStrict({
        operatorRole: operatorRolePDA,
        operator: operator.publicKey,
        mint: mintAddress,
        recipient: recipientTokenAccount,
        mintAuthority: mintAuthorityPDA,
        tokenProgram: new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"), // Token-2022 program
      })
      .rpc();

    console.log("\n✅ Tokens minted successfully!");
    console.log("Transaction signature:", tx);
    console.log(`View transaction: https://explorer.solana.com/tx/${tx}?cluster=devnet`);
    console.log("");
    console.log("📊 Mint Details:");
    console.log("  Recipient:", recipientTokenAccount.toString());
    console.log("  Amount:", amountToMint.toString());
    console.log("  Minted by:", operator.publicKey.toString());

  } catch (error: any) {
    console.error("\n❌ Error minting tokens:");
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
