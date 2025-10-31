/// RWAToken - 債權 Token 模組
/// 將已核准的退稅債權 tokenization,投資者可以購買
///
/// 功能:
/// - 創建債權 Token (每筆退稅生成一個)
/// - 債權狀態管理
/// - 到期自動償還

module taxcoin::rwa_token {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::event;
    use std::string::{Self, String};

    // ===== 錯誤碼 =====
    const E_NOT_AUTHORIZED: u64 = 1;
    const E_INVALID_STATUS: u64 = 2;
    const E_ALREADY_REDEEMED: u64 = 3;
    const E_NOT_MATURED: u64 = 4;

    // ===== 狀態常量 =====
    const STATUS_AVAILABLE: u8 = 0; // 可售
    const STATUS_SOLD: u8 = 1;      // 已售
    const STATUS_REDEEMED: u8 = 2;  // 已兌現

    // ===== 結構體定義 =====

    /// 管理員能力
    public struct AdminCap has key, store {
        id: UID
    }

    /// RWA 債權 Token
    /// 這是一個 NFT,代表一筆退稅債權
    public struct RWAToken has key, store {
        id: UID,
        /// 對應的退稅申請 ID
        claim_id: String,
        /// 債權金額 (以分為單位)
        amount: u64,
        /// 年化利率 (百分比 * 100, 例如 200 = 2%)
        interest_rate: u64,
        /// 到期日 (Unix 時間戳,毫秒)
        maturity_date: u64,
        /// 狀態: 0=可售, 1=已售, 2=已兌現
        status: u8,
        /// 所屬投資池 ID (如果已加入池)
        pool_id: String,
        /// 當前持有者
        owner: address,
        /// 創建時間
        created_at: u64,
        /// 售出時間
        sold_at: u64,
        /// 兌現時間
        redeemed_at: u64
    }

    /// RWA Token 創建事件
    public struct RWATokenCreated has copy, drop {
        token_id: address,
        claim_id: String,
        amount: u64,
        interest_rate: u64,
        maturity_date: u64,
        timestamp: u64
    }

    /// RWA Token 出售事件
    public struct RWATokenSold has copy, drop {
        token_id: address,
        claim_id: String,
        pool_id: String,
        buyer: address,
        amount: u64,
        timestamp: u64
    }

    /// RWA Token 兌現事件
    public struct RWATokenRedeemed has copy, drop {
        token_id: address,
        claim_id: String,
        owner: address,
        principal: u64,
        interest: u64,
        total: u64,
        timestamp: u64
    }

    // ===== 初始化函數 =====

    fun init(ctx: &mut TxContext) {
        // 創建並轉移 AdminCap
        let admin_cap = AdminCap {
            id: object::new(ctx)
        };
        transfer::public_transfer(admin_cap, tx_context::sender(ctx));
    }

    // ===== 公開函數 =====

    /// 創建 RWA Token (將退稅債權 tokenization)
    ///
    /// # 參數
    /// - `_admin_cap`: AdminCap (權限驗證)
    /// - `claim_id`: 退稅申請 ID
    /// - `amount`: 債權金額 (分)
    /// - `interest_rate`: 年化利率 (基點, 200 = 2%)
    /// - `maturity_date`: 到期日 (Unix 時間戳)
    /// - `pool_id`: 投資池 ID
    /// - `ctx`: 交易上下文
    public entry fun create_token(
        _admin_cap: &AdminCap,
        claim_id: vector<u8>,
        amount: u64,
        interest_rate: u64,
        maturity_date: u64,
        pool_id: vector<u8>,
        ctx: &mut TxContext
    ) {
        let token_id = object::new(ctx);
        let token_addr = object::uid_to_address(&token_id);
        let sender = tx_context::sender(ctx);

        let token = RWAToken {
            id: token_id,
            claim_id: string::utf8(claim_id),
            amount,
            interest_rate,
            maturity_date,
            status: STATUS_AVAILABLE,
            pool_id: string::utf8(pool_id),
            owner: sender,
            created_at: tx_context::epoch_timestamp_ms(ctx),
            sold_at: 0,
            redeemed_at: 0
        };

        // 發出創建事件
        event::emit(RWATokenCreated {
            token_id: token_addr,
            claim_id: token.claim_id,
            amount,
            interest_rate,
            maturity_date,
            timestamp: token.created_at
        });

        // 轉移給管理者 (等待加入投資池)
        transfer::public_transfer(token, sender);
    }

