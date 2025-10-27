# token mint
# =====================================================================
# New token with PDA mint authority
TOKEN_MINT=7X6dcotdgssn6wqkHhVSxGnrGkWoCGq4HddqBX5xeGhg
TOKEN_ACCOUNT=EKmXK17A6JNDzdHw22NRbJK49x3DYieuAAmX2tVhn5qJ

token-authorize-mint:; spl-token authorize $(TOKEN_MINT) mint 4ph4YUFNV8pithois4scjnwyeRBQb92ksiCtEDj1WSvj
token-account-info:; spl-token account-info $(TOKEN_MINT) --verbose
token-account-create:; spl-token create-account $(TOKEN_MINT)
token-accounts:; spl-token accounts $(TOKEN_MINT)
token-display:; spl-token display $(TOKEN_MINT)


# anchor program 
# =====================================================================
program-show:; solana program show 9ftLECMyJfEk27kjxyrs3cPh8h6EtKET7gpj8v2RqN1e --url devnet


# scripts
# =====================================================================
generate-pda:; node scripts/generate-pda.js
create-tokens:; bash scripts/create-token.sh
mint-tokens:; ts-node scripts/mint-tokens.ts


# solana 
# =====================================================================
use-account-default :; solana config set --keypair ~/.config/solana/id.json
use-account-1 :; solana config set --keypair ~/.config/solana/wallets/account1.json

#address 4nCCoHpuaKc4vgYbp3gAiai2qDKLXmXvhsWacq191wJg  # token account GWSdoteVZbKm8wgwbXyzQ4Ceo39neqYyLzvop1qUagur
use-account-2 :; solana config set --keypair ~/.config/solana/wallets/account2.json 
use-account-3 :; solana config set --keypair ~/.config/solana/wallets/account3.json
