# TipJar — contracts

Foundry project for `TipJar.sol`: a single-file ETH tip jar with on-chain messages and owner-only withdraw.

## Deployed

| Network | Address |
|---|---|
| Base Sepolia (84532) | [`0x2b7aD12C066181c354a615A3c6ce1edAf4c6Ef33`](https://sepolia.basescan.org/address/0x2b7aD12C066181c354a615A3c6ce1edAf4c6Ef33) |

## Build & test

```bash
forge build
forge test -vv     # 7 tests, all should pass
```

## Deploy

```bash
cp .env.example .env       # fill in PRIVATE_KEY and BASE_SEPOLIA_RPC_URL
source .env

forge script script/Deploy.s.sol:Deploy \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast
```

`Deploy.s.sol` reads `PRIVATE_KEY` from env and uses the deployer as the jar owner unless `TIPJAR_OWNER` is set.

Faucets: <https://www.alchemy.com/faucets/base-sepolia> · <https://faucet.quicknode.com/base/sepolia>.

## Verify on Basescan

```bash
forge verify-contract <ADDRESS> src/TipJar.sol:TipJar \
  --chain base-sepolia \
  --constructor-args $(cast abi-encode "constructor(address)" <OWNER_ADDRESS>)
```

## Contract surface

| Function | Notes |
|---|---|
| `tip(string message) payable` | Reverts on 0 value. Stores sender, amount, message, timestamp. Emits `NewTip`. |
| `recentTips() view → Tip[]` | Up to the 10 newest tips, newest first. |
| `tipCount() view → uint256` | Total tips ever. |
| `tips(uint256) view` | Raw storage access by index (oldest → newest). |
| `owner() view → address` | Set in constructor, immutable. |
| `withdraw()` | Owner only. Sends full balance to owner. |
| `receive() payable` | Plain ETH transfers count as tips with empty message. |
