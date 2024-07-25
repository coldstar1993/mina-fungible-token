# Introduction

Mina原生支持自定义代币([MIP-4](https://github.com/MinaProtocol/MIPs/blob/main/MIPS/mip-zkapps.md#token-mechanics))。Mina 上的每个帐户都可以创建对应一个自定义代币。

要创建新代币，需要创建一个智能合约，该合约将成为代币的所有者(token owner)，并使用该合约来设置有关如何铸造、销毁和转让代币的规则。合约还可以设置代币符号。代币名称不强制要求唯一性。相反，合约的公钥用于派生计算出代币的唯一标识符(tokenId)。

## SHOW ME THE CODE

[`mina-fungible-token` repo 的 e2e 示例](../examples/e2e.eg.ts) 展示了 token 的整个生命周期。

运行 `npm i mina-fungible-token` 后，导入 `FungibleToken` 和 `FungibleTokenAdmin`合约并部署它们：

```ts
const token = new FungibleToken(contract.publicKey)
const adminContract = new FungibleTokenAdmin(admin.publicKey)

const deployTx = await Mina.transaction({
  sender: deployer,
  fee,
}, async () => {
  AccountUpdate.fundNewAccount(deployer, 3)
  await adminContract.deploy({ adminPublicKey: admin.publicKey })
  await token.deploy({
    symbol: "abc",
    src: "../examples/e2e.eg.ts",
  })
  await token.initialize(
    admin.publicKey,
    UInt8.from(9),
    Bool(false),
  )
})
await deployTx.prove()
deployTx.sign([deployer.key, contract.privateKey, admin.privateKey])
await deployTx.send()
```

> 注意：此示例假设 `contract` 和 `deployer` 是范围内有效的密钥对。

## How?

这个自定义token机制在Mina中是如何实现的呢？

### Token Owner Account

代币所有者账户(Token Owner Account)是具有以下功能的合约。

- 为其代币设置代币符号（也称为代币名称）。代币名称不强制唯一性，因为所有者账户的公钥已经被用于为每个代币派生唯一标识符(tokenId)。
- 铸造新代币。zkApp 通过向账户添加新创建的代币来更新账户余额。
  您可以将铸造的代币发送到网络中的任何现有账户。
- 销毁代币（铸造的反义词）。销毁代币会从某个地址的余额中扣除指定金额。zkApp 不能销毁超过指定账户的代币数量。
- 在两个账户之间发送代币。有两种方式可以发起转账：要么代币所有者可以直接创建账户更新（通过 `transfer` 方法），要么账户更新可以在外部创建，然后由代币所有者批准（参见 [批准机制](#approval-mechanism)）。

### Token Account

代币账户(Token Account)与普通账户(Regular Account)类似，但它们持有的是特定自定义代币的余额，而不是 MINA。代币账户由公钥和代币 ID 指定。

代币账户特定于每种类型的自定义代币，因此单个公钥可以拥有许多不同的代币账户。

每当现有账户收到用自定义代币表示的交易时，都会自动为公钥创建一个代币账户。

> [!重要] 首次创建代币账户时，必须支付与创建新标准账户相同的账户创建费(1 MINA)。

### Token ID

代币 ID 是区分不同类型自定义代币的唯一标识符。自定义代币标识符在整个网络中是全局唯一的。

代币 ID 源自代币所有者帐户。使用 `deriveTokenId()` 函数获取代币的 ID。

### Approval mechanism

在两个账户之间发送代币必须得到Token Owner zkApp 的批准。这可以通过自定义代币标准参考实现的 `approveBase()` 方法来完成。

> [!重要] 手动构建 `AccountUpdate` 时，请确保在对 `approveBase()` 的调用中对其进行适当排序。合约不允许闪电铸造，即在从账户发送代币之前，账户无法接收代币。

[!NOTE] 可以传递给 `approveBase()` 的 `AccountUpdate` 数量受基础代币合约限制。当前限制为 9。
