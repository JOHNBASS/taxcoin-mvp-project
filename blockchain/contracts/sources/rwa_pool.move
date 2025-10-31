/// RWAPool - 投資池管理模組
/// 管理多個 RWA Token,投資者可以購買池中的份額
///
/// 功能:
/// - 創建投資池
/// - 投資者購買份額 (shares)
/// - 自動收益分配
/// - 到期結算

module taxcoin::rwa_pool {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::table::{Self, Table};
    use sui::event;
    use sui::display;
    use sui::package;
    use std::string::{Self, String};
    use std::vector;
    use taxcoin::taxcoin::TAXCOIN;

    // ===== 錯誤碼 =====
    const E_NOT_AUTHORIZED: u64 = 1;
    const E_INVALID_STATUS: u64 = 2;
    const E_POOL_FULL: u64 = 3;
    const E_INSUFFICIENT_AMOUNT: u64 = 4;
    const E_POOL_NOT_MATURED: u64 = 5;
    const E_ALREADY_SETTLED: u64 = 6;
    const E_NO_INVESTMENT: u64 = 7;

    // ===== 狀態常量 =====
    const STATUS_RECRUITING: u8 = 0; // 募集中
    const STATUS_FULL: u8 = 1;       // 已滿額
    const STATUS_MATURED: u8 = 2;    // 已到期
    const STATUS_SETTLED: u8 = 3;    // 已結算

    // ===== 風險等級 =====
    const RISK_LOW: u8 = 0;
    const RISK_MEDIUM: u8 = 1;
    const RISK_HIGH: u8 = 2;

    // ===== 結構體定義 =====

    /// One-Time-Witness for Display
    public struct RWA_POOL has drop {}

    /// 管理員能力
    public struct AdminCap has key, store {
        id: UID
    }

    /// 投資池
    public struct RWAPool has key {
        id: UID,
        /// 池名稱
        name: String,
        /// 池描述
        description: String,
        /// 目標募集金額 (分)
        target_amount: u64,
        /// 當前募集金額 (分)
        current_amount: u64,
        /// 年化收益率 (基點, 200 = 2%)
        yield_rate: u64,
        /// 風險等級: 0=低, 1=中, 2=高
        risk_level: u8,
        /// 到期日 (Unix 時間戳,毫秒)
        maturity_date: u64,
        /// 狀態
        status: u8,
        /// 投資者數量
        investor_count: u64,
        /// 投資記錄 (投資者地址 => 投資金額)
        investments: Table<address, u64>,
        /// 資金池 (存放投資的 TaxCoin)
        balance: Balance<TAXCOIN>,
        /// 包含的退稅債權 ID 列表
        claim_ids: vector<String>,
        /// 創建時間
        created_at: u64,
        /// 結算時間
        settled_at: u64
    }

    /// 投資者份額憑證 (可轉讓的 NFT)
    public struct PoolShare has key, store {
        id: UID,
        /// 所屬池 ID
        pool_id: address,
        /// 投資者地址
        investor: address,
        /// 投資金額 (分)
        amount: u64,
        /// 預期收益金額 (分)
        expected_yield: u64,
        /// 投資時間
        invested_at: u64,
        /// 是否已結算
        is_settled: bool,
        /// 實際收益 (結算後填入)
        actual_yield: u64
    }

    /// 投資池創建事件
    public struct PoolCreated has copy, drop {
        pool_id: address,
        name: String,
        target_amount: u64,
        yield_rate: u64,
        maturity_date: u64,
        timestamp: u64
    }

    /// 投資事件
    public struct Invested has copy, drop {
        pool_id: address,
        investor: address,
        amount: u64,
        expected_yield: u64,
        timestamp: u64
    }

    /// 池狀態更新事件
    public struct PoolStatusUpdated has copy, drop {
        pool_id: address,
        old_status: u8,
        new_status: u8,
        timestamp: u64
    }

    /// 收益分配事件
    public struct YieldDistributed has copy, drop {
        pool_id: address,
        investor: address,
        principal: u64,
        yield_amount: u64,
        total: u64,
        timestamp: u64
    }

    /// 收益注入事件
    public struct YieldDeposited has copy, drop {
        pool_id: address,
        amount: u64,
        timestamp: u64
    }

    // ===== 初始化函數 =====

