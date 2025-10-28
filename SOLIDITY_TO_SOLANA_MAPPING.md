# Solidity to Solana Anchor Program Mapping

## Overview
This document maps the Solidity smart contract functionality to the Solana Anchor program implementation for the PUSD token.

## Contract Comparison

### Solidity Contracts
- **BaseStorage.sol** - Base storage with role constants and state variables
- **PalmController.sol** - Controller with role management and initialization
- **PalmUSD.sol** - Main implementation with mint, burn, and token logic

### Solana Anchor Program
- **lib.rs** - Complete implementation matching all Solidity functionality

---

## Feature Mapping

### 1. Roles (BaseStorage.sol ↔ lib.rs)

| Solidity | Solana Anchor | Description |
|----------|---------------|-------------|
| `ADMIN_ROLE` | `Role::Admin` | Contract administrators (deployment, upgrades) |
| `OPERATOR_ROLE` | `Role::Operator` | Operators (mint, burn management) |
| `AUTHORIZED_CONTRACT_ROLE` | `Role::AuthorizedContract` | Authorized contracts for minting |
| `roleActiveTime` mapping | `role_active_time` field in `UserRole` | Tracks when role becomes active |

### 2. Initialization

#### Solidity: `PalmController.__PalmController_init()`
```solidity
function __PalmController_init(
    string memory name, 
    string memory symbol, 
    address ownerAddress, 
    address operator
) internal onlyInitializing
```

#### Solana: `initialize()`
```rust
pub fn initialize(
    ctx: Context<Initialize>, 
    owner_address: Pubkey, 
    operator: Pubkey
) -> Result<()>
```

**Key Features:**
- ✅ Sets up admin (owner) with DEFAULT_ADMIN_ROLE
- ✅ Grants OPERATOR_ROLE to operator address
- ✅ Validates addresses (checks for zero/default address)
- ✅ Records role activation time

**Note:** Token name/symbol are set during SPL Token creation, not in program initialization.

### 3. Mint Functions

#### A. Mint by Authorized Contract

**Solidity:** `PalmUSD.mint()`
```solidity
function mint(address to, uint256 amount) 
    external 
    onlyRole(AUTHORIZED_CONTRACT_ROLE)
```

**Solana:** `mint()`
```rust
pub fn mint(ctx: Context<MintByContract>, amount: u64) -> Result<()>
```

**Features:**
- ✅ Only callable by AUTHORIZED_CONTRACT_ROLE
- ✅ Validates recipient address (no zero address)
- ✅ Uses PDA as mint authority
- ✅ Emits appropriate logs

#### B. Mint by Operator

**Solidity:** `PalmUSD.mintByOperator()`
```solidity
function mintByOperator(address to, uint256 amount) 
    external 
    onlyRole(OPERATOR_ROLE)
```

**Solana:** `mint_by_operator()`
```rust
pub fn mint_by_operator(ctx: Context<MintByOperator>, amount: u64) -> Result<()>
```

**Features:**
- ✅ Only callable by OPERATOR_ROLE
- ✅ Validates recipient address
- ✅ Uses PDA as mint authority
- ✅ Emits appropriate logs

#### C. CPI Mint (Solana-specific)

**Solana Only:** `mint_cpi()`
```rust
pub fn mint_cpi(ctx: Context<MintByCPI>, amount: u64) -> Result<()>
```

**Purpose:** Enables other Solana programs to mint tokens via Cross-Program Invocation (CPI).

### 4. Burn Function

**Solidity:** `PalmUSD.burn()`
```solidity
function burn(uint256 amount) external
```

**Solana:** `burn()`
```rust
pub fn burn(ctx: Context<BurnTokens>, amount: u64) -> Result<()>
```

**Features:**
- ✅ Any user can burn their own tokens
- ✅ Burns from msg.sender/signer's token account
- ✅ Emits burn logs

### 5. Role Management

#### Add Role

**Solidity:** Inherited from `AccessControlUpgradeable._grantRole()`

**Solana:** `add_role()`
```rust
pub fn add_role(ctx: Context<AddRole>, user: Pubkey, role: Role) -> Result<()>
```

**Features:**
- ✅ Only callable by Admin
- ✅ Creates or updates user role account
- ✅ Sets role activation time
- ✅ Validates address

#### Remove Role

**Solidity:** Inherited from `AccessControlUpgradeable._revokeRole()`

**Solana:** `remove_role()`
```rust
pub fn remove_role(ctx: Context<RemoveRole>) -> Result<()>
```

**Features:**
- ✅ Only callable by Admin
- ✅ Closes role account and refunds rent

### 6. Version Information

**Solidity:** `PalmUSD.version()`
```solidity
function version() public pure returns (string memory) {
    return "1.0";
}
```

**Solana:** `version()`
```rust
pub fn version() -> String {
    VERSION.to_string()
}
```

**Features:**
- ✅ Returns version string "1.0"
- ✅ Constant defined at program level

### 7. Decimals

**Solidity:** `PalmUSD.decimals()`
```solidity
function decimals() public pure override returns (uint8) {
    return 6;
}
```

**Solana:** Set during token creation
- Decimals are specified when creating the SPL Token-2022 mint account
- Cannot be changed after creation
- Should be set to 6 to match Solidity

### 8. Mint Authority Management

**Solana-Specific:** `transfer_mint_authority_to_pda()`
```rust
pub fn transfer_mint_authority_to_pda(
    ctx: Context<TransferAuthority>
) -> Result<()>
```

**Purpose:** 
- Transfers mint authority from deployer wallet to program-controlled PDA
- Must be called after token creation
- Enables program to mint tokens via PDA signing

**Solidity Equivalent:** Not needed - Solidity contracts control minting directly.

---

