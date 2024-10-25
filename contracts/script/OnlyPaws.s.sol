// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/OnlyPaws.sol";

contract DeployOnlyPaws is Script {
    function run() external {
        vm.startBroadcast();

        new OnlyPaws();

        vm.stopBroadcast();
    }
}
