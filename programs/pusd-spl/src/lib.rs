use anchor_lang::prelude::*;
use anchor_spl::token_2022::{MintTo, SetAuthority};
use anchor_spl::token_interface::{mint_to, set_authority, Token2022, spl_token_2022::instruction::AuthorityType};

declare_id!("9ftLECMyJfEk27kjxyrs3cPh8h6EtKET7gpj8v2RqN1e");

#[program]
pub mod pusd_spl {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
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

    /// Mint tokens to a specified address
    /// This function can only be called when the program has mint authority
    /// Parameters:
    /// - address: The recipient address to mint tokens to
    /// - amount: The amount of tokens to mint (in smallest unit)
    pub fn mint_by_operator(ctx: Context<MintByOperator>, amount: u64) -> Result<()> {
        msg!("Minting {} tokens to {}", amount, ctx.accounts.recipient.key());
        
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
        
        msg!("Successfully minted {} tokens", amount);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

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
pub struct MintByOperator<'info> {
    /// The mint account for Token-2022
    /// This should be: 2g6GnMj75Uk5S7q7u3VPvmkGGYSEM3KSa7tUPe41QMma
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
