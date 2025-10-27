#!/bin/bash

# Script to create a new Token-2022 token with PDA as mint authority
# This ensures the program can mint tokens using the PDA

set -e

echo "Creating new Token-2022 with metadata..."
echo ""

# Calculate the PDA that will be the mint authority
PROGRAM_ID="9ftLECMyJfEk27kjxyrs3cPh8h6EtKET7gpj8v2RqN1e"
PDA="4ph4YUFNV8pithois4scjnwyeRBQb92ksiCtEDj1WSvj"

echo "Program ID: $PROGRAM_ID"
echo "PDA (Mint Authority): $PDA"
echo ""

# Create the token with metadata enabled
echo "Step 1: Creating token..."
TOKEN_MINT=$(spl-token create-token \
  --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \
  --enable-metadata \
  --decimals 6 \
  2>&1 | grep "Creating token" | awk '{print $3}')

if [ -z "$TOKEN_MINT" ]; then
  echo "Error: Failed to create token"
  exit 1
fi

echo "Token created: $TOKEN_MINT"
echo ""

# Transfer mint authority to PDA
echo "Step 2: Initializing token metadata..."

spl-token initialize-metadata "$TOKEN_MINT" "Palm Token" "PUSD" "https://silver-electoral-chimpanzee-979.mypinata.cloud/ipfs/bafkreidobmyejmuc576icx4e3bup4o2bcf2noo2j6pjhkuur2nevkxm4qa?pinataGatewayToken=m-GyBbr_vleYQQfzsIPwCCxXepxHgCG0ZKwww1J8MeCVY9KUlQJ620MIUzt-RvVb"


# Transfer mint authority to PDA
echo "Step 3: Transferring mint authority to PDA..."
spl-token authorize "$TOKEN_MINT" mint "$PDA"

echo ""
echo "Step 4: Creating token account..."
TOKEN_ACCOUNT=$(spl-token create-account "$TOKEN_MINT" 2>&1 | grep "Creating account" | awk '{print $3}')

if [ -z "$TOKEN_ACCOUNT" ]; then
  echo "Error: Failed to create token account"
  exit 1
fi

echo "Token account created: $TOKEN_ACCOUNT"
echo ""

echo "✅ Setup complete!"
echo ""
echo "Summary:"
echo "========================================"
echo "Token Mint: $TOKEN_MINT"
echo "Token Account: $TOKEN_ACCOUNT"
echo "Mint Authority (PDA): $PDA"
echo "Program ID: $PROGRAM_ID"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Update Makefile with the new token mint address"
echo "2. Update scripts/mint-tokens.ts with the new addresses"
echo "3. Run: make mint-tokens"
