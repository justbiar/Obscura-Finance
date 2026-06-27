// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IVerifier} from "../interfaces/IVerifier.sol";

interface IUltraVerifier {
    function verify(bytes calldata _proof, bytes32[] calldata _publicInputs) external view returns (bool);
}

/// @title ObscuraVerifier - Adapter wrapping Noir's UltraVerifier to IVerifier interface
/// @notice Delegates ZK proof verification to the auto-generated UltraPlonk verifier
contract ObscuraVerifier is IVerifier {
    IUltraVerifier public immutable ultraVerifier;

    constructor(address _ultraVerifier) {
        require(_ultraVerifier != address(0), "Zero address");
        ultraVerifier = IUltraVerifier(_ultraVerifier);
    }

    function verify(
        bytes calldata proof,
        bytes32[] calldata publicInputs
    ) external view override returns (bool isValid) {
        try ultraVerifier.verify(proof, publicInputs) returns (bool result) {
            return result;
        } catch {
            return false;
        }
    }
}
