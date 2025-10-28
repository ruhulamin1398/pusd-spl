# Role Management Commands

## Overview
These commands help you manage roles (Admin, Operator, Authorized Contract) for your PUSD SPL program.

## Quick Commands

### Add Roles
```bash
# Add an operator
make add-operator USER=<PUBLIC_KEY>

# Add an authorized contract
make add-contract USER=<PUBLIC_KEY>

# Add an admin
make add-admin USER=<PUBLIC_KEY>
```

### Remove Role
```bash
make remove-role USER=<PUBLIC_KEY>
```

### Check Role
```bash
make check-role USER=<PUBLIC_KEY>
```

## Quick Commands for Pre-configured Accounts

### Add Operators from Local Wallets
```bash
make add-operator-account1   # Add account1 as operator
make add-operator-account2   # Add account2 as operator
make add-operator-account3   # Add account3 as operator
```

### Remove Operators from Local Wallets
```bash
make remove-operator-account1
make remove-operator-account2
make remove-operator-account3
```

## Examples

### Example 1: Add an Operator
```bash
make add-operator USER=4nCCoHpuaKc4vgYbp3gAiai2qDKLXmXvhsWacq191wJg
```

### Example 2: Add a Program as Authorized Contract
```bash
make add-contract USER=YourProgram111111111111111111111111111111111
```

### Example 3: Check a User's Role
```bash
make check-role USER=4nCCoHpuaKc4vgYbp3gAiai2qDKLXmXvhsWacq191wJg
```

### Example 4: Remove a Role
```bash
make remove-role USER=4nCCoHpuaKc4vgYbp3gAiai2qDKLXmXvhsWacq191wJg
```

## Role Types

1. **Admin** - Can add and remove all roles
2. **Operator** - Can call `mint_by_operator` function
3. **Authorized Contract** (contract) - Can call `mint` and `mint_cpi` functions

## Notes

- You must be an admin to add/remove roles
- Each address can only have ONE role at a time
- The role is stored in a PDA derived from `["user_role", user_pubkey]`
- Removing a role closes the account and refunds rent to the admin
