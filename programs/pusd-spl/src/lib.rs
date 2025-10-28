use anchor_lang::prelude::*;
use anchor_lang::solana_program::bpf_loader_upgradeable;
use anchor_spl::token_interface::{
    mint_to, 
    set_authority, 
    burn as token_burn,  // Rename to avoid conflict with our burn instruction
    MintTo, 
    SetAuthority, 
    Burn, 
    Token2022, 
    TokenAccount, 
    Mint, 
    spl_token_2022::instruction::AuthorityType
};

// Module declarations
mod state;
mod errors;
mod constants;

// Re-export for convenience
pub use state::*;
pub use errors::*;
pub use constants::*;

declare_id!("9ftLECMyJfEk27kjxyrs3cPh8h6EtKET7gpj8v2RqN1e");

#[program]
pub mod pusd_spl {
    use super::*;

    /// Initialize the program with the initial admin (owner)
    /// Matches Solidity: initialize(address ownerAddress, address operator)
    /// SECURITY: Only the program upgrade authority (deployer) can call this
    /// The deployer sets two addresses: one for owner and one for operator
    /// The deployer themselves does not receive any role
    /// Can only be called once
    pub fn initialize(ctx: Context<Initialize>, owner_address: Pubkey, operator_address: Pubkey) -> Result<()> {
        // Verify that the payer is the program upgrade authority FIRST
        // Manually deserialize the program data account
        let program_data_account = &ctx.accounts.program_data;
        let data = program_data_account.try_borrow_data()?;
        
        // ProgramData account structure: 45 bytes header + upgrade authority option
        // First 4 bytes: discriminator (3 for ProgramData)
        // Next 8 bytes: slot
        // Next 32 bytes: upgrade authority option (0 = None, 1 = Some followed by Pubkey)
        require!(data.len() >= 45, PusdError::InvalidProgramData);
        
        let upgrade_authority_option = data[4 + 8]; // Skip discriminator and slot
        require!(upgrade_authority_option == 1, PusdError::OnlyUpgradeAuthority);
        
        let upgrade_authority = Pubkey::try_from(&data[4 + 8 + 1..4 + 8 + 1 + 32])
            .map_err(|_| PusdError::InvalidProgramData)?;
        
        require!(
            upgrade_authority == ctx.accounts.payer.key(),
            PusdError::OnlyUpgradeAuthority
        );
        
        // Check if already initialized
        let program_state = &mut ctx.accounts.program_state;
        require!(!program_state.is_initialized, PusdError::AlreadyInitialized);
        
        // Validate addresses - matches Solidity InvalidAddress check
        require!(
            owner_address != Pubkey::default() && operator_address != Pubkey::default(),
            PusdError::InvalidAddress
        );
        
        msg!("Initializing program with owner: {:?} and operator: {:?}", owner_address, operator_address);
        
        // Grant owner role to owner_address (DEFAULT_ADMIN_ROLE in Solidity)
        let owner_role = &mut ctx.accounts.owner_role;
        owner_role.user = owner_address;
        owner_role.role = Role::Owner;
        owner_role.bump = ctx.bumps.owner_role;
        owner_role.role_active_time = Clock::get()?.unix_timestamp;
        
        // Grant operator role to operator_address
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

    /// Admin function: Add or update a user's role
    /// Only Owner can call this
    pub fn add_role(ctx: Context<AddRole>, user: Pubkey, role: Role) -> Result<()> {
        // Validate address
        require!(user != Pubkey::default(), PusdError::InvalidAddress);
        
        msg!("Adding role {:?} to user: {}", role, user);
        
        let user_role = &mut ctx.accounts.user_role;
        user_role.user = user;
        user_role.role = role;
        user_role.bump = ctx.bumps.user_role;
        user_role.role_active_time = Clock::get()?.unix_timestamp;
        
        msg!("Role added successfully");
        Ok(())
    }

    /// Admin function: Remove a user's role
    /// Only Owner can call this
    pub fn remove_role(ctx: Context<RemoveRole>) -> Result<()> {
        msg!("Removing role for user: {}", ctx.accounts.user_role.user);
        // Account will be closed and rent refunded to owner
        Ok(())
    }

    /// Authorized Contract function: Mint tokens to a specified address
    /// Matches Solidity: mint(address to, uint256 amount)
    /// Can only be called by users with AuthorizedContract role
    pub fn mint(ctx: Context<MintByContract>, amount: u64) -> Result<()> {
        // Validate recipient address 
        require!(
            ctx.accounts.recipient.key() != Pubkey::default(),
            PusdError::RecipientIsZeroAddress
        );
        
        msg!("Minting {} tokens to {} by authorized contract", amount, ctx.accounts.recipient.key());
        
        // Create PDA seeds and signer
        let seeds = &[
            b"mint_authority".as_ref(),
            &[ctx.bumps.mint_authority],
        ];
        let signer_seeds = &[&seeds[..]];
        
        // Mint tokens using CPI to token-2022 program with PDA signer
        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.recipient.to_account_info(),
            authority: ctx.accounts.mint_authority.to_account_info(),
        };
        
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
        
        mint_to(cpi_ctx, amount)?;
        
        msg!("Successfully minted {} tokens by authorized contract", amount);
        Ok(())
    }
    