    fun init(otw: RWA_POOL, ctx: &mut TxContext) {
        // 創建管理員能力
        let admin_cap = AdminCap {
            id: object::new(ctx)
        };
        transfer::public_transfer(admin_cap, tx_context::sender(ctx));

        // 創建 Publisher
        let publisher = package::claim(otw, ctx);

        // 設定 PoolShare NFT 的 Display
        let mut display = display::new<PoolShare>(&publisher, ctx);

        // 設定 NFT 顯示屬性
        display::add(&mut display, string::utf8(b"name"), string::utf8(b"投資池份額憑證 #{amount}"));
        display::add(&mut display, string::utf8(b"description"), string::utf8(b"RWA 投資池份額憑證，可獲得投資收益"));

        // 根據 is_settled 狀態顯示不同圖片
        // 投資中：pool-share-false.svg，已結算：pool-share-true.svg
        display::add(
            &mut display,
            string::utf8(b"image_url"),
            string::utf8(b"https://taxcoin-mvp.transferhelper.com.tw/nft/pool-share-{is_settled}.svg")
        );

        display::add(&mut display, string::utf8(b"pool_id"), string::utf8(b"{pool_id}"));
        display::add(&mut display, string::utf8(b"amount"), string::utf8(b"{amount}"));
        display::add(&mut display, string::utf8(b"expected_yield"), string::utf8(b"{expected_yield}"));
        display::add(&mut display, string::utf8(b"is_settled"), string::utf8(b"{is_settled}"));
        display::add(&mut display, string::utf8(b"actual_yield"), string::utf8(b"{actual_yield}"));

        // 發布 Display
        display::update_version(&mut display);
        transfer::public_transfer(publisher, tx_context::sender(ctx));
        transfer::public_transfer(display, tx_context::sender(ctx));
    }

    // ===== 公開函數 =====

    /// 創建投資池
    public entry fun create_pool(
        _admin_cap: &AdminCap,
        name: vector<u8>,
        description: vector<u8>,
        target_amount: u64,
        yield_rate: u64,
        risk_level: u8,
        maturity_date: u64,
        claim_ids: vector<vector<u8>>,
        ctx: &mut TxContext
    ) {
        let pool_id = object::new(ctx);
        let pool_addr = object::uid_to_address(&pool_id);

        // 轉換 claim_ids
        let mut claim_ids_string = vector::empty<String>();
        let len = vector::length(&claim_ids);
        let mut i = 0;
        while (i < len) {
            let claim_id = *vector::borrow(&claim_ids, i);
            vector::push_back(&mut claim_ids_string, string::utf8(claim_id));
            i = i + 1;
        };

        let pool = RWAPool {
            id: pool_id,
            name: string::utf8(name),
            description: string::utf8(description),
            target_amount,
            current_amount: 0,
            yield_rate,
            risk_level,
            maturity_date,
            status: STATUS_RECRUITING,
            investor_count: 0,
            investments: table::new(ctx),
            balance: balance::zero(),
            claim_ids: claim_ids_string,
            created_at: tx_context::epoch_timestamp_ms(ctx),
            settled_at: 0
        };

        // 發出創建事件
        event::emit(PoolCreated {
            pool_id: pool_addr,
            name: pool.name,
            target_amount,
            yield_rate,
            maturity_date,
            timestamp: pool.created_at
        });

        transfer::share_object(pool);
    }

    /// 投資到池中
    public entry fun invest(
        pool: &mut RWAPool,
        payment: Coin<TAXCOIN>,
        ctx: &mut TxContext
    ) {
        assert!(pool.status == STATUS_RECRUITING, E_INVALID_STATUS);

        let investor = tx_context::sender(ctx);
        let amount = coin::value(&payment);

        // 檢查是否超過目標金額
        let remaining = pool.target_amount - pool.current_amount;
        assert!(amount <= remaining, E_POOL_FULL);

        // 最低投資金額檢查 (100,000 分 = 1000 TWD)
        assert!(amount >= 100000, E_INSUFFICIENT_AMOUNT);

        // 將支付加入資金池
        let payment_balance = coin::into_balance(payment);
        balance::join(&mut pool.balance, payment_balance);

        // 記錄投資
        if (table::contains(&pool.investments, investor)) {
            let existing = table::borrow_mut(&mut pool.investments, investor);
            *existing = *existing + amount;
        } else {
            table::add(&mut pool.investments, investor, amount);
            pool.investor_count = pool.investor_count + 1;
        };

        pool.current_amount = pool.current_amount + amount;

        // 計算預期收益
        let days_to_maturity = (pool.maturity_date - tx_context::epoch_timestamp_ms(ctx)) / (24 * 60 * 60 * 1000);
        let expected_yield = (amount * pool.yield_rate * days_to_maturity) / (10000 * 365);

        // 創建份額憑證 NFT
        let share = PoolShare {
            id: object::new(ctx),
            pool_id: object::uid_to_address(&pool.id),
            investor,
            amount,
            expected_yield,
            invested_at: tx_context::epoch_timestamp_ms(ctx),
            is_settled: false,
            actual_yield: 0
        };

        // 發出投資事件
        event::emit(Invested {
            pool_id: object::uid_to_address(&pool.id),
            investor,
            amount,
            expected_yield,
            timestamp: share.invested_at
        });

        // 轉移份額憑證給投資者
        transfer::public_transfer(share, investor);

        // 檢查是否已滿額
        if (pool.current_amount >= pool.target_amount) {
            update_status(pool, STATUS_FULL, ctx);
        }
    }

