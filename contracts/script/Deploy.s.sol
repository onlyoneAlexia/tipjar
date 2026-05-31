// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {TipJar} from "../src/TipJar.sol";

contract Deploy is Script {
    function run() external returns (TipJar jar) {
        address ownerEnv = vm.envOr("TIPJAR_OWNER", address(0));
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        address ownerToUse = ownerEnv == address(0) ? deployer : ownerEnv;

        vm.startBroadcast(pk);
        jar = new TipJar(ownerToUse);
        vm.stopBroadcast();

        console.log("TipJar deployed at:", address(jar));
        console.log("Owner:", ownerToUse);
    }
}
