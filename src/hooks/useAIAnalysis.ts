import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PredictionData {
  timeframe: '24h' | '7d' | '30d';
  prediction: number;
  confidence: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
}

interface MarketIndicator {
  name: string;
  value: number;
  signal: 'buy' | 'sell' | 'hold';
  description: string;
}

interface MarketInsight {
  id: string;
  type: 'prediction' | 'signal' | 'news' | 'recommendation';
  title: string;
  description: string;
  confidence?: number;
  impact: 'high' | 'medium' | 'low';
  timestamp: Date;
}

interface MultiCoinPrediction extends PredictionData {
  coin: string;
  symbol: string;
}

interface MultiCoinIndicator extends MarketIndicator {
  coin: string;
  symbol: string;
}

interface AIAnalysisData {
  predictions: PredictionData[];
  indicators: MarketIndicator[];
  insights: MarketInsight[];
  multiCoinPredictions: MultiCoinPrediction[];
  multiCoinIndicators: MultiCoinIndicator[];
  timestamp: string;
  coinData?: {
    id: string;
    name: string;
    symbol: string;
  };
}

interface UseAIAnalysisReturn {
  analysisData: AIAnalysisData | null;
  loading: boolean;
  error: string | null;
  generateAnalysis: (selectedCoin: { id: string; name: string }, marketData?: any[], portfolioData?: any[]) => Promise<void>;
  lastUpdated: Date | null;
}

// Cache for analysis results to avoid unnecessary API calls
const analysisCache = new Map<string, { data: AIAnalysisData; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useAIAnalysis = (): UseAIAnalysisReturn => {
  const [analysisData, setAnalysisData] = useState<AIAnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { toast } = useToast();

  const generateAnalysis = useCallback(async (
    selectedCoin: { id: string; name: string },
    marketData: any[] = [],
    portfolioData: any[] = []
  ) => {
    // Check cache first
    const cacheKey = `${selectedCoin.id}-${marketData.length}`;
    const cached = analysisCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setAnalysisData(cached.data);
      setLastUpdated(new Date(cached.timestamp));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Generating AI analysis for:', selectedCoin.name);
      
      const { data, error: supabaseError } = await supabase.functions.invoke('ai-analysis', {
        body: {
          selectedCoin,
          marketData: marketData.slice(0, 10), // Limit data size for API efficiency
          portfolioData: portfolioData.slice(0, 5)
        }
      });

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      if (data.error) {
        // Handle fallback data if main analysis fails
        if (data.fallback) {
          console.warn('Using fallback analysis data:', data.details);
          setAnalysisData({
            ...data.fallback,
            insights: data.fallback.insights.map((insight: any) => ({
              ...insight,
              timestamp: new Date(insight.timestamp)
            }))
          });
        } else {
          throw new Error(data.details || 'Analysis generation failed');
        }
      } else {
        // Process successful response
        const processedData: AIAnalysisData = {
          ...data,
          insights: data.insights.map((insight: any) => ({
            ...insight,
            timestamp: new Date(insight.timestamp)
          }))
        };

        setAnalysisData(processedData);
        
        // Cache the result
        analysisCache.set(cacheKey, {
          data: processedData,
          timestamp: Date.now()
        });
      }

      setLastUpdated(new Date());
      
      toast({
        title: "Analysis Complete",
        description: `AI analysis generated for ${selectedCoin.name}`,
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate analysis';
      console.error('AI analysis error:', err);
      setError(errorMessage);
      
      toast({
        title: "Analysis Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      // Set fallback data in case of complete failure
      setAnalysisData({
        predictions: [
          { timeframe: '24h', prediction: 0, confidence: 50, sentiment: 'neutral' },
          { timeframe: '7d', prediction: 0, confidence: 50, sentiment: 'neutral' },
          { timeframe: '30d', prediction: 0, confidence: 50, sentiment: 'neutral' }
        ],
        indicators: [
          { name: 'Analysis Unavailable', value: 0, signal: 'hold', description: 'Unable to fetch analysis' }
        ],
        insights: [
          {
            id: 'error-1',
            type: 'recommendation',
            title: 'Analysis Error',
            description: 'Unable to generate AI analysis at this time. Please try again later.',
            impact: 'low',
            timestamp: new Date()
          }
        ],
        multiCoinPredictions: [],
        multiCoinIndicators: [],
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return {
    analysisData,
    loading,
    error,
    generateAnalysis,
    lastUpdated
  };
};