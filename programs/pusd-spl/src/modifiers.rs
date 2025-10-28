/// Macro to check if a user has a specific role (similar to Solidity modifiers)
/// Usage: require_role!(user_role_account, Role::Owner)?;
#[macro_export]
macro_rules! require_role {
    ($user_role:expr, $required_role:expr) => {
        if $user_role.role != $required_role {
            return Err(PusdError::Unauthorized.into());
        }
    };
}

/// Macro to check if caller is upgrade authority
/// Usage: require_upgrade_authority!(program_data_account, payer_key)?;
#[macro_export]
macro_rules! require_upgrade_authority {
    ($program_data:expr, $payer:expr) => {{
        let data = $program_data.try_borrow_data()?;
        if data.len() < 45 {
            return Err(PusdError::InvalidProgramData.into());
        }
        
        let upgrade_authority_option = data[4 + 8];
        if upgrade_authority_option != 1 {
            return Err(PusdError::OnlyUpgradeAuthority.into());
        }
        
        let upgrade_authority = Pubkey::try_from(&data[4 + 8 + 1..4 + 8 + 1 + 32])
            .map_err(|_| PusdError::InvalidProgramData)?;
        
        if upgrade_authority != $payer {
            return Err(PusdError::OnlyUpgradeAuthority.into());
        }
    }};
}

/// Macro to check if program is not already initialized
/// Usage: require_not_initialized!(program_state)?;
#[macro_export]
macro_rules! require_not_initialized {
    ($program_state:expr) => {
        if $program_state.is_initialized {
            return Err(PusdError::AlreadyInitialized.into());
        }
    };
}

/// Macro to check if address is not default (zero address)
/// Usage: require_valid_address!(address)?;
#[macro_export]
macro_rules! require_valid_address {
    ($address:expr) => {
        if $address == Pubkey::default() {
            return Err(PusdError::InvalidAddress.into());
        }
    };
}
