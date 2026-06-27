// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {ObscuraLending} from "../contracts/ObscuraLending.sol";
import {MockVerifier} from "../contracts/mocks/MockVerifier.sol";
import {ObscuraErrors} from "../contracts/libraries/ObscuraErrors.sol";

contract ObscuraLendingTest is Test {
    ObscuraLending public lending;
    MockVerifier public mockVerifier;

    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    // Test commitment hash (rastgele)
    bytes32 public constant ALICE_COMMITMENT = keccak256("alice_secret");

    // Geçerli bir mock proof (64+ byte)
    bytes public validProof = new bytes(128);

    function setUp() public {
        // MockVerifier deploy et (tüm proof'ları kabul eder)
        mockVerifier = new MockVerifier();

        // ObscuraLending deploy et
        lending = new ObscuraLending(address(mockVerifier));

        // Test kullanıcılarına ETH ver
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
    }

    // ========================================================================
    // Deposit Testleri
    // ========================================================================

    function test_deposit() public {
        vm.prank(alice);
        lending.deposit{value: 10 ether}();

        assertEq(lending.collateral(alice), 10 ether);
        assertEq(lending.totalDeposits(), 10 ether);
    }

    function test_deposit_multiple() public {
        vm.startPrank(alice);
        lending.deposit{value: 5 ether}();
        lending.deposit{value: 3 ether}();
        vm.stopPrank();

        assertEq(lending.collateral(alice), 8 ether);
    }

    function test_deposit_zero_reverts() public {
        vm.prank(alice);
        vm.expectRevert(ObscuraErrors.ZeroAmount.selector);
        lending.deposit{value: 0}();
    }

    function test_deposit_via_receive() public {
        vm.prank(alice);
        (bool success,) = address(lending).call{value: 5 ether}("");
        assertTrue(success);
        assertEq(lending.collateral(alice), 5 ether);
    }

    // ========================================================================
    // Withdraw Testleri
    // ========================================================================

    function test_withdraw() public {
        vm.startPrank(alice);
        lending.deposit{value: 10 ether}();
        lending.withdraw(4 ether);
        vm.stopPrank();

        assertEq(lending.collateral(alice), 6 ether);
        assertEq(alice.balance, 94 ether); // 100 - 10 + 4
    }

    function test_withdraw_insufficient_reverts() public {
        vm.startPrank(alice);
        lending.deposit{value: 5 ether}();
        vm.expectRevert("Yetersiz teminat");
        lending.withdraw(6 ether);
        vm.stopPrank();
    }

    function test_withdraw_zero_reverts() public {
        vm.prank(alice);
        vm.expectRevert(ObscuraErrors.ZeroAmount.selector);
        lending.withdraw(0);
    }

    function test_withdraw_blocked_by_debt() public {
        // Alice 15 ETH yatırır, 10 ETH borç alır (standart %150)
        // Gerekli teminat = 10 * 15000 / 10000 = 15 ETH
        // Yani hiç çekemez
        vm.startPrank(alice);
        lending.deposit{value: 15 ether}();
        lending.borrow(10 ether);

        vm.expectRevert(
            abi.encodeWithSelector(
                ObscuraErrors.InsufficientCollateral.selector,
                15 ether, // required
                14 ether  // remaining after withdraw
            )
        );
        lending.withdraw(1 ether);
        vm.stopPrank();
    }

    // ========================================================================
    // Standard Borrow Testleri
    // ========================================================================

    function test_borrow_standard() public {
        // Bob 20 ETH yatırır -> Alice 15 ETH yatırır -> Alice 10 ETH borç alır
        vm.prank(bob);
        lending.deposit{value: 20 ether}();

        vm.startPrank(alice);
        lending.deposit{value: 15 ether}();
        lending.borrow(10 ether);
        vm.stopPrank();

        assertEq(lending.debt(alice), 10 ether);
        assertEq(lending.totalBorrows(), 10 ether);
    }

    function test_borrow_insufficient_collateral_reverts() public {
        vm.prank(bob);
        lending.deposit{value: 20 ether}();

        // Alice 10 ETH teminat ile 10 ETH borç alamaz (%150 gerekir -> 15 ETH lazım)
        vm.startPrank(alice);
        lending.deposit{value: 10 ether}();

        vm.expectRevert(
            abi.encodeWithSelector(
                ObscuraErrors.InsufficientCollateral.selector,
                15 ether, // required (10 * 15000 / 10000)
                10 ether  // provided
            )
        );
        lending.borrow(10 ether);
        vm.stopPrank();
    }

    function test_borrow_insufficient_liquidity_reverts() public {
        // Alice 15 ETH yatırır (toplam havuz = 15 ETH), 20 ETH borç ister
        vm.startPrank(alice);
        lending.deposit{value: 15 ether}();

        vm.expectRevert(
            abi.encodeWithSelector(
                ObscuraErrors.InsufficientLiquidity.selector,
                20 ether, // requested
                15 ether  // available
            )
        );
        lending.borrow(20 ether);
        vm.stopPrank();
    }

    // ========================================================================
    // ZK Borrow Testleri
    // ========================================================================

    function test_borrowWithZKProof() public {
        // Havuza likidite ekle
        vm.prank(bob);
        lending.deposit{value: 50 ether}();

        vm.startPrank(alice);
        // 1. Teminat yatır
        lending.deposit{value: 10 ether}();
        // 2. Commitment kaydet
        lending.registerCommitment(ALICE_COMMITMENT);

        // 3. ZK proof ile borç al (%100 teminat -> 10 ETH teminat ile 10 ETH borç)
        bytes32[] memory publicInputs = new bytes32[](2);
        publicInputs[0] = bytes32(uint256(750)); // minScore
        publicInputs[1] = ALICE_COMMITMENT;       // secretHash

        lending.borrowWithZKProof(10 ether, validProof, publicInputs);
        vm.stopPrank();

        assertEq(lending.debt(alice), 10 ether);
        assertTrue(lending.hasZKBorrow(alice));
    }

    function test_borrowWithZKProof_invalid_proof_reverts() public {
        vm.prank(bob);
        lending.deposit{value: 50 ether}();

        // MockVerifier'ı reddetmeye ayarla
        mockVerifier.setShouldVerify(false);

        vm.startPrank(alice);
        lending.deposit{value: 10 ether}();
        lending.registerCommitment(ALICE_COMMITMENT);

        bytes32[] memory publicInputs = new bytes32[](2);
        publicInputs[0] = bytes32(uint256(750));
        publicInputs[1] = ALICE_COMMITMENT;

        vm.expectRevert(ObscuraErrors.InvalidZKProof.selector);
        lending.borrowWithZKProof(10 ether, validProof, publicInputs);
        vm.stopPrank();
    }

    function test_borrowWithZKProof_wrong_commitment_reverts() public {
        vm.prank(bob);
        lending.deposit{value: 50 ether}();

        vm.startPrank(alice);
        lending.deposit{value: 10 ether}();
        lending.registerCommitment(ALICE_COMMITMENT);

        bytes32[] memory publicInputs = new bytes32[](2);
        publicInputs[0] = bytes32(uint256(750));
        publicInputs[1] = keccak256("wrong_secret"); // Yanlış commitment

        vm.expectRevert("Commitment uyusmasi");
        lending.borrowWithZKProof(10 ether, validProof, publicInputs);
        vm.stopPrank();
    }

    function test_borrowWithZKProof_double_borrow_reverts() public {
        vm.prank(bob);
        lending.deposit{value: 50 ether}();

        vm.startPrank(alice);
        lending.deposit{value: 20 ether}();
        lending.registerCommitment(ALICE_COMMITMENT);

        bytes32[] memory publicInputs = new bytes32[](2);
        publicInputs[0] = bytes32(uint256(750));
        publicInputs[1] = ALICE_COMMITMENT;

        // İlk borç başarılı
        lending.borrowWithZKProof(5 ether, validProof, publicInputs);

        // İkinci ZK borç denemesi başarısız olmalı
        vm.expectRevert(ObscuraErrors.ExistingZKDebt.selector);
        lending.borrowWithZKProof(5 ether, validProof, publicInputs);
        vm.stopPrank();
    }

    function test_borrowWithZKProof_undercollateralized_advantage() public {
        // ZK ile %100 teminat vs standart %150 teminat farkını test et
        vm.prank(bob);
        lending.deposit{value: 50 ether}();

        vm.startPrank(alice);
        lending.deposit{value: 10 ether}();
        lending.registerCommitment(ALICE_COMMITMENT);

        // Standart borçta 10 ETH teminat ile max 6.66 ETH borç alınabilir
        // ZK borçta 10 ETH teminat ile max 10 ETH borç alınabilir
        bytes32[] memory publicInputs = new bytes32[](2);
        publicInputs[0] = bytes32(uint256(750));
        publicInputs[1] = ALICE_COMMITMENT;

        // 8 ETH borç: standart %150 ile 12 ETH teminat gerekir (başarısız)
        //              ZK %100 ile 8 ETH teminat yeterli (başarılı)
        lending.borrowWithZKProof(8 ether, validProof, publicInputs);
        vm.stopPrank();

        assertEq(lending.debt(alice), 8 ether);
    }

    // ========================================================================
    // Repay Testleri
    // ========================================================================

    function test_repay_partial() public {
        vm.prank(bob);
        lending.deposit{value: 50 ether}();

        vm.startPrank(alice);
        lending.deposit{value: 15 ether}();
        lending.borrow(10 ether);

        // Kısmi ödeme
        lending.repay{value: 4 ether}();
        vm.stopPrank();

        assertEq(lending.debt(alice), 6 ether);
    }

    function test_repay_full_clears_zk_flag() public {
        vm.prank(bob);
        lending.deposit{value: 50 ether}();

        vm.startPrank(alice);
        lending.deposit{value: 10 ether}();
        lending.registerCommitment(ALICE_COMMITMENT);

        bytes32[] memory publicInputs = new bytes32[](2);
        publicInputs[0] = bytes32(uint256(750));
        publicInputs[1] = ALICE_COMMITMENT;

        lending.borrowWithZKProof(5 ether, validProof, publicInputs);
        assertTrue(lending.hasZKBorrow(alice));

        // Tam ödeme -> ZK flag sıfırlanmalı
        lending.repay{value: 5 ether}();
        vm.stopPrank();

        assertEq(lending.debt(alice), 0);
        assertFalse(lending.hasZKBorrow(alice));
    }

    function test_repay_excessive_reverts() public {
        vm.prank(bob);
        lending.deposit{value: 50 ether}();

        vm.startPrank(alice);
        lending.deposit{value: 15 ether}();
        lending.borrow(5 ether);

        vm.expectRevert(
            abi.encodeWithSelector(
                ObscuraErrors.ExcessiveRepayment.selector,
                5 ether,  // debt
                10 ether  // repayment
            )
        );
        lending.repay{value: 10 ether}();
        vm.stopPrank();
    }

    function test_repay_no_debt_reverts() public {
        vm.prank(alice);
        vm.expectRevert("Borcunuz bulunmuyor");
        lending.repay{value: 1 ether}();
    }

    // ========================================================================
    // Commitment Testleri
    // ========================================================================

    function test_registerCommitment() public {
        vm.prank(alice);
        lending.registerCommitment(ALICE_COMMITMENT);
        assertEq(lending.commitments(alice), ALICE_COMMITMENT);
    }

    function test_registerCommitment_duplicate_reverts() public {
        vm.startPrank(alice);
        lending.registerCommitment(ALICE_COMMITMENT);

        vm.expectRevert(ObscuraErrors.CommitmentAlreadyRegistered.selector);
        lending.registerCommitment(keccak256("another"));
        vm.stopPrank();
    }

    // ========================================================================
    // View Fonksiyon Testleri
    // ========================================================================

    function test_getHealthFactor_no_debt() public {
        assertEq(lending.getHealthFactor(alice), type(uint256).max);
    }

    function test_getHealthFactor_with_debt() public {
        vm.prank(bob);
        lending.deposit{value: 50 ether}();

        vm.startPrank(alice);
        lending.deposit{value: 15 ether}();
        lending.borrow(10 ether);
        vm.stopPrank();

        // healthFactor = (15e18 * 10000 * 10000) / (10e18 * 15000) = 10000
        // Tam sınırda: 1.0x
        uint256 hf = lending.getHealthFactor(alice);
        assertEq(hf, 10000);
    }

    function test_getMaxBorrow() public {
        vm.prank(bob);
        lending.deposit{value: 50 ether}();

        vm.prank(alice);
        lending.deposit{value: 15 ether}();

        // Standart: maxDebt = 15 * 10000 / 15000 = 10 ETH
        uint256 maxBorrow = lending.getMaxBorrow(alice);
        assertEq(maxBorrow, 10 ether);
    }

    function test_getUserPosition() public {
        vm.prank(bob);
        lending.deposit{value: 50 ether}();

        vm.startPrank(alice);
        lending.deposit{value: 10 ether}();
        lending.registerCommitment(ALICE_COMMITMENT);

        bytes32[] memory publicInputs = new bytes32[](2);
        publicInputs[0] = bytes32(uint256(750));
        publicInputs[1] = ALICE_COMMITMENT;
        lending.borrowWithZKProof(5 ether, validProof, publicInputs);
        vm.stopPrank();

        (uint256 col, uint256 dbt, bool isZK, uint256 ratio) = lending.getUserPosition(alice);
        assertEq(col, 10 ether);
        assertEq(dbt, 5 ether);
        assertTrue(isZK);
        assertEq(ratio, 10000); // ZK ratio
    }

    function test_getPoolInfo() public {
        vm.prank(bob);
        lending.deposit{value: 50 ether}();

        vm.startPrank(alice);
        lending.deposit{value: 15 ether}();
        lending.borrow(10 ether);
        vm.stopPrank();

        (uint256 deposits, uint256 borrows, uint256 utilization) = lending.getPoolInfo();
        assertEq(deposits, 65 ether);
        assertEq(borrows, 10 ether);
        // utilization = (10 * 10000) / 65 = 1538 (~%15.38)
        assertEq(utilization, 1538);
    }

    // ========================================================================
    // Constructor Testleri
    // ========================================================================

    function test_constructor_zero_verifier_reverts() public {
        vm.expectRevert(ObscuraErrors.ZeroAddress.selector);
        new ObscuraLending(address(0));
    }
}