    /// 標記為已售 (當投資者購買後調用)
    public entry fun mark_sold(
        _admin_cap: &AdminCap,
        token: &mut RWAToken,
        buyer: address,
        ctx: &mut TxContext
    ) {
        assert!(token.status == STATUS_AVAILABLE, E_INVALID_STATUS);

        token.status = STATUS_SOLD;
        token.owner = buyer;
        token.sold_at = tx_context::epoch_timestamp_ms(ctx);

        // 發出售出事件
        event::emit(RWATokenSold {
            token_id: object::uid_to_address(&token.id),
            claim_id: token.claim_id,
            pool_id: token.pool_id,
            buyer,
            amount: token.amount,
            timestamp: token.sold_at
        });
    }

    /// 兌現債權 (到期後調用)
    /// 計算本金 + 利息並發放給持有者
    public entry fun redeem(
        _admin_cap: &AdminCap,
        token: &mut RWAToken,
        ctx: &mut TxContext
    ) {
        assert!(token.status == STATUS_SOLD, E_INVALID_STATUS);
        assert!(token.redeemed_at == 0, E_ALREADY_REDEEMED);

        let current_time = tx_context::epoch_timestamp_ms(ctx);
        assert!(current_time >= token.maturity_date, E_NOT_MATURED);

        // 計算利息
        let principal = token.amount;
        let interest = calculate_interest(
            principal,
            token.interest_rate,
            token.sold_at,
            token.maturity_date
        );
        let total = principal + interest;

        token.status = STATUS_REDEEMED;
        token.redeemed_at = current_time;

        // 發出兌現事件
        event::emit(RWATokenRedeemed {
            token_id: object::uid_to_address(&token.id),
            claim_id: token.claim_id,
            owner: token.owner,
            principal,
            interest,
            total,
            timestamp: token.redeemed_at
        });

        // 注意: 實際的 TaxCoin 發放需要在鏈下處理或通過其他合約
    }

    /// 批量兌現 (到期後批量處理)
    public entry fun batch_redeem(
        _admin_cap: &AdminCap,
        mut tokens: vector<RWAToken>,
        ctx: &mut TxContext
    ) {
        let len = vector::length(&tokens);
        let mut i = 0;

        while (i < len) {
            let mut token = vector::pop_back(&mut tokens);

            if (token.status == STATUS_SOLD && token.redeemed_at == 0) {
                let current_time = tx_context::epoch_timestamp_ms(ctx);

                if (current_time >= token.maturity_date) {
                    let principal = token.amount;
                    let interest = calculate_interest(
                        principal,
                        token.interest_rate,
                        token.sold_at,
                        token.maturity_date
                    );
                    let total = principal + interest;

                    token.status = STATUS_REDEEMED;
                    token.redeemed_at = current_time;

                    event::emit(RWATokenRedeemed {
                        token_id: object::uid_to_address(&token.id),
                        claim_id: token.claim_id,
                        owner: token.owner,
                        principal,
                        interest,
                        total,
                        timestamp: token.redeemed_at
                    });
                }
            };

            let owner = token.owner;
            transfer::public_transfer(token, owner);
            i = i + 1;
        };

        vector::destroy_empty(tokens);
    }

    // ===== 輔助函數 =====

    /// 計算利息
    /// 使用簡單利息公式: Interest = Principal * Rate * Time
    fun calculate_interest(
        principal: u64,
        annual_rate: u64,  // 基點 (200 = 2%)
        start_time: u64,   // 毫秒
        end_time: u64      // 毫秒
    ): u64 {
        // 計算天數
        let time_diff = end_time - start_time;
        let days = time_diff / (24 * 60 * 60 * 1000);

        // 計算利息 = 本金 * 年利率 * (天數/365)
        // annual_rate 是基點 (200 = 2%), 需要除以 10000
        let interest = (principal * annual_rate * days) / (10000 * 365);

        interest
    }

    // ===== 查詢函數 =====

    /// 獲取債權金額
    public fun amount(token: &RWAToken): u64 {
        token.amount
    }

    /// 獲取利率
    public fun interest_rate(token: &RWAToken): u64 {
        token.interest_rate
    }

    /// 獲取狀態
    public fun status(token: &RWAToken): u8 {
        token.status
    }

    /// 獲取到期日
    public fun maturity_date(token: &RWAToken): u64 {
        token.maturity_date
    }

    /// 檢查是否已到期
    public fun is_matured(token: &RWAToken, current_time: u64): bool {
        current_time >= token.maturity_date
    }

    /// 檢查是否已兌現
    public fun is_redeemed(token: &RWAToken): bool {
        token.status == STATUS_REDEEMED
    }

    // ===== 測試函數 =====

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }
}
