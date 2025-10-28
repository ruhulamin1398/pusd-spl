import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PusdSpl } from "../target/types/pusd_spl";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

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
  const payer = provider.wallet as anchor.Wallet;

  console.log("\n🚀 Initializing PUSD Program...\n");
  console.log("Program ID:", program.programId.toString());
  console.log("Payer:", payer.publicKey.toString());

  // Get owner and operator addresses from command line or use defaults
  const args = process.argv.slice(2);
  let ownerAddress: PublicKey;
  let operatorAddress: PublicKey;

  if (args.length >= 2) {
    ownerAddress = new PublicKey(args[0]);
    operatorAddress = new PublicKey(args[1]);
    console.log("\n📋 Using provided addresses:");
  } else {
    // Default: use payer as both owner and operator
    ownerAddress = payer.publicKey;
    operatorAddress = payer.publicKey;
    console.log("\n📋 No addresses provided, using payer for both roles:");
  }

  console.log("Owner Address:", ownerAddress.toString());
  console.log("Operator Address:", operatorAddress.toString());

  // Derive PDAs
  const [programStatePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("program_state")],
    program.programId
  );

  const [ownerRolePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_role"), ownerAddress.toBuffer()],
    program.programId
  );

  const [operatorRolePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_role"), operatorAddress.toBuffer()],
    program.programId
  );

  // Get program data account for upgrade authority verification
  const [programDataAddress] = PublicKey.findProgramAddressSync(
    [program.programId.toBuffer()],
    new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111")
  );

  console.log("\n🔑 Derived PDAs:");
  console.log("Program State PDA:", programStatePDA.toString());
  console.log("Owner Role PDA:", ownerRolePDA.toString());
  console.log("Operator Role PDA:", operatorRolePDA.toString());
  console.log("Program Data Address:", programDataAddress.toString());

  try {
    // DON'T check initialization state here - let the on-chain program check authority FIRST
    // The on-chain program checks in this order:
    // 1. Upgrade authority (FIRST - most important security check)
    // 2. Already initialized
    // 3. Address validation
    console.log("\n📝 Sending initialize transaction...");
    console.log("⚠️  Note: The program will verify upgrade authority on-chain before initialization");

    const tx = await program.methods
      .initialize(ownerAddress, operatorAddress)
      .accountsStrict({
        programState: programStatePDA,
        ownerRole: ownerRolePDA,
        operatorRole: operatorRolePDA,
        programData: programDataAddress,
        payer: payer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("\n✅ Initialize transaction signature:", tx);

    // // Fetch and display the created accounts
    // console.log("\n📊 Fetching initialized accounts...");

    // const programState = await program.account.programState.fetch(programStatePDA);
    // console.log("\nProgram State:", {
    //   isInitialized: programState.isInitialized,
    //   bump: programState.bump,
    // });

    // const ownerRole = await program.account.userRole.fetch(ownerRolePDA);
    // console.log("\nOwner Role:", {
    //   user: ownerRole.user.toString(),
    //   role: Object.keys(ownerRole.role)[0],
    //   roleActiveTime: new Date(ownerRole.roleActiveTime.toNumber() * 1000).toISOString(),
    // });

    // const operatorRole = await program.account.userRole.fetch(operatorRolePDA);
    // console.log("\nOperator Role:", {
    //   user: operatorRole.user.toString(),
    //   role: Object.keys(operatorRole.role)[0],
    //   roleActiveTime: new Date(operatorRole.roleActiveTime.toNumber() * 1000).toISOString(),
    // });

    // // Save initialization info to file
    // const initInfo = {
    //   programId: program.programId.toString(),
    //   programStatePDA: programStatePDA.toString(),
    //   owner: {
    //     address: ownerAddress.toString(),
    //     rolePDA: ownerRolePDA.toString(),
    //   },
    //   operator: {
    //     address: operatorAddress.toString(),
    //     rolePDA: operatorRolePDA.toString(),
    //   },
    //   transactionSignature: tx,
    //   timestamp: new Date().toISOString(),
    // };

    // const initFilePath = path.join(__dirname, "../.init-info.json");
    // fs.writeFileSync(initFilePath, JSON.stringify(initInfo, null, 2));
    // console.log("\n💾 Initialization info saved to .init-info.json");

    // console.log("\n🎉 Program initialization complete!");
    // console.log("\n📝 Next steps:");
    // console.log("1. Create your SPL Token-2022 mint");
    // console.log("2. Transfer mint authority to program PDA");
    // console.log("3. Use 'make add-role' to add more roles");
    // console.log("4. Use 'make mint' to mint tokens");

  } catch (error) {
    console.error("\n❌ Error initializing program:", error);
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
