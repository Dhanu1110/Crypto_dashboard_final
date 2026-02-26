import type { PortfolioHolding } from '@/hooks/usePortfolio';

/**
 * Merge duplicate holdings by coinId
 * Sums amounts and calculates weighted average buy price
 */
export const normalizeHoldings = (holdings: PortfolioHolding[]): PortfolioHolding[] => {
  const map = new Map<string, PortfolioHolding>();

  for (const h of holdings) {
    const key = h.coinId;
    if (!map.has(key)) {
      map.set(key, { ...h });
    } else {
      const existing = map.get(key)!;
      const totalAmount = (existing.amount || 0) + (h.amount || 0);
      const totalInvestment = (existing.amount * existing.averageBuyPrice) + (h.amount * h.averageBuyPrice);
      const newAvg = totalAmount > 0 ? totalInvestment / totalAmount : existing.averageBuyPrice;

      map.set(key, {
        ...existing,
        amount: totalAmount,
        averageBuyPrice: newAvg,
        currentPrice: h.currentPrice || existing.currentPrice,
        priceChange24h: h.priceChange24h ?? existing.priceChange24h,
      });
    }
  }

  return Array.from(map.values());
};

/**
 * Calculate weighted average buy price for combining holdings
 */
export const calculateWeightedAverage = (
  amount1: number,
  price1: number,
  amount2: number,
  price2: number
): number => {
  const totalAmount = amount1 + amount2;
  if (totalAmount === 0) return 0;
  return ((amount1 * price1) + (amount2 * price2)) / totalAmount;
};

/**
 * Validate holding data
 */
export const validateHolding = (holding: Partial<PortfolioHolding>): string | null => {
  if (!holding.coinId || typeof holding.coinId !== 'string') {
    return 'Invalid coin ID';
  }
  if (!holding.amount || holding.amount <= 0) {
    return 'Amount must be greater than 0';
  }
  if (!holding.averageBuyPrice || holding.averageBuyPrice <= 0) {
    return 'Average buy price must be greater than 0';
  }
  if (!holding.symbol || typeof holding.symbol !== 'string') {
    return 'Invalid symbol';
  }
  if (!holding.name || typeof holding.name !== 'string') {
    return 'Invalid coin name';
  }
  return null;
};

/**
 * Format currency value
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Format percentage value
 */
export const formatPercentage = (value: number): string => {
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
};
