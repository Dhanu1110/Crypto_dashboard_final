import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain, TrendingUp, TrendingDown, Target, AlertTriangle, Lightbulb, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAIAnalysis } from '@/hooks/useAIAnalysis';

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

interface AIInsightsPanelProps {
  className?: string;
  selectedCoin?: { id: string; name: string };
  marketData?: any[];
  portfolioData?: any[];
}

const AIInsightsPanel = ({ 
  className, 
  selectedCoin = { id: 'bitcoin', name: 'Bitcoin' },
  marketData = [],
  portfolioData = []
}: AIInsightsPanelProps) => {
  const { analysisData, loading, error, generateAnalysis, lastUpdated } = useAIAnalysis();

  // Extract data from analysisData or use empty arrays as fallback
  const predictions = analysisData?.predictions || [];
  const multiCoinPredictions = analysisData?.multiCoinPredictions || [];
  const indicators = analysisData?.indicators || [];
  const multiCoinIndicators = analysisData?.multiCoinIndicators || [];
  const insights = analysisData?.insights || [];

  // Generate analysis when component mounts, selectedCoin changes, or marketData becomes available
  useEffect(() => {
    if (marketData.length > 0) {
      generateAnalysis(selectedCoin, marketData, portfolioData);
    }
  }, [selectedCoin.id, marketData.length]); // Wait for marketData to be populated before firing

  const handleRegenerateAnalysis = async () => {
    await generateAnalysis(selectedCoin, marketData, portfolioData);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-profit';
    if (confidence >= 60) return 'text-bitcoin';
    return 'text-loss';
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish':
        return <TrendingUp className="w-4 h-4 text-profit" />;
      case 'bearish':
        return <TrendingDown className="w-4 h-4 text-loss" />;
      default:
        return <Target className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getImpactBadgeVariant = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className={className}>
        <Card className="bg-gradient-glass border-glass-border backdrop-blur-md shadow-glass p-6">
          <div className="space-y-4">
            <Skeleton className="h-6 w-40" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={className}
    >
      <Card className="bg-gradient-glass border-glass-border backdrop-blur-md shadow-glass">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <Brain className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">AI Market Insights</h2>
            </div>
            {lastUpdated && (
              <div className="text-xs text-muted-foreground">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </div>
            )}
          </div>

          {/* Price Predictions */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-6 flex items-center space-x-2">
              <Target className="w-4 h-4" />
              <span>Price Predictions</span>
            </h3>
            
            {/* Selected Coin Predictions */}
            <div className="mb-6">
              <h4 className="text-md font-medium mb-3 text-muted-foreground">
                {selectedCoin.name} Forecast
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {predictions.map((prediction) => (
                  <motion.div
                    key={prediction.timeframe}
                    whileHover={{ scale: 1.02 }}
                    className="bg-glass/50 border border-glass-border rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        {prediction.timeframe.toUpperCase()}
                      </span>
                      {getSentimentIcon(prediction.sentiment)}
                    </div>
                    <div className="space-y-1">
                      <div className={`text-xl font-bold ${
                        prediction.prediction > 0 ? 'text-profit' : 'text-loss'
                      }`}>
                        {prediction.prediction > 0 ? '+' : ''}{prediction.prediction.toFixed(2)}%
                      </div>
                      <div className={`text-xs ${getConfidenceColor(prediction.confidence)}`}>
                        {prediction.confidence}% confidence
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Multiple Coins Predictions */}
            <div>
              <h4 className="text-md font-medium mb-3 text-muted-foreground">
                Market Overview (24h)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {multiCoinPredictions.map((prediction) => (
                  <motion.div
                    key={prediction.coin}
                    whileHover={{ scale: 1.02 }}
                    className="bg-glass/30 border border-glass-border rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-sm font-medium text-foreground">
                          {prediction.coin}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {prediction.symbol}
                        </span>
                      </div>
                      {getSentimentIcon(prediction.sentiment)}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className={`text-lg font-bold ${
                        prediction.prediction > 0 ? 'text-profit' : 'text-loss'
                      }`}>
                        {prediction.prediction > 0 ? '+' : ''}{prediction.prediction.toFixed(2)}%
                      </div>
                      <div className={`text-xs ${getConfidenceColor(prediction.confidence)}`}>
                        {prediction.confidence}%
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Technical Indicators */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-6 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Technical Indicators</span>
            </h3>
            
            {/* Selected Coin Indicators */}
            <div className="mb-6">
              <h4 className="text-md font-medium mb-3 text-muted-foreground">
                {selectedCoin.name} Analysis
              </h4>
              <div className="space-y-3">
                {indicators.map((indicator, index) => (
                  <motion.div
                    key={indicator.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 bg-glass/50 border border-glass-border rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-foreground">{indicator.name}</div>
                      <div className="text-sm text-muted-foreground">{indicator.description}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-medium">
                        {typeof indicator.value === 'number' 
                          ? indicator.value.toLocaleString()
                          : indicator.value
                        }
                      </div>
                      <Badge 
                        variant={
                          indicator.signal === 'buy' ? 'default' : 
                          indicator.signal === 'sell' ? 'destructive' : 'secondary'
                        }
                        className="text-xs"
                      >
                        {indicator.signal.toUpperCase()}
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Multiple Coins Indicators */}
            <div>
              <h4 className="text-md font-medium mb-3 text-muted-foreground">
                Market Signals
              </h4>
              <div className="space-y-2">
                {multiCoinIndicators.map((indicator, index) => (
                  <motion.div
                    key={`${indicator.coin}-${indicator.name}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 bg-glass/30 border border-glass-border rounded-lg"
                  >
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-foreground">{indicator.coin}</span>
                        <span className="text-xs text-muted-foreground">{indicator.symbol}</span>
                        <span className="text-sm text-muted-foreground">• {indicator.name}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">{indicator.description}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm font-medium">
                        {typeof indicator.value === 'number' 
                          ? indicator.value.toLocaleString()
                          : indicator.value
                        }
                      </div>
                      <Badge 
                        variant={
                          indicator.signal === 'buy' ? 'default' : 
                          indicator.signal === 'sell' ? 'destructive' : 'secondary'
                        }
                        className="text-xs"
                      >
                        {indicator.signal.toUpperCase()}
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Market Insights */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
              <Lightbulb className="w-4 h-4" />
              <span>Market Insights</span>
            </h3>
            <div className="space-y-3">
              {insights.map((insight, index) => (
                <motion.div
                  key={insight.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 bg-glass/30 border border-glass-border rounded-lg"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-foreground">{insight.title}</h4>
                    <div className="flex items-center space-x-2">
                      <Badge variant={getImpactBadgeVariant(insight.impact)} className="text-xs">
                        {insight.impact}
                      </Badge>
                      {insight.confidence && (
                        <span className={`text-xs ${getConfidenceColor(insight.confidence)}`}>
                          {insight.confidence}%
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{insight.description}</p>
                  <div className="text-xs text-muted-foreground">
                    {insight.timestamp.toLocaleTimeString()}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-glass-border">
            <Button 
              variant="outline" 
              className="w-full bg-glass border-glass-border hover:bg-gradient-primary/10"
              onClick={handleRegenerateAnalysis}
              disabled={loading}
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Brain className="w-4 h-4 mr-2" />
              )}
              {loading ? 'Generating Analysis...' : 'Generate New Analysis'}
            </Button>
            {error && (
              <p className="text-sm text-destructive mt-2 text-center">
                {error}
              </p>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export { AIInsightsPanel };