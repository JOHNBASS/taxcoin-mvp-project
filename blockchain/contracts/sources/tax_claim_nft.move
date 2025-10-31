/// TaxClaimNFT - 退稅申請 NFT 模組
/// 每筆退稅申請會生成一個唯一的 NFT,記錄退稅資訊
///
/// 功能:
/// - 鑄造退稅申請 NFT
/// - 更新申請狀態
/// - 查詢申請資訊

module taxcoin::tax_claim_nft {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::event;
    use sui::display;
    use sui::package;
    use std::string::{Self, String};

    // ===== 錯誤碼 =====
    const E_NOT_AUTHORIZED: u64 = 1;
    const E_INVALID_STATUS: u64 = 2;
    const E_ALREADY_DISBURSED: u64 = 3;

    // ===== 狀態常量 =====
    const STATUS_PENDING: u8 = 0;
    const STATUS_APPROVED: u8 = 1;
    const STATUS_REJECTED: u8 = 2;
    const STATUS_DISBURSED: u8 = 3;

    // ===== 結構體定義 =====

    /// One-Time-Witness for Display
    public struct TAX_CLAIM_NFT has drop {}

    /// 管理員能力
    public struct AdminCap has key, store {
        id: UID
    }

    /// 退稅申請 NFT（靈魂綁定，不可轉讓）
    /// 移除 store 特性使其無法在市場交易或轉讓
    public struct TaxClaimNFT has key {
        id: UID,
        /// 申請 ID (對應後端資料庫)
        claim_id: String,
        /// 申請者 DID
        did: String,
        /// 原始持有者地址（永久記錄）
        original_owner: address,
        /// 靈魂綁定標記（true = 不可轉讓）
        is_soulbound: bool,
        /// 原始消費金額 (以分為單位, 100 = 1 TWD)
        original_amount: u64,
        /// 退稅金額 (以分為單位)
        tax_amount: u64,
        /// TaxCoin 數量 (1:1 對應退稅金額)
        taxcoin_amount: u64,
        /// 商家名稱
        merchant_name: String,
        /// 購買日期 (Unix 時間戳,毫秒)
        purchase_date: u64,
        /// 收據圖片 hash (IPFS hash 或其他)
        receipt_hash: String,
        /// 狀態: 0=待審核, 1=已核准, 2=已拒絕, 3=已發放
        status: u8,
        /// 創建時間
        created_at: u64,
        /// 審核時間
        reviewed_at: u64,
        /// 發放時間
        disbursed_at: u64,
        /// 拒絕原因 (如果被拒絕)
        rejected_reason: String
    }

    /// NFT 鑄造事件
    public struct NFTMinted has copy, drop {
        nft_id: address,
        claim_id: String,
        did: String,
        tax_amount: u64,
        timestamp: u64
    }

    /// NFT 狀態更新事件
    public struct NFTStatusUpdated has copy, drop {
        nft_id: address,
        claim_id: String,
        old_status: u8,
        new_status: u8,
        timestamp: u64
    }

    /// TaxCoin 發放事件
    public struct TaxCoinDisbursed has copy, drop {
        nft_id: address,
        claim_id: String,
        recipient: address,
        amount: u64,
        timestamp: u64
    }

    /// 緊急轉移事件
    public struct EmergencyTransfer has copy, drop {
        nft_id: address,
        claim_id: String,
        old_owner: address,
        new_owner: address,
        reason: String,
        admin: address,
        timestamp: u64
    }

    // ===== 初始化函數 =====

