import { PORTFOLIO_SNAPSHOTS_KEY, SNAPSHOT_INTERVAL, MAX_SNAPSHOTS } from '@/constants/portfolio';
import type { PortfolioHolding } from '@/hooks/usePortfolio';

export interface PortfolioSnapshot {
  date: string;
  totalValue: number;
  totalInvestment: number;
  holdings: {
    coinId: string;
    amount: number;
    value: number;
  }[];
}

/**
 * Get all portfolio snapshots from localStorage
 */
export const getSnapshots = (): PortfolioSnapshot[] => {
  try {
    const stored = localStorage.getItem(PORTFOLIO_SNAPSHOTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load snapshots:', error);
    return [];
  }
};

/**
 * Save portfolio snapshot
 */
export const saveSnapshot = (holdings: PortfolioHolding[]): void => {
  try {
    const snapshots = getSnapshots();
    const today = new Date().toISOString().split('T')[0];
    
    // Check if we already have a snapshot for today
    const existingIndex = snapshots.findIndex(s => s.date === today);
    
    const totalValue = holdings.reduce((sum, h) => sum + (h.amount * h.currentPrice), 0);
    const totalInvestment = holdings.reduce((sum, h) => sum + (h.amount * h.averageBuyPrice), 0);
    
    const snapshot: PortfolioSnapshot = {
      date: today,
      totalValue,
      totalInvestment,
      holdings: holdings.map(h => ({
        coinId: h.coinId,
        amount: h.amount,
        value: h.amount * h.currentPrice,
      })),
    };
    
    if (existingIndex >= 0) {
      // Update existing snapshot
      snapshots[existingIndex] = snapshot;
    } else {
      // Add new snapshot
      snapshots.push(snapshot);
    }
    
    // Keep only MAX_SNAPSHOTS most recent snapshots
    const sortedSnapshots = snapshots
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, MAX_SNAPSHOTS);
    
    localStorage.setItem(PORTFOLIO_SNAPSHOTS_KEY, JSON.stringify(sortedSnapshots));
    console.log('📸 Portfolio snapshot saved:', today);
  } catch (error) {
    console.error('Failed to save snapshot:', error);
  }
};

/**
 * Check if we should take a new snapshot
 */
export const shouldTakeSnapshot = (): boolean => {
  const snapshots = getSnapshots();
  if (snapshots.length === 0) return true;
  
  const lastSnapshot = snapshots[0];
  const lastDate = new Date(lastSnapshot.date);
  const now = new Date();
  
  return (now.getTime() - lastDate.getTime()) >= SNAPSHOT_INTERVAL;
};

/**
 * Get historical data for charts (with interpolation for missing days)
 */
export const getHistoricalChartData = (days: number = 30): Array<{
  date: string;
  value: number;
  invested: number;
}> => {
  const snapshots = getSnapshots();
  if (snapshots.length === 0) return [];
  
  const sortedSnapshots = [...snapshots].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  const result: Array<{ date: string; value: number; invested: number }> = [];
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));
  
  // Filter snapshots within range
  const relevantSnapshots = sortedSnapshots.filter(s => {
    const snapDate = new Date(s.date);
    return snapDate >= startDate && snapDate <= endDate;
  });
  
  if (relevantSnapshots.length === 0) return [];
  
  // Fill in all days with interpolated or actual data
  for (let i = 0; i <= days; i++) {
    const currentDate = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000));
    const dateStr = currentDate.toISOString().split('T')[0];
    
    // Check if we have actual data for this date
    const exactSnapshot = relevantSnapshots.find(s => s.date === dateStr);
    
    if (exactSnapshot) {
      result.push({
        date: currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: exactSnapshot.totalValue,
        invested: exactSnapshot.totalInvestment,
      });
    } else {
      // Interpolate between nearest snapshots
      const before = relevantSnapshots.filter(s => new Date(s.date) < currentDate).pop();
      const after = relevantSnapshots.find(s => new Date(s.date) > currentDate);
      
      if (before && after) {
        const beforeDate = new Date(before.date).getTime();
        const afterDate = new Date(after.date).getTime();
        const currentTime = currentDate.getTime();
        const ratio = (currentTime - beforeDate) / (afterDate - beforeDate);
        
        result.push({
          date: currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          value: before.totalValue + (after.totalValue - before.totalValue) * ratio,
          invested: before.totalInvestment + (after.totalInvestment - before.totalInvestment) * ratio,
        });
      } else if (before) {
        // Use last known value
        result.push({
          date: currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          value: before.totalValue,
          invested: before.totalInvestment,
        });
      }
    }
  }
  
  return result;
};

/**
 * Clear all snapshots
 */
export const clearSnapshots = (): void => {
  localStorage.removeItem(PORTFOLIO_SNAPSHOTS_KEY);
  console.log('🗑️ All portfolio snapshots cleared');
};
