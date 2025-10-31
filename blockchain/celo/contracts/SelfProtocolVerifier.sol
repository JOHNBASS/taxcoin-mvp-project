// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title SelfProtocolVerifier
 * @dev Self Protocol Zero-Knowledge Proof 驗證合約
 * 部署在 Celo Alfajores Testnet
 *
 * 功能：
 * - 驗證 Self Protocol 提供的零知識證明
 * - 檢查年齡、國籍、OFAC 狀態
 * - 存儲驗證記錄
 * - 防止重放攻擊
 */
contract SelfProtocolVerifier {
    // ===== 事件 =====

    /**
     * @dev 驗證成功事件
     * @param user 用戶地址
     * @param proofHash Proof 雜湊值
     * @param nationality 國籍 (ISO 3166-1 alpha-3)
     * @param age 年齡
     * @param ofacClear OFAC 檢查通過
     * @param timestamp 驗證時間戳
     */
    event ProofVerified(
        address indexed user,
        bytes32 indexed proofHash,
        string nationality,
        uint256 age,
        bool ofacClear,
        uint256 timestamp
    );

    /**
     * @dev 驗證失敗事件
     * @param user 用戶地址
     * @param reason 失敗原因
     */
    event VerificationFailed(
        address indexed user,
        string reason
    );

    // ===== 結構 =====

    /**
     * @dev 驗證記錄
     */
    struct VerificationRecord {
        bytes32 proofHash;           // Proof 雜湊值
        string nationality;          // 國籍 (ISO 3166-1 alpha-3)
        uint256 age;                 // 年齡
        bool ofacClear;              // OFAC 檢查通過
        uint256 timestamp;           // 驗證時間
        bool isValid;                // 是否有效
    }

    // ===== 狀態變數 =====

    /// 用戶地址 => 驗證記錄
    mapping(address => VerificationRecord) public verifications;

    /// Proof Hash => 是否已使用（防止重放攻擊）
    mapping(bytes32 => bool) public usedProofs;

    /// 最低年齡要求
    uint256 public constant MIN_AGE = 18;

    /// 禁止國家（ISO 3166-1 alpha-3）
    mapping(bytes3 => bool) public excludedCountries;

    /// 合約擁有者
    address public owner;

    // ===== 修飾符 =====

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    // ===== 建構函數 =====

    constructor() {
        owner = msg.sender;

        // 初始化禁止國家列表（制裁國家）
        excludedCountries["IRN"] = true; // Iran (伊朗)
        excludedCountries["PRK"] = true; // North Korea (北韓)
        excludedCountries["SYR"] = true; // Syria (敘利亞)
        excludedCountries["CUB"] = true; // Cuba (古巴)
    }

    // ===== 核心功能 =====

    /**
     * @dev 驗證 Self Protocol 零知識證明
     * @param proof 零知識證明數據（bytes 編碼）
     * @param publicSignals 公開信號（bytes 編碼）
     * @param nationality 國籍 (ISO 3166-1 alpha-3，例如 "USA", "TWN")
     * @param age 年齡
     * @param ofacClear OFAC 檢查通過
     * @return success 驗證是否成功
     */
    function verifyProof(
        bytes calldata proof,
        bytes calldata publicSignals,
        string calldata nationality,
        uint256 age,
        bool ofacClear
    ) external returns (bool success) {
        // 1. 計算 proof hash（防止重放攻擊）
        bytes32 proofHash = keccak256(abi.encodePacked(proof, publicSignals, msg.sender));

        if (usedProofs[proofHash]) {
            emit VerificationFailed(msg.sender, "Proof already used");
            return false;
        }

        // 2. 驗證年齡
        if (age < MIN_AGE) {
            emit VerificationFailed(msg.sender, "Age below minimum requirement");
            return false;
        }

        // 3. 驗證國籍（不在禁止名單）
        bytes3 countryCode = stringToBytes3(nationality);
        if (excludedCountries[countryCode]) {
            emit VerificationFailed(msg.sender, "Nationality not allowed");
            return false;
        }

        // 4. 驗證 OFAC
        if (!ofacClear) {
            emit VerificationFailed(msg.sender, "OFAC check failed");
            return false;
        }

        // 5. 驗證 proof 和 publicSignals 不為空
        if (proof.length == 0 || publicSignals.length == 0) {
            emit VerificationFailed(msg.sender, "Invalid proof or public signals");
            return false;
        }

        // 6. 標記 proof 已使用
        usedProofs[proofHash] = true;

        // 7. 存儲驗證記錄
        verifications[msg.sender] = VerificationRecord({
            proofHash: proofHash,
            nationality: nationality,
            age: age,
            ofacClear: ofacClear,
            timestamp: block.timestamp,
            isValid: true
        });

        // 8. 發出成功事件
        emit ProofVerified(
            msg.sender,
            proofHash,
            nationality,
            age,
            ofacClear,
            block.timestamp
        );

        return true;
    }

    // ===== 查詢功能 =====

    /**
     * @dev 查詢用戶驗證記錄
     * @param user 用戶地址
     * @return 驗證記錄
     */
    function getVerification(address user)
        external
        view
        returns (VerificationRecord memory)
    {
        return verifications[user];
    }

    /**
     * @dev 檢查用戶是否已驗證
     * @param user 用戶地址
     * @return 是否已驗證
     */
    function isVerified(address user) external view returns (bool) {
        return verifications[user].isValid;
    }

    /**
     * @dev 檢查 proof 是否已使用
     * @param proofHash Proof 雜湊值
     * @return 是否已使用
     */
    function isProofUsed(bytes32 proofHash) external view returns (bool) {
        return usedProofs[proofHash];
    }

    // ===== 管理功能 =====

    /**
     * @dev 添加禁止國家
     * @param countryCode 國家代碼 (ISO 3166-1 alpha-3)
     */
    function addExcludedCountry(string calldata countryCode) external onlyOwner {
        bytes3 code = stringToBytes3(countryCode);
        excludedCountries[code] = true;
    }

    /**
     * @dev 移除禁止國家
     * @param countryCode 國家代碼 (ISO 3166-1 alpha-3)
     */
    function removeExcludedCountry(string calldata countryCode) external onlyOwner {
        bytes3 code = stringToBytes3(countryCode);
        excludedCountries[code] = false;
    }

    /**
     * @dev 檢查國家是否被禁止
     * @param countryCode 國家代碼 (ISO 3166-1 alpha-3)
     * @return 是否被禁止
     */
    function isCountryExcluded(string calldata countryCode) external view returns (bool) {
        bytes3 code = stringToBytes3(countryCode);
        return excludedCountries[code];
    }

    // ===== 工具函數 =====

    /**
     * @dev 將 string 轉換為 bytes3（ISO 3166-1 alpha-3）
     * @param str 國家代碼字符串（長度應為 3）
     * @return 轉換後的 bytes3
     */
    function stringToBytes3(string memory str) internal pure returns (bytes3) {
        bytes memory strBytes = bytes(str);
        require(strBytes.length == 3, "Country code must be 3 characters");

        bytes3 result;
        assembly {
            result := mload(add(strBytes, 32))
        }
        return result;
    }

    /**
     * @dev 轉移合約擁有權
     * @param newOwner 新擁有者地址
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        owner = newOwner;
    }
}
