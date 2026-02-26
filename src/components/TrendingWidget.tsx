import { motion } from 'framer-motion';
import { TrendingUp, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCryptoData } from '@/hooks/useCryptoData';

export const TrendingWidget = () => {
  const { trendingCoins, loading } = useCryptoData();

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="bg-gradient-glass border-glass-border backdrop-blur-md shadow-glass p-6">
        <div className="flex items-center space-x-2 mb-4">
          <TrendingUp className="w-5 h-5 text-profit" />
          <h3 className="text-lg font-bold text-foreground">Trending Now</h3>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-glass/50 border border-glass-border rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {trendingCoins.slice(0, 5).map((coin, index) => (
              <motion.div
                key={coin.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-3 bg-glass/30 border border-glass-border rounded-lg hover:bg-glass/50 transition-all"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-bold text-muted-foreground">#{coin.market_cap_rank}</span>
                  <img src={coin.thumb} alt={coin.name} className="w-6 h-6 rounded-full" loading="lazy" />
                  <div>
                    <p className="font-medium text-sm text-foreground">{coin.symbol}</p>
                    <p className="text-xs text-muted-foreground">{coin.name}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => window.open(`https://www.coingecko.com/en/coins/${coin.id}`, '_blank')}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </motion.div>
            ))}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-glass-border">
          <p className="text-xs text-muted-foreground text-center">
            Updated based on CoinGecko search trends
          </p>
        </div>
      </Card>
    </motion.div>
  );
};
