// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ShelbyUSD.sol";

/**
 * @title SnakeOnShelby Smart Contract
 * @dev Manages payments, score recording, global leaderboards, and daily check-ins on Shelbynet.
 */
contract SnakeOnShelby {
    IERC20 public shelbyUSDToken;
    address public treasury;

    uint256 public constant GAME_COST = 0.001 * 10**18; // Exactly 0.001 ShelbyUSD
    uint256 public constant CHECK_IN_POINTS = 10; // Daily check-in awards 10 points

    struct LeaderboardRecord {
        address player;
        uint256 score;
        uint256 timestamp;
    }

    // High scores array (top 10 global players)
    LeaderboardRecord[] public globalLeaderboard;

    // Mappings to track player stats
    mapping(address => uint256) public userBonusPoints;
    mapping(address => uint256) public playerHighScores;
    mapping(address => uint256) public lastCheckInTimestamp;

    event GameEntryPaid(address indexed player, uint256 fee, uint256 timestamp);
    event ScoreSubmitted(address indexed player, uint256 score, uint256 timestamp);
    event DailyCheckInClaimed(address indexed player, uint256 currentPoints, uint256 timestamp);

    constructor(address _shelbyUSDTokenAddress) {
        shelbyUSDToken = IERC20(_shelbyUSDTokenAddress);
        treasury = msg.sender; // Initial deployer serves as arcade treasury
    }

    /**
     * @dev Pay Game Entry Fee of exactly 0.001 ShelbyUSD.
     */
    function payGameEntry() external {
        require(
            shelbyUSDToken.transferFrom(msg.sender, treasury, GAME_COST),
            "Payment of 0.001 ShelbyUSD entry fee failed"
        );
        emit GameEntryPaid(msg.sender, GAME_COST, block.timestamp);
    }

    /**
     * @dev Submit score. Triggers a transaction cost of exactly 0.001 ShelbyUSD.
     * Records the score on the global leaderboard.
     */
    function submitScore(uint256 score) external {
        require(
            shelbyUSDToken.transferFrom(msg.sender, treasury, GAME_COST),
            "Payment of 0.001 ShelbyUSD score submission fee failed"
        );

        // Update player high score
        if (score > playerHighScores[msg.sender]) {
            playerHighScores[msg.sender] = score;
        }

        // Add score record to the global leaderboard
        _addLeaderboardRecord(msg.sender, score);

        emit ScoreSubmitted(msg.sender, score, block.timestamp);
    }

    /**
     * @dev Claim Daily Check-In once every 24 hours.
     * Triggers a transaction of 0.001 ShelbyUSD.
     * Awards 10 bonus points.
     */
    function dailyCheckIn() external {
        uint256 lastClaim = lastCheckInTimestamp[msg.sender];
        require(
            block.timestamp >= lastClaim + 24 hours,
            "Daily check-in cooldown active. Try again in 24 hours."
        );

        require(
            shelbyUSDToken.transferFrom(msg.sender, treasury, GAME_COST),
            "Payment of 0.001 ShelbyUSD daily check-in fee failed"
        );

        lastCheckInTimestamp[msg.sender] = block.timestamp;
        userBonusPoints[msg.sender] += CHECK_IN_POINTS;

        emit DailyCheckInClaimed(msg.sender, userBonusPoints[msg.sender], block.timestamp);
    }

    /**
     * @dev Returns the full array of high scores.
     */
    function getLeaderboard() external view returns (LeaderboardRecord[] memory) {
        return globalLeaderboard;
    }

    /**
     * @dev Internal helper to sort and insert high score into the leaderboard array.
     */
    function _addLeaderboardRecord(address player, uint256 score) internal {
        LeaderboardRecord memory newRecord = LeaderboardRecord({
            player: player,
            score: score,
            timestamp: block.timestamp
        });

        // Push new record
        globalLeaderboard.push(newRecord);

        // Sort the leaderboard in descending order based on score (Bubble sort for simplicity on top records)
        uint256 length = globalLeaderboard.length;
        for (uint256 i = 0; i < length - 1; i++) {
            for (uint256 j = 0; j < length - i - 1; j++) {
                if (globalLeaderboard[j].score < globalLeaderboard[j + 1].score) {
                    // Swap
                    LeaderboardRecord memory temp = globalLeaderboard[j];
                    globalLeaderboard[j] = globalLeaderboard[j + 1];
                    globalLeaderboard[j + 1] = temp;
                }
            }
        }

        // Keep maximum of 10 records
        if (globalLeaderboard.length > 10) {
            globalLeaderboard.pop();
        }
    }
}
