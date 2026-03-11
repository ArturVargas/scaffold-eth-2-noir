// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IUltraVerifier } from "./interfaces/IUltraVerifier.sol";

contract BalloonVendor is Ownable {
    error InvalidProof();
    error InvalidPublicInputs();
    error AlreadyClaimed();

    uint256 public constant FREE_TOKEN_AMOUNT = 1 ether;
    uint256 private constant PUBLIC_INPUTS_LENGTH = 85;

    IERC20 public immutable balloonToken;
    IUltraVerifier public verifier;

    uint16 public earliestBirthYear = 2013;
    bytes32 public authorityPublicKeyX = hex"ba5734d8f7091719471e7f7ed6b9df170dc70cc661ca05e688601ad984f068b0";
    bytes32 public authorityPublicKeyY = hex"d67351e5f06073092499336ab0839ef8a521afd334e53807205fa2f08eec74f4";

    mapping(address => bool) public hasClaimedFreeToken;

    event FreeTokenClaimed(address indexed claimer, uint256 amount);
    event VerifierUpdated(address indexed verifier);
    event AgeRestrictionUpdated(uint16 earliestBirthYear);
    event AuthorityUpdated(bytes32 authorityPublicKeyX, bytes32 authorityPublicKeyY);

    constructor(address initialOwner, address balloonTokenAddress, address verifierAddress) Ownable(initialOwner) {
        balloonToken = IERC20(balloonTokenAddress);
        verifier = IUltraVerifier(verifierAddress);
    }

    function getFreeToken(bytes calldata proof, bytes32[] calldata publicInputs) external {
        if (hasClaimedFreeToken[msg.sender]) revert AlreadyClaimed();
        if (!_matchesExpectedPublicInputs(publicInputs, msg.sender)) revert InvalidPublicInputs();
        if (!verifier.verify(proof, publicInputs)) revert InvalidProof();

        hasClaimedFreeToken[msg.sender] = true;
        balloonToken.transfer(msg.sender, FREE_TOKEN_AMOUNT);

        emit FreeTokenClaimed(msg.sender, FREE_TOKEN_AMOUNT);
    }

    function setVerifier(address verifierAddress) external onlyOwner {
        verifier = IUltraVerifier(verifierAddress);
        emit VerifierUpdated(verifierAddress);
    }

    function setAgeRestriction(uint16 nextEarliestBirthYear) external onlyOwner {
        earliestBirthYear = nextEarliestBirthYear;
        emit AgeRestrictionUpdated(nextEarliestBirthYear);
    }

    function setAuthority(bytes32 nextAuthorityPublicKeyX, bytes32 nextAuthorityPublicKeyY) external onlyOwner {
        authorityPublicKeyX = nextAuthorityPublicKeyX;
        authorityPublicKeyY = nextAuthorityPublicKeyY;
        emit AuthorityUpdated(nextAuthorityPublicKeyX, nextAuthorityPublicKeyY);
    }

    function _matchesExpectedPublicInputs(
        bytes32[] calldata publicInputs,
        address claimer
    )
        internal
        view
        returns (bool)
    {
        if (publicInputs.length != PUBLIC_INPUTS_LENGTH) {
            return false;
        }

        bytes32[] memory expectedInputs = _buildExpectedPublicInputs(claimer);
        for (uint256 index = 0; index < PUBLIC_INPUTS_LENGTH; index++) {
            if (publicInputs[index] != expectedInputs[index]) {
                return false;
            }
        }

        return true;
    }

    function _buildExpectedPublicInputs(address claimer) internal view returns (bytes32[] memory publicInputs) {
        publicInputs = new bytes32[](PUBLIC_INPUTS_LENGTH);
        publicInputs[0] = bytes32(uint256(earliestBirthYear));
        _appendBytes(publicInputs, authorityPublicKeyX, 1, 32);
        _appendBytes(publicInputs, authorityPublicKeyY, 33, 32);
        _appendBytes(publicInputs, bytes32(uint256(uint160(claimer))), 65, 20);
    }

    function _appendBytes(
        bytes32[] memory publicInputs,
        bytes32 value,
        uint256 offset,
        uint256 length
    )
        internal
        pure
    {
        for (uint256 index = 0; index < length; index++) {
            publicInputs[offset + index] = (value >> ((length - 1 - index) * 8)) & bytes32(uint256(0xFF));
        }
    }
}
