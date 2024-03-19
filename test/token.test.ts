import {
  AccountUpdate,
  Mina,
  PrivateKey,
  type PublicKey,
  UInt64,
  Provable,
  Int64,
  AccountUpdateForest,
} from 'o1js';

import ThirdParty from '../test/ThirdParty';

import Token from '../src/token';
import TokenAccount from '../src/TokenAccount';
import Hooks from '../src/Hooks';

const proofsEnabled = false;
const enforceTransactionLimits = false;

interface Context {

  deployerKey: PrivateKey;
  deployerAccount: PublicKey;

  senderKey: PrivateKey;
  senderAccount: PublicKey;

  hooksKey: PrivateKey;
  hooksAccount: PublicKey;
  hooks: Hooks;

  directAdminKey: PrivateKey;
  directAdminAccount: PublicKey;

  tokenAKey: PrivateKey;
  tokenAAccount: PublicKey;
  tokenA: Token;

  tokenBKey: PrivateKey;
  tokenBAccount: PublicKey;
  tokenB: Token;

  thirdPartyKey: PrivateKey;
  thirdPartyAccount: PublicKey;
  thirdParty: ThirdParty;

  thirdParty2Key: PrivateKey;
  thirdParty2Account: PublicKey;
  thirdParty2: ThirdParty;

  tokenAccountA: TokenAccount;
  tokenAccountB: TokenAccount;

}

