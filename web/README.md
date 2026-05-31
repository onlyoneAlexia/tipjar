# TipJar — web

React + Vite frontend for the [TipJar](../) on-chain tip jar on Base Sepolia.

Built with **wagmi v3 + RainbowKit + viem**. Streams new tips live via `useWatchContractEvent`, polls the jar balance, and exposes an owner-only withdraw panel.

## Run locally

```bash
cp .env.example .env        # the live Base Sepolia contract is the default
npm install
npm run dev
```

Opens at <http://localhost:5173>. Injected wallets (MetaMask, Coinbase Wallet, Rabby) work out of the box; for WalletConnect QR pairing set `VITE_WC_PROJECT_ID` from [cloud.reown.com](https://cloud.reown.com).

## Build for production

```bash
npm run build        # → dist/
npm run preview      # serve dist/ on :4173
```

The build is fully static. Drop `dist/` on any host (Vercel, Netlify, Cloudflare Pages, IPFS, S3+CloudFront). A `vercel.json` is included so deploying with the repo root as the project root works without extra config.

## Environment

| Var | Required | Default | Notes |
|---|---|---|---|
| `VITE_TIPJAR_ADDRESS` | yes | live Base Sepolia deployment | 20-byte address of a deployed `TipJar.sol` |
| `VITE_BASE_SEPOLIA_RPC_URL` | no | `https://sepolia.base.org` | Override with an Alchemy/QuickNode endpoint if you expect traffic |
| `VITE_WC_PROJECT_ID` | no | empty (injected-wallet only) | Required for WalletConnect QR pairing on mobile |

## Project layout

```
src/
├── App.tsx        UI: stats row, tip form, live feed, owner panel
├── App.css        Visual system (red/olive glass aesthetic)
├── contract.ts    TIPJAR_ADDRESS + ABI
├── wagmi.ts       RainbowKit config (Base Sepolia only)
└── main.tsx       Providers (wagmi, react-query, RainbowKit)
```
