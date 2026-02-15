//SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IAccount} from "account-abstraction/contracts/interfaces/IAccount.sol";
import {
    PackedUserOperation
} from "account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import {P256} from "p256-verifier/P256.sol";
import {
    SIG_VALIDATION_FAILED,
    SIG_VALIDATION_SUCCESS
} from "account-abstraction/contracts/core/Helpers.sol";

contract KinetiFiAccount is IAccount {
    // ── State Variables ──────────────────────────────────────────────────────
    address public immutable entryPoint;

    // ── Constructor ──────────────────────────────────────────────────────────
    constructor(address _entryPoint, uint256 _x, uint256 _y) {
        entryPoint = _entryPoint;
        pubKeyX = _x;
        pubKeyY = _y;
    }

    // ── Validate User Operation ──────────────────────────────────────────────
    function validateUserOp(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external virtual override returns (uint256 validationData) {
        // 1. Restrict to entrypoint
        require(
            msg.sender == address(entryPoint),
            "Only entrypoint can call this function"
        );

        // 2. Check if the signature is valid
        if (!_validateSignature(userOp, userOpHash)) {
            return SIG_VALIDATION_FAILED;
        }

        // 3. Pay entrypoint
        _payPrefund(missingAccountFunds);

        return SIG_VALIDATION_SUCCESS;
    }

    // ── Validate Signature ─────────────────────────────────────────────────────
    function _validateSignature(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash
    ) internal view returns (bool) {
        // userOp.signature typically contains [r, s]
        (uint256 r, uint256 s) = abi.decode(
            userOp.signature,
            (uint256, uint256)
        );

        // Use the automated Daimo verifier
        return P256.verifySignature(userOpHash, r, s, pubKeyX, pubKeyY);
    }

    // ── Execute ──────────────────────────────────────────────────────────────
    function execute(
        address dest,
        uint256 value,
        bytes calldata func
    ) external {
        // 1. Restrict to entrypoint
        require(
            msg.sender == entryPoint,
            "Only entrypoint can call this function"
        );

        // 2. Execute the function
        (bool success, ) = dest.call{value: value}(func);
        require(success, "Failed to execute");
    }

    // ── Pay Entrypoint ───────────────────────────────────────────────────────
    function _payPrefund(uint256 missingAccountFunds) internal {
        // 1. Pay entrypoint if needed
        if (missingAccountFunds != 0) {
            (bool success, ) = payable(msg.sender).call{
                value: missingAccountFunds
            }("");
            require(success, "Failed to pay entrypoint");
        }
    }
}