    /// CPI-friendly mint function for authorized programs
    /// Use this when calling from another program via CPI
    /// The calling program's ID must have AuthorizedContract role
    pub fn mint_cpi(ctx: Context<MintByCPI>, amount: u64) -> Result<()> {
        msg!("Minting {} tokens to {} via CPI from program {}", 
            amount, 
            ctx.accounts.recipient.key(),
            ctx.accounts.caller_program.key()
        );
        
        // Create PDA seeds and signer
        let seeds = &[
            b"mint_authority".as_ref(),
            &[ctx.bumps.mint_authority],
        ];
        let signer_seeds = &[&seeds[..]];
        
        // Mint tokens using CPI to token-2022 program with PDA signer
        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.recipient.to_account_info(),
            authority: ctx.accounts.mint_authority.to_account_info(),
        };
        
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
        
        mint_to(cpi_ctx, amount)?;
        
        msg!("Successfully minted {} tokens via CPI", amount);
        Ok(())
    }

    /// Transfer mint authority to the PDA
    /// This should be called once after deploying to set up the PDA as mint authority
    pub fn transfer_mint_authority_to_pda(ctx: Context<TransferAuthority>) -> Result<()> {
        msg!("Transferring mint authority to PDA");
        
        // Derive the PDA that will become the new mint authority
        let (_mint_authority_pda, _bump) = Pubkey::find_program_address(
            &[b"mint_authority"],
            ctx.program_id
        );
        
        // Transfer mint authority to PDA
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

    /// Operator function: Mint tokens to a specified address
    /// Matches Solidity: mintByOperator(address to, uint256 amount)
    /// Can only be called by users with Operator role
    pub fn mint_by_operator(ctx: Context<MintByOperator>, amount: u64) -> Result<()> {
        // Validate recipient address
        require!(
            ctx.accounts.recipient.key() != Pubkey::default(),
            PusdError::RecipientIsZeroAddress
        );
        
        msg!("Minting {} tokens to {} by operator", amount, ctx.accounts.recipient.key());
        
        // Create PDA seeds and signer
        let seeds = &[
            b"mint_authority".as_ref(),
            &[ctx.bumps.mint_authority],
        ];
        let signer_seeds = &[&seeds[..]];
        
        // Mint tokens using CPI to token-2022 program with PDA signer
        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.recipient.to_account_info(),
            authority: ctx.accounts.mint_authority.to_account_info(),
        };
        
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
        
        mint_to(cpi_ctx, amount)?;
        
        msg!("Successfully minted {} tokens by operator", amount);
        Ok(())
    }

    /// Burn tokens from user's account
    /// Matches Solidity: burn(uint256 amount)
    /// Can be called by any user to burn their own tokens
    pub fn burn(ctx: Context<BurnTokens>, amount: u64) -> Result<()> {
        msg!("Burning {} tokens from {}", amount, ctx.accounts.owner.key());
        
        // Burn tokens using CPI to token-2022 program
        let cpi_accounts = Burn {
            mint: ctx.accounts.mint.to_account_info(),
            from: ctx.accounts.token_account.to_account_info(),
            authority: ctx.accounts.owner.to_account_info(),
        };
        
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        
        token_burn(cpi_ctx, amount)?;
        
        msg!("Successfully burned {} tokens", amount);
        Ok(())
    }
}

/// Get the program version - matches Solidity: version() returns (string memory)
/// This is a helper function, not part of the instruction set
pub fn get_version() -> String {
    VERSION.to_string()
}

// ============================================================================
// Account Validation Structs
// ============================================================================

