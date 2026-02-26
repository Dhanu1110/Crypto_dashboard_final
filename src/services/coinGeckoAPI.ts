// CoinGecko API service for real-time crypto data
const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';
import { supabase } from '@/integrations/supabase/client';
import { 
  MAX_CONCURRENT_REQUESTS, 
  RETRY_ATTEMPTS, 
  RETRY_DELAY, 
  MIN_REQUEST_INTERVAL,
  PRICE_CACHE_TTL,
  DATA_CACHE_TTL,
  MAX_CACHE_SIZE,
  REQUEST_TIMEOUT
} from '@/constants/portfolio';

export interface CryptoCoin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  sparkline_in_7d: {
    price: number[];
  };
}

export interface GlobalMarketData {
  total_market_cap: { [key: string]: number };
  total_volume: { [key: string]: number };
  market_cap_percentage: { [key: string]: number };
  market_cap_change_percentage_24h_usd: number;
}

export interface ChartData {
  prices: [number, number][];
  market_caps: [number, number][];
  total_volumes: [number, number][];
}

export interface TrendingCoin {
  id: string;
  name: string;
  symbol: string;
  market_cap_rank: number;
  thumb: string;
  price_btc: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class CoinGeckoAPI {
  private static instance: CoinGeckoAPI;
  private requestQueue: Map<string, Promise<any>> = new Map();
  private cache: Map<string, CacheEntry<any>> = new Map();
  private lastRequestTime = 0;
  private lastCacheCleanup = 0;
  private readonly CACHE_CLEANUP_INTERVAL = 5 * 60 * 1000; // Clean cache every 5 minutes

  static getInstance(): CoinGeckoAPI {
    if (!CoinGeckoAPI.instance) {
      CoinGeckoAPI.instance = new CoinGeckoAPI();
    }
    return CoinGeckoAPI.instance;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private cleanupCache(): void {
    const now = Date.now();
    if (now - this.lastCacheCleanup < this.CACHE_CLEANUP_INTERVAL) return;
    
    this.lastCacheCleanup = now;
    const entries = Array.from(this.cache.entries());
    
    // Remove expired entries
    for (const [key, entry] of entries) {
      if (now - entry.timestamp > DATA_CACHE_TTL) {
        this.cache.delete(key);
      }
    }
    
    // If still too large, remove oldest entries
    if (this.cache.size > MAX_CACHE_SIZE) {
      const sorted = entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = sorted.slice(0, this.cache.size - MAX_CACHE_SIZE);
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
    
    console.log(`🧹 Cache cleaned. Size: ${this.cache.size}`);
  }

  private async fetchWithRetryAndRateLimit<T>(url: string, cacheTTL = PRICE_CACHE_TTL): Promise<T> {
    // Cleanup cache periodically
    this.cleanupCache();
    
    // Check cache first
    const cached = this.cache.get(url);
    if (cached && Date.now() - cached.timestamp < cacheTTL) {
      console.log(`💾 Using cached data for: ${url}`);
      return cached.data;
    }

    // Check if we already have this request in progress
    const existingRequest = this.requestQueue.get(url);
    if (existingRequest) {
      console.log(`📋 Reusing existing request for: ${url}`);
      return existingRequest;
    }

    // Wait if too many concurrent requests
    while (this.requestQueue.size >= MAX_CONCURRENT_REQUESTS) {
      await Promise.race(Array.from(this.requestQueue.values()));
    }

    // Rate limiting - ensure minimum interval between requests
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      await this.delay(MIN_REQUEST_INTERVAL - timeSinceLastRequest);
    }
    this.lastRequestTime = Date.now();

    const fetchPromise = this.fetchWithErrorHandling<T>(url);
    this.requestQueue.set(url, fetchPromise);

    try {
      const result = await fetchPromise;
      // Cache successful result
      this.cache.set(url, { data: result, timestamp: Date.now() });
      return result;
    } finally {
      // Remove from queue when done
      this.requestQueue.delete(url);
    }
  }

  private async fetchWithErrorHandling<T>(url: string): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
      try {
        console.log(`Attempting request ${attempt}/${RETRY_ATTEMPTS}: ${url}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 429) {
            // Rate limited - wait exponentially longer
            const waitTime = RETRY_DELAY * attempt * 3;
            console.log(`⏳ Rate limited. Waiting ${waitTime}ms before retry...`);
            await this.delay(waitTime);
            continue;
          }
          if (response.status >= 500) {
            // Server error - retry with longer delay
            const waitTime = RETRY_DELAY * attempt * 2;
            console.log(`🔄 Server error ${response.status}. Waiting ${waitTime}ms before retry...`);
            await this.delay(waitTime);
            continue;
          }
          throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`✅ Request successful: ${url}`);
        return data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.error(`❌ Request attempt ${attempt} failed:`, lastError.message);

        if (attempt < RETRY_ATTEMPTS) {
          // Exponential backoff with jitter
          const jitter = Math.random() * 500;
          const waitTime = RETRY_DELAY * attempt + jitter;
          console.log(`Waiting ${Math.round(waitTime)}ms before retry...`);
          await this.delay(waitTime);
        }
      }
    }

    console.error('🚨 All retry attempts failed for:', url);

    // Fallback: try Supabase Edge Function proxy
    try {
      console.log('🛟 Falling back to Supabase coingecko-proxy...');
      const { data, error } = await supabase.functions.invoke('coingecko-proxy', {
        body: { url },
      });
      if (error) {
        throw new Error(error.message);
      }
      // Validate response structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid proxy response');
      }
      return data as T;
    } catch (proxyErr) {
      console.error('❌ Proxy fallback failed:', proxyErr);
      throw lastError;
    }
  }

  // Get top cryptocurrencies with market data
  async getTopCryptos(vs_currency = 'usd', per_page = 100, page = 1): Promise<CryptoCoin[]> {
    const url = `${COINGECKO_API_BASE}/coins/markets?vs_currency=${vs_currency}&order=market_cap_desc&per_page=${per_page}&page=${page}&sparkline=true&price_change_percentage=24h`;
    return await this.fetchWithRetryAndRateLimit<CryptoCoin[]>(url);
  }

  // Get global market data
  async getGlobalMarketData(): Promise<{ data: GlobalMarketData }> {
    const url = `${COINGECKO_API_BASE}/global`;
    return await this.fetchWithRetryAndRateLimit<{ data: GlobalMarketData }>(url, DATA_CACHE_TTL);
  }

  // Get trending cryptocurrencies
  async getTrendingCryptos(): Promise<{ coins: Array<{ item: TrendingCoin }> }> {
    const url = `${COINGECKO_API_BASE}/search/trending`;
    return this.fetchWithRetryAndRateLimit<{ coins: Array<{ item: TrendingCoin }> }>(url, DATA_CACHE_TTL);
  }

  // Get historical chart data for a specific coin
  async getCoinChartData(
    coinId: string,
    vs_currency = 'usd',
    days: string | number = '30'
  ): Promise<ChartData> {
    const url = `${COINGECKO_API_BASE}/coins/${coinId}/market_chart?vs_currency=${vs_currency}&days=${days}`;
    return await this.fetchWithRetryAndRateLimit<ChartData>(url);
  }

  // Get detailed coin information
  async getCoinDetails(coinId: string): Promise<any> {
    const url = `${COINGECKO_API_BASE}/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=true`;
    return this.fetchWithRetryAndRateLimit<any>(url, DATA_CACHE_TTL);
  }

  // Get simple price for multiple coins
  async getSimplePrices(
    coinIds: string[],
    vs_currencies = ['usd'],
    include_24hr_change = true
  ): Promise<{ [key: string]: { [key: string]: number } }> {
    const ids = coinIds.join(',');
    const currencies = vs_currencies.join(',');
    const url = `${COINGECKO_API_BASE}/simple/price?ids=${ids}&vs_currencies=${currencies}&include_24hr_change=${include_24hr_change}`;
    return await this.fetchWithRetryAndRateLimit<{ [key: string]: { [key: string]: number } }>(url);
  }

}

export const coinGeckoAPI = CoinGeckoAPI.getInstance();