// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract TipJar {
    struct Tip {
        address sender;
        uint256 amount;
        string message;
        uint256 timestamp;
    }

    address public immutable owner;
    Tip[] public tips;

    event NewTip(address indexed sender, uint256 amount, string message, uint256 timestamp);
    event Withdrawn(address indexed owner, uint256 amount);

    error NotOwner();
    error ZeroTip();
    error WithdrawFailed();

    constructor(address _owner) {
        owner = _owner == address(0) ? msg.sender : _owner;
    }

    function tip(string calldata message) external payable {
        if (msg.value == 0) revert ZeroTip();
        tips.push(Tip({
            sender: msg.sender,
            amount: msg.value,
            message: message,
            timestamp: block.timestamp
        }));
        emit NewTip(msg.sender, msg.value, message, block.timestamp);
    }

    /// @notice Returns up to the 10 most recent tips, newest first.
    function recentTips() external view returns (Tip[] memory result) {
        uint256 n = tips.length;
        uint256 count = n > 10 ? 10 : n;
        result = new Tip[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = tips[n - 1 - i];
        }
    }

    function tipCount() external view returns (uint256) {
        return tips.length;
    }

    function withdraw() external {
        if (msg.sender != owner) revert NotOwner();
        uint256 balance = address(this).balance;
        (bool ok, ) = owner.call{value: balance}("");
        if (!ok) revert WithdrawFailed();
        emit Withdrawn(owner, balance);
    }

    receive() external payable {
        if (msg.value == 0) revert ZeroTip();
        tips.push(Tip({
            sender: msg.sender,
            amount: msg.value,
            message: "",
            timestamp: block.timestamp
        }));
        emit NewTip(msg.sender, msg.value, "", block.timestamp);
    }
}
