// SPDX-License-Identifier: MIT

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

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {PalmController} from "./PalmController.sol";
/**
 * @title PalmUSD
 * @dev This contract is an implementation of the PalmController for the Palm USD token.
 * @notice It extends PalmController and implements the UUPS upgradeable pattern.
 * @dev It includes functions for minting, burning, sending tokens across chains, and handling cross-chain transfers.
 */

contract PalmUSD is Initializable, UUPSUpgradeable, PalmController {
    // =========================
    //      ✅ Errors
    // =========================

    /// @notice The operation failed because the recipient address is invalid (zero address).
    error RecipientIsZeroAddress();

    /// @notice The operation failed because the contract has already been initialized.
    error ContractAlreadyInitialized();

    /// @notice The operation failed because only admin can update the contract.
    error OnlyAdminCanUpdateContract(address caller);

    // =========================
    //      ✅ Events
    // =========================

    /**
     * @notice Emitted when new tokens are minted.
     * @param operator The address performing the mint operation.
     * @param to The address receiving the minted tokens.
     * @param to The address receiving the minted tokens.
     * @param amount The number of tokens minted.
     */
    event MintByOperator(address indexed operator, address indexed to, uint256 amount);
    /**
     * @notice Emitted when tokens are minted via Authorized Minter.
     * @param to The address receiving the minted tokens.
     * @param amount The number of tokens minted.
     */
    event MintByAuthorizedContract(address indexed to, uint256 amount);

    /**
     * @notice Emitted when tokens are burned. 
     * @param from The address whose tokens were burned.
     * @param amount The number of tokens burned.
     */
  
    event Burn (address indexed from, uint256 amount);

    // =========================
    //      ✅ Modifiers
    // =========================

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // =========================
    //      ✅ Initializer
    // =========================

    /**
     * Fron v1
     * @notice Initializes the PalmUSD contract with admin and operator roles.
     * @dev Sets up the token name and symbol, assigns roles, and enables UUPS upgradeability.
     * @param ownerAddress The address to be granted the DEFAULT_ADMIN_ROLE (owner ).
     * @param operator The address to be granted the OPERATOR_ROLE (mint, destroy).
     */
    function initialize(address ownerAddress, address operator) public initializer  {
        if (ownerAddress == address(0) || operator == address(0)) {
            revert InvalidAddress();
        }
        __PalmController_init("Palm USD", "PUSD", ownerAddress, operator);
        __UUPSUpgradeable_init();
    }

    // =========================
    //   ✅ External Functions
    // =========================

    /**
     * @notice Mints new PUSD tokens to a specified address.
     * @dev Only callable by OPERATOR_ROLE.
     * @param to The address to receive the minted tokens.
     * @param amount The number of tokens to mint (6 decimals).
     */
    function mintByOperator(address to, uint256 amount) external onlyRole(OPERATOR_ROLE) {
        if (to == address(0)) revert RecipientIsZeroAddress();

        _mint(to, amount);
        emit MintByOperator(msg.sender, to, amount);
    }
    /**
     * @notice Mints new PUSD tokens to a specified address By Authorized Minter.
     * @dev Only callable by  AUTHORIZED_CONTRACT_ROLE.
     * @param to The address to receive the minted tokens.
     * @param amount The number of tokens to mint (6 decimals).
     */

    function mint(address to, uint256 amount) external onlyRole(AUTHORIZED_CONTRACT_ROLE) {
        if (to == address(0)) revert RecipientIsZeroAddress();
        _mint(to, amount);
        emit MintByAuthorizedContract(to, amount);
    }

 
    /**
     * @notice Burns PUSD tokens from msg sender.
     * @dev Only callable by user.
     * @param amount The number of tokens to burn (6 decimals).
     */
    function burn(uint256 amount) external  {
        _burn(msg.sender, amount);
        emit Burn(msg.sender, amount);
    }

    // =========================
    //   ✅ Internal Functions
    // =========================

    /**
     * @notice Authorizes contract upgrades via UUPS proxy pattern.
     * @dev Only callable by ADMIN_ROLE.
     * @param newImplementation The address of the new contract implementation.
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(ADMIN_ROLE) {}

    // =========================
    //   ✅ Private Functions
    // =========================

    // =========================
    //   ✅ View & Pure Functions
    // =========================

    /**
     * @notice Returns the number of decimals used for PUSD (fixed at 6).
     * @return uint8 The number of decimals (6).
     */
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function version() public pure returns (string memory) {
        return "1.0";
    }
}
