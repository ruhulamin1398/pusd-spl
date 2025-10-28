import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  createMint,
  createAccount,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { PusdSpl } from "../target/types/pusd_spl";
import { assert } from "chai";

describe("RBAC Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.PusdSpl as Program<PusdSpl>;
  
  // Wallets
  const admin = provider.wallet as anchor.Wallet;
  const operator = Keypair.generate();
  const authorizedContract = Keypair.generate();
  const unauthorizedUser = Keypair.generate();
  
  let mint: PublicKey;
  let recipientTokenAccount: PublicKey;
  
  // PDAs
  let adminRolePDA: PublicKey;
  let operatorRolePDA: PublicKey;
  let contractRolePDA: PublicKey;
  let mintAuthorityPDA: PublicKey;

  before(async () => {
    // Derive all PDAs
    [adminRolePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_role"), admin.publicKey.toBuffer()],
      program.programId
    );

    [operatorRolePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_role"), operator.publicKey.toBuffer()],
      program.programId
    );

    [contractRolePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_role"), authorizedContract.publicKey.toBuffer()],
      program.programId
    );

    [mintAuthorityPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("mint_authority")],
      program.programId
    );

    // Airdrop SOL to test wallets
    await provider.connection.requestAirdrop(
      operator.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.requestAirdrop(
      authorizedContract.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.requestAirdrop(
      unauthorizedUser.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );

    // Wait for airdrops
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Create Token-2022 mint with admin as initial authority
    mint = await createMint(
      provider.connection,
      admin.payer,
      admin.publicKey,
      null,
      6, // decimals
      Keypair.generate(),
      undefined,
      TOKEN_2022_PROGRAM_ID
    );

    // Create recipient token account
    const recipientAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      admin.payer,
      mint,
      admin.publicKey,
      false,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
    recipientTokenAccount = recipientAccount.address;

    console.log("Setup complete");
    console.log("Mint:", mint.toString());
    console.log("Admin:", admin.publicKey.toString());
    console.log("Mint Authority PDA:", mintAuthorityPDA.toString());
  });

  it("Initializes program with admin role", async () => {
    await program.methods
      .initialize(admin.publicKey)
      .accounts({
        userRole: adminRolePDA,
        payer: admin.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const adminRole = await program.account.userRole.fetch(adminRolePDA);
    assert.equal(adminRole.user.toString(), admin.publicKey.toString());
    assert.deepEqual(adminRole.role, { admin: {} });
    
    console.log("✓ Admin role initialized");
  });

  it("Transfers mint authority to PDA", async () => {
    await program.methods
      .transferMintAuthorityToPda()
      .accounts({
        mint: mint,
        currentAuthority: admin.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .rpc();

    console.log("✓ Mint authority transferred to PDA");
  });

  it("Admin can add operator role", async () => {
    await program.methods
      .addRole(operator.publicKey, { operator: {} })
      .accounts({
        adminRole: adminRolePDA,
        admin: admin.publicKey,
        userRole: operatorRolePDA,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const operatorRole = await program.account.userRole.fetch(operatorRolePDA);
    assert.equal(operatorRole.user.toString(), operator.publicKey.toString());
    assert.deepEqual(operatorRole.role, { operator: {} });
    
    console.log("✓ Operator role added");
  });

  it("Admin can add authorized contract role", async () => {
    await program.methods
      .addRole(authorizedContract.publicKey, { authorizedContract: {} })
      .accounts({
        adminRole: adminRolePDA,
        admin: admin.publicKey,
        userRole: contractRolePDA,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const contractRole = await program.account.userRole.fetch(contractRolePDA);
    assert.equal(
      contractRole.user.toString(),
      authorizedContract.publicKey.toString()
    );
    assert.deepEqual(contractRole.role, { authorizedContract: {} });
    
    console.log("✓ Authorized contract role added");
  });

  it("Operator can mint tokens", async () => {
    const amount = new BN(1_000_000); // 1 token with 6 decimals

    await program.methods
      .mintByOperator(amount)
      .accounts({
        operatorRole: operatorRolePDA,
        operator: operator.publicKey,
        mint: mint,
        recipient: recipientTokenAccount,
        mintAuthority: mintAuthorityPDA,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([operator])
      .rpc();

    console.log("✓ Operator successfully minted tokens");
  });

  it("Authorized contract can mint tokens", async () => {
    const amount = new BN(2_000_000); // 2 tokens with 6 decimals

    await program.methods
      .mint(amount)
      .accounts({
        contractRole: contractRolePDA,
        authorizedContract: authorizedContract.publicKey,
        mint: mint,
        recipient: recipientTokenAccount,
        mintAuthority: mintAuthorityPDA,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([authorizedContract])
      .rpc();

    console.log("✓ Authorized contract successfully minted tokens");
  });

  it("Unauthorized user cannot mint tokens", async () => {
    const [unauthorizedRolePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_role"), unauthorizedUser.publicKey.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .mintByOperator(new BN(1_000_000))
        .accounts({
          operatorRole: unauthorizedRolePDA,
          operator: unauthorizedUser.publicKey,
          mint: mint,
          recipient: recipientTokenAccount,
          mintAuthority: mintAuthorityPDA,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .signers([unauthorizedUser])
        .rpc();
      
      assert.fail("Should have thrown error");
    } catch (error) {
      assert.include(error.toString(), "AccountNotInitialized");
      console.log("✓ Unauthorized user correctly rejected");
    }
  });

  it("Non-admin cannot add roles", async () => {
    const newUser = Keypair.generate();
    const [newUserRolePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_role"), newUser.publicKey.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .addRole(newUser.publicKey, { operator: {} })
        .accounts({
          adminRole: operatorRolePDA, // Using operator instead of admin
          admin: operator.publicKey,
          userRole: newUserRolePDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([operator])
        .rpc();
      
      assert.fail("Should have thrown error");
    } catch (error) {
      assert.include(error.toString(), "Unauthorized");
      console.log("✓ Non-admin correctly rejected from adding roles");
    }
  });

  it("Operator cannot call authorized contract mint function", async () => {
    try {
      await program.methods
        .mint(new BN(1_000_000))
        .accounts({
          contractRole: operatorRolePDA, // Using operator role instead of contract
          authorizedContract: operator.publicKey,
          mint: mint,
          recipient: recipientTokenAccount,
          mintAuthority: mintAuthorityPDA,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .signers([operator])
        .rpc();
      
      assert.fail("Should have thrown error");
    } catch (error) {
      assert.include(error.toString(), "Unauthorized");
      console.log("✓ Operator correctly rejected from contract mint function");
    }
  });

  it("Admin can remove roles", async () => {
    await program.methods
      .removeRole()
      .accounts({
        adminRole: adminRolePDA,
        admin: admin.publicKey,
        userRole: operatorRolePDA,
      })
      .rpc();

    // Try to fetch the account - it should not exist
    try {
      await program.account.userRole.fetch(operatorRolePDA);
      assert.fail("Should have thrown error");
    } catch (error) {
      assert.include(error.toString(), "Account does not exist");
      console.log("✓ Role successfully removed");
    }
  });

  it("Removed user cannot mint tokens", async () => {
    try {
      await program.methods
        .mintByOperator(new BN(1_000_000))
        .accounts({
          operatorRole: operatorRolePDA,
          operator: operator.publicKey,
          mint: mint,
          recipient: recipientTokenAccount,
          mintAuthority: mintAuthorityPDA,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .signers([operator])
        .rpc();
      
      assert.fail("Should have thrown error");
    } catch (error) {
      assert.include(error.toString(), "AccountNotInitialized");
      console.log("✓ Removed user correctly rejected");
    }
  });
});