    fun init(otw: TAX_CLAIM_NFT, ctx: &mut TxContext) {
        // 創建並轉移 AdminCap
        let admin_cap = AdminCap {
            id: object::new(ctx)
        };
        transfer::public_transfer(admin_cap, tx_context::sender(ctx));

        // 創建 Publisher
        let publisher = package::claim(otw, ctx);

        // 設定 TaxClaimNFT 的 Display
        let mut display = display::new<TaxClaimNFT>(&publisher, ctx);

        // 設定 NFT 顯示屬性
        display::add(&mut display, string::utf8(b"name"), string::utf8(b"退稅證明 NFT #{claim_id} 🔒"));
        display::add(&mut display, string::utf8(b"description"), string::utf8(b"TaxCoin 退稅申請證明（靈魂綁定，不可轉讓），可追蹤退稅申請狀態"));

        // 根據 status 狀態顯示不同圖片
        // 0=待審核, 1=已核准, 2=已拒絕, 3=已發放
        display::add(
            &mut display,
            string::utf8(b"image_url"),
            string::utf8(b"https://taxcoin-mvp.transferhelper.com.tw/nft/tax-claim-{status}.svg")
        );

        display::add(&mut display, string::utf8(b"claim_id"), string::utf8(b"{claim_id}"));
        display::add(&mut display, string::utf8(b"did"), string::utf8(b"{did}"));
        display::add(&mut display, string::utf8(b"original_owner"), string::utf8(b"{original_owner}"));
        display::add(&mut display, string::utf8(b"is_soulbound"), string::utf8(b"{is_soulbound}"));
        display::add(&mut display, string::utf8(b"original_amount"), string::utf8(b"{original_amount}"));
        display::add(&mut display, string::utf8(b"tax_amount"), string::utf8(b"{tax_amount}"));
        display::add(&mut display, string::utf8(b"taxcoin_amount"), string::utf8(b"{taxcoin_amount}"));
        display::add(&mut display, string::utf8(b"merchant_name"), string::utf8(b"{merchant_name}"));
        display::add(&mut display, string::utf8(b"status"), string::utf8(b"{status}"));
        display::add(&mut display, string::utf8(b"purchase_date"), string::utf8(b"{purchase_date}"));

        // 發布 Display
        display::update_version(&mut display);
        transfer::public_transfer(publisher, tx_context::sender(ctx));
        transfer::public_transfer(display, tx_context::sender(ctx));
    }

    // ===== 公開函數 =====

    /// 鑄造退稅申請 NFT（靈魂綁定）
    ///
    /// # 參數
    /// - `_admin_cap`: AdminCap (權限驗證)
    /// - `claim_id`: 申請 ID
    /// - `did`: 申請者 DID
    /// - `original_amount`: 原始金額 (分)
    /// - `tax_amount`: 退稅金額 (分)
    /// - `merchant_name`: 商家名稱
    /// - `purchase_date`: 購買日期
    /// - `receipt_hash`: 收據 hash
    /// - `recipient`: NFT 接收者（將永久綁定）
    /// - `initial_status`: 初始狀態 (0=待審核, 1=已核准, 2=已拒絕, 3=已發放)
    /// - `ctx`: 交易上下文
    public entry fun mint(
        _admin_cap: &AdminCap,
        claim_id: vector<u8>,
        did: vector<u8>,
        original_amount: u64,
        tax_amount: u64,
        merchant_name: vector<u8>,
        purchase_date: u64,
        receipt_hash: vector<u8>,
        recipient: address,
        initial_status: u8,
        ctx: &mut TxContext
    ) {
        // 驗證狀態值有效
        assert!(initial_status <= STATUS_DISBURSED, E_INVALID_STATUS);

        let nft_id = object::new(ctx);
        let nft_addr = object::uid_to_address(&nft_id);
        let timestamp = tx_context::epoch_timestamp_ms(ctx);

        let nft = TaxClaimNFT {
            id: nft_id,
            claim_id: string::utf8(claim_id),
            did: string::utf8(did),
            original_owner: recipient,      // 記錄原始持有者
            is_soulbound: true,             // 標記為靈魂綁定
            original_amount,
            tax_amount,
            taxcoin_amount: tax_amount, // 1:1 對應
            merchant_name: string::utf8(merchant_name),
            purchase_date,
            receipt_hash: string::utf8(receipt_hash),
            status: initial_status,
            created_at: timestamp,
            reviewed_at: if (initial_status >= STATUS_APPROVED) { timestamp } else { 0 },
            disbursed_at: if (initial_status == STATUS_DISBURSED) { timestamp } else { 0 },
            rejected_reason: string::utf8(b"")
        };

        // 發出鑄造事件
        event::emit(NFTMinted {
            nft_id: nft_addr,
            claim_id: nft.claim_id,
            did: nft.did,
            tax_amount,
            timestamp: nft.created_at
        });

        // 使用 transfer（非 public_transfer）轉移 NFT
        // 由於移除了 store 特性，NFT 無法再被轉移
        transfer::transfer(nft, recipient);
    }

    /// 審核通過申請
    public entry fun approve(
        _admin_cap: &AdminCap,
        nft: &mut TaxClaimNFT,
        ctx: &mut TxContext
    ) {
        assert!(nft.status == STATUS_PENDING, E_INVALID_STATUS);

        let old_status = nft.status;
        nft.status = STATUS_APPROVED;
        nft.reviewed_at = tx_context::epoch_timestamp_ms(ctx);

        // 發出狀態更新事件
        event::emit(NFTStatusUpdated {
            nft_id: object::uid_to_address(&nft.id),
            claim_id: nft.claim_id,
            old_status,
            new_status: nft.status,
            timestamp: nft.reviewed_at
        });
    }

