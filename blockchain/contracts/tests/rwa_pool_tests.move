#[test_only]
module taxcoin::rwa_pool_tests {
    use sui::test_scenario::{Self as ts, Scenario};
    use sui::coin::{Self, Coin};
    use sui::test_utils;
    use taxcoin::rwa_pool::{Self, RWAPool, AdminCap, PoolShare};
    use taxcoin::taxcoin::{Self, TAXCOIN, AdminCap as TaxcoinAdminCap};

    // ===== 測試常量 =====
    const ADMIN: address = @0xAD;
    const USER1: address = @0x1;
    const USER2: address = @0x2;
    const USER3: address = @0x3;

    const TARGET_AMOUNT: u64 = 10000000; // 100,000 分 = 1000 TWD
    const YIELD_RATE: u64 = 200; // 2% 年化收益率
    const INVESTMENT_AMOUNT: u64 = 5000000; // 50,000 分 = 500 TWD

    // ===== 輔助函數 =====

    /// 初始化測試場景
    fun setup_test(): Scenario {
        let mut scenario = ts::begin(ADMIN);

        // 初始化 TaxCoin 模組
        {
            ts::next_tx(&mut scenario, ADMIN);
            taxcoin::init_for_testing(ts::ctx(&mut scenario));
        };

        // 初始化 RWAPool 模組
        {
            ts::next_tx(&mut scenario, ADMIN);
            rwa_pool::init_for_testing(ts::ctx(&mut scenario));
        };

        scenario
    }

    /// 鑄造 TAXCOIN 給用戶
    fun mint_taxcoin(
        scenario: &mut Scenario,
        recipient: address,
        amount: u64
    ) {
        ts::next_tx(scenario, ADMIN);
        let mut treasury = ts::take_from_sender<coin::TreasuryCap<TAXCOIN>>(scenario);
        let admin_cap = ts::take_from_sender<TaxcoinAdminCap>(scenario);

        taxcoin::mint(
            &mut treasury,
            &admin_cap,
            amount,
            recipient,
            b"test_investment",
            ts::ctx(scenario)
        );

        ts::return_to_sender(scenario, treasury);
        ts::return_to_sender(scenario, admin_cap);
    }

    /// 創建測試用投資池（短期到期用於測試）
    fun create_test_pool(
        scenario: &mut Scenario,
        maturity_offset_ms: u64  // 從現在開始多少毫秒後到期
    ) {
        ts::next_tx(scenario, ADMIN);
        let admin_cap = ts::take_from_sender<AdminCap>(scenario);

        rwa_pool::create_pool(
            &admin_cap,
            b"Test Investment Pool",
            b"A test pool for automated testing",
            TARGET_AMOUNT,
            YIELD_RATE,
            0, // 低風險
            maturity_offset_ms, // 這裡直接傳入到期時間戳
            vector::empty(),
            ts::ctx(scenario)
        );

        ts::return_to_sender(scenario, admin_cap);
    }

    // ===== 單元測試 =====

    #[test]
    /// 測試創建投資池
    fun test_create_pool() {
        let mut scenario = setup_test();

        ts::next_tx(&mut scenario, ADMIN);
        let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
        let current_time = ts::ctx(&mut scenario).epoch_timestamp_ms();

        rwa_pool::create_pool(
            &admin_cap,
            b"My First Pool",
            b"A test investment pool",
            TARGET_AMOUNT,
            YIELD_RATE,
            0,
            current_time + 7 * 24 * 60 * 60 * 1000, // 7天後到期
            vector::empty(),
            ts::ctx(&mut scenario)
        );

        ts::return_to_sender(&scenario, admin_cap);

        // 驗證池已創建
        ts::next_tx(&mut scenario, ADMIN);
        {
            let pool = ts::take_shared<RWAPool>(&scenario);
            assert!(rwa_pool::target_amount(&pool) == TARGET_AMOUNT, 0);
            assert!(rwa_pool::current_amount(&pool) == 0, 1);
            assert!(rwa_pool::status(&pool) == 0, 2); // STATUS_RECRUITING
            ts::return_shared(pool);
        };

        ts::end(scenario);
    }

