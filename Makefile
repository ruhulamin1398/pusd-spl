#  constant variable 
# ====================================================================

TOKEN_MINT=7X6dcotdgssn6wqkHhVSxGnrGkWoCGq4HddqBX5xeGhg
TOKEN_ACCOUNT=EKmXK17A6JNDzdHw22NRbJK49x3DYieuAAmX2tVhn5qJ
OWNER_PUBKEY=AyB64MyXyUsHFaauWspTE1hxN3VPwd7ofDas8D1QFJsR
OPERATOR_PUBKEY=4nCCoHpuaKc4vgYbp3gAiai2qDKLXmXvhsWacq191wJg
USER_PUBKEY=5nPDzEq3Gc3mBBDGh9jdpZuBNCowj6SoXsnz3vzZRUDD

# token mint
# =====================================================================
# New token with PDA mint authority

token-authorize-mint:; spl-token authorize $(TOKEN_MINT) mint $(USER_PUBKEY)

token-display:; spl-token display $(TOKEN_MINT)
token-balance:; spl-token balance $(TOKEN_MINT)  --verbose
token-account-info:; spl-token account-info $(TOKEN_MINT) --verbose
token-account-create:; spl-token create-account $(TOKEN_MINT)
token-account-all:; spl-token accounts --verbose
token-accounts:; spl-token accounts $(TOKEN_MINT)
token-burn:; spl-token burn  9N5PG1w59QFJGmEbMgFCxw5KnrQSC1jpdTEPq7HLna2g  12


# anchor program 
# =====================================================================
PROGRAM_ID=9ftLECMyJfEk27kjxyrs3cPh8h6EtKET7gpj8v2RqN1e

build:; anchor build
deploy:; anchor deploy
deploy-devnet:; anchor deploy --provider.cluster devnet
deploy-mainnet:; anchor deploy --provider.cluster mainnet
program-show:; solana program show $(PROGRAM_ID) --url devnet

# Program upgrade with automatic buffer management
# Creates a new buffer and deploys from it to handle size increases
program-upgrade:
	@echo "Building program..."
	@anchor build
	@echo "Creating buffer for program upgrade..."
	@BUFFER=$$(solana program write-buffer target/deploy/pusd_spl.so --url devnet | grep "Buffer:" | awk '{print $$2}'); \
	echo "Buffer created: $$BUFFER"; \
	echo "Deploying from buffer..."; \
	solana program deploy --buffer $$BUFFER --program-id $(PROGRAM_ID) --url devnet
	@echo "Program upgrade successful!"

# Legacy upgrade command (may fail if program size increases)
program-upgrade-legacy:; anchor upgrade target/deploy/pusd_spl.so --program-id $(PROGRAM_ID) --provider.cluster devnet

# IDL Management
idl-close:; anchor idl close $(PROGRAM_ID) --provider.cluster devnet
idl-init:; anchor idl init $(PROGRAM_ID) --filepath target/idl/pusd_spl.json --provider.cluster devnet
idl-upgrade:; anchor idl upgrade $(PROGRAM_ID) --filepath target/idl/pusd_spl.json --provider.cluster devnet
idl-fetch:; anchor idl fetch $(PROGRAM_ID) --provider.cluster devnet


# scripts
# =====================================================================
# Program Initialization 
# If not specified, uses default keypair for both roles
# The script will auto-detect the current Solana wallet
create-tokens:; bash scripts/create-token.sh

initialize:; ts-node scripts/initialize.ts $(OWNER_PUBKEY) $(OPERATOR_PUBKEY)
generate-pda:; node scripts/generate-pda.js
mint-tokens:; ts-node scripts/mint-tokens.ts
mint:; ts-node scripts/mint-tokens.ts $(RECIPIENT) $(AMOUNT)


# Role Management 

assign-role-operator:; ts-node scripts/assignrole.ts $(OPERATOR_PUBKEY) operator 
remove-role-operator:; ts-node scripts/removerole.ts $(OPERATOR_PUBKEY)

has-role-owner:; ts-node scripts/hasrole.ts $(OWNER_PUBKEY) owner
has-role-operator:; ts-node scripts/hasrole.ts $(OPERATOR_PUBKEY) operator

# Quick add for specific accounts


# solana 
# =====================================================================
use-account-default :; solana config set --keypair ~/.config/solana/id.json
use-account-owner :; solana config set --keypair ~/.config/solana/wallets/account1.json  #AyB64MyXyUsHFaauWspTE1hxN3VPwd7ofDas8D1QFJsR
use-account-operator :; solana config set --keypair ~/.config/solana/wallets/account2.json #4nCCoHpuaKc4vgYbp3gAiai2qDKLXmXvhsWacq191wJg
use-account-user :; solana config set --keypair ~/.config/solana/wallets/account3.json #5nPDzEq3Gc3mBBDGh9jdpZuBNCowj6SoXsnz3vzZRUDD