import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
  useAccount,
  useBalance,
  useReadContract,
  useWaitForTransactionReceipt,
  useWatchContractEvent,
  useWriteContract,
} from 'wagmi';
import { formatEther, isAddressEqual, parseEther } from 'viem';

import { TIPJAR_ABI, TIPJAR_ADDRESS, type RecentTip } from './contract';
import './App.css';

function shortenAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatTime(ts: bigint) {
  const d = new Date(Number(ts) * 1000);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function totalEth(tips: readonly RecentTip[]) {
  const sum = tips.reduce((acc, t) => acc + t.amount, 0n);
  return formatEther(sum);
}

/** Honour the user's OS-level motion preference (subscribes via the platform store, no effect-setState). */
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
function useReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(REDUCED_MOTION_QUERY);
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );
}

/** Counts up to `value` on change with an ease-out curve; jumps instantly when motion is reduced. */
function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const currentRef = useRef(value);

  useEffect(() => {
    if (reduced) {
      currentRef.current = value; // render `value` directly below; nothing to animate
      return;
    }
    const from = currentRef.current;
    const to = value;
    if (Math.abs(from - to) < 1e-9) return;

    let raf = 0;
    const start = performance.now();
    const duration = 700;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const v = from + (to - from) * eased;
      currentRef.current = v;
      setDisplay(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduced]);

  const shown = reduced ? value : display;
  return (
    <>{shown.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</>
  );
}

function Spinner() {
  return (
    <svg className="spinner" width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** A short, celebratory coin shower for the rare moment a tip confirms on-chain. */
function CoinBurst() {
  return (
    <div className="burst" aria-hidden="true">
      {Array.from({ length: 9 }).map((_, i) => (
        <span
          key={i}
          className="coin"
          style={{
            left: `${10 + (i * 80) / 8}%`,
            animationDelay: `${i * 55}ms`,
            ['--s' as string]: `${10 + (i % 3) * 5}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

export default function App() {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState('0.001');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [showBurst, setShowBurst] = useState(false);

  const addressConfigured = TIPJAR_ADDRESS !== '0x0000000000000000000000000000000000000000';

  const {
    data: tipsData,
    refetch: refetchTips,
    isLoading: tipsLoading,
  } = useReadContract({
    address: TIPJAR_ADDRESS,
    abi: TIPJAR_ABI,
    functionName: 'recentTips',
    query: { refetchInterval: 15_000, enabled: addressConfigured },
  });

  const { data: owner } = useReadContract({
    address: TIPJAR_ADDRESS,
    abi: TIPJAR_ABI,
    functionName: 'owner',
    query: { enabled: addressConfigured },
  });

  const { data: tipCount } = useReadContract({
    address: TIPJAR_ADDRESS,
    abi: TIPJAR_ABI,
    functionName: 'tipCount',
    query: { enabled: addressConfigured, refetchInterval: 15_000 },
  });

  const { data: jarBalance } = useBalance({
    address: addressConfigured ? TIPJAR_ADDRESS : undefined,
    query: { refetchInterval: 15_000, enabled: addressConfigured },
  });

  const tips = (tipsData ?? []) as readonly RecentTip[];

  const isOwner = useMemo(
    () => !!address && !!owner && isAddressEqual(address, owner as `0x${string}`),
    [address, owner],
  );

  const { writeContractAsync, data: txHash, isPending, reset } = useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({ hash: txHash });

  /* eslint-disable react-hooks/set-state-in-effect --
     Reflecting an external async result (the on-chain tx receipt from
     useWaitForTransactionReceipt) into UI state: the documented "subscribe to
     an external system" case. One-shot side effects (status, confetti, refetch,
     timers) have no render-time derivation. */
  useEffect(() => {
    if (confirmed) {
      setStatus('Tip sent ✓');
      setMessage('');
      setShowBurst(true);
      void refetchTips();
      const resetTimer = setTimeout(() => reset(), 1500);
      const burstTimer = setTimeout(() => setShowBurst(false), 1300);
      return () => {
        clearTimeout(resetTimer);
        clearTimeout(burstTimer);
      };
    }
  }, [confirmed, refetchTips, reset]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useWatchContractEvent({
    address: TIPJAR_ADDRESS,
    abi: TIPJAR_ABI,
    eventName: 'NewTip',
    enabled: addressConfigured,
    onLogs: () => void refetchTips(),
  });

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    try {
      const value = parseEther(amount || '0');
      if (value === 0n) {
        setStatus('Enter an amount greater than 0.');
        return;
      }
      await writeContractAsync({
        address: TIPJAR_ADDRESS,
        abi: TIPJAR_ABI,
        functionName: 'tip',
        args: [message],
        value,
      });
      setStatus('Sending… confirm in your wallet');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send tip';
      setStatus(msg.split('\n')[0]);
    }
  }

  async function handleWithdraw() {
    setStatus(null);
    try {
      await writeContractAsync({
        address: TIPJAR_ADDRESS,
        abi: TIPJAR_ABI,
        functionName: 'withdraw',
      });
      setStatus('Withdraw submitted…');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Withdraw failed';
      setStatus(msg.split('\n')[0]);
    }
  }

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand-wrap">
          <h1 className="brand">
            TIPJAR<span className="dot">.</span>
          </h1>
          <p className="brand-sub">on-chain tip jar · base sepolia</p>
        </div>
        <ConnectButton chainStatus="icon" showBalance={false} />
      </header>

      {!addressConfigured && (
        <div className="banner banner-warn">
          ⚠ Contract not yet deployed — set <code>VITE_TIPJAR_ADDRESS</code> in <code>web/.env</code>.
        </div>
      )}

      <div className="stats">
        <div className="stat">
          <div className="stat-label">Tips received</div>
          <div className="stat-value">
            {addressConfigured && tipCount !== undefined ? (
              <AnimatedNumber value={Number(tipCount)} />
            ) : (
              '—'
            )}
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Jar balance</div>
          <div className="stat-value">
            {jarBalance ? <AnimatedNumber value={Number(formatEther(jarBalance.value))} decimals={4} /> : '—'}
            <span className="unit">ETH</span>
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Last 10 total</div>
          <div className="stat-value">
            <AnimatedNumber value={Number(totalEth(tips))} decimals={4} />
            <span className="unit">ETH</span>
          </div>
        </div>
      </div>

      <main className="layout">
        <section className="card">
          <h2 className="card-title">◉ Drop a tip</h2>
          <form onSubmit={handleSend} className="form">
            <label className="field">
              <span className="label">Amount (ETH)</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.0001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.001"
                required
              />
            </label>
            <label className="field">
              <span className="label">Message (optional)</span>
              <input
                type="text"
                maxLength={280}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Say something nice…"
              />
            </label>
            <button
              type="submit"
              className="btn btn-primary"
              data-loading={isPending || confirming ? 'true' : undefined}
              disabled={!isConnected || isPending || confirming || !addressConfigured}>
              {(isPending || confirming) && <Spinner />}
              {!isConnected
                ? 'Connect wallet to tip'
                : isPending
                  ? 'Confirm in wallet…'
                  : confirming
                    ? 'Mining on Base Sepolia…'
                    : 'Send tip →'}
            </button>
            {status && (
              <p className={`status${status.startsWith('Tip sent') ? ' status-success' : ''}`}>{status}</p>
            )}
          </form>

          {showBurst && <CoinBurst />}

          {isConnected && isOwner && (
            <div className="owner-panel">
              <span className="owner-tag">★ You are the owner</span>
              <button type="button" onClick={handleWithdraw} className="btn btn-red">
                Withdraw balance
              </button>
            </div>
          )}
        </section>

        <section className="card">
          <h2 className="card-title">⟁ Live feed · last 10</h2>
          {!addressConfigured ? (
            <p className="muted">Deploy the contract to see live tips here.</p>
          ) : tipsLoading ? (
            <p className="muted">Loading…</p>
          ) : tips.length === 0 ? (
            <p className="muted">No tips yet. Be the first.</p>
          ) : (
            <ul className="feed">
              {tips.map((t, i) => (
                <li
                  key={`${t.timestamp}-${i}`}
                  className="tip-row"
                  style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}>
                  <div className="tip-head">
                    <span className="tip-amount">{formatEther(t.amount)} ETH</span>
                    <span className="tip-time">{formatTime(t.timestamp)}</span>
                  </div>
                  <div className="tip-sender">{shortenAddr(t.sender)}</div>
                  {t.message && <div className="tip-message">"{t.message}"</div>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <footer className="footer">
        <span>Base Sepolia · chain id 84532</span>
        {addressConfigured && (
          <a
            className="footer-link"
            href={`https://sepolia.basescan.org/address/${TIPJAR_ADDRESS}`}
            target="_blank"
            rel="noreferrer">
            View contract on Basescan ↗
          </a>
        )}
      </footer>
    </div>
  );
}
