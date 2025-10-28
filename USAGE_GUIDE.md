# PUSD SPL Token - Usage Guide

## Overview
This guide explains how to use the PUSD Solana program that matches the Solidity smart contract functionality.

## Program Instructions

### 1. Initialize
Set up the program with an owner (admin) and operator.

```bash
anchor run initialize-rbac
# Or using TypeScript
ts-node scripts/initialize-rbac.ts
```

**Parameters:**
- `owner_address`: Pubkey - The admin/owner address (gets Admin role)
- `operator`: Pubkey - The operator address (gets Operator role)

**Accounts Required:**
- `owner_role`: PDA account for owner's role
- `operator_role`: PDA account for operator's role
- `payer`: Signer paying for account creation
- `system_program`: Solana System Program

### 2. Add Role
Grant a role to a user (Admin only).

```bash
ts-node scripts/manage-roles.ts add <USER_PUBKEY> <ROLE>
```

**Parameters:**
- `user`: Pubkey - The user to grant the role to
- `role`: Role enum - One of: `Admin`, `Operator`, `AuthorizedContract`

**Roles:**
- `Admin` (0): Can manage roles and upgrade program
- `Operator` (1): Can mint tokens
- `AuthorizedContract` (2): Can mint tokens (for contracts/programs)

**Accounts Required:**
- `admin_role`: Admin's role verification PDA
- `admin`: Signer with Admin role
- `user_role`: PDA for the new user's role (created if doesn't exist)
- `system_program`: Solana System Program

### 3. Remove Role
Revoke a user's role (Admin only).

```bash
ts-node scripts/manage-roles.ts remove <USER_PUBKEY>
```

**Accounts Required:**
- `admin_role`: Admin's role verification PDA
- `admin`: Signer with Admin role
- `user_role`: User's role PDA (will be closed, rent refunded)

### 4. Mint by Operator
Mint tokens to a recipient (Operator only).

```bash
ts-node scripts/mint-tokens.ts <RECIPIENT_PUBKEY> <AMOUNT>
```

**Parameters:**
- `amount`: u64 - Amount to mint (with 6 decimals)
  - Example: 1000000 = 1 PUSD

**Accounts Required:**
- `operator_role`: Operator's role verification PDA
- `operator`: Signer with Operator role
- `mint`: The PUSD token mint account
- `recipient`: Recipient's token account
- `mint_authority`: PDA controlling mint authority
- `token_program`: Token-2022 Program

**Example:**
```typescript
// Mint 100 PUSD (100 * 10^6)
const amount = 100 * 1_000_000;
await program.methods
  .mintByOperator(new BN(amount))
  .accounts({
    operatorRole: operatorRolePDA,
    operator: operatorKeypair.publicKey,
    mint: mintPubkey,
    recipient: recipientTokenAccount,
    mintAuthority: mintAuthorityPDA,
    tokenProgram: TOKEN_2022_PROGRAM_ID,
  })
  .signers([operatorKeypair])
  .rpc();
```

### 5. Mint (by Authorized Contract)
Mint tokens via authorized contract or program.

```bash
# Similar to mint_by_operator but requires AuthorizedContract role
```

**Parameters:**
- `amount`: u64 - Amount to mint (with 6 decimals)

**Accounts Required:**
- `contract_role`: Contract's role verification PDA
- `authorized_contract`: Signer with AuthorizedContract role
- `mint`: The PUSD token mint account
- `recipient`: Recipient's token account
- `mint_authority`: PDA controlling mint authority
- `token_program`: Token-2022 Program

### 6. Mint CPI (for Cross-Program Invocation)
Allows other Solana programs to mint via CPI.

**Rust Example:**
```rust
use anchor_lang::prelude::*;

// In your program:
let cpi_program = pusd_program.to_account_info();
let cpi_accounts = MintByCPI {
    program_role: program_role.to_account_info(),
    caller_program: caller_program.to_account_info(),
    mint: mint.to_account_info(),
    recipient: recipient.to_account_info(),
    mint_authority: mint_authority.to_account_info(),
    token_program: token_program.to_account_info(),
};
let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

pusd_spl::cpi::mint_cpi(cpi_ctx, amount)?;
```

### 7. Burn
Burn tokens from your own account.

**TypeScript Example:**
```typescript
const amount = 10 * 1_000_000; // Burn 10 PUSD

await program.methods
  .burn(new BN(amount))
  .accounts({
    mint: mintPubkey,
    tokenAccount: userTokenAccount,
    owner: userKeypair.publicKey,
    tokenProgram: TOKEN_2022_PROGRAM_ID,
  })
  .signers([userKeypair])
  .rpc();
```

