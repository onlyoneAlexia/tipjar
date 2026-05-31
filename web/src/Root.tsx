import { useEffect, useState } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, lightTheme, darkTheme } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';

import Landing from './Landing.tsx';
import { wagmiConfig } from './wagmi';

const queryClient = new QueryClient();

type Theme = 'light' | 'dark';
function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem('tipjar-theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* localStorage unavailable */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const rkAccent = {
  accentColor: '#B13A2E',
  accentColorForeground: '#FFFFFF',
  borderRadius: 'medium' as const,
  fontStack: 'system' as const,
};

export default function Root() {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('tipjar-theme', theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={theme === 'dark' ? darkTheme(rkAccent) : lightTheme(rkAccent)}>
          <Landing theme={theme} onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
