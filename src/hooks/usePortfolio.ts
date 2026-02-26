import { useState, useEffect, useCallback, useRef } from 'react';
import { coinGeckoAPI } from '@/services/coinGeckoAPI';
import { normalizeHoldings } from '@/utils/portfolioUtils';
import { saveSnapshot, shouldTakeSnapshot } from '@/utils/portfolioSnapshots';
import { handleError } from '@/utils/errorHandling';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface PortfolioHolding {
  id: string;
  coinId: string;
  symbol: string;
  name: string;
  amount: number;
  averageBuyPrice: number;
  currentPrice: number;
  image?: string;
  priceChange24h?: number;
}

interface PortfolioSummary {
  totalValue: number;
  totalInvestment: number;
  totalPnL: number;
  totalPnLPercentage: number;
  dayChange: number;
  dayChangePercentage: number;
}

interface PortfolioState {
  holdings: PortfolioHolding[];
  summary: PortfolioSummary;
  loading: boolean;
  error: string | null;
}

const emptySummary: PortfolioSummary = {
  totalValue: 0,
  totalInvestment: 0,
  totalPnL: 0,
  totalPnLPercentage: 0,
  dayChange: 0,
  dayChangePercentage: 0,
};

export const usePortfolio = () => {
  const { user } = useAuth();
  const [state, setState] = useState<PortfolioState>({
    holdings: [],
    summary: emptySummary,
    loading: true,
    error: null,
  });

  const isInitializedRef = useRef(false);

  // ─── Helpers ──────────────────────────────────────────

  const dispatchUpdate = (holdings: PortfolioHolding[]) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('portfolio:updated', {
          detail: { count: new Set(holdings.map((h) => h.coinId)).size },
        })
      );
    }
  };

  const calculateSummary = useCallback((holdings: PortfolioHolding[]): PortfolioSummary => {
    const agg = holdings.reduce(
      (acc, h) => {
        const val = h.amount * h.currentPrice;
        const inv = h.amount * h.averageBuyPrice;
        const dc = h.amount * (h.currentPrice * (h.priceChange24h || 0) / 100);
        return {
          totalValue: acc.totalValue + val,
          totalInvestment: acc.totalInvestment + inv,
          totalPnL: acc.totalPnL + (val - inv),
          dayChange: acc.dayChange + dc,
        };
      },
      { totalValue: 0, totalInvestment: 0, totalPnL: 0, dayChange: 0 }
    );
    return {
      ...agg,
      totalPnLPercentage: agg.totalInvestment > 0 ? (agg.totalPnL / agg.totalInvestment) * 100 : 0,
      dayChangePercentage: agg.totalValue > 0 ? (agg.dayChange / (agg.totalValue - agg.dayChange)) * 100 : 0,
    };
  }, []);

  const updatePrices = useCallback(async (holdings: PortfolioHolding[]) => {
    if (holdings.length === 0) return holdings;
    try {
      const ids = holdings.map((h) => h.coinId);
      const prices = await coinGeckoAPI.getSimplePrices(ids, ['usd'], true);
      return holdings.map((h) => ({
        ...h,
        currentPrice: prices[h.coinId]?.usd || h.currentPrice,
        priceChange24h: prices[h.coinId]?.usd_24h_change || h.priceChange24h,
      }));
    } catch {
      return holdings;
    }
  }, []);

  // ─── DB helpers ───────────────────────────────────────

  const dbToLocal = (row: any): PortfolioHolding => ({
    id: row.id,
    coinId: row.coin_id,
    symbol: row.symbol,
    name: row.name,
    amount: Number(row.amount),
    averageBuyPrice: Number(row.average_buy_price),
    currentPrice: 0,
    image: row.image,
  });

  const fetchHoldings = useCallback(async (): Promise<PortfolioHolding[]> => {
    if (!user) return [];
    const { data, error } = await supabase
      .from('portfolio_holdings')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) {
      console.error('Failed to fetch holdings:', error);
      return [];
    }
    return (data ?? []).map(dbToLocal);
  }, [user]);

  // ─── CRUD ─────────────────────────────────────────────

  const addHolding = useCallback(
    async (
      coinId: string,
      symbol: string,
      name: string,
      amount: number,
      averageBuyPrice: number,
      image?: string
    ) => {
      if (!user) return;
      setState((prev) => ({ ...prev, loading: true }));

      try {
        // Get current price
        const prices = await coinGeckoAPI.getSimplePrices([coinId], ['usd'], true);
        const currentPrice = prices[coinId]?.usd || averageBuyPrice;
        const priceChange24h = prices[coinId]?.usd_24h_change || 0;

        // Check if holding already exists
        const existing = state.holdings.find((h) => h.coinId === coinId);

        if (existing) {
          const totalAmount = existing.amount + amount;
          const totalInv = existing.amount * existing.averageBuyPrice + amount * averageBuyPrice;
          const newAvg = totalInv / totalAmount;

          await supabase
            .from('portfolio_holdings')
            .update({ amount: totalAmount, average_buy_price: newAvg, image: image || existing.image })
            .eq('id', existing.id);
        } else {
          await supabase.from('portfolio_holdings').insert({
            user_id: user.id,
            coin_id: coinId,
            symbol: symbol.toUpperCase(),
            name,
            amount,
            average_buy_price: averageBuyPrice,
            image,
          });
        }

        // Re-fetch and update prices
        const fresh = await fetchHoldings();
        const withPrices = await updatePrices(fresh);
        const summary = calculateSummary(withPrices);

        if (shouldTakeSnapshot()) saveSnapshot(withPrices);
        dispatchUpdate(withPrices);

        setState({ holdings: withPrices, summary, loading: false, error: null });
      } catch (error) {
        console.error('Failed to add holding:', error);
        setState((prev) => ({ ...prev, loading: false, error: 'Failed to add holding' }));
      }
    },
    [user, state.holdings, fetchHoldings, updatePrices, calculateSummary]
  );

  const removeHolding = useCallback(
    async (holdingId: string) => {
      await supabase.from('portfolio_holdings').delete().eq('id', holdingId);
      const updated = state.holdings.filter((h) => h.id !== holdingId);
      const summary = calculateSummary(updated);
      dispatchUpdate(updated);
      setState((prev) => ({ ...prev, holdings: updated, summary }));
    },
    [state.holdings, calculateSummary]
  );

  const updateHolding = useCallback(
    async (holdingId: string, updates: Partial<PortfolioHolding>) => {
      const dbUpdates: Record<string, any> = {};
      if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
      if (updates.averageBuyPrice !== undefined) dbUpdates.average_buy_price = updates.averageBuyPrice;
      if (updates.image !== undefined) dbUpdates.image = updates.image;

      if (Object.keys(dbUpdates).length > 0) {
        await supabase.from('portfolio_holdings').update(dbUpdates).eq('id', holdingId);
      }

      const updated = state.holdings.map((h) =>
        h.id === holdingId ? { ...h, ...updates } : h
      );
      const summary = calculateSummary(updated);
      dispatchUpdate(updated);
      setState((prev) => ({ ...prev, holdings: updated, summary }));
    },
    [state.holdings, calculateSummary]
  );

  const refreshPrices = useCallback(async () => {
    if (state.holdings.length === 0) return;
    setState((prev) => ({ ...prev, loading: true }));
    try {
      const withPrices = await updatePrices(state.holdings);
      const summary = calculateSummary(withPrices);
      setState({ holdings: withPrices, summary, loading: false, error: null });
    } catch {
      setState((prev) => ({ ...prev, loading: false, error: 'Failed to refresh prices' }));
    }
  }, [state.holdings, updatePrices, calculateSummary]);

  // ─── Init ─────────────────────────────────────────────

  useEffect(() => {
    if (!user) {
      setState({ holdings: [], summary: emptySummary, loading: false, error: null });
      isInitializedRef.current = false;
      return;
    }
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const init = async () => {
      try {
        const holdings = await fetchHoldings();
        if (holdings.length > 0) {
          const withPrices = await updatePrices(holdings);
          const summary = calculateSummary(withPrices);
          if (shouldTakeSnapshot()) saveSnapshot(withPrices);
          setState({ holdings: withPrices, summary, loading: false, error: null });
        } else {
          setState((prev) => ({ ...prev, loading: false }));
        }
      } catch (error) {
        handleError(error, 'Portfolio Initialization');
        setState((prev) => ({ ...prev, loading: false }));
      }
    };
    init();
  }, [user, fetchHoldings, updatePrices, calculateSummary]);

  return { ...state, addHolding, removeHolding, updateHolding, refreshPrices };
};
