import type { Address } from 'viem';

// Paste the deployed address from `forge script ... --broadcast` here, or set VITE_TIPJAR_ADDRESS in .env.
const envAddr = import.meta.env.VITE_TIPJAR_ADDRESS;
export const TIPJAR_ADDRESS = (typeof envAddr === 'string' && /^0x[a-fA-F0-9]{40}$/.test(envAddr)
  ? envAddr
  : '0x0000000000000000000000000000000000000000') as Address;

export const TIPJAR_ABI = [
  {
    type: 'constructor',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_owner', type: 'address' }],
  },
  {
    type: 'function',
    name: 'owner',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'tipCount',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'tip',
    stateMutability: 'payable',
    inputs: [{ name: 'message', type: 'string' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'recentTips',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        name: 'result',
        type: 'tuple[]',
        components: [
          { name: 'sender', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'message', type: 'string' },
          { name: 'timestamp', type: 'uint256' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'withdraw',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    type: 'event',
    name: 'NewTip',
    inputs: [
      { name: 'sender', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'message', type: 'string', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'Withdrawn',
    inputs: [
      { name: 'owner', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
    anonymous: false,
  },
  { type: 'error', name: 'NotOwner', inputs: [] },
  { type: 'error', name: 'ZeroTip', inputs: [] },
  { type: 'error', name: 'WithdrawFailed', inputs: [] },
] as const;

export type RecentTip = {
  sender: Address;
  amount: bigint;
  message: string;
  timestamp: bigint;
};