describe('token integration', () => {
  let context: Context;

  beforeAll(async () => {
    const Local = Mina.LocalBlockchain({ proofsEnabled, enforceTransactionLimits });
    Mina.setActiveInstance(Local);

    // We need Mina accounts, for paying fees. 
    // We use the predefined test accounts for those
    let [
      { publicKey: deployerAccount, privateKey: deployerKey },
      { publicKey: senderAccount, privateKey: senderKey }
    ] = Local.testAccounts;

    // Key pairs for non-Mina accounts
    const {privateKey: hooksKey, publicKey: hooksAccount} =
      PrivateKey.randomKeypair();
    const hooks = new Hooks(hooksAccount);

    const {privateKey: directAdminKey, publicKey: directAdminAccount} =
      PrivateKey.randomKeypair();

    const {privateKey: tokenAKey, publicKey: tokenAAccount} =
      PrivateKey.randomKeypair();
    const tokenA = new Token(tokenAAccount);

    const {privateKey: tokenBKey, publicKey: tokenBAccount} =
      PrivateKey.randomKeypair();
    const tokenB = new Token(tokenBAccount);

    const {privateKey: thirdPartyKey, publicKey: thirdPartyAccount} =
      PrivateKey.randomKeypair();
    const thirdParty = new ThirdParty(thirdPartyAccount);

    const {privateKey: thirdParty2Key, publicKey: thirdParty2Account} =
      PrivateKey.randomKeypair();
    const thirdParty2 = new ThirdParty(thirdParty2Account);

    const tokenAccountA = new TokenAccount(thirdPartyAccount, tokenA.deriveTokenId());
    const tokenAccountB = new TokenAccount(thirdPartyAccount, tokenB.deriveTokenId());

    await Hooks.compile();
    await Token.compile();

    context = {
      deployerKey,
      deployerAccount,

      senderKey,
      senderAccount,

      hooksKey,
      hooksAccount,
      hooks,

      directAdminKey,
      directAdminAccount,

      tokenAKey,
      tokenAAccount,
      tokenA,

      tokenBKey,
      tokenBAccount,
      tokenB,

      thirdPartyKey,
      thirdPartyAccount,
      thirdParty,

      thirdParty2Key,
      thirdParty2Account,
      thirdParty2,

      tokenAccountA,
      tokenAccountB,

    };
  });

  const totalSupply = UInt64.from(10_000_000_000_000);

  describe('deploy', () => {
    it('should deploy token hooks', async () => {
      const tx = await Mina.transaction(context.deployerAccount, () => {
        AccountUpdate.fundNewAccount(context.deployerAccount, 1);
        context.hooks.deploy();
      });
      tx.sign([context.deployerKey, context.hooksKey]);
      await tx.prove();
      await tx.send();

      const tx2 = await Mina.transaction(context.deployerAccount, () => {
        context.hooks.initialize(context.directAdminAccount);
      });
      tx2.sign([context.deployerKey, context.directAdminKey]);
      await tx2.prove();
      await tx2.send();

    });
 
    it('should deploy token contract A', async () => {

      const tx = await Mina.transaction(context.deployerAccount, () => {
        AccountUpdate.fundNewAccount(context.deployerAccount, 1);
        context.tokenA.deploy();
        context.tokenA.initialize(context.hooksAccount, totalSupply);
      });

      tx.sign([context.deployerKey, context.tokenAKey]);

      await tx.prove();
      await tx.send();

      expect(context.tokenA.hooks.get().toBase58()).toBe(
        context.hooksAccount.toBase58()
      );
    });

    it('should deploy token contract B', async () => {

      const tx = await Mina.transaction(context.deployerAccount, () => {
        AccountUpdate.fundNewAccount(context.deployerAccount, 1);
        context.tokenB.deploy();
        context.tokenB.initialize(context.hooksAccount, totalSupply);
      });

      tx.sign([context.deployerKey, context.tokenBKey]);

      await tx.prove();
      await tx.send();

      expect(context.tokenB.hooks.get().toBase58()).toBe(
        context.hooksAccount.toBase58()
      );
    });

    it('should deploy a third party contract', async () => {

      const tx = await Mina.transaction(context.deployerAccount, () => {
        AccountUpdate.fundNewAccount(context.deployerAccount, 2);
        context.thirdParty.deploy({ ownerAddress: context.tokenAAccount });
        context.thirdParty2.deploy({ ownerAddress: context.tokenAAccount });
      });

      tx.sign([context.deployerKey, context.thirdPartyKey, context.thirdParty2Key]);

      await tx.prove();
      await tx.send();
    });

    it('should deploy a third party token account for token A', async () => {

      const tx = await Mina.transaction(context.deployerAccount, () => {
        context.tokenAccountA.deploy({ ownerAddress: context.tokenAAccount });
        context.tokenA.approve(context.tokenAccountA.self);
      });

      tx.sign([context.deployerKey, context.thirdPartyKey]);

      await tx.prove();
      await tx.send();
    });

    it('should deploy a third party token account for token B', async () => {

      const tx = await Mina.transaction(context.deployerAccount, () => {
        context.tokenAccountB.deploy({ ownerAddress: context.tokenAAccount });
        context.tokenB.approve(context.tokenAccountB.self);
      });

      tx.sign([context.deployerKey, context.thirdPartyKey]);

      await tx.prove();
      await tx.send();
    });
  });

  const mintAmount = UInt64.from(1000);

  describe('mint', () => {
    it('should mint for the sender account', async () => {

      const tx = await Mina.transaction(context.senderAccount, () => {
        // eslint-disable-next-line no-warning-comments
        // TODO: it looks like the 'directAdmin' account
        // is also created and needs to be paid for
        AccountUpdate.fundNewAccount(context.senderAccount, 2);
        context.tokenA.mint(context.senderAccount, mintAmount);
      });
  
      tx.sign([context.senderKey, context.directAdminKey]);

      await tx.prove();
      await tx.send();

      expect(
        context.tokenA.getBalanceOf(context.senderAccount).toBigInt()
      ).toBe(mintAmount.toBigInt());
    });
  });

  describe('third party', () => {
    const depositAmount = UInt64.from(1);

    it('should deposit from the user to the token account of the third party', async () => {

      const tokenId = context.tokenA.deriveTokenId();

      const updateWithdraw = AccountUpdate.createSigned(context.senderAccount, tokenId)
      updateWithdraw.balanceChange = Int64.fromUnsigned(depositAmount).neg();

      const updateDeposit = context.thirdParty.deposit(depositAmount);
      updateDeposit.body.mayUseToken = AccountUpdate.MayUseToken.InheritFromParent;

      const tx = await Mina.transaction(context.senderAccount, () => {
        AccountUpdate.fundNewAccount(context.senderAccount, 1)
        context.tokenA.approveBase(AccountUpdateForest.fromFlatArray([
          updateWithdraw,
          updateDeposit
        ]));
      });

      tx.sign([context.senderKey]);

      await tx.prove();
      await tx.send();

      expect(
        context.tokenA.getBalanceOf(context.thirdPartyAccount).toBigInt()
      ).toBe(depositAmount.toBigInt());

      expect(
        context.tokenA.getBalanceOf(context.senderAccount).toBigInt()
      ).toBe(mintAmount.toBigInt() - depositAmount.toBigInt());
    });

    it('should send tokens from one contract to another', async () => {
      const transferAmount = UInt64.from(0);
      const updateWithdraw = context.thirdParty.withdraw(transferAmount);
      const updateDeposit = context.thirdParty2.deposit(transferAmount);
      updateDeposit.body.mayUseToken = AccountUpdate.MayUseToken.InheritFromParent;
      const tx = await Mina.transaction(context.senderAccount, () => {
        AccountUpdate.fundNewAccount(context.senderAccount, 1);
        context.tokenA.approveBase(AccountUpdateForest.fromFlatArray([
          updateWithdraw, updateDeposit
        ]))});
      Provable.log(tx);
      await tx.sign([context.senderKey, context.thirdPartyKey]).prove()
      await tx.send();

      expect(
        context.tokenA.getBalanceOf(context.thirdPartyAccount).toBigInt()
      ).toBe(depositAmount.toBigInt() - transferAmount.toBigInt());
      expect(
        context.tokenA.getBalanceOf(context.thirdParty2Account).toBigInt()
      ).toBe(transferAmount.toBigInt());
    })
/*
      it('should reject an unbalanced transaction', async () => {
        const insufficientDeposit = UInt64.from(0);
        expect(async () => (await Mina.transaction(context.senderAccount, () => {
          const [fromAccountUpdate] = context.tokenA.transferFrom(
            context.senderAccount,
            insufficientDeposit,
            AccountUpdate.MayUseToken.ParentsOwnToken
          );
          fromAccountUpdate.requireSignature();
          context.thirdParty.deposit(fromAccountUpdate, depositAmount)
        }))).toThrow(errors.nonZeroBalanceChange);
      });
*/
  });

  describe('paused', () => {

    const sendAmount = UInt64.from(10);

    it('should be paused by the admin', async () => {
      const tx = await Mina.transaction(context.senderAccount, () => {
        context.tokenA.setPaused(Bool(true));
      });
      tx.sign([context.senderKey, context.directAdminKey]);
      await tx.prove();
      await tx.send();
    });

    it('should block minting and burning while paused', async () => {
      expect( async () => await Mina.transaction(context.senderAccount, () => {
        context.tokenA.mint(context.thirdPartyAccount, sendAmount)
      })).toThrow(errors.tokenPaused);

      expect( async () => await Mina.transaction(context.senderAccount, () => {
        context.tokenA.burn(context.thirdPartyAccount, sendAmount)
      })).toThrow(errors.tokenPaused);
    })

    it('should block token transfers while paused', async () => {
      expect(async () => await Mina.transaction(context.senderAccount, () => {
        context.tokenA.transferFromTo({
          from: context.thirdPartyAccount,
          to: context.thirdPartyAccount,
          amount: sendAmount})
      })).toThrow(errors.tokenPaused);
      expect(async () => await Mina.transaction(context.senderAccount, () => {
        context.tokenA.transferFrom(
          context.thirdPartyAccount,
          sendAmount,
          AccountUpdate.MayUseToken.ParentsOwnToken) }
      )).toThrow(errors.tokenPaused);
      expect(async () => await Mina.transaction(context.senderAccount, () => {
        context.tokenA.transferTo(
          context.thirdPartyAccount,
          sendAmount,
          AccountUpdate.MayUseToken.ParentsOwnToken) }
      )).toThrow(errors.tokenPaused);
    })

    it('should be unpaused by the admin', async () => {
      const tx = await Mina.transaction(context.senderAccount, () => {
        context.tokenA.setPaused(Bool(false));
      });
      tx.sign([context.senderKey, context.directAdminKey]);
      await tx.prove();
      await tx.send();
    });

  });
});
