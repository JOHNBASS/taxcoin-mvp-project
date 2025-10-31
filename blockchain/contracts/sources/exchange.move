/// Exchange - SUI ↔ TAXCOIN 兑换模块
/// 实现自动做市商 (AMM) 机制,基于恒定乘积公式 (x * y = k)
///
/// 功能:
/// - SUI 换 TAXCOIN
/// - TAXCOIN 换 SUI
/// - 流动性池管理 (添加/移除流动性)
/// - 价格计算
/// - 手续费机制

module taxcoin::exchange {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::sui::SUI;
    use sui::event;
    use sui::math;
    use taxcoin::taxcoin::TAXCOIN;

    // ===== 错误码 =====
    const E_INSUFFICIENT_LIQUIDITY: u64 = 1;
    const E_INSUFFICIENT_OUTPUT_AMOUNT: u64 = 2;
    const E_INSUFFICIENT_INPUT_AMOUNT: u64 = 3;
    const E_INVALID_AMOUNT: u64 = 4;
    const E_SLIPPAGE_EXCEEDED: u64 = 5;
    const E_ZERO_LIQUIDITY: u64 = 6;
    const E_INSUFFICIENT_LP_TOKENS: u64 = 7;
    const E_NOT_AUTHORIZED: u64 = 8;

    // ===== 常量 =====
    /// 手续费率 (30 = 0.3%)
    const FEE_RATE: u64 = 30;
    const FEE_DENOMINATOR: u64 = 10000;

    /// 最小流动性 (防止除零错误)
    const MINIMUM_LIQUIDITY: u64 = 1000;

    // ===== 结构体定义 =====

    /// 管理员能力
    public struct AdminCap has key, store {
        id: UID
    }

    /// 流动性池
    public struct LiquidityPool has key {
        id: UID,
        /// SUI 储备量
        sui_reserve: Balance<SUI>,
        /// TAXCOIN 储备量
        taxcoin_reserve: Balance<TAXCOIN>,
        /// LP Token 总供应量
        lp_supply: u64,
        /// 累计手续费 (SUI)
        collected_fee_sui: Balance<SUI>,
        /// 累计手续费 (TAXCOIN)
        collected_fee_taxcoin: Balance<TAXCOIN>,
        /// 创建时间
        created_at: u64
    }

    /// 流动性提供者凭证 (LP Token)
    public struct LPToken has key, store {
        id: UID,
        /// LP Token 数量
        amount: u64,
        /// 提供者地址
        provider: address,
        /// 提供时间
        provided_at: u64
    }

    /// 流动性添加事件
    public struct LiquidityAdded has copy, drop {
        provider: address,
        sui_amount: u64,
        taxcoin_amount: u64,
        lp_tokens: u64,
        timestamp: u64
    }

    /// 流动性移除事件
    public struct LiquidityRemoved has copy, drop {
        provider: address,
        sui_amount: u64,
        taxcoin_amount: u64,
        lp_tokens: u64,
        timestamp: u64
    }

    /// 兑换事件
    public struct Swapped has copy, drop {
        trader: address,
        input_type: vector<u8>, // "SUI" or "TAXCOIN"
        input_amount: u64,
        output_amount: u64,
        fee_amount: u64,
        timestamp: u64
    }

    /// 价格更新事件
    public struct PriceUpdated has copy, drop {
        sui_reserve: u64,
        taxcoin_reserve: u64,
        price: u64, // TAXCOIN per SUI (scaled by 10^8)
        timestamp: u64
    }

    // ===== 初始化函数 =====

    fun init(ctx: &mut TxContext) {
        // 创建管理员能力
        let admin_cap = AdminCap {
            id: object::new(ctx)
        };
        transfer::public_transfer(admin_cap, tx_context::sender(ctx));

        // 创建流动性池
        let pool = LiquidityPool {
            id: object::new(ctx),
            sui_reserve: balance::zero(),
            taxcoin_reserve: balance::zero(),
            lp_supply: 0,
            collected_fee_sui: balance::zero(),
            collected_fee_taxcoin: balance::zero(),
            created_at: tx_context::epoch_timestamp_ms(ctx)
        };

        transfer::share_object(pool);
    }

