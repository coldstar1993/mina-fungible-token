# Limitations of the Current Design

这个'代币合约的标准实现和自定义管理合约'的设计考虑到了一定的灵活性，但仍存在一些限制。

1. 由于代币转移不应依赖于自定义代码，因此 `transfer()` 和 `approveBase()`方法不会调用管理合约。因此，不支持自定义转移逻辑。

    因此，代币实现将难以实现以下功能：

    1. 转移费用。有关示例，请参阅 [此处](https://github.com/d-xo/weird-erc20?tab=readme-ov-file#fee-on-transfer)。
    2. 代币黑名单或白名单。有关示例，请参阅 [此处](https://github.com/d-xo/weird-erc20?tab=readme-ov-file#tokens-with-blocklists)。
    3. 熔断或转移金额限制。有关示例，请参阅 [此处](https://github.com/d-xo/weird-erc20?tab=readme-ov-file#revert-on-large-approvals--transfers)。

2. 不支持自定义销毁逻辑。

许多应用程序可能希望维护与总供应量相关的一些不变量。 例如，`wMina` 代币合约的管理员将拥有一种机制来锁定或释放 `Mina`，以换取铸造或销毁 `wMina`。 目前，这将由 `wMina` 管理合约实现具有代表用户调用销毁的方法。 但是，这只会保持不变的 `wMina 供应量 >= 锁定的 Mina`，而不是严格相等。

这种类型的不变量通常对代表某些包装资产份额的任何代币都有意义。

3. 不支持自定义 `balanceOf()` 逻辑：

    1. 可重写的（如 [stEth](https://github.com/lidofinance/lido-dao/blob/5fcedc6e9a9f3ec154e69cff47c2b9e25503a78a/contracts/0.4.24/StETH.sol#L166-L168)) 代币可能难以实现。有关更多示例，请参阅 [此处](https://github.com/d-xo/weird-erc20?tab=readme-ov-file#balance-modifications-outside-of-transfers-rebasingairdrops)。

未来，Mina 基金会和社区可能会开发更灵活的代币实现版本，以绕过部分或全部限制。这可能涉及额外的钩子，可能在主代币合约状态中使用标志来确定是否应调用自定义合约。但目前，这些限制仍然存在，代币开发者应该意识到它们。
