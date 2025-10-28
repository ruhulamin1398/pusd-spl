# Role-Based Access Control (RBAC) Guide

## Overview

Your PUSD SPL token program now has a comprehensive role-based access control system with three distinct roles:

### Roles

1. **Admin** - Can add and remove Authorized Contracts and Operators
2. **Authorized Contract** - Can call the `mint()` function to mint tokens
3. **Operator** - Can call the `mint_by_operator()` function to mint tokens

## Architecture

### UserRole Account
Each user can have one role stored in a PDA (Program Derived Address):
- **Seeds**: `["user_role", user_pubkey]`
- **Data**: User pubkey, Role enum, and bump seed

### Access Control Flow
```
┌─────────────────────────────────────────────────┐
│                    Admin                         │
│  (Can manage all other roles)                   │
└──────────────┬──────────────┬───────────────────┘
               │              │
               │              │
       ┌───────▼──────┐   ┌──▼────────────────┐
       │ Authorized   │   │    Operator       │
       │  Contract    │   │                   │
       │              │   │                   │
       │ Can call:    │   │ Can call:         │
       │ - mint()     │   │ - mint_by_operator│
       └──────────────┘   └───────────────────┘
```

## Functions

### 1. `initialize` - Setup Initial Admin
Called once to set up the first admin.

**Parameters:**
- `initial_admin`: Pubkey of the first admin

**Example:**
```typescript
await program.methods
  .initialize(adminWallet.publicKey)
  .accounts({
    userRole: adminRolePDA,
    payer: adminWallet.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

### 2. `add_role` - Admin Function
Add or update a user's role. Only callable by Admin.

**Parameters:**
- `user`: Pubkey of the user to assign the role
- `role`: Role enum (Admin, AuthorizedContract, or Operator)

**Example:**
```typescript
// Add an Authorized Contract
await program.methods
  .addRole(contractWallet.publicKey, { authorizedContract: {} })
  .accounts({
    adminRole: adminRolePDA,
    admin: adminWallet.publicKey,
    userRole: contractRolePDA,
    systemProgram: SystemProgram.programId,
  })
  .signers([adminWallet])
  .rpc();

// Add an Operator
await program.methods
  .addRole(operatorWallet.publicKey, { operator: {} })
  .accounts({
    adminRole: adminRolePDA,
    admin: adminWallet.publicKey,
    userRole: operatorRolePDA,
    systemProgram: SystemProgram.programId,
  })
  .signers([adminWallet])
  .rpc();
```

### 3. `remove_role` - Admin Function
Remove a user's role and close the account. Only callable by Admin.

**Example:**
```typescript
await program.methods
  .removeRole()
  .accounts({
    adminRole: adminRolePDA,
    admin: adminWallet.publicKey,
    userRole: userToRemoveRolePDA,
  })
  .signers([adminWallet])
  .rpc();
```

### 4. `mint` - Authorized Contract Function
Mint tokens to a recipient. Only callable by Authorized Contracts.

**Parameters:**
- `amount`: Amount of tokens to mint (in smallest unit)

**Example:**
```typescript
await program.methods
  .mint(new BN(1000000)) // 1 token with 6 decimals
  .accounts({
    contractRole: contractRolePDA,
    authorizedContract: contractWallet.publicKey,
    mint: mintAddress,
    recipient: recipientTokenAccount,
    mintAuthority: mintAuthorityPDA,
    tokenProgram: TOKEN_2022_PROGRAM_ID,
  })
  .signers([contractWallet])
  .rpc();
```

### 5. `mint_by_operator` - Operator Function
Mint tokens to a recipient. Only callable by Operators.

**Parameters:**
- `amount`: Amount of tokens to mint (in smallest unit)

**Example:**
```typescript
await program.methods
  .mintByOperator(new BN(500000)) // 0.5 token with 6 decimals
  .accounts({
    operatorRole: operatorRolePDA,
    operator: operatorWallet.publicKey,
    mint: mintAddress,
    recipient: recipientTokenAccount,
    mintAuthority: mintAuthorityPDA,
    tokenProgram: TOKEN_2022_PROGRAM_ID,
  })
  .signers([operatorWallet])
  .rpc();
```

## Helper Functions

### Derive User Role PDA
```typescript
function getUserRolePDA(programId: PublicKey, user: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("user_role"), user.toBuffer()],
    programId
  );
}
```

### Derive Mint Authority PDA
```typescript
function getMintAuthorityPDA(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("mint_authority")],
    programId
  );
}
```

## Deployment Steps

1. **Deploy the program:**
   ```bash
   anchor build
   anchor deploy
   ```

2. **Initialize with first admin:**
   ```bash
   # Run initialization script (see example below)
   ts-node scripts/initialize-rbac.ts
   ```

3. **Transfer mint authority to PDA** (if not done yet):
   ```bash
   # This makes the program's PDA the mint authority
   # so it can mint tokens on behalf of authorized users
   ```

4. **Add authorized contracts and operators:**
   ```bash
   # Use the add_role function as admin
   ```

## Security Considerations

1. **Admin Key Security**: The admin key has full control over roles. Protect it with:
   - Hardware wallet (Ledger/Trezor)
   - Multisig (using Squads Protocol)
   - Cold storage when not in use

2. **Role Separation**: 
   - Authorized Contracts should be verified smart contracts
   - Operators should be trusted individuals or automated systems
   - Never reuse keys across roles

3. **Auditing**: 
   - Log all role changes
   - Monitor mint operations
   - Regular security audits

4. **Upgrade Authority**: Consider using multisig for program upgrades

## Error Codes

- `Unauthorized`: User doesn't have the required role
- `RoleAlreadyAssigned`: Role already exists for this user (shouldn't happen with init_if_needed)
- `RoleNotFound`: Role doesn't exist when trying to remove

## Complete Example Script

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { PusdSpl } from "../target/types/pusd_spl";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  const program = anchor.workspace.PusdSpl as Program<PusdSpl>;
  const admin = provider.wallet;
  
  // Derive PDAs
  const [adminRolePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_role"), admin.publicKey.toBuffer()],
    program.programId
  );
  
  const [mintAuthorityPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("mint_authority")],
    program.programId
  );
  
  // 1. Initialize with admin
  console.log("Initializing program...");
  await program.methods
    .initialize(admin.publicKey)
    .accounts({
      userRole: adminRolePDA,
      payer: admin.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  console.log("Admin initialized:", admin.publicKey.toString());
  
  // 2. Create operator wallet (example)
  const operatorWallet = anchor.web3.Keypair.generate();
  const [operatorRolePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_role"), operatorWallet.publicKey.toBuffer()],
    program.programId
  );
  
  // 3. Add operator role
  console.log("Adding operator role...");
  await program.methods
    .addRole(operatorWallet.publicKey, { operator: {} })
    .accounts({
      adminRole: adminRolePDA,
      admin: admin.publicKey,
      userRole: operatorRolePDA,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  console.log("Operator added:", operatorWallet.publicKey.toString());
  
  console.log("\nSetup complete!");
  console.log("Admin:", admin.publicKey.toString());
  console.log("Operator:", operatorWallet.publicKey.toString());
  console.log("Mint Authority PDA:", mintAuthorityPDA.toString());
}

main();
```

## Testing

See `tests/rbac-tests.ts` for comprehensive test examples.

## Questions?

- Check program logs for detailed error messages
- Review the source code in `programs/pusd-spl/src/lib.rs`
- Test on devnet before mainnet deployment
