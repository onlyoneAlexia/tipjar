import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { baseSepolia } from 'wagmi/chains';
import { http } from 'wagmi';

// Get one for free at https://cloud.reown.com (formerly WalletConnect Cloud).
// Falls back to a placeholder so the app boots without one; WalletConnect QR pairing won't work,
// but injected wallets (MetaMask, Coinbase Wallet extension, Rabby) work fine.
const envProjectId = import.meta.env.VITE_WC_PROJECT_ID;
const projectId =
  typeof envProjectId === 'string' && envProjectId.length > 0
    ? envProjectId
    : 'tipjar_demo_placeholder_projectid';

const envRpc = import.meta.env.VITE_BASE_SEPOLIA_RPC_URL;
const rpcUrl = typeof envRpc === 'string' && envRpc.length > 0 ? envRpc : 'https://sepolia.base.org';

export const wagmiConfig = getDefaultConfig({
  appName: 'TipJar',
  projectId,
  chains: [baseSepolia],
  transports: { [baseSepolia.id]: http(rpcUrl) },
  ssr: false,
});
