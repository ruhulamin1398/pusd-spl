use anchor_lang::prelude::*;

// Error codes 
#[error_code]
pub enum PusdError {
    #[msg("Unauthorized: User does not have the required role")]
    Unauthorized,
    #[msg("Role already assigned to this user")]
    RoleAlreadyAssigned,
    #[msg("Role not found for this user")]
    RoleNotFound,
    #[msg("Invalid address: Cannot be zero address")]
    InvalidAddress,
    #[msg("Recipient is zero address")]
    RecipientIsZeroAddress,
    #[msg("Role not active yet")]
    RoleNotActiveYet,
    #[msg("Grant role failed")]
    GrantRoleFailed,
    #[msg("Only the program upgrade authority can initialize")]
    OnlyUpgradeAuthority,
    #[msg("Program data account not found")]
    ProgramDataNotFound,
    #[msg("Program already initialized")]
    AlreadyInitialized,
    #[msg("Invalid program data")]
    InvalidProgramData,
}
