import { useEffect, useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, AlertTriangle, Target, BarChart3, RefreshCw, Shield } from 'lucide-react';
import { usePortfolioAnalysis } from '@/hooks/usePortfolioAnalysis';
import type { PortfolioHolding } from '@/hooks/usePortfolio';

interface PortfolioAIAnalysisProps {
  holdings: PortfolioHolding[];
  marketData: any[];
  className?: string;
}

const PortfolioAIAnalysisComponent = ({ holdings, marketData, className }: PortfolioAIAnalysisProps) => {
  const { analysisData, loading, generateAnalysis, lastUpdated } = usePortfolioAnalysis();

  // Memoize holdings fingerprint to prevent unnecessary re-analysis
  const holdingsFingerprint = useMemo(
    () => holdings.map(h => `${h.coinId}:${h.amount}`).join('|'),
    [holdings]
  );

  useEffect(() => {
    if (holdings.length > 0 && marketData.length > 0) {
      generateAnalysis(holdings, marketData);
    }
  }, [holdingsFingerprint, marketData, generateAnalysis]);

  const handleRefresh = () => {
    generateAnalysis(holdings, marketData);
  };

  if (holdings.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Portfolio AI Analysis
          </CardTitle>
          <CardDescription>Add holdings to get AI-powered insights</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Portfolio AI Analysis
            </CardTitle>
            <CardDescription>
              {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'AI-powered portfolio insights'}
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && !analysisData ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : analysisData ? (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="risk">Risk</TabsTrigger>
              <TabsTrigger value="predictions">Predictions</TabsTrigger>
              <TabsTrigger value="rebalance">Rebalance</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Portfolio Health Score */}
                <div className="p-4 rounded-lg bg-muted/50 border">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Portfolio Health Score
                    </h3>
                    <Badge variant={analysisData.portfolioHealth.score > 70 ? 'default' : 'secondary'}>
                      {analysisData.portfolioHealth.score}/100
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {analysisData.portfolioHealth.insights.map((insight, idx) => (
                      <p key={idx} className="text-sm text-muted-foreground">• {insight}</p>
                    ))}
                  </div>
                </div>

                {/* Diversification */}
                <div className="p-4 rounded-lg bg-muted/50 border">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Diversification Score</h3>
                    <Badge>{analysisData.diversificationScore.rating.toUpperCase()}</Badge>
                  </div>
                  <p className="text-sm mb-2">{analysisData.diversificationScore.details}</p>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all"
                        style={{ width: `${analysisData.diversificationScore.score}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{analysisData.diversificationScore.score}%</span>
                  </div>
                </div>

                {/* Top & Worst Performers */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border bg-green-500/10 border-green-500/20">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="font-semibold text-sm">Top Performer</span>
                    </div>
                    <p className="text-lg font-bold">{analysisData.topPerformer.name}</p>
                    <p className="text-sm text-green-600">+{analysisData.topPerformer.pnl.toFixed(2)}%</p>
                  </div>
                  <div className="p-4 rounded-lg border bg-red-500/10 border-red-500/20">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingDown className="h-4 w-4 text-red-500" />
                      <span className="font-semibold text-sm">Worst Performer</span>
                    </div>
                    <p className="text-lg font-bold">{analysisData.worstPerformer.name}</p>
                    <p className="text-sm text-red-600">{analysisData.worstPerformer.pnl.toFixed(2)}%</p>
                  </div>
                </div>
              </motion.div>
            </TabsContent>

            <TabsContent value="risk" className="space-y-4 mt-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="p-4 rounded-lg bg-muted/50 border">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Risk Assessment
                    </h3>
                    <Badge variant={
                      analysisData.riskAnalysis.level === 'low' ? 'default' :
                      analysisData.riskAnalysis.level === 'medium' ? 'secondary' : 'destructive'
                    }>
                      {analysisData.riskAnalysis.level.toUpperCase()} RISK
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium mb-1">Concentration Risk</p>
                      <p className="text-sm text-muted-foreground">{analysisData.riskAnalysis.concentrationRisk}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Volatility Risk</p>
                      <p className="text-sm text-muted-foreground">{analysisData.riskAnalysis.volatilityRisk}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-muted/50 border">
                  <h3 className="font-semibold mb-2">Risk Mitigation Recommendations</h3>
                  <ul className="space-y-2">
                    {analysisData.riskAnalysis.recommendations.map((rec, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <Target className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            </TabsContent>

            <TabsContent value="predictions" className="space-y-4 mt-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                {analysisData.predictions.map((pred, idx) => (
                  <div key={idx} className="p-4 rounded-lg border bg-muted/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{pred.timeframe} Forecast</span>
                        <Badge variant={pred.sentiment === 'bullish' ? 'default' : pred.sentiment === 'bearish' ? 'destructive' : 'secondary'}>
                          {pred.sentiment}
                        </Badge>
                      </div>
                      <span className={`font-bold ${pred.prediction > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {pred.prediction > 0 ? '+' : ''}{pred.prediction.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Confidence:</span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary"
                          style={{ width: `${pred.confidence}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium">{pred.confidence}%</span>
                    </div>
                  </div>
                ))}
              </motion.div>
            </TabsContent>

            <TabsContent value="rebalance" className="space-y-4 mt-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                {analysisData.rebalancingRecommendations.length > 0 ? (
                  analysisData.rebalancingRecommendations.map((rec, idx) => (
                    <div key={idx} className="p-4 rounded-lg border bg-muted/50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={rec.action === 'buy' ? 'default' : rec.action === 'sell' ? 'destructive' : 'secondary'}>
                            {rec.action.toUpperCase()}
                          </Badge>
                          <span className="font-semibold">{rec.coin}</span>
                        </div>
                        <Badge variant="outline">{rec.priority}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{rec.reason}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Your portfolio is well balanced. No rebalancing needed at this time.</p>
                  </div>
                )}
              </motion.div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>Click refresh to generate analysis</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const PortfolioAIAnalysis = memo(PortfolioAIAnalysisComponent);