# Token Operations

在本节中，我们将探讨该标准所代表的各种代币操作，其中包括：

- Minting 铸造
- Burning 销毁
- Transferring between users 在用户之间转移

## Mint tokens

将代币铸造到某个地址：

```ts
// paste the address where you want to mint tokens to
const mintTo = PublicKey.fromBase58("...")
const mintAmount = UInt64.from(1000)

const mintTx = await Mina.transaction({
  sender: owner,
  fee,
}, async () => {
  // remove this line if a receiver already has token account
  AccountUpdate.fundNewAccount(owner, 1)
  await token.mint(mintTo, new UInt64(2e9))
})
mintTx.sign([owner.privateKey, admin.privateKey])
await mintTx.prove()
await mintTx.send()
```

> [!IMPORTANT] 首次创建代币账户时，必须支付与创建新标准账户相同的账户创建费。

## Burn tokens

销毁某个地址拥有的代币：

```ts
// paste the address where you want to burn tokens from
const burnFrom = PublicKey.fromBase58("...")
const burnAmount = UInt64.from(1000)

const tx = await Mina.transaction({ sender: burnFrom, fee }, () => {
  token.burn(burnFrom, burnAmount)
})

tx.sign([burnFromKey])
await tx.prove()
await tx.send()
```

## Transfer tokens between user accounts

在两个用户帐户之间转移代币：

```ts
// paste the private key of the sender and the address of the receiver
const sendFrom = PublicKey.fromBase58("...")
const sendFromKey = Private.fromPublicKey(sendFrom)
const sendTo = PublicKey.fromBase58("...")

const sendAmount = UInt64.from(1)

const tx = await Mina.transaction({ sender: sendFrom, fee }, () => {
  token.transfer(sendFrom, sendTo, sendAmount)
})
tx.sign([sendFromKey])
await tx.prove()
await tx.send()
```

## Fetch token balance of the account

获取某个账户的代币余额：

```ts
// paste the address of the account you want to read balance of
const anyAccount = PublicKey.fromBase58("...")
const balance = token.getBalanceOf(anyAccount)
```

请参阅 [examples/e2e.eg.ts](https://github.com/MinaFoundation/mina-fungible-token/blob/main/examples/e2e.eg.ts)查看可执行的端到端示例。