    /// Admin 注入收益到投資池
    /// 在到期前，Admin 需要將收益金額注入池中，以便用戶領取
    public entry fun deposit_yield(
        _admin_cap: &AdminCap,
        pool: &mut RWAPool,
        yield_payment: Coin<TAXCOIN>,
        ctx: &mut TxContext
    ) {
        let yield_amount = coin::value(&yield_payment);
        let yield_balance = coin::into_balance(yield_payment);

        // 將收益加入資金池
        balance::join(&mut pool.balance, yield_balance);

        // 發出收益注入事件
        event::emit(YieldDeposited {
            pool_id: object::uid_to_address(&pool.id),
            amount: yield_amount,
            timestamp: tx_context::epoch_timestamp_ms(ctx)
        });
    }

    /// 🧪 測試專用：修改投資池到期日
    /// ⚠️ 僅用於測試環境，生產環境應移除此函數
    public entry fun update_maturity_date_for_testing(
        _admin_cap: &AdminCap,
        pool: &mut RWAPool,
        new_maturity_date: u64,
        _ctx: &mut TxContext
    ) {
        pool.maturity_date = new_maturity_date;
    }

    /// 🧪 測試專用：手動更新池狀態到 MATURED
    /// ⚠️ 僅用於測試環境，生產環境應移除此函數
    public entry fun update_status_to_matured_for_testing(
        _admin_cap: &AdminCap,
        pool: &mut RWAPool,
        ctx: &mut TxContext
    ) {
        let old_status = pool.status;
        pool.status = STATUS_MATURED;

        // 發出狀態更新事件
        event::emit(PoolStatusUpdated {
            pool_id: object::uid_to_address(&pool.id),
            old_status,
            new_status: STATUS_MATURED,
            timestamp: tx_context::epoch_timestamp_ms(ctx)
        });
    }

    /// 結算投資池 (到期後調用)
    public entry fun settle_pool(
        _admin_cap: &AdminCap,
        pool: &mut RWAPool,
        ctx: &mut TxContext
    ) {
        assert!(pool.status == STATUS_MATURED || pool.status == STATUS_FULL, E_INVALID_STATUS);

        let current_time = tx_context::epoch_timestamp_ms(ctx);
        assert!(current_time >= pool.maturity_date, E_POOL_NOT_MATURED);
        assert!(pool.settled_at == 0, E_ALREADY_SETTLED);

        pool.status = STATUS_SETTLED;
        pool.settled_at = current_time;

        // 發出狀態更新事件
        event::emit(PoolStatusUpdated {
            pool_id: object::uid_to_address(&pool.id),
            old_status: STATUS_MATURED,
            new_status: STATUS_SETTLED,
            timestamp: pool.settled_at
        });

        // 注意: 實際的資金分配需要通過 claim_yield 函數由投資者主動領取
    }

