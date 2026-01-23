// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title EventEscrow
 * @notice Trustless escrow for event attendance staking
 * @dev Attendees stake funds, released to organizer on check-in or forfeited on no-show
 * 
 * Flow:
 *   1. Attendee calls stake() with eventId and organizer address
 *   2. On check-in, organizer/backend calls release() to pay organizer
 *   3. If attendee cancels early, they can call refund()
 *   4. On no-show, organizer calls forfeit() to claim stake
 */
contract EventEscrow {
    // ============================================================================
    // Types
    // ============================================================================
    
    enum StakeStatus {
        None,       // No stake exists
        Staked,     // Funds locked
        Released,   // Funds sent to organizer (successful check-in)
        Refunded,   // Funds returned to attendee (cancellation)
        Forfeited   // Funds sent to organizer (no-show)
    }

    struct Stake {
        uint256 amount;
        address attendee;
        address organizer;
        StakeStatus status;
        uint256 stakedAt;
        uint256 eventStartTime; // Unix timestamp when event starts
    }

    // ============================================================================
    // State
    // ============================================================================

    // eventId (bytes32 hash) => attendee address => Stake
    mapping(bytes32 => mapping(address => Stake)) public stakes;

    // Contract owner for emergency functions
    address public owner;

    // Minimum stake amount (prevents dust attacks)
    uint256 public constant MIN_STAKE = 0.001 ether;

    // Grace period for refunds before event (e.g., 1 hour before)
    uint256 public constant REFUND_CUTOFF = 1 hours;

    // ============================================================================
    // Events
    // ============================================================================

    event Staked(
        bytes32 indexed eventId,
        address indexed attendee,
        address indexed organizer,
        uint256 amount,
        uint256 eventStartTime
    );

    event Released(
        bytes32 indexed eventId,
        address indexed attendee,
        address indexed organizer,
        uint256 amount
    );

    event Refunded(
        bytes32 indexed eventId,
        address indexed attendee,
        uint256 amount
    );

    event Forfeited(
        bytes32 indexed eventId,
        address indexed attendee,
        address indexed organizer,
        uint256 amount
    );

    // ============================================================================
    // Errors
    // ============================================================================

    error InsufficientStake();
    error AlreadyStaked();
    error NotStaked();
    error NotAuthorized();
    error InvalidStatus();
    error EventNotEnded();
    error RefundCutoffPassed();
    error TransferFailed();

    // ============================================================================
    // Constructor
    // ============================================================================

    constructor() {
        owner = msg.sender;
    }

    // ============================================================================
    // Core Functions
    // ============================================================================

    /**
     * @notice Stake funds for event attendance
     * @param eventId Keccak256 hash of the off-chain event ID
     * @param organizer Address to receive funds on release/forfeit
     * @param eventStartTime Unix timestamp when event starts (for refund cutoff)
     */
    function stake(
        bytes32 eventId,
        address organizer,
        uint256 eventStartTime
    ) external payable {
        if (msg.value < MIN_STAKE) revert InsufficientStake();
        
        Stake storage s = stakes[eventId][msg.sender];
        if (s.status != StakeStatus.None) revert AlreadyStaked();

        s.amount = msg.value;
        s.attendee = msg.sender;
        s.organizer = organizer;
        s.status = StakeStatus.Staked;
        s.stakedAt = block.timestamp;
        s.eventStartTime = eventStartTime;

        emit Staked(eventId, msg.sender, organizer, msg.value, eventStartTime);
    }

    /**
     * @notice Release stake to organizer (called on successful check-in)
     * @param eventId The event ID
     * @param attendee The attendee whose stake to release
     * @dev Can only be called by organizer or contract owner
     */
    function release(bytes32 eventId, address attendee) external {
        Stake storage s = stakes[eventId][attendee];
        
        if (s.status != StakeStatus.Staked) revert InvalidStatus();
        if (msg.sender != s.organizer && msg.sender != owner) revert NotAuthorized();

        s.status = StakeStatus.Released;
        uint256 amount = s.amount;

        // Transfer to organizer
        (bool success, ) = s.organizer.call{value: amount}("");
        if (!success) revert TransferFailed();

        emit Released(eventId, attendee, s.organizer, amount);
    }

    /**
     * @notice Refund stake to attendee (cancellation before event)
     * @param eventId The event ID
     * @dev Can only be called by the attendee, before cutoff time
     */
    function refund(bytes32 eventId) external {
        Stake storage s = stakes[eventId][msg.sender];
        
        if (s.status != StakeStatus.Staked) revert InvalidStatus();
        if (s.attendee != msg.sender) revert NotAuthorized();
        
        // Check if refund is still allowed (before event start - cutoff)
        if (block.timestamp >= s.eventStartTime - REFUND_CUTOFF) {
            revert RefundCutoffPassed();
        }

        s.status = StakeStatus.Refunded;
        uint256 amount = s.amount;

        // Transfer back to attendee
        (bool success, ) = msg.sender.call{value: amount}("");
        if (!success) revert TransferFailed();

        emit Refunded(eventId, msg.sender, amount);
    }

    /**
     * @notice Forfeit stake to organizer (no-show after event ends)
     * @param eventId The event ID
     * @param attendee The attendee whose stake to forfeit
     * @dev Can only be called by organizer after event has ended
     */
    function forfeit(bytes32 eventId, address attendee) external {
        Stake storage s = stakes[eventId][attendee];
        
        if (s.status != StakeStatus.Staked) revert InvalidStatus();
        if (msg.sender != s.organizer && msg.sender != owner) revert NotAuthorized();
        
        // Event must have ended (start time + some buffer, e.g., 1 hour after for grace)
        // For simplicity, we just check that event start time has passed
        if (block.timestamp < s.eventStartTime) revert EventNotEnded();

        s.status = StakeStatus.Forfeited;
        uint256 amount = s.amount;

        // Transfer to organizer
        (bool success, ) = s.organizer.call{value: amount}("");
        if (!success) revert TransferFailed();

        emit Forfeited(eventId, attendee, s.organizer, amount);
    }

    // ============================================================================
    // View Functions
    // ============================================================================

    /**
     * @notice Get stake info for an attendee
     */
    function getStake(bytes32 eventId, address attendee) external view returns (
        uint256 amount,
        address organizer,
        StakeStatus status,
        uint256 stakedAt,
        uint256 eventStartTime
    ) {
        Stake storage s = stakes[eventId][attendee];
        return (s.amount, s.organizer, s.status, s.stakedAt, s.eventStartTime);
    }

    /**
     * @notice Check if an attendee has an active stake
     */
    function hasActiveStake(bytes32 eventId, address attendee) external view returns (bool) {
        return stakes[eventId][attendee].status == StakeStatus.Staked;
    }

    /**
     * @notice Convert string event ID to bytes32 hash
     * @dev Utility function for off-chain compatibility
     */
    function hashEventId(string calldata eventId) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(eventId));
    }

    // ============================================================================
    // Admin Functions
    // ============================================================================

    /**
     * @notice Transfer ownership
     */
    function transferOwnership(address newOwner) external {
        if (msg.sender != owner) revert NotAuthorized();
        owner = newOwner;
    }

    /**
     * @notice Emergency withdraw (only owner, for stuck funds)
     */
    function emergencyWithdraw(address to, uint256 amount) external {
        if (msg.sender != owner) revert NotAuthorized();
        (bool success, ) = to.call{value: amount}("");
        if (!success) revert TransferFailed();
    }
}