    // ===== 流动性管理函数 =====

    /// 添加流动性
    ///
    /// # 参数
    /// - `pool`: 流动性池
    /// - `sui_coin`: 提供的 SUI
    /// - `taxcoin_coin`: 提供的 TAXCOIN
    /// - `min_lp_tokens`: 最小 LP Token 数量 (防止滑点)
    /// - `ctx`: 交易上下文
    public entry fun add_liquidity(
        pool: &mut LiquidityPool,
        sui_coin: Coin<SUI>,
        taxcoin_coin: Coin<TAXCOIN>,
        min_lp_tokens: u64,
        ctx: &mut TxContext
    ) {
        let sui_amount = coin::value(&sui_coin);
        let taxcoin_amount = coin::value(&taxcoin_coin);

        assert!(sui_amount > 0, E_INVALID_AMOUNT);
        assert!(taxcoin_amount > 0, E_INVALID_AMOUNT);

        let sui_reserve = balance::value(&pool.sui_reserve);
        let taxcoin_reserve = balance::value(&pool.taxcoin_reserve);

        // 计算 LP Token 数量
        let lp_tokens = if (pool.lp_supply == 0) {
            // 首次添加流动性:使用几何平均数
            let initial_lp = sqrt(sui_amount * taxcoin_amount);
            assert!(initial_lp > MINIMUM_LIQUIDITY, E_ZERO_LIQUIDITY);
            initial_lp - MINIMUM_LIQUIDITY // 锁定最小流动性
        } else {
            // 后续添加:按比例计算
            let lp_from_sui = (sui_amount * pool.lp_supply) / sui_reserve;
            let lp_from_taxcoin = (taxcoin_amount * pool.lp_supply) / taxcoin_reserve;
            // 取较小值,防止套利
            if (lp_from_sui < lp_from_taxcoin) { lp_from_sui } else { lp_from_taxcoin }
        };

        assert!(lp_tokens >= min_lp_tokens, E_SLIPPAGE_EXCEEDED);

        // 将代币加入池中
        let sui_balance = coin::into_balance(sui_coin);
        let taxcoin_balance = coin::into_balance(taxcoin_coin);
        balance::join(&mut pool.sui_reserve, sui_balance);
        balance::join(&mut pool.taxcoin_reserve, taxcoin_balance);

        // 更新 LP 总供应量
        pool.lp_supply = pool.lp_supply + lp_tokens;

        let provider = tx_context::sender(ctx);

        // 创建 LP Token 凭证
        let lp_token = LPToken {
            id: object::new(ctx),
            amount: lp_tokens,
            provider,
            provided_at: tx_context::epoch_timestamp_ms(ctx)
        };

        // 发出事件
        event::emit(LiquidityAdded {
            provider,
            sui_amount,
            taxcoin_amount,
            lp_tokens,
            timestamp: lp_token.provided_at
        });

        emit_price_update(pool, ctx);

        // 转移 LP Token 给提供者
        transfer::public_transfer(lp_token, provider);
    }

