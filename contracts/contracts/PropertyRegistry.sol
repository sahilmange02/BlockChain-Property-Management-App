// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/*
 * BLOCKCHAIN EXPLAINED: PropertyRegistry.sol
 * ============================================
 * This is a SMART CONTRACT — a program that lives permanently on the blockchain.
 *
 * Think of it as a VENDING MACHINE:
 *   - You put in the right inputs (property details + your identity)
 *   - It automatically does the right thing (records the property)
 *   - Nobody can change what it does — not even the developer
 *   - Every action is recorded permanently and publicly
 *
 * KEY CONCEPTS USED HERE:
 *
 * 1. STRUCT: Like a row in a spreadsheet — groups related data together.
 *    e.g., Property { id, owner, location, area... }
 *
 * 2. MAPPING: Like a dictionary/lookup table.
 *    properties[1] → gives you Property #1's details
 *    ownerProperties[0xABC...] → gives you all property IDs owned by wallet 0xABC
 *
 * 3. EVENT: A notification the contract "shouts out" when something happens.
 *    Your frontend can LISTEN for these events in real-time.
 *    e.g., "PropertyRegistered" event fires when a new property is added.
 *
 * 4. MODIFIER: A reusable rule/check applied before a function runs.
 *    e.g., onlyGovernment() checks "is the caller the government wallet?"
 *    If not → the transaction is REVERTED (cancelled, no changes made).
 *
 * 5. msg.sender: The Ethereum wallet address of whoever is calling the function.
 *    This is how the blockchain knows WHO is doing the action.
 *    You can't fake this — it's cryptographically verified automatically.
 *
 * 6. UUPS PROXY PATTERN: Normally smart contracts can never be changed after
 *    deployment. The UUPS proxy pattern lets us upgrade the contract logic
 *    while keeping the same address and all the stored data.
 *    Think of it as: the address is the "house", the logic is the "furniture"
 *    — you can rearrange the furniture without moving the house.
 *
 * GAS EXPLAINED:
 *    Every operation on the blockchain costs "gas" — a small fee paid in ETH.
 *    Writing data to the blockchain (STORAGE) costs more gas than reading (VIEW).
 *    That's why we store only essential data on-chain and put files on IPFS.
 */

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

