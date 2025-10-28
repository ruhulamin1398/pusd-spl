use anchor_lang::prelude::*;

// Define role types - matches Solidity BaseStorage roles
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum Role {
    Owner,           // ADMIN_ROLE / DEFAULT_ADMIN_ROLE in Solidity
    AuthorizedContract,  // AUTHORIZED_CONTRACT_ROLE in Solidity
    Operator,        // OPERATOR_ROLE in Solidity
}

// Account to store user roles
// Matches Solidity BaseStorage mapping and role system
#[account]
pub struct UserRole {
    pub user: Pubkey,              // 32 bytes - the user's public key
    pub role: Role,                // 1 byte - Owner, AuthorizedContract, or Operator
    pub bump: u8,                  // 1 byte - PDA bump seed
    pub role_active_time: i64,     // 8 bytes - timestamp when role becomes active (matches roleActiveTime in Solidity)
}

impl UserRole {
    pub const LEN: usize = 8 + 32 + 1 + 1 + 8; // discriminator + user + role + bump + role_active_time
}

// Program data account structure for upgrade authority verification
// This is owned by the BPF Loader Upgradeable program, not our program
#[derive(Debug, AnchorSerialize, AnchorDeserialize)]
pub struct UpgradeableData {
    pub slot: u64,
    pub upgrade_authority_address: Option<Pubkey>,
}

// Program state to track initialization
#[account]
pub struct ProgramState {
    pub is_initialized: bool,      // 1 byte - tracks if program has been initialized
    pub bump: u8,                  // 1 byte - PDA bump seed
}

impl ProgramState {
    pub const LEN: usize = 8 + 1 + 1; // discriminator + is_initialized + bump
}
