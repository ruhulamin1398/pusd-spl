use anchor_lang::prelude::*;
use anchor_lang::solana_program::bpf_loader_upgradeable;
use anchor_spl::token_interface::{
    mint_to, 
    set_authority, 
    MintTo, 
    SetAuthority, 
    Token2022, 
    spl_token_2022::instruction::AuthorityType
};

// Module declarations
mod state;
mod errors;
mod constants;
mod modifiers;

// Re-export for convenience
pub use state::*;
pub use errors::*;
pub use constants::*;

declare_id!("9ftLECMyJfEk27kjxyrs3cPh8h6EtKET7gpj8v2RqN1e");

#[program]
pub mod pusd_spl {
    use super::*;

    /// Initialize the program with owner and operator roles
    /// SECURITY: Only the program upgrade authority (deployer) can call this function
    /// The deployer assigns two separate addresses for owner and operator roles
    /// The deployer themselves does not receive any role
    /// This function can only be called once during program setup
    pub fn initialize(ctx: Context<Initialize>, owner_address: Pubkey, operator_address: Pubkey) -> Result<()> {
        // Verify that the caller is the program upgrade authority
        require_upgrade_authority!(ctx.accounts.program_data, ctx.accounts.payer.key());
        
        // Ensure the program hasn't been initialized already
        let program_state = &mut ctx.accounts.program_state;
        require_not_initialized!(program_state);
        
        // Validate that the provided addresses are not zero addresses
        require_valid_address!(owner_address);
        require_valid_address!(operator_address);
        
        msg!("Initializing program with owner: {:?} and operator: {:?}", owner_address, operator_address);
        
        // Set up the owner role account
        let owner_role = &mut ctx.accounts.owner_role;
        owner_role.user = owner_address;
        owner_role.role = Role::Owner;
        owner_role.bump = ctx.bumps.owner_role;
        owner_role.role_active_time = Clock::get()?.unix_timestamp;
        
        // Set up the operator role account
        let operator_role = &mut ctx.accounts.operator_role;
        operator_role.user = operator_address;
        operator_role.role = Role::Operator;
        operator_role.bump = ctx.bumps.operator_role;
        operator_role.role_active_time = Clock::get()?.unix_timestamp;
        
        // Set program state as initialized
        program_state.is_initialized = true;
        program_state.bump = ctx.bumps.program_state;
        
        msg!("Program initialized successfully - version {}", VERSION);
        msg!("Owner: {}", owner_address);
        msg!("Operator: {}", operator_address);
        msg!("Initialized by deployer: {}", ctx.accounts.payer.key());
        Ok(())
    }


    /// Transfer the mint authority from the current owner to the program PDA
    /// This must be called once after deployment to enable program-controlled minting
    /// After this, only the program can mint new tokens
    pub fn transfer_mint_authority_to_pda(ctx: Context<TransferAuthority>) -> Result<()> {
        // Verify that the caller is the program upgrade authority
        require_upgrade_authority!(ctx.accounts.program_data, ctx.accounts.payer.key());
        
        msg!("Transferring mint authority to PDA");
        
        // Calculate the mint authority PDA address
        let (_mint_authority_pda, _bump) = Pubkey::find_program_address(
            &[b"mint_authority"],
            ctx.program_id
        );
        
        // Transfer the mint authority to the PDA
        let cpi_accounts = SetAuthority {
            current_authority: ctx.accounts.current_authority.to_account_info(),
            account_or_mint: ctx.accounts.mint.to_account_info(),
        };
        
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        
        set_authority(
            cpi_ctx,
            AuthorityType::MintTokens,
            Some(_mint_authority_pda),
        )?;
        
        msg!("Successfully transferred mint authority to PDA: {}", _mint_authority_pda);
        Ok(())
    }
    /// Administrative function to assign or update a user's role
    /// Only the Owner can execute this function
    pub fn add_role(ctx: Context<AddRole>, user: Pubkey, role: Role) -> Result<()> {
        // Verify the caller has Owner role
        require_role!(ctx.accounts.owner_role, Role::Owner);
        
        // Validate the user address
        require_valid_address!(user);
        
        msg!("Adding role {:?} to user: {}", role, user);
        
        let user_role = &mut ctx.accounts.user_role;
        user_role.user = user;
        user_role.role = role;
        user_role.bump = ctx.bumps.user_role;
        user_role.role_active_time = Clock::get()?.unix_timestamp;
        
        msg!("Role added successfully");
        Ok(())
    }

    /// Administrative function to remove a user's role
    /// Only the Owner can execute this function
    /// The role account will be closed and rent refunded to the owner
    pub fn remove_role(ctx: Context<RemoveRole>) -> Result<()> {
        msg!("Removing role for user: {}", ctx.accounts.user_role.user);
        Ok(())
    }

