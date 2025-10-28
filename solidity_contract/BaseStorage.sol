//SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title BaseStorage
 * @notice Base storage contract for the Palm token, defining shared state variables and constants.
 * @dev Intended to be inherited by PalmController. Provides upgradeable storage layout for roles, and storage gap.
 */
abstract contract BaseStorage {
    // =========================
    //      ✅ State Variables
    // =========================
 

    /// @notice Role identifier for contract administrators (deployment, upgrades).
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    /// @notice Role identifier for operators (mint, burn management).
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    /// @notice Role identifier for  mint and burn authorization. It can be layerzero, Spear mint contract and others.
    bytes32 public constant AUTHORIZED_CONTRACT_ROLE = keccak256("AUTHORIZED_CONTRACT_ROLE");

    /// @notice Mapping to track role active timestamps for delay enforcement.
    //  user => role active timestamp
    mapping(address => uint256) public roleActiveTime;

    /// @dev Storage gap for upgradeability (see OpenZeppelin docs).
    uint256[98] __gap_BaseStorage;
}