    /// 拒絕申請
    public entry fun reject(
        _admin_cap: &AdminCap,
        nft: &mut TaxClaimNFT,
        reason: vector<u8>,
        ctx: &mut TxContext
    ) {
        assert!(nft.status == STATUS_PENDING, E_INVALID_STATUS);

        let old_status = nft.status;
        nft.status = STATUS_REJECTED;
        nft.reviewed_at = tx_context::epoch_timestamp_ms(ctx);
        nft.rejected_reason = string::utf8(reason);

        // 發出狀態更新事件
        event::emit(NFTStatusUpdated {
            nft_id: object::uid_to_address(&nft.id),
            claim_id: nft.claim_id,
            old_status,
            new_status: nft.status,
            timestamp: nft.reviewed_at
        });
    }

    /// 標記為已發放 (當 TaxCoin 發放給用戶後調用)
    public entry fun mark_disbursed(
        _admin_cap: &AdminCap,
        nft: &mut TaxClaimNFT,
        ctx: &mut TxContext
    ) {
        assert!(nft.status == STATUS_APPROVED, E_INVALID_STATUS);
        assert!(nft.disbursed_at == 0, E_ALREADY_DISBURSED);

        let old_status = nft.status;
        nft.status = STATUS_DISBURSED;
        nft.disbursed_at = tx_context::epoch_timestamp_ms(ctx);

        // 發出發放事件
        event::emit(TaxCoinDisbursed {
            nft_id: object::uid_to_address(&nft.id),
            claim_id: nft.claim_id,
            recipient: tx_context::sender(ctx),
            amount: nft.taxcoin_amount,
            timestamp: nft.disbursed_at
        });

        // 發出狀態更新事件
        event::emit(NFTStatusUpdated {
            nft_id: object::uid_to_address(&nft.id),
            claim_id: nft.claim_id,
            old_status,
            new_status: nft.status,
            timestamp: nft.disbursed_at
        });
    }

    /// 緊急轉移 NFT（僅限管理員，用於特殊情況如錢包遺失）
    ///
    /// # 參數
    /// - `_admin_cap`: AdminCap (權限驗證)
    /// - `nft`: 要轉移的 NFT
    /// - `new_owner`: 新持有者地址
    /// - `reason`: 轉移原因（必須提供）
    /// - `ctx`: 交易上下文
    public entry fun emergency_transfer(
        _admin_cap: &AdminCap,
        nft: TaxClaimNFT,
        new_owner: address,
        reason: vector<u8>,
        ctx: &mut TxContext
    ) {
        let nft_id = object::uid_to_address(&nft.id);
        let old_owner = nft.original_owner;
        let timestamp = tx_context::epoch_timestamp_ms(ctx);

        // 發出緊急轉移事件
        event::emit(EmergencyTransfer {
            nft_id,
            claim_id: nft.claim_id,
            old_owner,
            new_owner,
            reason: string::utf8(reason),
            admin: tx_context::sender(ctx),
            timestamp
        });

        // 轉移 NFT（使用 transfer 而非 public_transfer）
        transfer::transfer(nft, new_owner);
    }

    // ===== 查詢函數 =====

    /// 獲取申請 ID
    public fun claim_id(nft: &TaxClaimNFT): String {
        nft.claim_id
    }

    /// 獲取 DID
    public fun did(nft: &TaxClaimNFT): String {
        nft.did
    }

    /// 獲取退稅金額
    public fun tax_amount(nft: &TaxClaimNFT): u64 {
        nft.tax_amount
    }

    /// 獲取狀態
    public fun status(nft: &TaxClaimNFT): u8 {
        nft.status
    }

    /// 檢查是否已發放
    public fun is_disbursed(nft: &TaxClaimNFT): bool {
        nft.status == STATUS_DISBURSED
    }

    /// 獲取原始持有者地址
    public fun original_owner(nft: &TaxClaimNFT): address {
        nft.original_owner
    }

    /// 檢查是否為靈魂綁定 NFT
    public fun is_soulbound(nft: &TaxClaimNFT): bool {
        nft.is_soulbound
    }

    /// 驗證地址是否為原始持有者
    public fun verify_owner(nft: &TaxClaimNFT, claimed_owner: address): bool {
        nft.original_owner == claimed_owner
    }

    // ===== 測試函數 =====

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        let otw = TAX_CLAIM_NFT {};
        init(otw, ctx);
    }
}
