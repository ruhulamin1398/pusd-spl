# How to Use the Mint Tokens Script

## Overview
I've created a TypeScript script to call the `mint_by_operator` function from your deployed program on Solana devnet.

## Files Created
1. `scripts/mint-tokens.ts` - The main minting script
2. `scripts/README.md` - Detailed instructions
3. Updated `Makefile` - Added `mint-tokens` command

## Current Configuration
- **Program ID**: `9ftLECMyJfEk27kjxyrs3cPh8h6EtKET7gpj8v2RqN1e`
- **Token Mint**: `2g6GnMj75Uk5S7q7u3VPvmkGGYSEM3KSa7tUPe41QMma`
- **Token Account**: `GWSdoteVZbKm8wgwbXyzQ4Ceo39neqYyLzvop1qUagur`
- **Amount to Mint**: 1,000,000,000 (1 token with 9 decimals)

## Prerequisites

### 1. Set Mint Authority
The program or your wallet needs to have mint authority over the token:

```bash
# Option A: Set your wallet as mint authority
spl-token authorize 2g6GnMj75Uk5S7q7u3VPvmkGGYSEM3KSa7tUPe41QMma mint $(solana address)

# Option B: Set the program as mint authority
spl-token authorize 2g6GnMj75Uk5S7q7u3VPvmkGGYSEM3KSa7tUPe41QMma mint 9ftLECMyJfEk27kjxyrs3cPh8h6EtKET7gpj8v2RqN1e
```

### 2. Install Dependencies
```bash
npm install
```

## Running the Script

### Method 1: Using Make
```bash
make mint-tokens
```

### Method 2: Direct Execution
```bash
ts-node scripts/mint-tokens.ts
```

### Method 3: Using Anchor (if needed)
```bash
anchor run mint-tokens
```

## Customizing the Script

You can modify these parameters in `scripts/mint-tokens.ts`:

1. **Amount to mint** (line 48):
   ```typescript
   const amountToMint = new anchor.BN(1000000000); // Change this value
   ```

2. **Recipient token account** (line 42):
   ```typescript
   const recipientTokenAccount = new PublicKey("GWSdoteVZbKm8wgwbXyzQ4Ceo39neqYyLzvop1qUagur");
   ```

3. **Network** (line 14):
   ```typescript
   const connection = new anchor.web3.Connection(
     "https://api.devnet.solana.com", // Change for mainnet
     "confirmed"
   );
   ```

## Troubleshooting

### Error: "Mint authority not found"
Make sure you've set the mint authority correctly (see Prerequisites #1).

### Error: "Account not found"
Verify that:
- The token mint exists
- The token account exists
- You're connected to the correct network (devnet)

### Error: "Signature verification failed"
Make sure your wallet has enough SOL for transaction fees.

## Next Steps

After successfully minting:
1. Check the balance: `make token-accounts`
2. View transaction on explorer: The script will output the transaction URL
3. Verify on: https://explorer.solana.com/?cluster=devnet
