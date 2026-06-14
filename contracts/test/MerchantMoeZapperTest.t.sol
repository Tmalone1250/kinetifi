// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../MerchantMoeZapper.sol";

/**
 * @title MerchantMoeZapperTest v2
 * @notice Fork test against Mantle Mainnet. Deploys a fresh Zapper in the test
 *         so we always test the latest code, not the old on-chain contract.
 * @dev Run with:
 *   forge test --fork-url https://rpc.mantle.xyz -vvvv --match-contract MerchantMoeZapperTest
 */
contract MerchantMoeZapperTest is Test {

    address constant LB_ROUTER = 0x013e138EF6008ae5FDFDE29700e3f2Bc61d21E3a;
    address constant WMNT_ADDR = 0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8;
    address constant USDT_ADDR = 0x201EBa5CC46D216Ce6DC03F6a759e8E766e956aE;
    address constant LB_PAIR   = 0x365722f12ceb2063286A268B03c654Df81B7C00F;

    MerchantMoeZapper zapper;
    address user = makeAddr("user");

    function setUp() public {
        // Deploy a fresh Zapper from the updated source
        zapper = new MerchantMoeZapper(LB_ROUTER, WMNT_ADDR);
        vm.deal(user, 10 ether);
    }

    function getActiveId() internal view returns (uint24) {
        (bool ok, bytes memory data) = LB_PAIR.staticcall(
            abi.encodeWithSignature("getActiveId()")
        );
        require(ok, "getActiveId failed");
        return abi.decode(data, (uint24));
    }

    // Test 1: Verify the on-chain selector matches what Python will compute
    function test_FunctionSelector() public view {
        bytes4 sel = MerchantMoeZapper.zapInMNT.selector;
        console.log("zapInMNT selector:");
        console.logBytes4(sel);
    }

    // Test 2: Full zap with realistic mainnet params
    function test_ZapInMNT_3MNT() public {
        uint24 activeId = getActiveId();
        console.log("Live activeId:", activeId);

        uint256 MNT_AMOUNT  = 3 ether;
        uint256 swapAmount  = MNT_AMOUNT / 2; // 1.5 WMNT

        // ~0.55 USDT per WMNT => 1.5 * 0.55 = 0.825 USDT = 825_000 uUSDT
        // 3% slippage => 800_250 floor
        uint256 amountOutMin = 800_000; // conservative

        IERC20[] memory tokenPath = new IERC20[](2);
        tokenPath[0] = IERC20(WMNT_ADDR);
        tokenPath[1] = IERC20(USDT_ADDR);

        uint256[] memory pairBinSteps = new uint256[](1);
        pairBinSteps[0] = 25;

        int256[] memory deltaIds = new int256[](1);
        deltaIds[0] = 0;

        uint256[] memory distributionX = new uint256[](1);
        distributionX[0] = 1e18;

        uint256[] memory distributionY = new uint256[](1);
        distributionY[0] = 1e18;

        MerchantMoeZapper.ZapParams memory params = MerchantMoeZapper.ZapParams({
            tokenB:          IERC20(USDT_ADDR),
            swapAmount:      swapAmount,
            amountOutMin:    amountOutMin,
            pairBinSteps:    pairBinSteps,
            tokenPath:       tokenPath,
            binStep:         25,
            amountXMin:      1.4 ether,
            amountYMin:      700_000,
            activeIdDesired: activeId,
            idSlippage:      5,
            deltaIds:        deltaIds,
            distributionX:   distributionX,
            distributionY:   distributionY,
            wmntIsTokenX:    true
        });

        address zapperAddr = address(zapper);
        uint256 wmntBefore = IERC20(WMNT_ADDR).balanceOf(user);
        uint256 usdtBefore = IERC20(USDT_ADDR).balanceOf(user);

        vm.prank(user);
        zapper.zapInMNT{value: MNT_AMOUNT}(params);

        uint256 wmntDust = IERC20(WMNT_ADDR).balanceOf(user) - wmntBefore;
        uint256 usdtDust = IERC20(USDT_ADDR).balanceOf(user) - usdtBefore;

        console.log("WMNT dust refunded:", wmntDust);
        console.log("USDT dust refunded:", usdtDust);
        console.log("Zapper WMNT balance (must be 0):", IERC20(WMNT_ADDR).balanceOf(zapperAddr));
        console.log("Zapper USDT balance (must be 0):", IERC20(USDT_ADDR).balanceOf(zapperAddr));
        console.log("Zapper MNT  balance (must be 0):", zapperAddr.balance);

        // Critical safety invariants
        assertEq(IERC20(WMNT_ADDR).balanceOf(zapperAddr), 0, "WMNT trapped!");
        assertEq(IERC20(USDT_ADDR).balanceOf(zapperAddr), 0, "USDT trapped!");
        assertEq(zapperAddr.balance,                       0, "MNT trapped!");
    }

    // Test 3: Verify V2.1 swap works in isolation
    function test_V21_Swap_Isolated() public {
        deal(WMNT_ADDR, user, 2 ether);

        ILBRouter.Version[] memory versions = new ILBRouter.Version[](1);
        versions[0] = ILBRouter.Version.V2_1;

        IERC20[] memory tokenPath = new IERC20[](2);
        tokenPath[0] = IERC20(WMNT_ADDR);
        tokenPath[1] = IERC20(USDT_ADDR);

        uint256[] memory pairBinSteps = new uint256[](1);
        pairBinSteps[0] = 25;

        ILBRouter.Path memory path = ILBRouter.Path({
            pairBinSteps: pairBinSteps,
            versions:     versions,
            tokenPath:    tokenPath
        });

        vm.startPrank(user);
        IERC20(WMNT_ADDR).approve(LB_ROUTER, 1 ether);
        uint256 amountOut = ILBRouter(LB_ROUTER).swapExactTokensForTokens(
            1 ether,
            700_000,
            path,
            user,
            block.timestamp + 300
        );
        vm.stopPrank();

        console.log("V2.1 swap succeeded. USDT received:", amountOut);
        assertGt(amountOut, 700_000, "Swap output below slippage floor");
    }
}
