# Use in a ZkApp

使用 zkApps，您还可以构建与代币交互的智能合约。例如，一个简单的托管合约，可以在其中存入和提取代币。

## Escrow contract code

与 zkApp 中的代币交互就像编写链下代码一样简单（与上一章中的代码相同，在 zkApp 方法中执行）：

```ts
export class TokenEscrow extends SmartContract {
  @state(PublicKey)
  tokenAddress = State<PublicKey>()
  @state(UInt64)
  total = State<UInt64>()

  deploy(args: DeployArgs & { tokenAddress: PublicKey }) {
    super.deploy(args)
    this.tokenAddress.set(args.tokenAddress)
    this.total.set(UInt64.zero)
  }

  @method
  deposit(from: PublicKey, amount: UInt64) {
    const token = new FungibleToken(this.tokenAddress.getAndRequireEquals())
    token.transfer(from, this.address, amount)
    const total = this.total.getAndRequireEquals()
    this.total.set(total.add(amount))
  }

  @method
  withdraw(to: PublicKey, amount: UInt64) {
    const token = new FungibleToken(this.tokenAddress.getAndRequireEquals())
    const total = this.total.getAndRequireEquals()
    total.greaterThanOrEqual(amount)
    this.total.set(total.sub(amount))
    token.transfer(this.address, to, amount)
  }
}
```

## Interacting with token escrow

请参阅 [examples/escrow.eg.ts](../examples/escrow.eg.ts) 并查看可执行的 `TokenEscrow` 示例。
