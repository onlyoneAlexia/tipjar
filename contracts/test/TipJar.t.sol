// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {TipJar} from "../src/TipJar.sol";

contract TipJarTest is Test {
    TipJar jar;
    address owner = address(0xA11CE);
    address alice = address(0xB0B);
    address bob = address(0xCAFE);

    function setUp() public {
        vm.prank(owner);
        jar = new TipJar(owner);
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
    }

    function test_tipStoresFields() public {
        vm.prank(alice);
        jar.tip{value: 1 ether}("thanks!");

        (address sender, uint256 amount, string memory message, uint256 ts) = jar.tips(0);
        assertEq(sender, alice);
        assertEq(amount, 1 ether);
        assertEq(message, "thanks!");
        assertEq(ts, block.timestamp);
    }

    function test_zeroTipReverts() public {
        vm.prank(alice);
        vm.expectRevert(TipJar.ZeroTip.selector);
        jar.tip("nope");
    }

    function test_recentTipsNewestFirst() public {
        for (uint256 i = 0; i < 12; i++) {
            vm.prank(i % 2 == 0 ? alice : bob);
            jar.tip{value: 0.01 ether}(string(abi.encodePacked("msg #", vm.toString(i))));
        }
        TipJar.Tip[] memory recent = jar.recentTips();
        assertEq(recent.length, 10);
        assertEq(recent[0].message, "msg #11");
        assertEq(recent[9].message, "msg #2");
    }

    function test_recentTipsHandlesUnderTen() public {
        vm.prank(alice);
        jar.tip{value: 0.1 ether}("hi");
        TipJar.Tip[] memory recent = jar.recentTips();
        assertEq(recent.length, 1);
        assertEq(recent[0].message, "hi");
    }

    function test_onlyOwnerCanWithdraw() public {
        vm.prank(alice);
        jar.tip{value: 1 ether}("");

        vm.prank(alice);
        vm.expectRevert(TipJar.NotOwner.selector);
        jar.withdraw();
    }

    function test_ownerWithdrawsBalance() public {
        vm.prank(alice);
        jar.tip{value: 1 ether}("for you");
        uint256 ownerStart = owner.balance;

        vm.prank(owner);
        jar.withdraw();

        assertEq(address(jar).balance, 0);
        assertEq(owner.balance, ownerStart + 1 ether);
    }

    function test_receiveAlsoStoresTip() public {
        vm.prank(alice);
        (bool ok, ) = address(jar).call{value: 0.5 ether}("");
        assertTrue(ok);
        assertEq(jar.tipCount(), 1);
        (, uint256 amount, string memory msg_,) = jar.tips(0);
        assertEq(amount, 0.5 ether);
        assertEq(msg_, "");
    }
}
