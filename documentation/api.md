# API overview

代币标准实现提供了一个智能合约 `FungibleToken`，可以将其部署为新代币的Token Owner。它提供了可替代代币所期望的所有面向用户的功能：创建、转移和销毁代币，以及查询余额和代币总量。

使用标准意味着使用这个特定的、未修改的合约。更改合约被视为偏离标准的原因是 MINA 的链下执行模型：想要集成代币的第三方（钱包、交易所等）需要访问并执行Token Owner合约的代码才能与代币交互。就一种特定的实现达成一致可以大大减轻集成的负担。

为了允许在不更改Token Owner合约的情况下进行一些定制，我们将一些功能委托给称为`FungibleTokenAdmin`的辅助管理合约。此合约控制对特权操作的访问，例如铸造、暂停/恢复传输或更改管理合约本身。这种结构允许您设置货币扩张的规则，而无需更改Token Owner合约本身。由于管理合约只会从代币合约中普通用户不打算调用的方法中调用，因此管理合约的代码无需集成到钱包或其他第三方应用程序中。

是一个代币管理器 zkApp，分为两部分：低级和高级。

## The `FungibleToken` contract

## On-chain State and deploy arguments

链上状态定义如下：

```ts
@state(UInt8) decimals = State<UInt8>()
@state(PublicKey) admin = State<PublicKey>()
@state(UInt64) private circulating = State<UInt64>()
@state(Bool) paused = State<Bool>()
```

`deploy()` 函数接受以下参数：

- 用作代币符号的字符串
- 指向合约源代码的字符串 - 遵循标准时，这应该指向 github 上标准实现的来源

部署合约后（理想情况下，在同一笔交易中）立即需要通过 `initialize()` 方法初始化合约。其参数为

- 已部署管理员合约的帐户的公钥
- 用于小数位数的 `UInt8`
- 用于确定代币合约是否应以暂停模式启动的 `Bool`。是否应立即启用代币转移。如果设置为 `Bool(true)`，代币合约最初将处于暂停状态，并且需要调用 `resume()` 方法才能铸造或转移代币。如果您有非原子部署（即，如果您没有在与代币合约本身部署和初始化的同一交易中部署管理合约），则这种方法更安全。

此方法初始化合约的状态。最初，流通供应设置为零，因为尚未创建任何代币。

## Methods

`FungibleToken` 面向用户的方法包括

```ts
@method.returns(AccountUpdate) async burn(from: PublicKey, amount: UInt64): Promise<AccountUpdate>

@method async transfer(from: PublicKey, to: PublicKey, amount: UInt64)
@method async approveBase(updates: AccountUpdateForest): Promise<void>
@method.returns(UInt64) async getBalanceOf(address: PublicKey): Promise<UInt64>
@method.returns(UInt64) async getCirculating(): Promise<UInt64>
@method async updateCirculating()
@method.returns(UInt8) async getDecimals(): Promise<UInt8>
```

以下方法调用管理员帐户获取权限，不应由普通用户调用

```ts
@method async setAdmin(admin: PublicKey)
@method.returns(AccountUpdate) async mint(recipient: PublicKey, amount: UInt64): Promise<AccountUpdate>
@method async pause()
@method async resume()
```

### Minting, burning, and keeping track of the circulating supply

为了允许在单个区块中执行多个铸造/销毁交易，我们不会将流通供应量作为合约状态的一部分进行统计。相反，我们使用一个特殊账户，其余额始终与其他账户中的代币总数相对应。此账户的余额在 `mint()` 和 `burn()` 方法中更新。无法从此账户转账。`getCirculating()` 方法报告账户余额。

请注意，如果您想对流通量施加某些限制，则应使用 `requireBetween()` 而不是 `requireEquals()` 来表达您的约束。这可以更有效地防止在同一个区块中铸造或销毁交易使您的先决条件无效。

## Events

在适当的时候，`FungibleToken`会发出以下事件(Events)：

```ts
events = {
  SetAdmin: SetAdminEvent,
  Pause: PauseEvent,
  Mint: MintEvent,
  Burn: BurnEvent,
  BalanceChange: BalanceChangeEvent,
}

export class SetAdminEvent extends Struct({
  adminKey: PublicKey,
}) {}

export class PauseEvent extends Struct({
  isPaused: Bool,
}) {}

class MintEvent extends Struct({
  recipient: PublicKey,
  amount: UInt64,
}) {}

class BurnEvent extends Struct({
  from: PublicKey,
  amount: UInt64,
}) {}

export class BalanceChangeEvent extends Struct({
  address: PublicKey,
  amount: Int64,
}) {}
```

请注意，`MintEvent`、`BurnEvent` 和 `BalanceChangeEvent` 均表示账户余额发生变化。 不同之处在于，`MintEvent` 和 `BurnEvent` 是在代币被铸造/销毁时发出的，而 `BalanceChangeEvent` 是在交易从某些地址获取代币并将其发送到其他地址时发出的。

[!NOTE] 请注意，`MintEvent`、`BurnEvent` 和 `BalanceChangeEvent` 事件可以在 `amount = 0` 时发出。 如果您想跟踪“真正的”铸造/销毁/转移（例如，维护存款人列表），则需要过滤非零值的 `amount`。
