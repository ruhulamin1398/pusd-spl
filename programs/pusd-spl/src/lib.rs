use anchor_lang::prelude::*;
use anchor_spl::token_2022::MintTo;
use anchor_spl::token_interface::{mint_to, Token2022};

declare_id!("9ftLECMyJfEk27kjxyrs3cPh8h6EtKET7gpj8v2RqN1e");

#[program]
pub mod pusd_spl {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }

    /// Mint tokens to a specified address
    /// This function can only be called when the program has mint authority
    /// Parameters:
    /// - address: The recipient address to mint tokens to
    /// - amount: The amount of tokens to mint (in smallest unit)
    pub fn mint_by_operator(ctx: Context<MintByOperator>, amount: u64) -> Result<()> {
        msg!("Minting {} tokens to {}", amount, ctx.accounts.recipient.key());
        
        // Mint tokens using CPI to token-2022 program
        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.recipient.to_account_info(),
            authority: ctx.accounts.mint_authority.to_account_info(),
        };
        
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        
        mint_to(cpi_ctx, amount)?;
        
        msg!("Successfully minted {} tokens", amount);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

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
    
    /// The mint authority - this should be the program or a PDA controlled by the program
    /// The program must be delegated as mint authority for this to work
    pub mint_authority: Signer<'info>,
    
    /// The Token-2022 program
    pub token_program: Program<'info, Token2022>,
}
