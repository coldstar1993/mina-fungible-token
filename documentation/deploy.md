# Deploy

设置新的可替代代币(Fungible Token)需要三个步骤：部署管理合约、部署代币合约本身以及初始化合约

## Deploying an admin contract

第一步是通过其 `deploy()` 函数部署管理合约。

管理合约(admin contract)处理特权操作（例如铸造）的权限。每当用户尝试执行特权操作时，它都会被代币合约调用。

将这些权限分离到单独的合约中的好处是，它允许更改权限逻辑而无需更改原始代币合约。这很重要，因为想要集成特定代币的第三方将需要该代币的合约代码。如果大多数代币使用标准代币合约，并且只修改管理合约，第三方的集成负担将大大减少。

如果您想更改管理合约，您可以编写一个`extends SmartContract` 和 `implements FungibleTokenAdminBase`的合约。

[!NOTE] 请注意，如果您想使用自定义管理合约，您应该从头开始编写管理合约。从 `FungibleTokenAdmin` 继承并覆盖特定方法可能不起作用。
您可以在 `FungibleToken.test.ts` 中找到自定义管理合约的示例。

`FungibleToken` 的 `initialize()` 方法将管理合约的地址作为一个参数。如果您编写了自己的管理合约，您还需要将 `FungibleToken.AdminContract` 设置为该类。

[!NOTE] 如果您不按原样使用 `FungibleToken` 类，想要集成您的代币的第三方也需要使用您的自定义合约。

[!NOTE] 管理合约的 `deploy()` 函数设置权限，使得管理合约只能在链发生中断更新时升级/替换，并防止更改部署合约的帐户的权限。这样，用户可以相信管理合约的代码不会任意更改。如果您编写了自己的管理合约，请相应地设置权限。

### Admin Contract and Centralization

默认管理合约使用单个密钥对。这并不理想，因为它引入了单点故障。通过使用去中心化治理或多重签名方案可以实现更高级别的安全性，建议这样做。

购买代币的任何用户都应调查代币部署者的密钥管理实践，并像使用任何 o1js 应用程序一样验证代币合约权限。特别是，他们应该检查

- 管理员和代币合约的验证密钥是否符合预期
- 管理员和代币合约都已设置权限，使得验证密钥只能在网络发生重大更新后设置
- 管理员和代币合约都已将权限设置为将权限设置为`impossible`
- 代币合约的部署交易尚未更改为跳过 [Issue 1439](https://github.com/o1-labs/o1js/issues/1439) 中引入的`isNew` 检查。如果恶意部署者跳过此测试，他们可以在部署代币合约之前为自己铸造代币。

## Initializing and deploying the token contract

接下来，需要通过其 `deploy()` 函数部署代币合约(token contract)。

部署后，需要通过调用 `init()` 函数和 `initialize()` 方法来初始化代币合约。这些函数确保合约状态已初始化，在链上创建一个账户，用于跟踪代币的当前流通，在代币合约的账户和跟踪总流通量的账户上设置所有权限。

[!NOTE] 以上所有三个步骤都可以在单个交易中执行，也可以在单独的交易中执行。强烈建议将这三个步骤都放在一个交易中!

[!NOTE] 除非您有非常好的理由，否则请使用一个交易来部署管理员合约、部署代币合约并在代币合约上调用 `initialize()`。

[!NOTE] 这三个步骤中的每一个都需要通过 `AccountUpdate.fundNewAccount` 在链上为新账户提供资金。

[!NOTE] 如果您使用单独的交易来部署管理合约以及部署和初始化代币合约，则应在暂停模式下启动代币合约，并且仅在验证管理合约已成功部署后才调用`resume()`。

请参阅[examples/e2e.eg.ts](https://github.com/MinaFoundation/mina-fungible-token/blob/main/examples/e2e.eg.ts) 查看可执行的端到端示例。

## Upgradeability

代币和管理合约都设置了权限，因此无法升级，除非 Mina 出现不向后兼容的硬分叉（请参阅 [Mina 可升级性文档](https://docs.minaprotocol.com/zkapps/writing-a-zkapp/feature-overview/permissions#example-impossible-to-upgrade)）。
这是为了确保在部署令牌后，令牌周围的规则不会发生变化。