**Parameters:**
- `amount`: u64 - Amount to burn (with 6 decimals)

**Accounts Required:**
- `mint`: The PUSD token mint account
- `token_account`: Your token account to burn from
- `owner`: Signer (you)
- `token_program`: Token-2022 Program

### 8. Transfer Mint Authority to PDA
Transfer control of minting to the program (one-time setup).

```bash
# After token creation, run once
ts-node scripts/transfer-authority.ts
```

**Accounts Required:**
- `mint`: The PUSD token mint account
- `current_authority`: Current mint authority (your wallet)
- `token_program`: Token-2022 Program

---

## PDA Derivations

### User Role PDA
```typescript
const [userRolePDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("user_role"), userPubkey.toBuffer()],
  programId
);
```

### Mint Authority PDA
```typescript
const [mintAuthorityPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("mint_authority")],
  programId
);
```

---

## Complete Setup Flow

### Step 1: Create Token
```bash
# Using Solana CLI or script
spl-token create-token --decimals 6 --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb
```

### Step 2: Deploy Program
```bash
anchor build
anchor deploy
```

### Step 3: Initialize Program
```bash
ts-node scripts/initialize-rbac.ts
```

### Step 4: Transfer Mint Authority
```bash
# Transfer mint authority from your wallet to the program's PDA
ts-node scripts/transfer-authority.ts
```

### Step 5: Create Token Accounts
```bash
# For recipients who need to receive tokens
spl-token create-account <MINT_ADDRESS>
```

### Step 6: Start Using
```bash
# Mint tokens
ts-node scripts/mint-tokens.ts <RECIPIENT> <AMOUNT>

# Burn tokens
# (User calls burn instruction)

# Manage roles
ts-node scripts/manage-roles.ts add <USER> <ROLE>
```

---

## Role Verification

All role-based instructions automatically verify:
1. The role PDA exists
2. The role matches the required role for the instruction
3. The signer is the user associated with the role

---

## Error Handling

Common errors and solutions:

### `Unauthorized`
- Ensure the signer has the required role
- Check that the role PDA exists
- Verify you're using the correct role account

### `InvalidAddress`
- Cannot use zero/default addresses
- Check all pubkeys are valid

### `RecipientIsZeroAddress`
- Recipient cannot be the default pubkey
- Ensure recipient token account exists

### Account Not Found
- Role account may not exist yet
- Call `add_role` first to create the role

### Mint Authority Error
- Ensure `transfer_mint_authority_to_pda` was called
- Verify the PDA is correctly derived

---

## Testing

Run the test suite:

```bash
anchor test
```

Individual test files:
```bash
# RBAC tests
anchor test -- --test-name rbac-tests

# Token operations
anchor test -- --test-name pusd-spl
```

---

## Comparison with Solidity

| Solidity Function | Solana Instruction | Notes |
|-------------------|-------------------|-------|
| `initialize(owner, operator)` | `initialize(owner, operator)` | Sets up admin and operator |
| `mint(to, amount)` | `mint(amount)` | By AuthorizedContract role |
| `mintByOperator(to, amount)` | `mint_by_operator(amount)` | By Operator role |
| `burn(amount)` | `burn(amount)` | Burns from signer's account |
| `grantRole(role, user)` | `add_role(user, role)` | Admin only |
| `revokeRole(role, user)` | `remove_role()` | Admin only |
| `version()` | `get_version()` | Returns "1.0" |
| `decimals()` | N/A | Set during token creation (6) |

---

## Security Notes

1. **Role Management**: Only Admin can add/remove roles
2. **Mint Authority**: Controlled by program PDA, not individual wallets
3. **Burn**: Users can only burn their own tokens
4. **Account Validation**: All instructions validate addresses and roles
5. **PDA Security**: PDAs are derived deterministically, cannot be forged

---

## Support & Documentation

- **Solidity Mapping**: See `SOLIDITY_TO_SOLANA_MAPPING.md`
- **RBAC Implementation**: See `RBAC_IMPLEMENTATION_SUMMARY.md`
- **Role Commands**: See `ROLE_COMMANDS.md`
- **Mint Instructions**: See `MINT_INSTRUCTIONS.md`

---

## Version
Program Version: 1.0  
Matches: PalmUSD Solidity Contract v1.0
