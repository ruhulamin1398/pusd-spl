# PUSD SPL Program Metadata Setup

## Program Information
- **Program ID**: `9ftLECMyJfEk27kjxyrs3cPh8h6EtKET7gpj8v2RqN1e`
- **Network**: Devnet
- **Type**: SPL Token-2022 Program

## How to Update Program Metadata on Explorers

### 1. Prepare Your Assets
- [ ] Create a logo (256x256px PNG recommended)
- [ ] Save as `logo.png` in the root directory
- [ ] Commit and push to GitHub

### 2. Submit to Solscan
1. Visit: https://solscan.io/account/9ftLECMyJfEk27kjxyrs3cPh8h6EtKET7gpj8v2RqN1e?cluster=devnet
2. Look for "Update Program Info" or email: support@solscan.io
3. Provide:
   - Program ID: `9ftLECMyJfEk27kjxyrs3cPh8h6EtKET7gpj8v2RqN1e`
   - Name: PUSD SPL Token Program
   - Description: PUSD Stablecoin implementation using Token-2022
   - Logo URL: `https://raw.githubusercontent.com/ruhulamin1398/pusd-spl/master/logo.png`
   - Website: Your website or GitHub
   - Verification: Prove ownership by signing a message with upgrade authority

### 3. Submit to Solana Explorer
1. Visit: https://explorer.solana.com/address/9ftLECMyJfEk27kjxyrs3cPh8h6EtKET7gpj8v2RqN1e?cluster=devnet
2. Create a PR to https://github.com/solana-labs/token-list
3. Or contact Solana Foundation

### 4. Use Anchor Verified Build
```bash
# Build with verification
anchor build --verifiable

# Deploy
anchor deploy --provider.cluster devnet

# Verify on-chain
anchor verify <PROGRAM_ID>
```

## Metadata Files
- `program-metadata.json` - Contains program metadata
- `Cargo.toml` - Contains package metadata

## Logo Requirements
- Format: PNG or SVG
- Size: 256x256px (recommended)
- Background: Transparent preferred
- File size: < 100KB

## Verification
To prove you own the program, you'll need to sign a message with your upgrade authority wallet:
```bash
solana-keygen verify <PUBKEY> <SIGNATURE>
```

## Resources
- Solscan: https://solscan.io/
- Solana Explorer: https://explorer.solana.com/
- Anchor Docs: https://www.anchor-lang.com/docs/verifiable-builds