    #[test]
    /// 測試投資到池中
    fun test_invest_to_pool() {
        let mut scenario = setup_test();

        // 創建投資池
        let current_time = ts::ctx(&mut scenario).epoch_timestamp_ms();
        create_test_pool(&mut scenario, current_time + 10000); // 10秒後到期

        // 鑄造 TAXCOIN 給 USER1
        mint_taxcoin(&mut scenario, USER1, INVESTMENT_AMOUNT);

        // USER1 投資
        ts::next_tx(&mut scenario, USER1);
        {
            let mut pool = ts::take_shared<RWAPool>(&scenario);
            let payment = ts::take_from_sender<Coin<TAXCOIN>>(&scenario);

            rwa_pool::invest(&mut pool, payment, ts::ctx(&mut scenario));

            // 驗證投資成功
            assert!(rwa_pool::current_amount(&pool) == INVESTMENT_AMOUNT, 0);
            assert!(rwa_pool::investor_count(&pool) == 1, 1);

            ts::return_shared(pool);
        };

        // 驗證 USER1 收到 PoolShare NFT
        ts::next_tx(&mut scenario, USER1);
        {
            let share = ts::take_from_sender<PoolShare>(&scenario);
            let (pool_id, investor, amount, expected_yield, is_settled, actual_yield) =
                rwa_pool::share_info(&share);

            assert!(investor == USER1, 2);
            assert!(amount == INVESTMENT_AMOUNT, 3);
            assert!(!is_settled, 4);
            assert!(expected_yield > 0, 5); // 應該有預期收益

            ts::return_to_sender(&scenario, share);
        };

        ts::end(scenario);
    }

    #[test]
    /// 測試完整的投資-到期-結算-領取流程
    fun test_full_investment_lifecycle() {
        let mut scenario = setup_test();

        // 步驟 1: 創建投資池（10秒後到期用於測試）
        let current_time = ts::ctx(&mut scenario).epoch_timestamp_ms();
        create_test_pool(&mut scenario, current_time + 10000);

        // 步驟 2: USER1 投資
        mint_taxcoin(&mut scenario, USER1, INVESTMENT_AMOUNT);
        ts::next_tx(&mut scenario, USER1);
        {
            let mut pool = ts::take_shared<RWAPool>(&scenario);
            let payment = ts::take_from_sender<Coin<TAXCOIN>>(&scenario);
            rwa_pool::invest(&mut pool, payment, ts::ctx(&mut scenario));
            ts::return_shared(pool);
        };

        // 步驟 3: 驗證 NFT 已發放（投資中狀態）
        ts::next_tx(&mut scenario, USER1);
        {
            let share = ts::take_from_sender<PoolShare>(&scenario);
            let (_, _, _, _, is_settled, _) = rwa_pool::share_info(&share);
            assert!(!is_settled, 0); // 應該是未結算狀態
            ts::return_to_sender(&scenario, share);
        };

        // 步驟 4: 使用測試函數強制池到期
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut pool = ts::take_shared<RWAPool>(&scenario);
            rwa_pool::advance_to_maturity_for_testing(&mut pool, ts::ctx(&mut scenario));

            // 驗證池狀態已更新為已到期
            assert!(rwa_pool::status(&pool) == 2, 1); // STATUS_MATURED

            ts::return_shared(pool);
        };

        // 步驟 5: 管理員結算池
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut pool = ts::take_shared<RWAPool>(&scenario);

            rwa_pool::settle_pool(&admin_cap, &mut pool, ts::ctx(&mut scenario));

            // 驗證池已結算
            assert!(rwa_pool::is_settled(&pool), 2);