contract PropertyRegistry is Initializable, UUPSUpgradeable, PausableUpgradeable {
    // =========================================================
    // STATE VARIABLES
    // BLOCKCHAIN EXPLAINED: State variables are stored PERMANENTLY
    // on the blockchain. Every node (computer) in the network keeps
    // a copy. Changing them costs gas. Reading them is free (view).
    // =========================================================

    // The wallet address of the government authority.
    // Only this address can verify properties and approve transfers.
    // Set once when the contract is deployed, can be updated by government.
    address public governmentAuthority;

    // Auto-incrementing counter for property IDs.
    // Every new property gets the next number: 1, 2, 3, 4...
    uint256 public propertyCount;

    // Counter for transfer requests
    uint256 public transferRequestCount;

    // Simple reentrancy guard
    uint256 private reentrancyStatus;

    // =========================================================
    // ENUMS
    // BLOCKCHAIN EXPLAINED: Enums are stored as numbers (0, 1, 2...)
    // but we give them names so the code is readable.
    // RESIDENTIAL=0, COMMERCIAL=1, AGRICULTURAL=2, INDUSTRIAL=3
    // =========================================================
    enum PropertyType {
        RESIDENTIAL,
        COMMERCIAL,
        AGRICULTURAL,
        INDUSTRIAL
    }

    // =========================================================
    // STRUCTS
    // BLOCKCHAIN EXPLAINED: A struct groups related data together,
    // like a row in a spreadsheet. All fields are stored together
    // in the same "storage slot" on the blockchain for efficiency.
    // =========================================================
    struct Property {
        uint256 propertyId; // Unique auto-incremented ID
        string surveyNumber; // Official government survey number (e.g., "MH/GK/2025/001")
        string location; // Physical address/location description
        uint256 areaInSqFt; // Property area in square feet
        address currentOwner; // Ethereum wallet address of the owner
        string ipfsDocumentHash; // IPFS CID — fingerprint of the property documents
        // The actual files live on IPFS, only the fingerprint is here
        bool isVerified; // false = pending government approval, true = approved
        uint256 registrationTimestamp; // Unix timestamp when the property was registered
        PropertyType propertyType; // RESIDENTIAL, COMMERCIAL, etc.
        string description; // Free-text description
    }

    struct TransferRequest {
        uint256 transferId;
        uint256 propertyId; // Which property is being transferred
        address fromOwner; // Current owner initiating the transfer
        address toOwner; // Proposed new owner
        uint256 requestTimestamp;
        bool isApproved; // false = pending, true = approved by government
        bool isRejected;
        string rejectionReason;
    }

    // =========================================================
    // MAPPINGS (the blockchain's "database tables")
    // BLOCKCHAIN EXPLAINED: Mappings are like hash tables / dictionaries.
    // They give O(1) (instant) lookups, which is important because
    // looping over arrays on-chain gets expensive fast (costs gas per iteration).
    // =========================================================

    // Look up any property by its ID: properties[1] → Property struct
    mapping(uint256 => Property) public properties;

    // Look up all property IDs owned by a wallet address
    // ownerProperties[0xABC...] → [1, 5, 12] (property IDs)
    mapping(address => uint256[]) public ownerProperties;

    // Check if a survey number is already registered (prevents duplicates)
    // surveyNumberExists["MH/GK/2025/001"] → true/false
    mapping(string => bool) public surveyNumberExists;

    // All transfer requests by ID
    mapping(uint256 => TransferRequest) public transferRequests;

    // Which transfer request is pending for a property (0 = none)
    // propertyPendingTransfer[propertyId] → transferRequestId
    mapping(uint256 => uint256) public propertyPendingTransfer;

    // =========================================================
    // EVENTS
    // BLOCKCHAIN EXPLAINED: Events are like "notifications" the contract
    // broadcasts when something important happens. They cost much less gas
    // than storing data on-chain. Your backend and frontend can LISTEN to
    // these events in real-time using ethers.js.
    //
    // "indexed" parameters allow efficient filtering — e.g., "give me all
    // PropertyRegistered events where owner = 0xABC..." without scanning
    // every single event on the chain.
    // =========================================================
    event PropertyRegistered(uint256 indexed propertyId, address indexed owner, string surveyNumber, PropertyType propertyType, uint256 timestamp);

    event PropertyVerified(uint256 indexed propertyId, address indexed verifiedBy, uint256 timestamp);

    event PropertyRejected(uint256 indexed propertyId, address indexed rejectedBy, string reason);

    event TransferInitiated(uint256 indexed transferId, uint256 indexed propertyId, address indexed fromOwner, address toOwner, uint256 timestamp);

    event OwnershipTransferred(uint256 indexed transferId, uint256 indexed propertyId, address indexed oldOwner, address newOwner, uint256 timestamp);

    event TransferRejected(uint256 indexed transferId, uint256 indexed propertyId, string reason);

    event GovernmentAuthorityUpdated(address indexed oldAuthority, address indexed newAuthority);

    // =========================================================
    // MODIFIERS
    // BLOCKCHAIN EXPLAINED: Modifiers are reusable checks that run
    // BEFORE a function executes. If the check fails, the ENTIRE
    // transaction is reverted — no changes are made, but the caller
    // still pays the gas used up to that point.
    // =========================================================

    // Only the government wallet can call functions with this modifier
    modifier onlyGovernment() {
        require(msg.sender == governmentAuthority, "PropertyRegistry: caller is not the government authority");
        _; // ← "continue running the rest of the function"
    }

    // Only the current owner of a specific property can call this
    modifier onlyPropertyOwner(uint256 propertyId) {
        require(properties[propertyId].currentOwner == msg.sender, "PropertyRegistry: caller is not the property owner");
        _;
    }

    // Check that a property ID actually exists
    modifier propertyExists(uint256 propertyId) {
        require(propertyId > 0 && propertyId <= propertyCount, "PropertyRegistry: property does not exist");
        _;
    }

    // Check that a property has been government-verified
    modifier propertyVerified(uint256 propertyId) {
        require(properties[propertyId].isVerified, "PropertyRegistry: property is not yet verified by government");
        _;
    }

    // Simple reentrancy guard modifier
    modifier nonReentrant() {
        require(reentrancyStatus == 0, "PropertyRegistry: reentrancy guard triggered");
        reentrancyStatus = 1;
        _;
        reentrancyStatus = 0;
    }

    // =========================================================
    // INITIALIZER (replaces constructor for upgradeable contracts)
    // BLOCKCHAIN EXPLAINED: Upgradeable contracts use initialize()
    // instead of constructor(). It can only be called ONCE, right
    // after deployment. The Initializable base contract enforces this.
    // =========================================================
    function initialize(address _governmentAuthority) public initializer {
        require(_governmentAuthority != address(0), "Invalid authority address");
        governmentAuthority = _governmentAuthority;

        propertyCount = 0;
        transferRequestCount = 0;
    }

    // =========================================================
    // CORE FUNCTIONS
    // =========================================================

    function registerProperty(
        string memory _surveyNumber,
        string memory _location,
        uint256 _areaInSqFt,
        string memory _ipfsHash,
        PropertyType _propertyType,
        string memory _description
    ) external nonReentrant whenNotPaused {
        require(bytes(_surveyNumber).length >= 3 && bytes(_surveyNumber).length <= 50, "Survey number must be 3-50 characters");
        require(bytes(_location).length > 0, "Location cannot be empty");
        require(_areaInSqFt > 0 && _areaInSqFt < 10_000_000, "Area must be between 1 and 10,000,000 sqft");
        require(bytes(_ipfsHash).length == 46 || bytes(_ipfsHash).length == 59, "Invalid IPFS hash (must be CIDv0 or CIDv1)");
        require(!surveyNumberExists[_surveyNumber], "PropertyRegistry: this survey number is already registered");

        propertyCount++;
        uint256 newPropertyId = propertyCount;

        properties[newPropertyId] = Property({
            propertyId: newPropertyId,
            surveyNumber: _surveyNumber,
            location: _location,
            areaInSqFt: _areaInSqFt,
            currentOwner: msg.sender,
            ipfsDocumentHash: _ipfsHash,
            isVerified: false,
            registrationTimestamp: block.timestamp,
            propertyType: _propertyType,
            description: _description
        });

        surveyNumberExists[_surveyNumber] = true;
        ownerProperties[msg.sender].push(newPropertyId);

        emit PropertyRegistered(newPropertyId, msg.sender, _surveyNumber, _propertyType, block.timestamp);
    }

    function verifyProperty(uint256 _propertyId) external onlyGovernment propertyExists(_propertyId) whenNotPaused {
        require(!properties[_propertyId].isVerified, "PropertyRegistry: property is already verified");
        Property storage prop = properties[_propertyId];
        prop.isVerified = true;
        emit PropertyVerified(_propertyId, msg.sender, block.timestamp);
    }

    function rejectProperty(uint256 _propertyId, string memory _reason) external onlyGovernment propertyExists(_propertyId) {
        require(!properties[_propertyId].isVerified, "PropertyRegistry: cannot reject an already verified property");
        emit PropertyRejected(_propertyId, msg.sender, _reason);
    }

    function initiateTransfer(uint256 _propertyId, address _newOwner)
        external
        nonReentrant
        whenNotPaused
        propertyExists(_propertyId)
        onlyPropertyOwner(_propertyId)
        propertyVerified(_propertyId)
    {
        require(_newOwner != address(0), "PropertyRegistry: new owner address cannot be zero");
        require(_newOwner != msg.sender, "PropertyRegistry: cannot transfer property to yourself");
        require(propertyPendingTransfer[_propertyId] == 0, "PropertyRegistry: a transfer is already pending for this property");

        transferRequestCount++;
        uint256 newTransferId = transferRequestCount;

        transferRequests[newTransferId] = TransferRequest({
            transferId: newTransferId,
            propertyId: _propertyId,
            fromOwner: msg.sender,
            toOwner: _newOwner,
            requestTimestamp: block.timestamp,
            isApproved: false,
            isRejected: false,
            rejectionReason: ""
        });

        propertyPendingTransfer[_propertyId] = newTransferId;
        emit TransferInitiated(newTransferId, _propertyId, msg.sender, _newOwner, block.timestamp);
    }

    function approveTransfer(uint256 _transferId) external nonReentrant onlyGovernment {
        TransferRequest storage req = transferRequests[_transferId];
        require(req.transferId != 0, "PropertyRegistry: transfer request does not exist");
        require(!req.isApproved, "PropertyRegistry: transfer already approved");
        require(!req.isRejected, "PropertyRegistry: transfer was rejected");

        Property storage prop = properties[req.propertyId];
        address oldOwner = prop.currentOwner;

        prop.currentOwner = req.toOwner;
        ownerProperties[req.toOwner].push(req.propertyId);

        req.isApproved = true;
        delete propertyPendingTransfer[req.propertyId];

        emit OwnershipTransferred(_transferId, req.propertyId, oldOwner, req.toOwner, block.timestamp);
    }

    function rejectTransfer(uint256 _transferId, string memory _reason) external onlyGovernment {
        TransferRequest storage req = transferRequests[_transferId];
        require(req.transferId != 0, "Transfer does not exist");
        require(!req.isApproved && !req.isRejected, "Transfer already processed");

        req.isRejected = true;
        req.rejectionReason = _reason;
        delete propertyPendingTransfer[req.propertyId];

        emit TransferRejected(_transferId, req.propertyId, _reason);
    }

    // =========================================================
    // VIEW FUNCTIONS (free to call — no gas cost for reading)
    // BLOCKCHAIN EXPLAINED: "view" functions only READ data, never
    // write. Reading blockchain data is FREE — no transaction needed,
    // no MetaMask popup. Your frontend can call these anytime.
    // =========================================================

    function getPropertyDetails(uint256 _propertyId) external view propertyExists(_propertyId) returns (Property memory) {
        return properties[_propertyId];
    }

    function getOwnerProperties(address _owner) external view returns (uint256[] memory) {
        return ownerProperties[_owner];
    }

    function getPendingTransfer(uint256 _propertyId) external view returns (TransferRequest memory) {
        uint256 transferId = propertyPendingTransfer[_propertyId];
        require(transferId != 0, "No pending transfer for this property");
        return transferRequests[transferId];
    }

    // =========================================================
    // ADMIN FUNCTIONS
    // =========================================================

    function updateGovernmentAuthority(address _newAuthority) external onlyGovernment {
        require(_newAuthority != address(0), "Invalid address");
        address old = governmentAuthority;
        governmentAuthority = _newAuthority;
        emit GovernmentAuthorityUpdated(old, _newAuthority);
    }

    function pause() external onlyGovernment {
        _pause();
    }

    function unpause() external onlyGovernment {
        _unpause();
    }

    receive() external payable {
        revert("PropertyRegistry: this contract does not accept ETH");
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyGovernment {}
}