#[derive(Accounts)]
#[instruction(owner_address: Pubkey, operator_address: Pubkey)]
pub struct Initialize<'info> {
    /// Program state account to track initialization
    #[account(
        init_if_needed,
        payer = payer,
        space = ProgramState::LEN,
        seeds = [b"program_state"],
        bump
    )]
    pub program_state: Account<'info, ProgramState>,
    
    /// The owner role account (DEFAULT_ADMIN_ROLE in Solidity)
    #[account(
        init_if_needed,
        payer = payer,
        space = UserRole::LEN,
        seeds = [b"user_role", owner_address.as_ref()],
        bump
    )]
    pub owner_role: Account<'info, UserRole>,
    
    /// The operator role account
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
pub struct TransferAuthority<'info> {
    /// The mint account
    /// CHECK: This is the Token-2022 mint account
    #[account(mut)]
    pub mint: AccountInfo<'info>,
    
    /// The current mint authority (your wallet)
    pub current_authority: Signer<'info>,
    
    /// The Token-2022 program
    pub token_program: Program<'info, Token2022>,
}

#[derive(Accounts)]
pub struct MintByContract<'info> {
    /// The authorized contract calling this function
    #[account(
        seeds = [b"user_role", authorized_contract.key().as_ref()],
        bump = contract_role.bump,
        constraint = contract_role.role == Role::AuthorizedContract @ PusdError::Unauthorized
    )]
    pub contract_role: Account<'info, UserRole>,
    
    pub authorized_contract: Signer<'info>,
    
    /// The mint account for Token-2022 
    /// CHECK: This is the Token-2022 mint account
    #[account(mut)]
    pub mint: AccountInfo<'info>,
    
    /// The token account to receive the minted tokens
    /// CHECK: This is the recipient's token account
    #[account(mut)]
    pub recipient: AccountInfo<'info>,
    
    /// The mint authority PDA - this is controlled by the program
    /// CHECK: This is a PDA derived from "mint_authority" seed
    #[account(
        seeds = [b"mint_authority"],
        bump
    )]
    pub mint_authority: AccountInfo<'info>,
    
    /// The Token-2022 program
    pub token_program: Program<'info, Token2022>,
}

#[derive(Accounts)]
pub struct MintByCPI<'info> {
    /// The program ID that is calling via CPI (must have AuthorizedContract role)
    #[account(
        seeds = [b"user_role", caller_program.key().as_ref()],
        bump = program_role.bump,
        constraint = program_role.role == Role::AuthorizedContract @ PusdError::Unauthorized
    )]
    pub program_role: Account<'info, UserRole>,
    
    /// The calling program's account info
    /// CHECK: This is the program making the CPI call
    pub caller_program: AccountInfo<'info>,
    
    /// The mint account for Token-2022 
    /// CHECK: This is the Token-2022 mint account
    #[account(mut)]
    pub mint: AccountInfo<'info>,
    
    /// The token account to receive the minted tokens
    /// CHECK: This is the recipient's token account
    #[account(mut)]
    pub recipient: AccountInfo<'info>,
    
    /// The mint authority PDA - this is controlled by the program
    /// CHECK: This is a PDA derived from "mint_authority" seed
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
    /// The operator calling this function
    #[account(
        seeds = [b"user_role", operator.key().as_ref()],
        bump = operator_role.bump,
        constraint = operator_role.role == Role::Operator @ PusdError::Unauthorized
    )]
    pub operator_role: Account<'info, UserRole>,
    
    pub operator: Signer<'info>,
    
    /// The mint account for Token-2022 
    /// CHECK: This is the Token-2022 mint account
    #[account(mut)]
    pub mint: AccountInfo<'info>,
    
    /// The token account to receive the minted tokens
    /// This account must be associated with the mint
    /// CHECK: This is the recipient's token account
    #[account(mut)]
    pub recipient: AccountInfo<'info>,
    
    /// The mint authority PDA - this is controlled by the program
    /// CHECK: This is a PDA derived from "mint_authority" seed
    #[account(
        seeds = [b"mint_authority"],
        bump
    )]
    pub mint_authority: AccountInfo<'info>,
    
    /// The Token-2022 program
    pub token_program: Program<'info, Token2022>,
}

/// Burn tokens from user's token account
/// Matches Solidity: burn(uint256 amount)
#[derive(Accounts)]
pub struct BurnTokens<'info> {
    /// The mint account
    #[account(mut)]
    pub mint: InterfaceAccount<'info, Mint>,
    
    /// The token account to burn from
    #[account(
        mut,
        constraint = token_account.owner == owner.key() @ PusdError::Unauthorized
    )]
    pub token_account: InterfaceAccount<'info, TokenAccount>,
    
    /// The owner of the token account
    pub owner: Signer<'info>,
    
    /// The Token-2022 program
    pub token_program: Program<'info, Token2022>,
}
