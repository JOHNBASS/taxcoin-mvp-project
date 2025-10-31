/// TaxCoin - 可替代代幣模組
/// 用於表示退稅金額, 1 TAXCOIN = 1 TWD
///
/// 功能:
/// - 鑄造 TaxCoin 給通過 KYC 的旅客
/// - 轉帳功能
/// - 查詢餘額
/// - 銷毀功能 (兌現時)

module taxcoin::taxcoin {
    use sui::coin::{Self, Coin, TreasuryCap};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::balance::{Self, Balance};
    use sui::object::{Self, UID};
    use sui::event;

    // ===== 錯誤碼 =====
    const E_INSUFFICIENT_BALANCE: u64 = 1;
    const E_NOT_AUTHORIZED: u64 = 2;
    const E_INVALID_AMOUNT: u64 = 3;

    // ===== 結構體定義 =====

    /// TaxCoin 代幣的見證型別
    public struct TAXCOIN has drop {}

    /// 管理員能力 (Admin Capability)
    public struct AdminCap has key, store {
        id: UID
    }

    /// TaxCoin 鑄造記錄
    public struct MintRecord has copy, drop {
        recipient: address,
        amount: u64,
        claim_id: vector<u8>, // 退稅申請 ID
        timestamp: u64
    }

    /// TaxCoin 銷毀記錄 (兌現時)
    public struct BurnRecord has copy, drop {
        owner: address,
        amount: u64,
        timestamp: u64
    }

    // ===== 初始化函數 =====

    /// 模組初始化 - 創建 TaxCoin 並發送 TreasuryCap 給部署者
    fun init(witness: TAXCOIN, ctx: &mut TxContext) {
        // 創建 TaxCoin (8 位小數精度)
        let (treasury, metadata) = coin::create_currency(
            witness,
            8, // decimals (精度 8 位,0.00000001 TAXCOIN = 最小單位)
            b"TAXCOIN",
            b"Tax Refund Coin",
            b"Digital token representing tax refund amount. 1 TAXCOIN = 1 TWD",
            option::none(),
            ctx
        );

        // 凍結 metadata,使其不可變
        transfer::public_freeze_object(metadata);

        // 將 TreasuryCap 轉移給部署者
        transfer::public_transfer(treasury, tx_context::sender(ctx));

        // 創建並轉移 AdminCap
        let admin_cap = AdminCap {
            id: object::new(ctx)
        };
        transfer::public_transfer(admin_cap, tx_context::sender(ctx));
    }

    // ===== 公開函數 =====

    /// 鑄造 TaxCoin (僅管理員可執行)
    ///
    /// # 參數
    /// - `treasury`: TreasuryCap
    /// - `_admin_cap`: AdminCap (用於權限驗證)
    /// - `amount`: 鑄造數量 (以最小單位計,需乘以 10^8)
    /// - `recipient`: 接收者地址
    /// - `claim_id`: 退稅申請 ID
    /// - `ctx`: 交易上下文
    public entry fun mint(
        treasury: &mut TreasuryCap<TAXCOIN>,
        _admin_cap: &AdminCap,
        amount: u64,
        recipient: address,
        claim_id: vector<u8>,
        ctx: &mut TxContext
    ) {
        assert!(amount > 0, E_INVALID_AMOUNT);

        // 鑄造代幣
        let coin = coin::mint(treasury, amount, ctx);

        // 發送給接收者
        transfer::public_transfer(coin, recipient);

        // 發出鑄造事件
        event::emit(MintRecord {
            recipient,
            amount,
            claim_id,
            timestamp: tx_context::epoch_timestamp_ms(ctx)
        });
    }

    /// 鑄造 TaxCoin 並返回 Coin 對象（用於後續操作）
    /// 此函數不自動轉帳，返回 Coin 供調用者使用
    public fun mint_coin(
        treasury: &mut TreasuryCap<TAXCOIN>,
        _admin_cap: &AdminCap,
        amount: u64,
        ctx: &mut TxContext
    ): Coin<TAXCOIN> {
        assert!(amount > 0, E_INVALID_AMOUNT);
        coin::mint(treasury, amount, ctx)
    }

    /// 批量鑄造 TaxCoin
    public entry fun batch_mint(
        treasury: &mut TreasuryCap<TAXCOIN>,
        _admin_cap: &AdminCap,
        amounts: vector<u64>,
        recipients: vector<address>,
        claim_ids: vector<vector<u8>>,
        ctx: &mut TxContext
    ) {
        let len = vector::length(&amounts);
        assert!(len == vector::length(&recipients), E_INVALID_AMOUNT);
        assert!(len == vector::length(&claim_ids), E_INVALID_AMOUNT);

        let mut i = 0;
        while (i < len) {
            let amount = *vector::borrow(&amounts, i);
            let recipient = *vector::borrow(&recipients, i);
            let claim_id = *vector::borrow(&claim_ids, i);

            let coin = coin::mint(treasury, amount, ctx);
            transfer::public_transfer(coin, recipient);

            event::emit(MintRecord {
                recipient,
                amount,
                claim_id,
                timestamp: tx_context::epoch_timestamp_ms(ctx)
            });

            i = i + 1;
        };
    }

    /// 銷毀 TaxCoin (兌現時)
    public entry fun burn(
        treasury: &mut TreasuryCap<TAXCOIN>,
        coin: Coin<TAXCOIN>,
        ctx: &mut TxContext
    ) {
        let amount = coin::value(&coin);
        coin::burn(treasury, coin);

        // 發出銷毀事件
        event::emit(BurnRecord {
            owner: tx_context::sender(ctx),
            amount,
            timestamp: tx_context::epoch_timestamp_ms(ctx)
        });
    }

    /// 轉帳 TaxCoin
    public entry fun transfer(
        coin: Coin<TAXCOIN>,
        recipient: address,
        _ctx: &mut TxContext
    ) {
        transfer::public_transfer(coin, recipient);
    }

    /// 分割代幣
    public fun split(
        coin: &mut Coin<TAXCOIN>,
        amount: u64,
        ctx: &mut TxContext
    ): Coin<TAXCOIN> {
        assert!(coin::value(coin) >= amount, E_INSUFFICIENT_BALANCE);
        coin::split(coin, amount, ctx)
    }

    /// 合併代幣
    public entry fun join(
        coin1: &mut Coin<TAXCOIN>,
        coin2: Coin<TAXCOIN>
    ) {
        coin::join(coin1, coin2);
    }

    // ===== 查詢函數 =====

    /// 獲取代幣餘額
    public fun balance(coin: &Coin<TAXCOIN>): u64 {
        coin::value(coin)
    }

    /// 獲取總供應量
    public fun total_supply(treasury: &TreasuryCap<TAXCOIN>): u64 {
        coin::total_supply(treasury)
    }

    // ===== 測試函數 =====

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(TAXCOIN {}, ctx);
    }
}