    /// 移除流动性
    ///
    /// # 参数
    /// - `pool`: 流动性池
    /// - `lp_token`: LP Token 凭证
    /// - `min_sui`: 最小 SUI 数量 (防止滑点)
    /// - `min_taxcoin`: 最小 TAXCOIN 数量 (防止滑点)
    /// - `ctx`: 交易上下文
    public entry fun remove_liquidity(
        pool: &mut LiquidityPool,
        lp_token: LPToken,
        min_sui: u64,
        min_taxcoin: u64,
        ctx: &mut TxContext
    ) {
        let provider = tx_context::sender(ctx);
        let LPToken { id, amount: lp_amount, provider: token_provider, provided_at: _ } = lp_token;

        assert!(provider == token_provider, E_NOT_AUTHORIZED);
        object::delete(id);

        assert!(lp_amount > 0, E_INSUFFICIENT_LP_TOKENS);
        assert!(pool.lp_supply >= lp_amount, E_INSUFFICIENT_LIQUIDITY);

        let sui_reserve = balance::value(&pool.sui_reserve);
        let taxcoin_reserve = balance::value(&pool.taxcoin_reserve);

        // 计算可以取回的代币数量
        let sui_amount = (lp_amount * sui_reserve) / pool.lp_supply;
        let taxcoin_amount = (lp_amount * taxcoin_reserve) / pool.lp_supply;

        assert!(sui_amount >= min_sui, E_SLIPPAGE_EXCEEDED);
        assert!(taxcoin_amount >= min_taxcoin, E_SLIPPAGE_EXCEEDED);

        // 从池中取出代币
        let sui_balance = balance::split(&mut pool.sui_reserve, sui_amount);
        let taxcoin_balance = balance::split(&mut pool.taxcoin_reserve, taxcoin_amount);

        let sui_coin = coin::from_balance(sui_balance, ctx);
        let taxcoin_coin = coin::from_balance(taxcoin_balance, ctx);

        // 更新 LP 总供应量
        pool.lp_supply = pool.lp_supply - lp_amount;

        // 发出事件
        event::emit(LiquidityRemoved {
            provider,
            sui_amount,
            taxcoin_amount,
            lp_tokens: lp_amount,
            timestamp: tx_context::epoch_timestamp_ms(ctx)
        });

        emit_price_update(pool, ctx);

        // 转账给提供者
        transfer::public_transfer(sui_coin, provider);
        transfer::public_transfer(taxcoin_coin, provider);
    }

    // ===== 兑换函数 =====

    /// SUI 换 TAXCOIN
    ///
    /// # 参数
    /// - `pool`: 流动性池
    /// - `sui_coin`: 输入的 SUI
    /// - `min_taxcoin`: 最小输出 TAXCOIN 数量 (防止滑点)
    /// - `ctx`: 交易上下文
    public entry fun swap_sui_to_taxcoin(
        pool: &mut LiquidityPool,
        sui_coin: Coin<SUI>,
        min_taxcoin: u64,
        ctx: &mut TxContext
    ) {
        let sui_amount = coin::value(&sui_coin);
        assert!(sui_amount > 0, E_INSUFFICIENT_INPUT_AMOUNT);

        let sui_reserve = balance::value(&pool.sui_reserve);
        let taxcoin_reserve = balance::value(&pool.taxcoin_reserve);

        assert!(sui_reserve > 0 && taxcoin_reserve > 0, E_INSUFFICIENT_LIQUIDITY);

        // 计算输出金额 (扣除手续费)
        let (taxcoin_amount, fee_amount) = calculate_output_amount(
            sui_amount,
            sui_reserve,
            taxcoin_reserve
        );

        assert!(taxcoin_amount >= min_taxcoin, E_SLIPPAGE_EXCEEDED);
        assert!(taxcoin_amount > 0, E_INSUFFICIENT_OUTPUT_AMOUNT);
        assert!(taxcoin_reserve > taxcoin_amount, E_INSUFFICIENT_LIQUIDITY);

        // 将 SUI 加入池中
        let sui_balance = coin::into_balance(sui_coin);
        balance::join(&mut pool.sui_reserve, sui_balance);

        // 从池中取出 TAXCOIN
        let taxcoin_balance = balance::split(&mut pool.taxcoin_reserve, taxcoin_amount);
        let taxcoin_coin = coin::from_balance(taxcoin_balance, ctx);

        let trader = tx_context::sender(ctx);

        // 发出事件
        event::emit(Swapped {
            trader,
            input_type: b"SUI",
            input_amount: sui_amount,
            output_amount: taxcoin_amount,
            fee_amount,
            timestamp: tx_context::epoch_timestamp_ms(ctx)
        });

        emit_price_update(pool, ctx);

        // 转账给交易者
        transfer::public_transfer(taxcoin_coin, trader);
    }