    /// Query function to check if a user has a specific role
    /// Returns true if the user has the specified role, false otherwise
    /// Note: If the account doesn't exist, the transaction will fail during validation
    pub fn has_role(ctx: Context<HasRole>, _user: Pubkey, _role: Role) -> Result<bool> {
        let has_role = ctx.accounts.user_role.role == _role;
        
        msg!("Checking role {:?} for user {}: {}", _role, _user, has_role);
        
        // Return the role check result
        // Note: Anchor doesn't support direct return values to the caller
        // Use this function for on-chain validation or check the account data directly
        Ok(has_role)
    }

    /// Mint tokens to a specified address using an authorized contract
    /// Only accounts with AuthorizedContract role can call this function
    /// Parameters: amount to mint
    pub fn mint(ctx: Context<MintByContract>, amount: u64) -> Result<()> {
        // Verify the caller has AuthorizedContract role
        require_role!(ctx.accounts.contract_role, Role::AuthorizedContract);
        
        // Ensure recipient is not a zero address
        require!(
            ctx.accounts.recipient.key() != Pubkey::default(),
            PusdError::RecipientIsZeroAddress
        );
        
        msg!("Minting {} tokens to {} by authorized contract", amount, ctx.accounts.recipient.key());
        
        // Call the internal mint function
        _mint(
            &ctx.accounts.mint,
            &ctx.accounts.recipient,
            &ctx.accounts.mint_authority,
            &ctx.accounts.token_program,
            ctx.bumps.mint_authority,
            amount,
        )?;
        
        msg!("Successfully minted {} tokens", amount);
        Ok(())
    }



    /// Operator-controlled mint function to mint tokens to any address
    /// Only users with Operator role can call this function
    /// Operators have elevated permissions to manage token supply
    pub fn mint_by_operator(ctx: Context<MintByOperator>, amount: u64) -> Result<()> {
        // Ensure recipient is not a zero address
        require!(
            ctx.accounts.recipient.key() != Pubkey::default(),
            PusdError::RecipientIsZeroAddress
        );
        
        msg!("Minting {} tokens to {} by operator", amount, ctx.accounts.recipient.key());
        
        // Call the internal mint function
        _mint(
            &ctx.accounts.mint,
            &ctx.accounts.recipient,
            &ctx.accounts.mint_authority,
            &ctx.accounts.token_program,
            ctx.bumps.mint_authority,
            amount,
        )?;
        
        msg!("Successfully minted {} tokens by operator", amount);
        Ok(())
    }
}

/// Private helper function to execute token minting via CPI
/// This internal function handles the actual minting logic
fn _mint<'info>(
    mint: &AccountInfo<'info>,
    recipient: &AccountInfo<'info>,
    mint_authority: &AccountInfo<'info>,
    token_program: &AccountInfo<'info>,
    mint_authority_bump: u8,
    amount: u64,
) -> Result<()> {
    // Prepare PDA signer seeds for cross-program invocation
    let seeds = &[
        b"mint_authority".as_ref(),
        &[mint_authority_bump],
    ];
    let signer_seeds = &[&seeds[..]];
    
    // Execute mint via CPI to Token-2022 program using PDA authority
    let cpi_accounts = MintTo {
        mint: mint.to_account_info(),
        to: recipient.to_account_info(),
        authority: mint_authority.to_account_info(),
    };
    
    let cpi_ctx = CpiContext::new_with_signer(
        token_program.to_account_info(),
        cpi_accounts,
        signer_seeds
    );
    
    mint_to(cpi_ctx, amount)?;
    
    Ok(())
}

/// Returns the program version string
pub fn get_version() -> String {
    VERSION.to_string()
}

// ============================================================================
// Account Validation Structs
// ============================================================================

#[derive(Accounts)]
#[instruction(owner_address: Pubkey, operator_address: Pubkey)]
pub struct Initialize<'info> {
    /// Program state account to track initialization status
    #[account(
        init_if_needed,
        payer = payer,
        space = ProgramState::LEN,
        seeds = [b"program_state"],
        bump
    )]
    pub program_state: Account<'info, ProgramState>,
    
    /// The owner role account with admin privileges
    #[account(
        init_if_needed,
        payer = payer,
        space = UserRole::LEN,
        seeds = [b"user_role", owner_address.as_ref()],
        bump
    )]
    pub owner_role: Account<'info, UserRole>,
    
    /// The operator role account with minting privileges
    #[account(
        init_if_needed,
        payer = payer,
        space = UserRole::LEN,
        seeds = [b"user_role", operator_address.as_ref()],
        bump
    )]
    pub operator_role: Account<'info, UserRole>,
    
    /// The program data account to verify upgrade authority
    /// CHECK: This is the BPF Loader Upgradeable program data account
    #[account(
        seeds = [crate::ID.as_ref()],
        bump,
        seeds::program = bpf_loader_upgradeable::ID,
    )]
    pub program_data: UncheckedAccount<'info>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(user: Pubkey, role: Role)]
