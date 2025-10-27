# Mint Tokens Script

This script calls the `mint_by_operator` function to mint tokens.

## Prerequisites

1. The program must have mint authority over the token
2. You need a token account to receive the minted tokens
3. Your wallet must be the mint authority

## Setup

1. Install dependencies (if not already installed):
```bash
npm install
```

2. Make sure you have a token account for the mint. If not, create one:
```bash
spl-token create-account 2g6GnMj75Uk5S7q7u3VPvmkGGYSEM3KSa7tUPe41QMma
```

3. Update the script `scripts/mint-tokens.ts`:
   - Replace `YOUR_TOKEN_ACCOUNT_ADDRESS_HERE` with your token account address
   - Adjust the `amountToMint` if needed

4. Make sure the mint authority is set to your wallet or the program:
```bash
# To set your wallet as mint authority:
spl-token authorize 2g6GnMj75Uk5S7q7u3VPvmkGGYSEM3KSa7tUPe41QMma mint <YOUR_WALLET_ADDRESS>

# Or to set the program as mint authority:
spl-token authorize 2g6GnMj75Uk5S7q7u3VPvmkGGYSEM3KSa7tUPe41QMma mint 9ftLECMyJfEk27kjxyrs3cPh8h6EtKET7gpj8v2RqN1e
```

## Run the Script

```bash
ts-node scripts/mint-tokens.ts
```

## Using with Makefile

You can add this to your Makefile for easy execution:

```makefile
mint-tokens:; ts-node scripts/mint-tokens.ts
```

Then run:
```bash
make mint-tokens
```
