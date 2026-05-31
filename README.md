# TipJar

> A minimal on-chain tip jar on **Base Sepolia**. Drop ETH + a short message — sender, amount, message and timestamp are stored on-chain and streamed back live. No backend, no database, no signup.

**Live contract:** [`0x2b7aD12C066181c354a615A3c6ce1edAf4c6Ef33`](https://sepolia.basescan.org/address/0x2b7aD12C066181c354a615A3c6ce1edAf4c6Ef33) · Base Sepolia (chain id 84532)

> ⚠️ **Testnet only.** This uses Base Sepolia ETH which has no monetary value. Get some free from [Alchemy](https://www.alchemy.com/faucets/base-sepolia) or [QuickNode](https://faucet.quicknode.com/base/sepolia) before tipping.

```
tipjar/
├── contracts/   Foundry project — TipJar.sol, 7 tests, deploy script
└── web/         Vite + React + wagmi + RainbowKit frontend
```

## Try it locally in 60 seconds

```bash
cd web
cp .env.example .env       # already points at the live contract
npm install
npm run dev                # → http://localhost:5173
```

Connect MetaMask / Coinbase Wallet / Rabby, switch to Base Sepolia, drop a tip.

## Deploy your own jar

See [`contracts/README.md`](contracts/README.md) for the full Foundry workflow. Quick version:

```bash
cd contracts
cp .env.example .env       # add PRIVATE_KEY with Base Sepolia ETH
source .env
forge test                 # 7 tests, all green
forge script script/Deploy.s.sol:Deploy --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast
```

Copy the printed address into `web/.env` as `VITE_TIPJAR_ADDRESS`.

## Contract surface

| Function | Notes |
|---|---|
| `tip(string message) payable` | Reverts on 0 value. Stores sender, amount, message, timestamp. Emits `NewTip`. |
| `recentTips() view → Tip[]` | Returns up to the 10 newest tips, newest first. |
| `tipCount() view → uint256` | Total tips ever. |
| `tips(uint256) view` | Raw storage access by index (oldest → newest). |
| `owner() view → address` | Set in constructor, immutable. |
| `withdraw()` | Owner only. Sends full balance to owner. Emits `Withdrawn`. |
| `receive() payable` | Plain ETH transfers count as tips with an empty message. |

## Stack

- **Contract** — Solidity 0.8.24, Foundry, 7-test suite (`forge test`)
- **Frontend** — React 19 + Vite, wagmi v3, viem, RainbowKit, @tanstack/react-query
- **Chain** — Base Sepolia (L2 testnet, ~2s blocks)

## License

MIT — see [LICENSE](LICENSE).