    /// TAXCOIN 换 SUI
    ///
    /// # 参数
    /// - `pool`: 流动性池
    /// - `taxcoin_coin`: 输入的 TAXCOIN
    /// - `min_sui`: 最小输出 SUI 数量 (防止滑点)
    /// - `ctx`: 交易上下文
    public entry fun swap_taxcoin_to_sui(
        pool: &mut LiquidityPool,
        taxcoin_coin: Coin<TAXCOIN>,
        min_sui: u64,
        ctx: &mut TxContext
    ) {
        let taxcoin_amount = coin::value(&taxcoin_coin);
        assert!(taxcoin_amount > 0, E_INSUFFICIENT_INPUT_AMOUNT);

        let sui_reserve = balance::value(&pool.sui_reserve);
        let taxcoin_reserve = balance::value(&pool.taxcoin_reserve);

        assert!(sui_reserve > 0 && taxcoin_reserve > 0, E_INSUFFICIENT_LIQUIDITY);

        // 计算输出金额 (扣除手续费)
        let (sui_amount, fee_amount) = calculate_output_amount(
            taxcoin_amount,
            taxcoin_reserve,
            sui_reserve
        );

        assert!(sui_amount >= min_sui, E_SLIPPAGE_EXCEEDED);
        assert!(sui_amount > 0, E_INSUFFICIENT_OUTPUT_AMOUNT);
        assert!(sui_reserve > sui_amount, E_INSUFFICIENT_LIQUIDITY);

        // 将 TAXCOIN 加入池中
        let taxcoin_balance = coin::into_balance(taxcoin_coin);
        balance::join(&mut pool.taxcoin_reserve, taxcoin_balance);

        // 从池中取出 SUI
        let sui_balance = balance::split(&mut pool.sui_reserve, sui_amount);
        let sui_coin = coin::from_balance(sui_balance, ctx);

        let trader = tx_context::sender(ctx);

        // 发出事件
        event::emit(Swapped {
            trader,
            input_type: b"TAXCOIN",
            input_amount: taxcoin_amount,
            output_amount: sui_amount,
            fee_amount,
            timestamp: tx_context::epoch_timestamp_ms(ctx)
        });

        emit_price_update(pool, ctx);

        // 转账给交易者
        transfer::public_transfer(sui_coin, trader);
    }

    // ===== 辅助函数 =====

    /// 计算输出金额 (基于恒定乘积公式 x * y = k)
    ///
    /// 公式: output = (input * 997 * output_reserve) / (input_reserve * 1000 + input * 997)
    /// 其中 997/1000 = 0.997 是扣除 0.3% 手续费后的系数
    fun calculate_output_amount(
        input_amount: u64,
        input_reserve: u64,
        output_reserve: u64
    ): (u64, u64) {
        // 计算手续费
        let fee_amount = (input_amount * FEE_RATE) / FEE_DENOMINATOR;
        let input_after_fee = input_amount - fee_amount;

        // 使用恒定乘积公式计算输出
        let numerator = input_after_fee * output_reserve;
        let denominator = input_reserve + input_after_fee;
        let output_amount = numerator / denominator;

        (output_amount, fee_amount)
    }

    /// 计算平方根 (使用牛顿迭代法)
    fun sqrt(y: u64): u64 {
        if (y == 0) {
            return 0
        };

        let mut z = y;
        let mut x = y / 2 + 1;

        while (x < z) {
            z = x;
            x = (y / x + x) / 2;
        };

        z
    }

    /// 发出价格更新事件
    fun emit_price_update(pool: &LiquidityPool, ctx: &mut TxContext) {
        let sui_reserve = balance::value(&pool.sui_reserve);
        let taxcoin_reserve = balance::value(&pool.taxcoin_reserve);

        // 计算价格 (TAXCOIN per SUI,按 10^8 缩放)
        let price = if (sui_reserve > 0) {
            (taxcoin_reserve * 100000000) / sui_reserve
        } else {
            0
        };

        event::emit(PriceUpdated {
            sui_reserve,
            taxcoin_reserve,
            price,
            timestamp: tx_context::epoch_timestamp_ms(ctx)
        });
    }

