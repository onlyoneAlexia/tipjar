import { useEffect, useMemo, useRef, useState } from 'react';
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
import './Landing.css';

/* ── Inline line icons (Lucide register, ~1.6px stroke) ──────────────────── */
const sx = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const IconSend = () => (<svg viewBox="0 0 24 24" {...sx}><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4Z" /></svg>);
const IconArrowUR = () => (<svg viewBox="0 0 24 24" {...sx}><path d="M7 17 17 7" /><path d="M8 7h9v9" /></svg>);
const IconCopy = () => (<svg viewBox="0 0 24 24" width="14" height="14" {...sx}><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>);
const IconCoins = () => (<svg viewBox="0 0 24 24" {...sx}><circle cx="8" cy="8" r="6" /><path d="M18.09 10.37A6 6 0 1 1 10.34 18" /><path d="M7 6h1v4" /><path d="m16.71 13.88.7.71-2.82 2.82" /></svg>);
const IconWallet = () => (<svg viewBox="0 0 24 24" {...sx}><path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5" /><path d="M16 12h.01" /></svg>);
const IconClock = () => (<svg viewBox="0 0 24 24" {...sx}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>);
const IconShield = () => (<svg viewBox="0 0 24 24" {...sx}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></svg>);
const IconLock = () => (<svg viewBox="0 0 24 24" {...sx}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>);
const IconSun = () => (<svg viewBox="0 0 24 24" {...sx}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>);
const IconMoon = () => (<svg viewBox="0 0 24 24" {...sx}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" /></svg>);

const CONTRACT = TIPJAR_ADDRESS;
const AV_COLORS = ['#b13a2e', '#c99a2e', '#7b7268', '#9a3026', '#1a1a1a'];

function shortenAddr(a: string) { return `${a.slice(0, 6)}…${a.slice(-4)}`; }
function initials(a: string) { return a.slice(2, 4).toUpperCase(); }
function fmtEth(v: bigint | undefined, dp = 4) {
  if (v === undefined) return '—';
  return Number(formatEther(v)).toLocaleString(undefined, { maximumFractionDigits: dp });
}
function formatTime(ts: bigint) {
  const secs = Math.floor(Date.now() / 1000) - Number(ts);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export default function Landing({ theme, onToggleTheme }: { theme: 'light' | 'dark'; onToggleTheme: () => void }) {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState('0.001');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  const configured = TIPJAR_ADDRESS !== '0x0000000000000000000000000000000000000000';

  /* ── Live contract reads (public — no wallet required) ── */
  const { data: tipsData, refetch: refetchTips, isLoading: tipsLoading } = useReadContract({
    address: TIPJAR_ADDRESS, abi: TIPJAR_ABI, functionName: 'recentTips',
    query: { refetchInterval: 15_000, enabled: configured },
  });
  const { data: owner } = useReadContract({
    address: TIPJAR_ADDRESS, abi: TIPJAR_ABI, functionName: 'owner', query: { enabled: configured },
  });
  const { data: tipCount } = useReadContract({
    address: TIPJAR_ADDRESS, abi: TIPJAR_ABI, functionName: 'tipCount',
    query: { enabled: configured, refetchInterval: 15_000 },
  });
  const { data: jarBalance } = useBalance({
    address: configured ? TIPJAR_ADDRESS : undefined, query: { refetchInterval: 15_000, enabled: configured },
  });

  const tips = useMemo(() => (tipsData ?? []) as readonly RecentTip[], [tipsData]);
  const last10 = useMemo(() => tips.reduce((acc, t) => acc + t.amount, 0n), [tips]);
  const isOwner = useMemo(
    () => !!address && !!owner && isAddressEqual(address, owner as `0x${string}`),
    [address, owner],
  );

  /* ── Writes ── */
  const { writeContractAsync, data: txHash, isPending, reset } = useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({ hash: txHash });

  /* eslint-disable react-hooks/set-state-in-effect -- reflecting the async tx receipt into UI state */
  useEffect(() => {
    if (confirmed) {
      setStatus('Tip sent ✓');
      setMessage('');
      void refetchTips();
      const t = setTimeout(() => reset(), 1800);
      return () => clearTimeout(t);
    }
  }, [confirmed, refetchTips, reset]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useWatchContractEvent({
    address: TIPJAR_ADDRESS, abi: TIPJAR_ABI, eventName: 'NewTip', enabled: configured,
    onLogs: () => void refetchTips(),
  });

  useEffect(() => {
    const v = videoRef.current;
    if (v && window.matchMedia('(prefers-reduced-motion: reduce)').matches) v.pause();
  }, []);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    try {
      const value = parseEther(amount || '0');
      if (value === 0n) { setStatus('Enter an amount greater than 0.'); return; }
      await writeContractAsync({ address: TIPJAR_ADDRESS, abi: TIPJAR_ABI, functionName: 'tip', args: [message], value });
      setStatus('Sending… confirm in your wallet');
    } catch (err) {
      setStatus((err instanceof Error ? err.message : 'Failed to send tip').split('\n')[0]);
    }
  }
  async function handleWithdraw() {
    setStatus(null);
    try {
      await writeContractAsync({ address: TIPJAR_ADDRESS, abi: TIPJAR_ABI, functionName: 'withdraw' });
      setStatus('Withdraw submitted…');
    } catch (err) {
      setStatus((err instanceof Error ? err.message : 'Withdraw failed').split('\n')[0]);
    }
  }
  function focusTip() {
    amountRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    amountRef.current?.focus();
  }

  const sending = isPending || confirming;

  return (
    <div className="lp-app">
      {/* ── Nav ── */}
      <nav className="lp-nav" aria-label="Primary">
        <div className="lp-brand-wrap">
          <span className="lp-brand">TipJar</span>
          <span className="lp-brand-sub">on-chain tips</span>
        </div>
        <span className="lp-net"><span className="lp-dot" aria-hidden="true" />Base Sepolia</span>
        <span className="lp-nav-spacer" />
        <button className="lp-theme-toggle" type="button" onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          {theme === 'dark' ? <IconSun /> : <IconMoon />}
        </button>
        <ConnectWallet />
      </nav>

      {/* ── Hero (full-bleed video) ── */}
      <header className="lp-hero">
        <video ref={videoRef} autoPlay muted loop playsInline preload="metadata" poster="/media/hero-poster.jpg" aria-hidden="true">
          <source src="/media/hero.webm" type="video/webm" />
          <source src="/media/hero.mp4" type="video/mp4" />
        </video>
        <div className="scrim" />
        <div className="lp-hero-inner">
          <span className="lp-eyebrow"><span className="diamond" aria-hidden="true" />Base Sepolia network</span>
          <h1 className="lp-h1">Tipping that lives <span className="em">on-chain.</span></h1>
          <p className="lp-sub">Transparent. Permanent. Yours.</p>
          <div className="lp-cta-row">
            <button className="lp-btn lp-btn-primary" type="button" onClick={focusTip}><IconSend />Send a tip</button>
            <a className="lp-btn lp-btn-ghost" href={`https://sepolia.basescan.org/address/${CONTRACT}`} target="_blank" rel="noreferrer">View on Basescan<IconArrowUR /></a>
          </div>
        </div>
      </header>

      {/* ── Stats strip (live) ── */}
      <section className="lp-stats" aria-label="Jar statistics">
        <div className="lp-stat">
          <span className="lp-ic"><IconCoins /></span>
          <div><div className="lp-stat-label">Tips received</div>
            <div className="lp-stat-val">{configured && tipCount !== undefined ? tipCount.toString() : '—'}</div></div>
        </div>
        <div className="lp-stat lp-stat--accent">
          <span className="lp-ic"><IconWallet /></span>
          <div><div className="lp-stat-label">Jar balance</div>
            <div className="lp-stat-val">{jarBalance ? fmtEth(jarBalance.value) : '—'}<span className="u">ETH</span></div></div>
        </div>
        <div className="lp-stat">
          <span className="lp-ic"><IconClock /></span>
          <div><div className="lp-stat-label">Last {tips.length || 10} total</div>
            <div className="lp-stat-val">{fmtEth(last10)}<span className="u">ETH</span></div></div>
        </div>
      </section>

      {/* ── Horizontal dashboard ── */}
      <main className={`lp-dash ${isOwner ? 'cols-3' : 'cols-2'}`}>
        {/* Drop a tip */}
        <form id="tip" className="lp-panel" onSubmit={handleSend}>
          <div className="lp-panel-head">
            <h2 className="lp-card-h">Drop a tip</h2>
            <p className="lp-card-sub">Every tip is recorded on-chain and belongs to the creator.</p>
          </div>
          <div className="lp-panel-body">
            <div className="lp-field">
              <label className="lp-label" htmlFor="amount">Amount</label>
              <div className="lp-input-wrap">
                <input ref={amountRef} id="amount" className="lp-input has-suffix" type="number" min="0" step="0.0001"
                  inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                <span className="lp-suffix">ETH</span>
              </div>
            </div>
            <div className="lp-field">
              <label className="lp-label" htmlFor="message">Message (optional)</label>
              <textarea id="message" className="lp-textarea" maxLength={280}
                placeholder="Say something — it lives on-chain." value={message} onChange={(e) => setMessage(e.target.value)} />
              <span className="lp-counter">{message.length} / 280</span>
            </div>
            <div className="lp-chips">
              <span className="lp-chip"><IconShield />Secure · on-chain</span>
              <span className="lp-chip"><IconLock />Permanent record</span>
            </div>
          </div>
          <div className="lp-panel-foot">
            <button className="lp-btn lp-btn-primary lp-btn-block" type="submit" disabled={!isConnected || sending || !configured}>
              {!isConnected ? 'Connect wallet to tip' : isPending ? 'Confirm in wallet…' : confirming ? 'Mining on Base Sepolia…' : (<><IconSend />Send tip</>)}
            </button>
            {status && <p className="lp-status">{status}</p>}
          </div>
        </form>

        {/* Owner only — rendered only when the connected wallet IS the owner */}
        {isOwner && (
          <aside className="lp-panel" aria-label="Owner controls">
            <div className="lp-panel-head">
              <h2 className="lp-card-h">Owner only</h2>
              <p className="lp-card-sub">Only the jar owner can withdraw.</p>
            </div>
            <div className="lp-panel-body">
              <span className="lp-label">Withdrawable balance</span>
              <div className="lp-owner-bal">{jarBalance ? fmtEth(jarBalance.value) : '—'}<span className="u">ETH</span></div>
              <div className="lp-owner-note"><IconShield />Funds settle to your wallet {address ? `(${shortenAddr(address)})` : ''}</div>
            </div>
            <div className="lp-panel-foot">
              <button className="lp-btn lp-btn-ghost lp-btn-block" type="button" onClick={handleWithdraw}
                disabled={sending || !jarBalance || jarBalance.value === 0n}>
                Withdraw balance<IconArrowUR />
              </button>
            </div>
          </aside>
        )}

        {/* Recent activity (scrolls internally) */}
        <section id="activity" className="lp-panel" aria-label="Recent activity">
          <div className="lp-panel-head">
            <h2 className="lp-card-h">Recent activity</h2>
            <p className="lp-card-sub">Live · last {Math.max(tips.length, 0) || 10} tips</p>
          </div>
          <div className="lp-panel-body lp-feed-body">
            {!configured ? (
              <p className="lp-empty">Contract not configured.</p>
            ) : tipsLoading ? (
              <p className="lp-empty">Loading on-chain activity…</p>
            ) : tips.length === 0 ? (
              <div className="lp-empty-state">
                <span className="lp-empty-ic"><IconCoins /></span>
                <p className="lp-empty-h">No tips yet</p>
                <p className="lp-empty-sub">Be the first to show some love.</p>
              </div>
            ) : (
              <div className="lp-feed">
                {tips.map((t, i) => (
                  <div className="lp-feed-row" key={`${t.timestamp}-${i}`}>
                    <span className="lp-av" style={{ background: AV_COLORS[i % AV_COLORS.length] }} aria-hidden="true">{initials(t.sender)}</span>
                    <div className="lp-feed-main">
                      <div className="lp-feed-who">{shortenAddr(t.sender)}</div>
                      {t.message && <div className="lp-feed-msg">“{t.message}”</div>}
                    </div>
                    <div className="lp-feed-right">
                      <div className="lp-feed-amt">+{fmtEth(t.amount)} ETH</div>
                      <div className="lp-feed-time">{formatTime(t.timestamp)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

/* ── Design-system connect pill via RainbowKit's headless API ────────────── */
function ConnectWallet() {
  const [copied, setCopied] = useState(false);
  const { address } = useAccount();
  // Read the balance ourselves — RainbowKit's account.displayBalance renders
  // "NaN ETH" under this repo's wagmi/RainbowKit peer pinning.
  const { data: bal } = useBalance({ address, query: { enabled: !!address } });
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const ready = mounted;
        const connected = ready && account && chain;
        if (!ready) return <div style={{ width: 150, height: 40 }} aria-hidden="true" />;
        if (!connected) {
          return (
            <button className="lp-btn lp-btn-primary lp-connect" type="button" onClick={openConnectModal}>
              <IconWallet />Connect wallet
            </button>
          );
        }
        if (chain.unsupported) {
          return (
            <button className="lp-btn lp-btn-ghost lp-connect" type="button" onClick={openChainModal}>
              Wrong network
            </button>
          );
        }
        return (
          <div className="lp-wallet">
            <button className="seg lp-wallet-id" type="button" onClick={openAccountModal} aria-label="Account details">
              <span className="lp-dot" aria-hidden="true" />{account.displayName}
            </button>
            <button className="lp-copy" type="button" aria-label="Copy wallet address"
              onClick={async () => { try { await navigator.clipboard.writeText(account.address); setCopied(true); setTimeout(() => setCopied(false), 1400); } catch { /* no-op */ } }}>
              {copied ? <span style={{ fontSize: 12, color: 'var(--terra)' }}>✓</span> : <IconCopy />}
            </button>
            {bal && <span className="lp-bal">{fmtEth(bal.value, 3)} ETH</span>}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
