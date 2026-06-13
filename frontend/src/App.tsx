import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { wagmiConfig } from "./wagmi";
import { TipForm, TipList, StatsBar, type Tip } from "./components";
import { useCallback, useState } from "react";

const queryClient = new QueryClient();

const rainbowTheme = darkTheme({
  accentColor: "#f5a623",
  accentColorForeground: "#1a1000",
  borderRadius: "medium",
  fontStack: "system",
});

function TipJarApp() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [tips, setTips] = useState<Tip[]>([]);

  const handleTipConfirmed = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleStatsChange = useCallback((newTips: Tip[]) => {
    setTips(newTips);
  }, []);

  return (
    <>
      <div className="bg-orb bg-orb-1" aria-hidden="true" />
      <div className="bg-orb bg-orb-2" aria-hidden="true" />
      <div className="bg-orb bg-orb-3" aria-hidden="true" />

      <header className="app-header">
        <div className="brand">
          <div className="brand-icon">🫙</div>
          <div className="brand-text">
            <h1>Tip Jar</h1>
            <p>On-chain gratitude</p>
          </div>
        </div>
        <ConnectButton showBalance={false} chainStatus="icon" />
      </header>

      <section className="hero">
        <div className="hero-badge">
          <span className="live-dot" />
          Decentralized tipping
        </div>
        <h2>
          Show appreciation, <em>on-chain</em>
        </h2>
        <p>
          Send ETH with a personal message. Every tip is recorded permanently on the blockchain
          and indexed in real time.
        </p>
      </section>

      <StatsBar tips={tips} />

      <div className="main-grid">
        <TipForm onTipConfirmed={handleTipConfirmed} />
        <TipList key={refreshKey} onStatsChange={handleStatsChange} />
      </div>

      <footer className="app-footer">
        <div className="footer-tech">
          Built with{" "}
          <span className="tech-pill">Solidity</span>
          <span className="tech-pill">wagmi</span>
          <span className="tech-pill">viem</span>
        </div>
        <div className="footer-brand">
          <span>Tip Jar dApp</span>
        </div>
      </footer>
    </>
  );
}

export function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={rainbowTheme}>
          <TipJarApp />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
