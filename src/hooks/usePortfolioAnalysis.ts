import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CACHE_DURATION } from '@/constants/portfolio';
import type { PortfolioHolding } from './usePortfolio';

interface RiskAnalysis {
  score: number; // 0-100
  level: 'low' | 'medium' | 'high';
  concentrationRisk: string;
  volatilityRisk: string;
  recommendations: string[];
}

interface DiversificationScore {
  score: number; // 0-100
  rating: 'poor' | 'fair' | 'good' | 'excellent';
  details: string;
  suggestions: string[];
}

interface PortfolioPrediction {
  timeframe: '24h' | '7d' | '30d';
  prediction: number;
  confidence: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
}

interface RebalancingRecommendation {
  action: 'buy' | 'sell' | 'hold';
  coin: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

interface PortfolioAnalysisData {
  riskAnalysis: RiskAnalysis;
  diversificationScore: DiversificationScore;
  predictions: PortfolioPrediction[];
  rebalancingRecommendations: RebalancingRecommendation[];
  portfolioHealth: {
    score: number;
    insights: string[];
  };
  topPerformer: { name: string; pnl: number };
  worstPerformer: { name: string; pnl: number };
  timestamp: string;
}

interface UsePortfolioAnalysisReturn {
  analysisData: PortfolioAnalysisData | null;
  loading: boolean;
  error: string | null;
  generateAnalysis: (holdings: PortfolioHolding[], marketData: any[]) => Promise<void>;
  lastUpdated: Date | null;
}

const analysisCache = new Map<string, { data: PortfolioAnalysisData; timestamp: number }>();

// Clean up old cache entries
const cleanupCache = () => {
  const now = Date.now();
  for (const [key, value] of analysisCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      analysisCache.delete(key);
    }
  }
};

export const usePortfolioAnalysis = (): UsePortfolioAnalysisReturn => {
  const [analysisData, setAnalysisData] = useState<PortfolioAnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const generateAnalysis = useCallback(async (holdings: PortfolioHolding[], marketData: any[]) => {
    if (holdings.length === 0) {
      setError('No holdings to analyze');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create stable cache key based on holdings
      const cacheKey = holdings
        .map(h => `${h.coinId}:${h.amount}:${h.currentPrice}`)
        .sort()
        .join('|');
      
      const cached = analysisCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log('📊 Using cached portfolio analysis');
        setAnalysisData(cached.data);
        setLastUpdated(new Date(cached.timestamp));
        setLoading(false);
        return;
      }

      // Clean up old cache entries
      cleanupCache();

      console.log('🤖 Generating portfolio analysis...');
      const { data, error: invokeError } = await supabase.functions.invoke('ai-analysis', {
        body: {
          type: 'portfolio-analysis',
          holdings,
          marketData
        }
      });

      if (invokeError) throw invokeError;

      if (data) {
        setAnalysisData(data);
        analysisCache.set(cacheKey, { data, timestamp: Date.now() });
        setLastUpdated(new Date());
        toast.success('Portfolio analysis complete');
      }
    } catch (err) {
      console.error('❌ Portfolio analysis failed:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed');
      toast.error('Failed to analyze portfolio');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    analysisData,
    loading,
    error,
    generateAnalysis,
    lastUpdated
  };
};