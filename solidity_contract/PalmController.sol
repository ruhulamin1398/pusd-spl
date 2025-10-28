//SPDX-License-Identifier: MIT

// This is considered an Exogenous,  Anchored (pegged), Fait Backend low volitility coin

// Layout of Contract:
// version
// imports
// interfaces, libraries, contracts
// errors
// Type declarations
// State variables
// Events
// Modifiers
// Functions

// Layout of Functions:
// constructor
// receive function (if exists)
// fallback function (if exists)
// external
// public
// internal
// private
// view & pure functions

pragma solidity 0.8.24;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {ERC20PermitUpgradeable} from
    "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";

import {BaseStorage} from "./BaseStorage.sol";

/**
 * @title PalmController
 * @notice Controller contract for the Palm token, managing roles, and core token logic.
 * @dev Inherits from BaseStorage , ERC20, AccessControl, and ERC20Permit (all upgradeable).
 *      Designed for upgradeability and secure role-based access control.
 */
abstract contract PalmController is BaseStorage, ERC20Upgradeable, AccessControlUpgradeable, ERC20PermitUpgradeable {
    // =========================
    //      ✅ Errors
    // =========================

    /// @notice The operation failed because the role assignment failed.
    error GrantRoleFailed(bytes32 role, address account);

    /// @notice The operation failed because the user already has the specified role.
    error UserHasAlreadyRole(bytes32 role, address account);

    /// @notice The operation failed because the role is not active yet.
    error RoleNotActiveYet(bytes32 role, address account, uint256 activationTime);

    /// @notice The operation failed because the provided address is invalid (e.g., zero address).
    error InvalidAddress();

    // =========================
    //      ✅ Events
    // =========================

    // =========================
    //      ✅ Modifiers
    // =========================

    // =========================
    //      ✅ Initializer
    // =========================

    /// @notice Initializes the PalmController contract with token details and role assignments.
    /// @dev Sets up ERC20 name/symbol, initializes access control, and permit modules. Grants admin and operator roles.
    /// @param name The name of the ERC20 token (Palm USD).
    /// @param symbol The symbol of the ERC20 token (e.g., "PUSD").
    /// @param ownerAddress The address to be granted DEFAULT_ADMIN_ROLE (owner).
    /// @param operator The address to be granted OPERATOR_ROLE (mint, burn).
    function __PalmController_init(string memory name, string memory symbol, address ownerAddress, address operator)
        internal
        onlyInitializing
    {
        __ERC20_init(name, symbol);
        __AccessControl_init();
        __ERC20Permit_init(name);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(DEFAULT_ADMIN_ROLE, ownerAddress);
        _grantRole(OPERATOR_ROLE, operator);
    }


}