## Error Codes Mapping

| Solidity Error | Solana Error | Description |
|----------------|--------------|-------------|
| `InvalidAddress()` | `ErrorCode::InvalidAddress` | Zero/invalid address provided |
| `RecipientIsZeroAddress()` | `ErrorCode::RecipientIsZeroAddress` | Recipient cannot be zero address |
| `GrantRoleFailed()` | `ErrorCode::GrantRoleFailed` | Failed to grant role |
| `UserHasAlreadyRole()` | `ErrorCode::RoleAlreadyAssigned` | User already has the role |
| `RoleNotActiveYet()` | `ErrorCode::RoleNotActiveYet` | Role not active yet (time-based) |
| `Unauthorized()` | `ErrorCode::Unauthorized` | Missing required role |
| N/A | `ErrorCode::RoleNotFound` | Role account doesn't exist |

---

## Storage Structure

### Solidity (BaseStorage)
```solidity
bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
bytes32 public constant AUTHORIZED_CONTRACT_ROLE = keccak256("AUTHORIZED_CONTRACT_ROLE");
mapping(address => uint256) public roleActiveTime;
```

### Solana (UserRole Account)
```rust
#[account]
pub struct UserRole {
    pub user: Pubkey,              // 32 bytes
    pub role: Role,                // 1 byte
    pub bump: u8,                  // 1 byte (PDA bump)
    pub role_active_time: i64,     // 8 bytes
}
```

**Key Differences:**
- Solidity uses mappings and role identifiers
- Solana uses PDA-based accounts (one per user per role)
- Solana requires explicit account creation (rent-based storage)

---

## Account Structures

### Initialize
- `owner_role` - Admin role account for owner
- `operator_role` - Operator role account
- `payer` - Transaction fee payer
- `system_program` - Solana system program

### MintByContract
- `contract_role` - Authorized contract role verification
- `authorized_contract` - Signer with authorized role
- `mint` - SPL Token mint account
- `recipient` - Token account receiving minted tokens
- `mint_authority` - PDA controlling mint authority
- `token_program` - Token-2022 program

### MintByOperator
- `operator_role` - Operator role verification
- `operator` - Signer with operator role
- `mint` - SPL Token mint account
- `recipient` - Token account receiving minted tokens
- `mint_authority` - PDA controlling mint authority
- `token_program` - Token-2022 program

### BurnTokens
- `mint` - SPL Token mint account
- `token_account` - Token account to burn from
- `owner` - Token account owner (signer)
- `token_program` - Token-2022 program

### AddRole
- `admin_role` - Admin role verification
- `admin` - Signer with admin role
- `user_role` - Role account being created/updated
- `system_program` - Solana system program

### RemoveRole
- `admin_role` - Admin role verification
- `admin` - Signer with admin role
- `user_role` - Role account being closed
- (Rent refunded to admin)

---

## Key Differences: Solidity vs Solana

### 1. **Account Model**
- **Solidity:** Contract storage, mappings
- **Solana:** Account-based, PDAs for derived addresses

### 2. **Role Storage**
- **Solidity:** Single mapping for all roles
- **Solana:** Separate account per user role (PDA-based)

### 3. **Mint Authority**
- **Solidity:** Contract controls minting directly
- **Solana:** PDA acts as mint authority, program signs on behalf

### 4. **Upgradeability**
- **Solidity:** UUPS proxy pattern
- **Solana:** Program upgrades via program authority

### 5. **Events**
- **Solidity:** Event emission via `emit`
- **Solana:** Logging via `msg!()` macro

### 6. **Gas/Fees**
- **Solidity:** Gas paid by transaction sender
- **Solana:** Transaction fees + rent for account storage

---

## Usage Examples

### Initialize Program
```rust
// Solana
initialize(owner_pubkey, operator_pubkey)

// Solidity
initialize(owner_address, operator_address)
```

### Mint Tokens (Operator)
```rust
// Solana
mint_by_operator(amount: 1000000) // 1 token with 6 decimals

// Solidity
mintByOperator(recipient_address, 1000000)
```

### Burn Tokens
```rust
// Solana
burn(amount: 500000) // Burns from signer's account

// Solidity
burn(500000) // Burns from msg.sender
```

### Add Role
```rust
// Solana
add_role(user_pubkey, Role::Operator)

// Solidity
grantRole(OPERATOR_ROLE, user_address)
```

---

## Testing Checklist

- [x] Initialize with owner and operator
- [x] Add Admin role
- [x] Add Operator role
- [x] Add AuthorizedContract role
- [x] Mint by Operator
- [x] Mint by Authorized Contract
- [x] Burn tokens by user
- [x] Remove role
- [x] Validate address checks
- [x] Role-based access control
- [x] PDA mint authority transfer
- [x] CPI minting

---

## Migration Notes

If migrating from Solidity to Solana:

1. **Create SPL Token-2022 mint** with 6 decimals
2. **Deploy Anchor program**
3. **Initialize program** with owner and operator
4. **Transfer mint authority to PDA** using `transfer_mint_authority_to_pda()`
5. **Grant additional roles** using `add_role()`
6. **Test minting** with operator and authorized contracts
7. **Test burning** from user accounts

---

## Conclusion

The Solana Anchor program now fully matches the Solidity contract functionality:

✅ **All roles implemented** (Admin, Operator, AuthorizedContract)  
✅ **Minting by operator and authorized contracts**  
✅ **Burning by users**  
✅ **Role management** (add/remove)  
✅ **Address validation**  
✅ **Role activation time tracking**  
✅ **Version information**  
✅ **6 decimal places** (configured during token creation)  
✅ **Proper error handling**  
✅ **Access control via PDAs**

The program is ready for deployment and testing on Solana!
