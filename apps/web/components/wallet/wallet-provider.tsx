"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { MarketView, Session } from "@/lib/chain-core";
import { fetchBalances, fetchMarkets } from "@/lib/chain";
import { loadPrices, loadStocks, STOCK_ORDER } from "@/lib/stocks";
import { symbolOf, tokenSymbol } from "@/lib/stocks";
import { bindIfPending } from "@/lib/referral";
import { connectWallet, devWallet, listWallets, type WalletChoice } from "@/lib/wallet";

const TEST_WALLET = "Test wallet (browser)";

export type TrackedToken = { symbol: string; token: string; mint: string; view: MarketView };

type BalanceState = { native: number; loaded: boolean; raw: Record<string, number> };

type WalletContextValue = {
  session: Session | null;
  balances: BalanceState;
  choices: WalletChoice[];
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  tracked: TrackedToken[];
  connectChoice: (choice: WalletChoice) => Promise<void>;
  connectTest: () => void;
  disconnect: () => Promise<void>;
  refreshBalances: () => Promise<void>;
  shareBalance: (market: MarketView) => number;
  balanceReady: () => boolean;
  trackStocks: (markets: MarketView[], all?: boolean) => void;
};

const WalletContext = createContext<WalletContextValue | null>(null);

const emptyBalances = (): BalanceState => ({ native: 0, loaded: false, raw: {} });

export function WalletProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<Session | null>(null);
  const [balances, setBalances] = useState<BalanceState>(emptyBalances);
  const [choices, setChoices] = useState<WalletChoice[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tracked, setTracked] = useState<TrackedToken[]>([]);
  const sessionRef = useRef<Session | null>(null);
  const balancesRef = useRef<BalanceState>(emptyBalances());
  const trackedRef = useRef<TrackedToken[]>([]);
  const trackedAll = useRef(false);
  const selfTracking = useRef(false);
  const refreshing = useRef<Promise<void> | null>(null);
  const again = useRef(false);
  const listeners = useRef<Set<() => void>>(new Set());

  const applySession = useCallback((next: Session | null) => {
    sessionRef.current = next;
    setSessionState(next);
    setMenuOpen(false);
    try {
      if (next) localStorage.setItem("bellpot.wallet", next.label);
      else localStorage.removeItem("bellpot.wallet");
    } catch {}
    const cleared = emptyBalances();
    balancesRef.current = cleared;
    setBalances(cleared);
  }, []);

  const refreshBalances = useCallback((): Promise<void> => {
    const current = sessionRef.current;
    if (!current) {
      setBalances(emptyBalances());
      return Promise.resolve();
    }
    if (refreshing.current) {
      again.current = true;
      return refreshing.current;
    }
    refreshing.current = (async () => {
      do {
        try {
          again.current = false;
          const owner = sessionRef.current?.address;
          if (!owner) {
            const cleared = emptyBalances();
            balancesRef.current = cleared;
            setBalances(cleared);
            break;
          }
          const read = await fetchBalances(owner, trackedRef.current.map((token) => token.view));
          const next = {
            native: read.native,
            loaded: true,
            raw: Object.fromEntries(trackedRef.current.map((token) => [token.mint, read.raw[token.mint] ?? 0])),
          };
          balancesRef.current = next;
          setBalances(next);
        } catch {
          const next = { ...balancesRef.current, loaded: false };
          balancesRef.current = next;
          setBalances(next);
        }
      } while (again.current);
      listeners.current.forEach((fn) => {
        try { fn(); } catch (error) { console.error(error); }
      });
    })().finally(() => {
      refreshing.current = null;
    });
    return refreshing.current;
  }, []);

  const trackStocks = useCallback((markets: MarketView[], all = true) => {
    if (all) trackedAll.current = true;
    const seen = new Map<string, TrackedToken>(trackedRef.current.map((token) => [token.mint, token]));
    for (const market of markets) {
      if (!seen.has(market.mint)) {
        seen.set(market.mint, { symbol: symbolOf(market), token: tokenSymbol(market), mint: market.mint, view: market });
      }
    }
    const next = [...seen.values()].sort(
      (a, b) => STOCK_ORDER.indexOf(a.symbol) - STOCK_ORDER.indexOf(b.symbol) || a.token.localeCompare(b.token),
    );
    trackedRef.current = next;
    setTracked(next);
    void refreshBalances();
  }, [refreshBalances]);

  const connectChoice = useCallback(async (choice: WalletChoice) => {
    const next = await connectWallet(choice);
    applySession(next);
    void refreshBalances();
    void bindIfPending(next);
  }, [applySession, refreshBalances]);

  const connectTest = useCallback(() => {
    const next = devWallet();
    applySession(next);
    if (next) {
      void refreshBalances();
      void bindIfPending(next);
    }
  }, [applySession, refreshBalances]);

  const disconnect = useCallback(async () => {
    await sessionRef.current?.disconnect();
    applySession(null);
  }, [applySession]);

  useEffect(() => {
    let cancelled = false;
    let offRegister = () => {};
    let offUnregister = () => {};
    (async () => {
      const { getWallets } = await import("@wallet-standard/app");
      const api = getWallets();
      const sync = () => { if (!cancelled) setChoices(listWallets()); };
      sync();
      offRegister = api.on("register", sync);
      offUnregister = api.on("unregister", sync);
      let last: string | null = null;
      try { last = localStorage.getItem("bellpot.wallet"); } catch {}
      if (!last || cancelled) return;
      if (last === TEST_WALLET) {
        const next = devWallet();
        if (!next || cancelled) return;
        applySession(next);
        void refreshBalances();
        void bindIfPending(next);
        return;
      }
      const attempt = async () => {
        const match = listWallets().find((choice) => choice.name === last);
        if (!match) return false;
        try {
          const next = await connectWallet(match);
          if (cancelled) return true;
          applySession(next);
          void refreshBalances();
          void bindIfPending(next);
        } catch {}
        return true;
      };
      if (!(await attempt())) {
        const off = api.on("register", () => { void attempt().then((done) => { if (done) off(); }); });
        const previous = offRegister;
        offRegister = () => { previous(); off(); };
      }
    })();
    return () => {
      cancelled = true;
      offRegister();
      offUnregister();
    };
  }, [applySession, refreshBalances]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (trackedAll.current || selfTracking.current || !sessionRef.current) return;
      selfTracking.current = true;
      try {
        const [markets] = await Promise.all([fetchMarkets(), loadPrices(), loadStocks()]);
        trackStocks(markets);
      } catch {} finally {
        selfTracking.current = false;
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [session, trackStocks]);

  const shareBalance = useCallback((market: MarketView) => balancesRef.current.raw[market.mint] ?? 0, []);
  const balanceReady = useCallback(() => balancesRef.current.loaded, []);

  const value = useMemo<WalletContextValue>(() => ({
    session, balances, choices, menuOpen, setMenuOpen, tracked,
    connectChoice, connectTest, disconnect, refreshBalances, shareBalance, balanceReady, trackStocks,
  }), [session, balances, choices, menuOpen, tracked, connectChoice, connectTest, disconnect, refreshBalances, shareBalance, balanceReady, trackStocks]);

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const value = useContext(WalletContext);
  if (!value) throw new Error("useWallet must be used inside WalletProvider");
  return value;
}
