import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, Activity, Globe, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { GlobalMarketData } from '@/services/coinGeckoAPI';

interface GlobalStatsProps {
  globalData: GlobalMarketData | null;
  loading: boolean;
  className?: string;
}

export const GlobalStats = ({ globalData, loading, className }: GlobalStatsProps) => {
  const formatMarketCap = (marketCap: number) => {
    if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(2)}T`;
    if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(2)}B`;
    return `$${marketCap.toLocaleString()}`;
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className={className}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="bg-gradient-glass border-glass-border backdrop-blur-md shadow-glass p-4">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-6 bg-muted rounded w-1/2"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!globalData) return null;

  const totalMarketCap = globalData.total_market_cap.usd;
  const totalVolume = globalData.total_volume.usd;
  const marketCapChange = globalData.market_cap_change_percentage_24h_usd;
  const btcDominance = globalData.market_cap_percentage.btc;
  const ethDominance = globalData.market_cap_percentage.eth;

  const stats = [
    {
      title: 'Total Market Cap',
      value: formatMarketCap(totalMarketCap),
      change: marketCapChange,
      icon: Globe,
      color: 'text-primary',
    },
    {
      title: '24h Volume',
      value: formatMarketCap(totalVolume),
      change: null,
      icon: Activity,
      color: 'text-ethereum',
    },
    {
      title: 'BTC Dominance',
      value: `${btcDominance.toFixed(1)}%`,
      change: null,
      icon: DollarSign,
      color: 'text-bitcoin',
    },
    {
      title: 'ETH Dominance',
      value: `${ethDominance.toFixed(1)}%`,
      change: null,
      icon: Users,
      color: 'text-ethereum',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={className}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
            whileHover={{ scale: 1.02, y: -2 }}
          >
            <Card className="bg-gradient-glass border-glass-border backdrop-blur-md shadow-glass hover:shadow-glow transition-all duration-300 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg bg-background/10 ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                {stat.change !== null && (
                  <div className={`flex items-center space-x-1 text-sm ${
                    stat.change > 0 ? 'text-profit' : 'text-loss'
                  }`}>
                    {stat.change > 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    <span>{formatPercentage(stat.change)}</span>
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  {stat.title}
                </h3>
                <p className="text-2xl font-bold text-foreground">
                  {stat.value}
                </p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};