            ts::return_shared(pool);
            ts::return_to_sender(&scenario, admin_cap);
        };

        // 步驟 6: USER1 領取收益
        ts::next_tx(&mut scenario, USER1);
        {
            let mut pool = ts::take_shared<RWAPool>(&scenario);
            let mut share = ts::take_from_sender<PoolShare>(&scenario);

            rwa_pool::claim_yield(&mut pool, &mut share, ts::ctx(&mut scenario));

            // 驗證 NFT 狀態已更新為已結算
            let (_, _, _, expected_yield, is_settled, actual_yield) = rwa_pool::share_info(&share);
            assert!(is_settled, 3); // NFT 應該被標記為已結算
            assert!(actual_yield == expected_yield, 4); // 實際收益應等於預期收益

            ts::return_to_sender(&scenario, share);
            ts::return_shared(pool);
        };

        // 步驟 7: 驗證 USER1 收到資金（本金 + 收益）
        ts::next_tx(&mut scenario, USER1);
        {
            let taxcoin = ts::take_from_sender<Coin<TAXCOIN>>(&scenario);
            let received_amount = coin::value(&taxcoin);

            // 收到的金額應該大於本金（因為有收益）
            assert!(received_amount > INVESTMENT_AMOUNT, 5);

            ts::return_to_sender(&scenario, taxcoin);
        };

        ts::end(scenario);
    }

    #[test]
    /// 測試多個投資者
    fun test_multiple_investors() {
        let mut scenario = setup_test();

        // 創建投資池
        let current_time = ts::ctx(&mut scenario).epoch_timestamp_ms();
        create_test_pool(&mut scenario, current_time + 10000);

        // USER1 投資
        mint_taxcoin(&mut scenario, USER1, INVESTMENT_AMOUNT);
        ts::next_tx(&mut scenario, USER1);
        {
            let mut pool = ts::take_shared<RWAPool>(&scenario);
            let payment = ts::take_from_sender<Coin<TAXCOIN>>(&scenario);
            rwa_pool::invest(&mut pool, payment, ts::ctx(&mut scenario));
            ts::return_shared(pool);
        };

        // USER2 投資
        mint_taxcoin(&mut scenario, USER2, INVESTMENT_AMOUNT);
        ts::next_tx(&mut scenario, USER2);
        {
            let mut pool = ts::take_shared<RWAPool>(&scenario);
            let payment = ts::take_from_sender<Coin<TAXCOIN>>(&scenario);
            rwa_pool::invest(&mut pool, payment, ts::ctx(&mut scenario));

            // 驗證池狀態
            assert!(rwa_pool::current_amount(&pool) == INVESTMENT_AMOUNT * 2, 0);
            assert!(rwa_pool::investor_count(&pool) == 2, 1);
            assert!(rwa_pool::status(&pool) == 1, 2); // 應該已滿額 STATUS_FULL

            ts::return_shared(pool);
        };

        // 驗證兩個投資者都收到 NFT
        ts::next_tx(&mut scenario, USER1);
        {
            let share = ts::take_from_sender<PoolShare>(&scenario);
            ts::return_to_sender(&scenario, share);
        };

        ts::next_tx(&mut scenario, USER2);
        {
            let share = ts::take_from_sender<PoolShare>(&scenario);
            ts::return_to_sender(&scenario, share);
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = rwa_pool::E_INSUFFICIENT_AMOUNT)]
    /// 測試低於最低投資金額失敗
    fun test_insufficient_investment_fails() {
        let mut scenario = setup_test();

        let current_time = ts::ctx(&mut scenario).epoch_timestamp_ms();
        create_test_pool(&mut scenario, current_time + 10000);

        // 嘗試投資少於最低金額 (100,000 分)
        mint_taxcoin(&mut scenario, USER1, 50000); // 只有 50,000 分

        ts::next_tx(&mut scenario, USER1);
        {
            let mut pool = ts::take_shared<RWAPool>(&scenario);
            let payment = ts::take_from_sender<Coin<TAXCOIN>>(&scenario);

            rwa_pool::invest(&mut pool, payment, ts::ctx(&mut scenario));

            ts::return_shared(pool);
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = rwa_pool::E_POOL_NOT_MATURED)]
    /// 測試未到期前結算失敗
    fun test_settle_before_maturity_fails() {
        let mut scenario = setup_test();

        let current_time = ts::ctx(&mut scenario).epoch_timestamp_ms();
        create_test_pool(&mut scenario, current_time + 1000000); // 很久以後才到期

        // 投資
        mint_taxcoin(&mut scenario, USER1, INVESTMENT_AMOUNT);
        ts::next_tx(&mut scenario, USER1);
        {
            let mut pool = ts::take_shared<RWAPool>(&scenario);
            let payment = ts::take_from_sender<Coin<TAXCOIN>>(&scenario);
            rwa_pool::invest(&mut pool, payment, ts::ctx(&mut scenario));
            ts::return_shared(pool);
        };

        // 嘗試在未到期前結算
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut pool = ts::take_shared<RWAPool>(&scenario);

            // 注意：需要先手動更新狀態為 FULL，因為測試中池可能還在募集中
            // 但不調用 advance_to_maturity，所以時間還沒到

            rwa_pool::settle_pool(&admin_cap, &mut pool, ts::ctx(&mut scenario));

            ts::return_shared(pool);
            ts::return_to_sender(&scenario, admin_cap);
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = rwa_pool::E_INVALID_STATUS)]
    /// 測試未結算前領取收益失敗
    fun test_claim_before_settlement_fails() {
        let mut scenario = setup_test();

        let current_time = ts::ctx(&mut scenario).epoch_timestamp_ms();
        create_test_pool(&mut scenario, current_time + 10000);

        // 投資
        mint_taxcoin(&mut scenario, USER1, INVESTMENT_AMOUNT);
        ts::next_tx(&mut scenario, USER1);
        {
            let mut pool = ts::take_shared<RWAPool>(&scenario);
            let payment = ts::take_from_sender<Coin<TAXCOIN>>(&scenario);
            rwa_pool::invest(&mut pool, payment, ts::ctx(&mut scenario));
            ts::return_shared(pool);
        };

        // 嘗試在未結算前領取收益
        ts::next_tx(&mut scenario, USER1);
        {
            let mut pool = ts::take_shared<RWAPool>(&scenario);
            let mut share = ts::take_from_sender<PoolShare>(&scenario);

            rwa_pool::claim_yield(&mut pool, &mut share, ts::ctx(&mut scenario));

            ts::return_to_sender(&scenario, share);
            ts::return_shared(pool);
        };

        ts::end(scenario);
    }

    #[test]
    /// 測試檢查並更新池狀態功能
    fun test_check_and_update_status() {
        let mut scenario = setup_test();

        let current_time = ts::ctx(&mut scenario).epoch_timestamp_ms();
        create_test_pool(&mut scenario, current_time + 5000);

        // 強制到期
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut pool = ts::take_shared<RWAPool>(&scenario);
            rwa_pool::advance_to_maturity_for_testing(&mut pool, ts::ctx(&mut scenario));
            ts::return_shared(pool);
        };

        // 調用 check_and_update_status
        ts::next_tx(&mut scenario, USER1);
        {
            let mut pool = ts::take_shared<RWAPool>(&scenario);
            rwa_pool::check_and_update_status(&mut pool, ts::ctx(&mut scenario));

            // 驗證狀態已更新
            assert!(rwa_pool::status(&pool) == 2, 0); // STATUS_MATURED

            ts::return_shared(pool);
        };

        ts::end(scenario);
    }

    #[test]
    /// 測試測試輔助函數
    fun test_helper_functions() {
        let mut scenario = setup_test();

        let current_time = ts::ctx(&mut scenario).epoch_timestamp_ms();
        create_test_pool(&mut scenario, current_time + 10000);

        // 投資
        mint_taxcoin(&mut scenario, USER1, INVESTMENT_AMOUNT);
        ts::next_tx(&mut scenario, USER1);
        {
            let mut pool = ts::take_shared<RWAPool>(&scenario);
            let payment = ts::take_from_sender<Coin<TAXCOIN>>(&scenario);
            rwa_pool::invest(&mut pool, payment, ts::ctx(&mut scenario));

            // 測試 get_investment_amount
            let invested = rwa_pool::get_investment_amount(&pool, USER1);
            assert!(invested == INVESTMENT_AMOUNT, 0);

            // 測試未投資的地址
            let not_invested = rwa_pool::get_investment_amount(&pool, USER2);
            assert!(not_invested == 0, 1);

            ts::return_shared(pool);
        };

        // 測試 set_maturity_date_for_testing
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut pool = ts::take_shared<RWAPool>(&scenario);
            let new_maturity = current_time + 20000;

            rwa_pool::set_maturity_date_for_testing(&mut pool, new_maturity);

            ts::return_shared(pool);
        };

        ts::end(scenario);
    }
}
