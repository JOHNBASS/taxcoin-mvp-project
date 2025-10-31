# TaxCoin Exchange 模块

## 概述

Exchange 模块实现了 SUI ↔ TAXCOIN 的去中心化兑换功能,基于自动做市商 (AMM) 机制,使用恒定乘积公式 (x × y = k)。

## 主要功能

### 1. 流动性管理

#### 添加流动性 (Add Liquidity)
```bash
sui client call \
  --package <PACKAGE_ID> \
  --module exchange \
  --function add_liquidity \
  --args <POOL_ID> <SUI_COIN> <TAXCOIN_COIN> <MIN_LP_TOKENS>
```

**参数说明:**
- `POOL_ID`: 流动性池对象 ID
- `SUI_COIN`: 提供的 SUI Coin 对象
- `TAXCOIN_COIN`: 提供的 TAXCOIN Coin 对象
- `MIN_LP_TOKENS`: 最小 LP Token 数量 (防止滑点)

**返回:**
- LP Token NFT (流动性提供者凭证)

#### 移除流动性 (Remove Liquidity)
```bash
sui client call \
  --package <PACKAGE_ID> \
  --module exchange \
  --function remove_liquidity \
  --args <POOL_ID> <LP_TOKEN> <MIN_SUI> <MIN_TAXCOIN>
```

**参数说明:**
- `LP_TOKEN`: LP Token NFT 对象
- `MIN_SUI`: 最小 SUI 数量 (防止滑点)
- `MIN_TAXCOIN`: 最小 TAXCOIN 数量 (防止滑点)

**返回:**
- SUI Coin
- TAXCOIN Coin

### 2. 代币兑换

#### SUI 换 TAXCOIN
```bash
sui client call \
  --package <PACKAGE_ID> \
  --module exchange \
  --function swap_sui_to_taxcoin \
  --args <POOL_ID> <SUI_COIN> <MIN_TAXCOIN>
```

**参数说明:**
- `SUI_COIN`: 输入的 SUI Coin 对象
- `MIN_TAXCOIN`: 最小输出 TAXCOIN 数量 (防止滑点)

**手续费:** 0.3%

#### TAXCOIN 换 SUI
```bash
sui client call \
  --package <PACKAGE_ID> \
  --module exchange \
  --function swap_taxcoin_to_sui \
  --args <POOL_ID> <TAXCOIN_COIN> <MIN_SUI>
```

**参数说明:**
- `TAXCOIN_COIN`: 输入的 TAXCOIN Coin 对象
- `MIN_SUI`: 最小输出 SUI 数量 (防止滑点)

**手续费:** 0.3%

### 3. 查询函数

#### 获取池储备量
```move
public fun sui_reserve(pool: &LiquidityPool): u64
public fun taxcoin_reserve(pool: &LiquidityPool): u64
```

#### 获取当前价格
```move
public fun get_price(pool: &LiquidityPool): u64
```
返回值按 10^8 缩放 (TAXCOIN per SUI)

#### 预估兑换输出
```move
public fun estimate_sui_to_taxcoin(pool: &LiquidityPool, sui_amount: u64): u64
public fun estimate_taxcoin_to_sui(pool: &LiquidityPool, taxcoin_amount: u64): u64
```

## 技术实现

### AMM 机制

基于 **恒定乘积公式**:
```
x × y = k
```

其中:
- `x` = SUI 储备量
- `y` = TAXCOIN 储备量
- `k` = 恒定乘积值

### 价格计算

输出金额公式 (扣除 0.3% 手续费):
```
output = (input × 997 × output_reserve) / (input_reserve × 1000 + input × 997)
```

### LP Token 计算

**首次添加流动性:**
```
lp_tokens = sqrt(sui_amount × taxcoin_amount) - MINIMUM_LIQUIDITY
```

**后续添加流动性:**
```
lp_tokens = min(
  (sui_amount × lp_supply) / sui_reserve,
  (taxcoin_amount × lp_supply) / taxcoin_reserve
)
```

### 手续费机制

- **交易手续费:** 0.3% (30 基点)
- **手续费分配:** 手续费留在流动性池中,由所有 LP 持有者共享
- **手续费提取:** 管理员可以调用 `collect_fees` 函数提取累计手续费

## 事件

### LiquidityAdded
```move
public struct LiquidityAdded has copy, drop {
    provider: address,
    sui_amount: u64,
    taxcoin_amount: u64,
    lp_tokens: u64,
    timestamp: u64
}
```

### LiquidityRemoved
```move
public struct LiquidityRemoved has copy, drop {
    provider: address,
    sui_amount: u64,
    taxcoin_amount: u64,
    lp_tokens: u64,
    timestamp: u64
}
```