pub struct AddRole<'info> {
    /// The owner who is adding the role
    #[account(
        seeds = [b"user_role", owner.key().as_ref()],
        bump = owner_role.bump,
        constraint = owner_role.role == Role::Owner @ PusdError::Unauthorized
    )]
    pub owner_role: Account<'info, UserRole>,
    
    #[account(mut)]
    pub owner: Signer<'info>,
    
    /// The user role account being created or updated
    #[account(
        init_if_needed,
        payer = owner,
        space = UserRole::LEN,
        seeds = [b"user_role", user.as_ref()],
        bump
    )]
    pub user_role: Account<'info, UserRole>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RemoveRole<'info> {
    /// The owner who is removing the role
    #[account(
        seeds = [b"user_role", owner.key().as_ref()],
        bump = owner_role.bump,
        constraint = owner_role.role == Role::Owner @ PusdError::Unauthorized
    )]
    pub owner_role: Account<'info, UserRole>,
    
    #[account(mut)]
    pub owner: Signer<'info>,
    
    /// The user role account being closed
    #[account(
        mut,
        close = owner,
        seeds = [b"user_role", user_role.user.as_ref()],
        bump = user_role.bump
    )]
    pub user_role: Account<'info, UserRole>,
}

#[derive(Accounts)]
#[instruction(user: Pubkey, role: Role)]
pub struct HasRole<'info> {
    /// The user role account to verify
    /// Transaction fails if this account doesn't exist (meaning no role assigned)
    #[account(
        seeds = [b"user_role", user.as_ref()],
        bump = user_role.bump
    )]
    pub user_role: Account<'info, UserRole>,
}

#[derive(Accounts)]
pub struct TransferAuthority<'info> {
    /// The Token-2022 mint account
    /// CHECK: Validated by Token-2022 program
    #[account(mut)]
    pub mint: AccountInfo<'info>,
    
    /// The current mint authority who will transfer control
    pub current_authority: Signer<'info>,
    
    /// The program data account to verify upgrade authority
    /// CHECK: This is the BPF Loader Upgradeable program data account
    #[account(
        seeds = [crate::ID.as_ref()],
        bump,
        seeds::program = bpf_loader_upgradeable::ID,
    )]
    pub program_data: UncheckedAccount<'info>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    /// The Token-2022 program
    pub token_program: Program<'info, Token2022>,
}

#[derive(Accounts)]
pub struct MintByContract<'info> {
    /// The authorized contract's role account
    #[account(
        seeds = [b"user_role", authorized_contract.key().as_ref()],
        bump = contract_role.bump,
        constraint = contract_role.role == Role::AuthorizedContract @ PusdError::Unauthorized
    )]
    pub contract_role: Account<'info, UserRole>,
    
    pub authorized_contract: Signer<'info>,
    
    /// The Token-2022 mint account
    /// CHECK: Validated by Token-2022 program
    #[account(mut)]
    pub mint: AccountInfo<'info>,
    
    /// The recipient's token account
    /// CHECK: Validated by Token-2022 program
    #[account(mut)]
    pub recipient: AccountInfo<'info>,
    
    /// The mint authority PDA controlled by this program
    /// CHECK: PDA derived from "mint_authority" seed
    #[account(
        seeds = [b"mint_authority"],
        bump
    )]
    pub mint_authority: AccountInfo<'info>,
    
    /// The Token-2022 program
    pub token_program: Program<'info, Token2022>,
}

#[derive(Accounts)]
pub struct MintByOperator<'info> {
    /// The operator's role account
    #[account(
        seeds = [b"user_role", operator.key().as_ref()],
        bump = operator_role.bump,
        constraint = operator_role.role == Role::Operator @ PusdError::Unauthorized
    )]
    pub operator_role: Account<'info, UserRole>,
    
    pub operator: Signer<'info>,
    
    /// The Token-2022 mint account
    /// CHECK: Validated by Token-2022 program
    #[account(mut)]
    pub mint: AccountInfo<'info>,
    
    /// The recipient's token account associated with the mint
    /// CHECK: Validated by Token-2022 program
    #[account(mut)]
    pub recipient: AccountInfo<'info>,
    
    /// The mint authority PDA controlled by this program
    /// CHECK: PDA derived from "mint_authority" seed
    #[account(
        seeds = [b"mint_authority"],
        bump
    )]
    pub mint_authority: AccountInfo<'info>,
    
    /// The Token-2022 program
    pub token_program: Program<'info, Token2022>,
}