    // ===== 查询函数 =====

    /// 获取 SUI 储备量
    public fun sui_reserve(pool: &LiquidityPool): u64 {
        balance::value(&pool.sui_reserve)
    }

    /// 获取 TAXCOIN 储备量
    public fun taxcoin_reserve(pool: &LiquidityPool): u64 {
        balance::value(&pool.taxcoin_reserve)
    }

    /// 获取 LP Token 总供应量
    public fun lp_supply(pool: &LiquidityPool): u64 {
        pool.lp_supply
    }

    /// 获取当前价格 (TAXCOIN per SUI)
    public fun get_price(pool: &LiquidityPool): u64 {
        let sui_reserve = balance::value(&pool.sui_reserve);
        let taxcoin_reserve = balance::value(&pool.taxcoin_reserve);

        if (sui_reserve == 0) {
            return 0
        };

        (taxcoin_reserve * 100000000) / sui_reserve
    }

    /// 预估兑换输出 (SUI -> TAXCOIN)
    public fun estimate_sui_to_taxcoin(
        pool: &LiquidityPool,
        sui_amount: u64
    ): u64 {
        let sui_reserve = balance::value(&pool.sui_reserve);
        let taxcoin_reserve = balance::value(&pool.taxcoin_reserve);

        if (sui_reserve == 0 || taxcoin_reserve == 0) {
            return 0
        };

        let (output, _fee) = calculate_output_amount(sui_amount, sui_reserve, taxcoin_reserve);
        output
    }

    /// 预估兑换输出 (TAXCOIN -> SUI)
    public fun estimate_taxcoin_to_sui(
        pool: &LiquidityPool,
        taxcoin_amount: u64
    ): u64 {
        let sui_reserve = balance::value(&pool.sui_reserve);
        let taxcoin_reserve = balance::value(&pool.taxcoin_reserve);

        if (sui_reserve == 0 || taxcoin_reserve == 0) {
            return 0
        };

        let (output, _fee) = calculate_output_amount(taxcoin_amount, taxcoin_reserve, sui_reserve);
        output
    }

    // ===== 管理员函数 =====

    /// 提取累计手续费 (仅管理员)
    public entry fun collect_fees(
        _admin_cap: &AdminCap,
        pool: &mut LiquidityPool,
        ctx: &mut TxContext
    ) {
        let admin = tx_context::sender(ctx);

        // 提取 SUI 手续费
        let sui_fee_amount = balance::value(&pool.collected_fee_sui);
        if (sui_fee_amount > 0) {
            let sui_fee_balance = balance::split(&mut pool.collected_fee_sui, sui_fee_amount);
            let sui_fee_coin = coin::from_balance(sui_fee_balance, ctx);
            transfer::public_transfer(sui_fee_coin, admin);
        };

        // 提取 TAXCOIN 手续费
        let taxcoin_fee_amount = balance::value(&pool.collected_fee_taxcoin);
        if (taxcoin_fee_amount > 0) {
            let taxcoin_fee_balance = balance::split(&mut pool.collected_fee_taxcoin, taxcoin_fee_amount);
            let taxcoin_fee_coin = coin::from_balance(taxcoin_fee_balance, ctx);
            transfer::public_transfer(taxcoin_fee_coin, admin);
        }
    }

    // ===== 测试函数 =====

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }

    #[test_only]
    public fun test_sqrt() {
        assert!(sqrt(0) == 0, 0);
        assert!(sqrt(1) == 1, 1);
        assert!(sqrt(4) == 2, 2);
        assert!(sqrt(9) == 3, 3);
        assert!(sqrt(16) == 4, 4);
        assert!(sqrt(100) == 10, 5);
        assert!(sqrt(10000) == 100, 6);
    }
}
