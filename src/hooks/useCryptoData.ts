import { useQuery, useQueryClient } from '@tanstack/react-query';
import { coinGeckoAPI, CryptoCoin, GlobalMarketData, TrendingCoin } from '@/services/coinGeckoAPI';
import { toast } from '@/hooks/use-toast';

interface CryptoDataState {
  topCryptos: CryptoCoin[];
  globalData: GlobalMarketData | null;
  trendingCoins: TrendingCoin[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

const QUERY_KEYS = {
  topCryptos: ['crypto', 'top-cryptos'] as const,
  globalData: ['crypto', 'global-data'] as const,
  trendingCoins: ['crypto', 'trending'] as const,
} as const;

const STALE_TIME = 1 * 60 * 1000; // 1 minute
const CACHE_TIME = 5 * 60 * 1000; // 5 minutes

export const useCryptoData = (autoRefresh = true, refreshInterval = 180000) => {
  const queryClient = useQueryClient();

  // Top Cryptocurrencies Query
  const topCryptosQuery = useQuery({
    queryKey: QUERY_KEYS.topCryptos,
    queryFn: () => coinGeckoAPI.getTopCryptos('usd', 50, 1),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    refetchInterval: autoRefresh ? refreshInterval : false,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Global Market Data Query
  const globalDataQuery = useQuery({
    queryKey: QUERY_KEYS.globalData,
    queryFn: async () => {
      const response = await coinGeckoAPI.getGlobalMarketData();
      return response.data;
    },
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    refetchInterval: autoRefresh ? refreshInterval : false,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Trending Coins Query
  const trendingQuery = useQuery({
    queryKey: QUERY_KEYS.trendingCoins,
    queryFn: async () => {
      const response = await coinGeckoAPI.getTrendingCryptos();
      return response.coins.map(coin => coin.item);
    },
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    refetchInterval: autoRefresh ? refreshInterval : false,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Handle errors and show toasts
  const handleQueryError = (error: Error, queryName: string) => {
    console.error(`❌ Failed to fetch ${queryName}:`, error);
    
    let userFriendlyMessage = `Unable to load ${queryName}. `;
    if (error.message.includes('Failed to fetch') || error.message.includes('429')) {
      userFriendlyMessage += 'This is likely due to API rate limiting. The app will retry automatically.';
    } else if (error.message.includes('Network')) {
      userFriendlyMessage += 'Please check your internet connection.';
    } else {
      userFriendlyMessage += 'The service may be temporarily unavailable.';
    }

    toast({
      title: "⚠️ Connection Issue",
      description: userFriendlyMessage,
      variant: "destructive",
    });
  };

  // Show error toasts for failed queries (only on first failure)
  if (topCryptosQuery.error && topCryptosQuery.failureCount === 1) {
    handleQueryError(topCryptosQuery.error as Error, 'market data');
  }
  if (globalDataQuery.error && globalDataQuery.failureCount === 1) {
    handleQueryError(globalDataQuery.error as Error, 'global data');
  }
  if (trendingQuery.error && trendingQuery.failureCount === 1) {
    handleQueryError(trendingQuery.error as Error, 'trending coins');
  }

  // Manual refetch function
  const refetch = async () => {
    console.log('🔄 Manual refetch triggered...');
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.topCryptos }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.globalData }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trendingCoins }),
    ]);
  };

  // Determine overall loading state
  const isLoading = topCryptosQuery.isLoading || globalDataQuery.isLoading || trendingQuery.isLoading;
  
  // Determine if we have any data
  const hasAnyData = (
    (topCryptosQuery.data && topCryptosQuery.data.length > 0) ||
    globalDataQuery.data ||
    (trendingQuery.data && trendingQuery.data.length > 0)
  );

  // Only show error if all queries failed and we have no data
  const hasError = !hasAnyData && (
    topCryptosQuery.error || globalDataQuery.error || trendingQuery.error
  );

  const lastUpdated = topCryptosQuery.dataUpdatedAt || globalDataQuery.dataUpdatedAt || trendingQuery.dataUpdatedAt
    ? new Date(Math.max(
        topCryptosQuery.dataUpdatedAt || 0,
        globalDataQuery.dataUpdatedAt || 0,
        trendingQuery.dataUpdatedAt || 0
      ))
    : null;

  return {
    topCryptos: topCryptosQuery.data || [],
    globalData: globalDataQuery.data || null,
    trendingCoins: trendingQuery.data || [],
    loading: isLoading,
    error: hasError ? 'Failed to load market data. Please check your connection and try again.' : null,
    lastUpdated,
    refetch,
  };
};