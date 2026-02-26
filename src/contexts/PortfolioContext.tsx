import { createContext, useContext, type ReactNode } from 'react';
import { usePortfolio as usePortfolioHook, type PortfolioHolding } from '@/hooks/usePortfolio';

interface PortfolioSummary {
  totalValue: number;
  totalInvestment: number;
  totalPnL: number;
  totalPnLPercentage: number;
  dayChange: number;
  dayChangePercentage: number;
}

interface PortfolioContextValue {
  holdings: PortfolioHolding[];
  summary: PortfolioSummary;
  loading: boolean;
  error: string | null;
  addHolding: (coinId: string, symbol: string, name: string, amount: number, averageBuyPrice: number, image?: string) => Promise<void>;
  removeHolding: (holdingId: string) => Promise<void>;
  updateHolding: (holdingId: string, updates: Partial<PortfolioHolding>) => Promise<void>;
  refreshPrices: () => Promise<void>;
}

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

export const PortfolioProvider = ({ children }: { children: ReactNode }) => {
  const portfolio = usePortfolioHook();
  return (
    <PortfolioContext.Provider value={portfolio}>
      {children}
    </PortfolioContext.Provider>
  );
};

export const usePortfolioContext = (): PortfolioContextValue => {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error('usePortfolioContext must be used within a PortfolioProvider');
  }
  return context;
};
