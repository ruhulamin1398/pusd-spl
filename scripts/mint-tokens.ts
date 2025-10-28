import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PusdSpl } from "../target/types/pusd_spl";
import { PublicKey, Keypair } from "@solana/web3.js";
import * as fs from "fs";

/**
 * Script to mint tokens using the mint_by_operator function
 * 
 * Usage:
 * ts-node scripts/mint-tokens.ts
 */

async function main() {
  // Configure the client to use devnet
  const connection = new anchor.web3.Connection(
    "https://api.devnet.solana.com",
    "confirmed"
  );

  // Set up the provider with your wallet
  // Use ANCHOR_WALLET env var or default to Solana CLI config
  const walletPath = process.env.ANCHOR_WALLET || `${process.env.HOME}/.config/solana/id.json`;
  const walletKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );
  const wallet = new anchor.Wallet(walletKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);

  // Load the program
  const programId = new PublicKey("9ftLECMyJfEk27kjxyrs3cPh8h6EtKET7gpj8v2RqN1e");
  const idl = require("../target/idl/pusd_spl.json");
  const program = new Program(
    idl,
    provider
  ) as Program<PusdSpl>;

  // Token mint address (Token-2022)
  const mintAddress = new PublicKey("7X6dcotdgssn6wqkHhVSxGnrGkWoCGq4HddqBX5xeGhg");

  // Recipient token account address
  // This is the token account where tokens will be minted
  const recipientTokenAccount = new PublicKey("DEht81K4NN6iseyzfYxYD2oEsSbHRL2ZjX121iVCXkPQ");

  // Derive the mint authority PDA
  const [mintAuthorityPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("mint_authority")],
    programId
  );

  // Amount to mint (in smallest units, considering decimals)
  // For example, if token has 9 decimals, 1000000000 = 1 token
  const amountToMint = new anchor.BN(1000000000); // 1 token with 9 decimals

  console.log("Program ID:", programId.toString());
  console.log("Mint Address:", mintAddress.toString());
  console.log("Recipient Token Account:", recipientTokenAccount.toString());
  console.log("Mint Authority PDA:", mintAuthorityPDA.toString());
  console.log("Wallet:", provider.wallet.publicKey.toString());
  console.log("Amount to Mint:", amountToMint.toString());

  try {
    // Call the mint_by_operator function
    // Note: mintAuthority PDA is auto-derived, no need to pass it explicitly
    const tx = await program.methods
      .mintByOperator(amountToMint)
      .accounts({
        mint: mintAddress,
        recipient: recipientTokenAccount,
      })
      .rpc();

    console.log("\n✅ Success!");
    console.log("Transaction signature:", tx);
    console.log(
      `View transaction: https://explorer.solana.com/tx/${tx}?cluster=devnet`
    );
  } catch (error: any) {
    console.error("\n❌ Error minting tokens:");
    console.error(error);
    
    if (error.logs) {
      console.error("\nProgram logs:");
      error.logs.forEach((log: string) => console.error(log));
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
