import { motion } from "framer-motion";
import { Coins, TrendingUp, BarChart3, RefreshCw, LogOut, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { PriceCard } from "@/components/PriceCard";
import { ChartComponent } from "@/components/ChartComponent";
import { PortfolioTable } from "@/components/PortfolioTable";
import { PortfolioCharts } from "@/components/PortfolioCharts";
import { PortfolioAIAnalysis } from "@/components/PortfolioAIAnalysis";
import { PortfolioAllocationChart } from "@/components/PortfolioAllocationChart";
import { PortfolioPerformanceChart } from "@/components/PortfolioPerformanceChart";
import { GlobalStats } from "@/components/GlobalStats";
import { AIInsightsPanel } from "@/components/AIInsightsPanel";
import { ChatbotWidget } from "@/components/ChatbotWidget";
import { TrendingWidget } from "@/components/TrendingWidget";
import { AlertsManagementPanel } from "@/components/AlertsManagementPanel";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useCryptoData } from "@/hooks/useCryptoData";
import { usePortfolioContext } from "@/contexts/PortfolioContext";
import { usePriceAlerts } from "@/hooks/usePriceAlerts";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";

const Index = () => {
  const { topCryptos, globalData, trendingCoins, loading, error, refetch, lastUpdated } = useCryptoData();
  const { holdings } = usePortfolioContext();
  const { activeAlerts, triggeredAlerts, addAlert, removeAlert, clearTriggered, checkAlerts } = usePriceAlerts();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [selectedCoin, setSelectedCoin] = useState({ id: 'bitcoin', name: 'Bitcoin' });

  // Check price alerts whenever market data updates
  useEffect(() => {
    if (topCryptos.length === 0) return;
    const priceMap: Record<string, number> = {};
    topCryptos.forEach(c => { priceMap[c.id] = c.current_price; });
    checkAlerts(priceMap);
  }, [topCryptos, checkAlerts]);

  return (
    <ThemeProvider defaultTheme="dark">
      <div className="min-h-screen bg-gradient-hero">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-b border-glass-border bg-glass/30 backdrop-blur-md sticky top-0 z-40"
        >
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <motion.div 
                className="flex items-center space-x-3"
                whileHover={{ scale: 1.05 }}
              >
                <div className="p-2 bg-gradient-primary rounded-lg">
                  <Coins className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">CryptoTracker Pro</h1>
                  <p className="text-xs text-muted-foreground">Real-time Portfolio & AI Insights</p>
                </div>
              </motion.div>
              
              <div className="flex items-center space-x-3">
                {lastUpdated && (
                  <div className="text-xs text-muted-foreground">
                    Last updated: {lastUpdated.toLocaleTimeString()}
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refetch}
                  disabled={loading}
                  className="bg-glass border-glass-border hover:bg-gradient-primary/10"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <ThemeToggle />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/settings")}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Settings className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={signOut}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </motion.header>

        <div className="container mx-auto px-4 py-6 space-y-8">
          {/* Global Market Stats */}
          <GlobalStats globalData={globalData} loading={loading} />

          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Left Column - Price Cards & Chart */}
            <div className="xl:col-span-2 space-y-6">
              {/* Trending Cryptos */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-foreground flex items-center space-x-2">
                    <TrendingUp className="w-6 h-6 text-profit" />
                    <span>Top Cryptocurrencies</span>
                  </h2>
                </div>
                
                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <div key={i} className="h-32 bg-glass/50 border border-glass-border rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : error ? (
                  <div className="text-center py-12 bg-glass/30 border border-glass-border rounded-lg">
                    <div className="space-y-4">
                      <div className="text-muted-foreground">
                        <p className="mb-2">⚠️ Market data temporarily unavailable</p>
                        <p className="text-sm max-w-md mx-auto">{error}</p>
                      </div>
                      <Button 
                        onClick={refetch}
                        className="bg-gradient-primary text-primary-foreground shadow-glow"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Retry Now
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        Auto-refresh will continue in the background
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {topCryptos.slice(0, 6).map((coin, index) => (
                      <motion.div
                        key={coin.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <PriceCard
                          coin={coin}
                          onClick={() => setSelectedCoin({ id: coin.id, name: coin.name })}
                          onAddAlert={addAlert}
                        />
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Price Chart */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-foreground flex items-center space-x-2">
                    <BarChart3 className="w-6 h-6 text-ethereum" />
                    <span>Price Chart</span>
                  </h2>
                </div>
                <ChartComponent
                  coinId={selectedCoin.id}
                  coinName={selectedCoin.name}
                />
              </div>

              {/* AI Insights */}
              <AIInsightsPanel 
                selectedCoin={selectedCoin}
                marketData={topCryptos}
                portfolioData={holdings} 
              />

              {/* Portfolio */}
              <PortfolioTable />

              {/* Portfolio Intelligence Section */}
              {holdings.length > 0 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-foreground">Portfolio Intelligence</h2>
                  
                  {/* Portfolio AI Analysis with Error Boundary */}
                  <ErrorBoundary>
                    <PortfolioAIAnalysis holdings={holdings} marketData={topCryptos} />
                  </ErrorBoundary>
                  
                  {/* Portfolio Charts Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ErrorBoundary>
                      <PortfolioAllocationChart holdings={holdings} />
                    </ErrorBoundary>
                    <ErrorBoundary>
                      <PortfolioPerformanceChart holdings={holdings} />
                    </ErrorBoundary>
                  </div>
                </div>
              )}

              {/* Portfolio Charts */}
              <PortfolioCharts />
            </div>

            {/* Right Column - Trending & Quick Actions */}
            <div className="space-y-6">
              <AlertsManagementPanel
                activeAlerts={activeAlerts}
                triggeredAlerts={triggeredAlerts}
                onRemoveAlert={removeAlert}
                onClearTriggered={clearTriggered}
              />
              <TrendingWidget />
            </div>
          </div>
        </div>

        {/* Chatbot Widget */}
        <ChatbotWidget />
      </div>
    </ThemeProvider>
  );
};

export default Index;
