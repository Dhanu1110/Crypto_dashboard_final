import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, TrendingUp, TrendingDown, CircleDot } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartComponent } from '@/components/ChartComponent';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { usePortfolioContext } from '@/contexts/PortfolioContext';

export const PortfolioCharts = ({ className }: { className?: string }) => {
  const { holdings, loading } = usePortfolioContext();
  const [activeTab, setActiveTab] = useState('');

  // Update active tab when holdings change
  useEffect(() => {
    if (holdings.length === 0) {
      setActiveTab('');
      return;
    }

    // Check if current activeTab still exists in holdings
    const activeHoldingExists = holdings.some(h => h.coinId === activeTab);
    
    // If no activeTab or current one doesn't exist, switch to first holding
    if (!activeTab || !activeHoldingExists) {
      console.log('🔄 Switching active tab from', activeTab, 'to', holdings[0].coinId);
      setActiveTab(holdings[0].coinId);
    }
  }, [holdings]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  // Don't render if no holdings
  if (holdings.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className={className}
    >
      <Card className="bg-gradient-glass border-glass-border backdrop-blur-md shadow-glass">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground flex items-center space-x-2">
              <BarChart3 className="w-6 h-6 text-primary" />
              <span>Portfolio Charts</span>
            </h2>
            <div className="text-sm text-muted-foreground">
              {holdings.length} coin{holdings.length !== 1 ? 's' : ''} tracked
            </div>
          </div>

          {/* Charts Tabs */}
          <Tabs key={holdings.map(h => h.coinId).join('-')} value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Tab Navigation */}
            <TabsList className="grid w-full bg-glass/50 border border-glass-border rounded-lg p-1 mb-6" 
                     style={{ gridTemplateColumns: `repeat(${Math.min(holdings.length, 4)}, 1fr)` }}>
              {holdings.slice(0, 4).map((holding) => {
                const marketValue = holding.amount * holding.currentPrice;
                const totalCost = holding.amount * holding.averageBuyPrice;
                const pnl = marketValue - totalCost;
                const pnlPercentage = (pnl / totalCost) * 100;
                
                return (
                  <TabsTrigger
                    key={holding.coinId}
                    value={holding.coinId}
                    className="flex-1 flex flex-col items-center space-y-1 p-3 rounded-md data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground transition-all duration-200"
                  >
                    <div className="flex items-center space-x-2">
                      <img
                        src={holding.image}
                        alt={holding.name}
                        className="w-5 h-5 rounded-full"
                      />
                      <span className="font-medium text-sm">{holding.symbol}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-xs">
                      <span className="font-mono">{formatCurrency(marketValue)}</span>
                      <div className={`flex items-center space-x-1 ${pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                        {pnl >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        <span>{formatPercentage(pnlPercentage)}</span>
                      </div>
                    </div>
                  </TabsTrigger>
                );
              })}
              
              {/* Show indicator if more coins available */}
              {holdings.length > 4 && (
                <div className="flex items-center justify-center px-3 py-2 text-muted-foreground">
                  <CircleDot className="w-4 h-4" />
                  <span className="ml-1 text-xs">+{holdings.length - 4}</span>
                </div>
              )}
            </TabsList>

            {/* Tab Content - Charts */}
            <AnimatePresence mode="wait">
              {holdings.map((holding) => (
                <TabsContent key={holding.coinId} value={holding.coinId} className="mt-0">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Holding Summary */}
                    <div className="mb-4 p-4 bg-glass/30 border border-glass-border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <img
                            src={holding.image}
                            alt={holding.name}
                            className="w-10 h-10 rounded-full"
                          />
                          <div>
                            <h3 className="font-bold text-lg">{holding.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {holding.amount.toLocaleString(undefined, {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 8,
                              })} {holding.symbol}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="font-mono text-xl font-bold">
                            {formatCurrency(holding.amount * holding.currentPrice)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Avg. Buy: {formatCurrency(holding.averageBuyPrice)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Chart */}
                    <div className="w-full overflow-hidden">
                      <ErrorBoundary>
                        <ChartComponent 
                          coinId={holding.coinId} 
                          coinName={holding.name}
                          className="w-full"
                        />
                      </ErrorBoundary>
                    </div>
                  </motion.div>
                </TabsContent>
              ))}
            </AnimatePresence>

            {/* Show remaining coins as quick navigation if more than 4 */}
            {holdings.length > 4 && (
              <div className="mt-6 pt-4 border-t border-glass-border">
                <p className="text-sm text-muted-foreground mb-3">Other holdings:</p>
                <div className="flex flex-wrap gap-2">
                  {holdings.slice(4).map((holding) => (
                    <Button
                      key={holding.coinId}
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab(holding.coinId)}
                      className="bg-glass/30 border-glass-border hover:bg-gradient-primary/10"
                    >
                      <img
                        src={holding.image}
                        alt={holding.name}
                        className="w-4 h-4 rounded-full mr-2"
                      />
                      {holding.symbol}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </Tabs>
        </div>
      </Card>
    </motion.div>
  );
};