### Swapped
```move
public struct Swapped has copy, drop {
    trader: address,
    input_type: vector<u8>, // "SUI" or "TAXCOIN"
    input_amount: u64,
    output_amount: u64,
    fee_amount: u64,
    timestamp: u64
}
```

### PriceUpdated
```move
public struct PriceUpdated has copy, drop {
    sui_reserve: u64,
    taxcoin_reserve: u64,
    price: u64, // TAXCOIN per SUI (scaled by 10^8)
    timestamp: u64
}
```

## 安全特性

1. **滑点保护:** 所有兑换和流动性操作都支持最小输出数量参数
2. **最小流动性锁定:** 首次添加流动性时锁定 1000 个最小单位,防止除零错误
3. **恒定乘积验证:** 确保 K 值不减少 (除非移除流动性)
4. **权限控制:** 只有 LP Token 持有者可以移除流动性

## 编译和测试

### 编译合约
```bash
cd blockchain
sui move build
```

### 运行测试
```bash
sui move test
```

### 测试覆盖
- ✅ 添加流动性
- ✅ 移除流动性
- ✅ SUI → TAXCOIN 兑换
- ✅ TAXCOIN → SUI 兑换
- ✅ 价格计算
- ✅ 恒定乘积公式验证
- ✅ 错误处理 (零金额、空池等)

## 部署

### 1. 发布合约
```bash
sui client publish --gas-budget 100000000
```

### 2. 记录对象 ID
部署后记录以下 ID:
- Package ID
- LiquidityPool Object ID
- AdminCap Object ID

### 3. 初始化流动性
第一个流动性提供者需要添加初始流动性来启动交易池。

## 示例用法

### 添加流动性示例
```typescript
// 使用 TypeScript SDK
const tx = new TransactionBlock();

tx.moveCall({
  target: `${packageId}::exchange::add_liquidity`,
  arguments: [
    tx.object(poolId),
    tx.object(suiCoinId),
    tx.object(taxcoinCoinId),
    tx.pure(0) // min_lp_tokens
  ]
});

const result = await client.signAndExecuteTransactionBlock({
  signer: keypair,
  transactionBlock: tx
});
```

### SUI 换 TAXCOIN 示例
```typescript
const tx = new TransactionBlock();

tx.moveCall({
  target: `${packageId}::exchange::swap_sui_to_taxcoin`,
  arguments: [
    tx.object(poolId),
    tx.object(suiCoinId),
    tx.pure(minTaxcoin) // 滑点保护
  ]
});

const result = await client.signAndExecuteTransactionBlock({
  signer: keypair,
  transactionBlock: tx
});
```

## 前端集成建议

### 价格显示
```typescript
// 获取当前价格
const price = await provider.getObject({
  id: poolId,
  options: { showContent: true }
});

const pricePerSui = price.data.content.fields.taxcoin_reserve /
                     price.data.content.fields.sui_reserve;
```

### 滑点设置
建议默认滑点容忍度:
- **正常交易:** 0.5%
- **大额交易:** 1%
- **高波动期:** 2-3%

### 计算最小输出
```typescript
const estimatedOutput = calculateOutput(inputAmount, inputReserve, outputReserve);
const minOutput = estimatedOutput * (1 - slippageTolerance);
```

## 注意事项

1. **流动性池初始化:** 首次添加流动性时,确保比例合理,因为这将设定初始价格
2. **滑点风险:** 大额交易可能产生较大滑点,建议分批交易
3. **手续费累积:** 交易手续费会留在池中,使 LP Token 价值增加
4. **无常损失:** 流动性提供者面临无常损失风险,特别是价格波动大时

## 与其他模块的集成

### 与 RWAPool 集成
投资者可以:
1. 用 SUI 兑换 TAXCOIN
2. 使用 TAXCOIN 投资 RWA Pool
3. 到期后收回 TAXCOIN
4. 将 TAXCOIN 兑换回 SUI

### 交易流程
```
用户持有 SUI
  ↓
Exchange: SUI → TAXCOIN
  ↓
RWA Pool: 投资 TAXCOIN
  ↓
到期收回 TAXCOIN + 收益
  ↓
Exchange: TAXCOIN → SUI
  ↓
用户收回 SUI (含收益)
```

## 未来优化方向

1. **动态手续费:** 根据池深度和交易量调整手续费率
2. **价格预言机集成:** 与外部价格源集成,提供更准确的价格参考
3. **限价订单:** 支持限价订单功能
4. **批量兑换:** 支持批量兑换以节省 gas
5. **闪电兑换:** 支持闪电贷功能

## 联系方式

如有问题或建议,请联系开发团队。
