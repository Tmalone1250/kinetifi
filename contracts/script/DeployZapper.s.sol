// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../MerchantMoeZapper.sol";

contract DeployZapper is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Mantle Mainnet Addresses (Live Fire Demo)
        address LB_ROUTER = vm.envOr("MOE_LB_ROUTER", address(0x013e138EF6008ae5FDFDE29700e3f2Bc61d21E3a)); 
        address WMNT = vm.envOr("WMNT_ADDRESS", address(0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8));

        vm.startBroadcast(deployerPrivateKey);

        MerchantMoeZapper zapper = new MerchantMoeZapper(LB_ROUTER, WMNT);
        
        vm.stopBroadcast();

        console.log("MerchantMoeZapper deployed at:", address(zapper));
    }
}
