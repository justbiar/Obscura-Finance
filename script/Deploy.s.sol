// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ObscuraLending} from "../contracts/ObscuraLending.sol";

contract DeployScript is Script {
    function run() external {
        vm.startBroadcast();

        // Deploy with an already-deployed verifier address
        // Pass verifier address via --sig or environment variable
        address verifierAddr = vm.envAddress("VERIFIER_ADDRESS");

        ObscuraLending lending = new ObscuraLending(verifierAddr);
        console.log("ObscuraLending deployed at:", address(lending));
        console.log("Verifier address:", address(lending.verifier()));
        console.log("Owner:", lending.owner());

        vm.stopBroadcast();
    }
}

contract DeployAll is Script {
    function run() external {
        vm.startBroadcast();

        // 1. Deploy UltraVerifier (generated from Noir circuit)
        bytes memory ultraVerifierCode = vm.getCode("verifier/UltraVerifier.sol:UltraVerifier");
        address ultraVerifier;
        assembly {
            ultraVerifier := create(0, add(ultraVerifierCode, 0x20), mload(ultraVerifierCode))
        }
        require(ultraVerifier != address(0), "UltraVerifier deploy failed");
        console.log("UltraVerifier deployed at:", ultraVerifier);

        // 2. Deploy ObscuraVerifier (IVerifier adapter)
        bytes memory adapterCode = vm.getCode("verifier/ObscuraVerifier.sol:ObscuraVerifier");
        bytes memory adapterInit = abi.encodePacked(adapterCode, abi.encode(ultraVerifier));
        address obscuraVerifier;
        assembly {
            obscuraVerifier := create(0, add(adapterInit, 0x20), mload(adapterInit))
        }
        require(obscuraVerifier != address(0), "ObscuraVerifier deploy failed");
        console.log("ObscuraVerifier deployed at:", obscuraVerifier);

        // 3. Deploy ObscuraLending
        ObscuraLending lending = new ObscuraLending(obscuraVerifier);
        console.log("ObscuraLending deployed at:", address(lending));

        vm.stopBroadcast();
    }
}

contract DeployMock is Script {
    function run() external {
        vm.startBroadcast();

        // Deploy with MockVerifier for testing
        bytes memory mockCode = vm.getCode("mocks/MockVerifier.sol:MockVerifier");
        address mockVerifier;
        assembly {
            mockVerifier := create(0, add(mockCode, 0x20), mload(mockCode))
        }
        console.log("MockVerifier deployed at:", mockVerifier);

        ObscuraLending lending = new ObscuraLending(mockVerifier);
        console.log("ObscuraLending deployed at:", address(lending));

        vm.stopBroadcast();
    }
}
