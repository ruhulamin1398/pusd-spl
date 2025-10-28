# PalmUSD Solana Program - Audit Documentation

## 📋 Overview

**PalmUSD (PUSD)** is a stablecoin implementation on Solana. This program implements role-based access control for minting operations with a mandatory 24-hour activation delay for security.

**Program Type**: SPL Token Management Program  
**Token Standard**: SPL Token (Solana's native token standard)  
**Language**: Rust (Anchor Framework v0.30.1)  
**Solana Version**: 1.18.x

---

## 📊 Audit Scope
 

### Files In Scope

| File | nSLOC |   Description |
|------|-------|-------------|
| **`lib.rs`** | **302** |  Main program logic, all instructions |
| **`modifiers.rs`** | **47** |  Security macros for authorization |
| **`state.rs`** | **30** |  Account structures and data models |
| **`errors.rs`** | **28** |   Custom error definitions |
| **`constants.rs`** | **2** |   Configuration constants |

**Total Lines for Audit: 409 Lines**
 

 
---

## 🏗️ Architecture

### Core Components

1. **Program State** (`ProgramState`): Tracks initialization status
2. **Role System** (`UserRole`): Implements RBAC with time-delayed activation
3. **Mint Authority**: PDA-controlled minting mechanism

### Role Hierarchy

```
Upgrade Authority (Deployer)
    └─ Owner
        ├─ Operator (can mint via mint_by_operator)
        └─ AuthorizedContract (can mint via mint)
```

---

## 🔐 Security Features

### 1. **24-Hour Role Activation Delay**
```rust
// constants.rs (2 nSLOC)
pub const ROLE_ACTIVATION_DELAY: i64 = 24 * 60 * 60; // 24 hours in seconds
```

### 2. **Single Role Per User**
- PDA derivation ensures one role account per user: `seeds = [b"user_role", user.key()]`
- Prevents privilege escalation through multiple roles

### 3. **Upgrade Authority Protection**
- Only upgrade authority can initialize the program
- Critical functions protected by `require_upgrade_authority!` macro

### 4. **Zero Address Validation**
- All address inputs validated with `require_valid_address!` macro

### 5. **Initialization Guard**
- Program can only be initialized once via `require_not_initialized!` macro

---
 