    /// 投資者領取收益 (使用份額憑證)
    public entry fun claim_yield(
        pool: &mut RWAPool,
        share: &mut PoolShare,
        ctx: &mut TxContext
    ) {
        assert!(pool.status == STATUS_SETTLED, E_INVALID_STATUS);
        assert!(!share.is_settled, E_ALREADY_SETTLED);
        assert!(share.pool_id == object::uid_to_address(&pool.id), E_INVALID_STATUS);

        let investor = tx_context::sender(ctx);
        assert!(share.investor == investor, E_NOT_AUTHORIZED);

        // 檢查投資記錄
        assert!(table::contains(&pool.investments, investor), E_NO_INVESTMENT);

        // 計算總收益 (本金 + 預期收益)
        let principal = share.amount;
        let yield_amount = share.expected_yield;
        let total = principal + yield_amount;

        // 從資金池提取
        let payout_balance = balance::split(&mut pool.balance, total);
        let payout_coin = coin::from_balance(payout_balance, ctx);

        // 標記為已結算
        share.is_settled = true;
        share.actual_yield = yield_amount;

        // 發出收益分配事件
        event::emit(YieldDistributed {
            pool_id: object::uid_to_address(&pool.id),
            investor,
            principal,
            yield_amount,
            total,
            timestamp: tx_context::epoch_timestamp_ms(ctx)
        });

        // 轉帳給投資者
        transfer::public_transfer(payout_coin, investor);

        // 從投資記錄中移除
        table::remove(&mut pool.investments, investor);
    }

    /// 更新池狀態 (內部函數)
    fun update_status(
        pool: &mut RWAPool,
        new_status: u8,
        ctx: &mut TxContext
    ) {
        let old_status = pool.status;
        pool.status = new_status;

        event::emit(PoolStatusUpdated {
            pool_id: object::uid_to_address(&pool.id),
            old_status,
            new_status,
            timestamp: tx_context::epoch_timestamp_ms(ctx)
        });
    }

    /// 檢查並更新池狀態 (定時任務調用)
    public entry fun check_and_update_status(
        pool: &mut RWAPool,
        ctx: &mut TxContext
    ) {
        let current_time = tx_context::epoch_timestamp_ms(ctx);

        // 檢查是否已到期
        if (current_time >= pool.maturity_date && pool.status != STATUS_MATURED && pool.status != STATUS_SETTLED) {
            update_status(pool, STATUS_MATURED, ctx);
        }
        // 檢查是否已滿額
        else if (pool.current_amount >= pool.target_amount && pool.status == STATUS_RECRUITING) {
            update_status(pool, STATUS_FULL, ctx);
        }
    }

    // ===== 查詢函數 =====

    /// 獲取池名稱
    public fun name(pool: &RWAPool): String {
        pool.name
    }

    /// 獲取目標金額
    public fun target_amount(pool: &RWAPool): u64 {
        pool.target_amount
    }

    /// 獲取當前金額
    public fun current_amount(pool: &RWAPool): u64 {
        pool.current_amount
    }

    /// 獲取填充率 (百分比 * 100)
    public fun fill_rate(pool: &RWAPool): u64 {
        if (pool.target_amount == 0) {
            return 0
        };
        (pool.current_amount * 10000) / pool.target_amount
    }

    /// 獲取收益率
    public fun yield_rate(pool: &RWAPool): u64 {
        pool.yield_rate
    }

    /// 獲取狀態
    public fun status(pool: &RWAPool): u8 {
        pool.status
    }

    /// 獲取投資者數量
    public fun investor_count(pool: &RWAPool): u64 {
        pool.investor_count
    }

    /// 檢查是否已結算
    public fun is_settled(pool: &RWAPool): bool {
        pool.status == STATUS_SETTLED
    }

    // ===== 測試函數 =====

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        let otw = RWA_POOL {};
        init(otw, ctx);
    }

    #[test_only]
    /// 測試專用：直接設定池的到期時間
    public fun set_maturity_date_for_testing(
        pool: &mut RWAPool,
        new_maturity_date: u64
    ) {
        pool.maturity_date = new_maturity_date;
    }

    #[test_only]
    /// 測試專用：強制池進入已到期狀態（用於快速測試到期流程）
    public fun advance_to_maturity_for_testing(
        pool: &mut RWAPool,
        ctx: &mut TxContext
    ) {
        let current_time = tx_context::epoch_timestamp_ms(ctx);
        pool.maturity_date = current_time - 1; // 設為已過期
        pool.status = STATUS_MATURED;
    }

    #[test_only]
    /// 測試專用：獲取投資者的投資金額
    public fun get_investment_amount(
        pool: &RWAPool,
        investor: address
    ): u64 {
        if (table::contains(&pool.investments, investor)) {
            *table::borrow(&pool.investments, investor)
        } else {
            0
        }
    }

    #[test_only]
    /// 測試專用：獲取 PoolShare 的詳細資訊
    public fun share_info(share: &PoolShare): (address, address, u64, u64, bool, u64) {
        (
            share.pool_id,
            share.investor,
            share.amount,
            share.expected_yield,
            share.is_settled,
            share.actual_yield
        )
    }
}
