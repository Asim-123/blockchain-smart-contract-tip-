// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title TipJar — native ETH tips with optional EIP-712 gasless relay
contract TipJar {
    address public owner;

    mapping(address => uint256) public nonces;

    bytes32 private immutable _DOMAIN_SEPARATOR;
    bytes32 private constant TIP_TYPEHASH =
        keccak256("Tip(address from,uint256 amount,string message,uint256 nonce,uint256 deadline)");

    event NewTip(address indexed from, uint256 amount, string message);

    error NotOwner();
    error NoValue();
    error TransferFailed();
    error NoBalance();
    error Expired();
    error InvalidSignature();
    error InvalidValue();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor() {
        owner = msg.sender;
        _DOMAIN_SEPARATOR = _buildDomainSeparator();
    }

    function tip(string calldata message) external payable {
        if (msg.value == 0) revert NoValue();
        emit NewTip(msg.sender, msg.value, message);
    }

    /// @notice Gasless tip — tipper signs off-chain; relayer submits and forwards ETH.
    function tipWithSig(
        address from,
        uint256 amount,
        string calldata message,
        uint256 deadline,
        bytes calldata signature
    ) external payable {
        if (block.timestamp > deadline) revert Expired();
        if (amount == 0) revert NoValue();
        if (msg.value != amount) revert InvalidValue();

        uint256 nonce = nonces[from]++;
        bytes32 structHash = keccak256(
            abi.encode(
                TIP_TYPEHASH,
                from,
                amount,
                keccak256(bytes(message)),
                nonce,
                deadline
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", _DOMAIN_SEPARATOR, structHash));
        if (_recoverSigner(digest, signature) != from) revert InvalidSignature();

        emit NewTip(from, amount, message);
    }

    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance == 0) revert NoBalance();
        (bool ok, ) = payable(owner).call{value: balance}("");
        if (!ok) revert TransferFailed();
    }

    function _buildDomainSeparator() private view returns (bytes32) {
        return keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("TipJar")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    function _recoverSigner(bytes32 digest, bytes calldata signature) private pure returns (address) {
        if (signature.length != 65) revert InvalidSignature();
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(add(signature.offset, 0))
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }
        if (uint256(s) > 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0) {
            revert InvalidSignature();
        }
        address signer = ecrecover(digest, v, r, s);
        if (signer == address(0)) revert InvalidSignature();
        return signer;
    }
}
