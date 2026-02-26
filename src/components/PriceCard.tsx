import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { CryptoCoin } from '@/services/coinGeckoAPI';
import { PriceAlertDialog } from '@/components/PriceAlertDialog';

interface PriceCardProps {
  coin: CryptoCoin;
  onClick?: () => void;
  className?: string;
  onAddAlert?: (alert: { coinId: string; coinName: string; symbol: string; targetPrice: number; direction: 'above' | 'below' }) => void;
}

export const PriceCard = ({ coin, onClick, className, onAddAlert }: PriceCardProps) => {
  const isPositive = coin.price_change_percentage_24h > 0;
  const isNegative = coin.price_change_percentage_24h < 0;
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: price < 1 ? 6 : 2,
      maximumFractionDigits: price < 1 ? 6 : 2,
    }).format(price);
  };

  const formatMarketCap = (marketCap: number) => {
    if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(2)}T`;
    if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(2)}B`;
    if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(2)}M`;
    return `$${marketCap.toLocaleString()}`;
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={className}
    >
      <Card 
        className="bg-gradient-glass border-glass-border backdrop-blur-md shadow-glass hover:shadow-glow cursor-pointer transition-all duration-300 p-4"
        onClick={onClick}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <motion.img
              src={coin.image}
              alt={coin.name}
              className="w-8 h-8 rounded-full"
              loading="lazy"
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.6 }}
            />
            <div>
              <h3 className="font-semibold text-foreground">{coin.symbol.toUpperCase()}</h3>
              <p className="text-xs text-muted-foreground">#{coin.market_cap_rank}</p>
            </div>
          </div>
          <div>
            {onAddAlert && (
              <PriceAlertDialog
                coinId={coin.id}
                coinName={coin.name}
                symbol={coin.symbol}
                currentPrice={coin.current_price}
                onAddAlert={onAddAlert}
              />
            )}
          </div>
          
          <div className="text-right">
            <p className="font-bold text-foreground">{formatPrice(coin.current_price)}</p>
            <div className={`flex items-center justify-end space-x-1 ${
              isPositive ? 'text-profit' : isNegative ? 'text-loss' : 'text-muted-foreground'
            }`}>
              {isPositive && <TrendingUp className="w-3 h-3" />}
              {isNegative && <TrendingDown className="w-3 h-3" />}
              {!isPositive && !isNegative && <Minus className="w-3 h-3" />}
              <span className="text-xs font-medium">
                {formatPercentage(coin.price_change_percentage_24h)}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Market Cap</span>
            <span className="text-foreground font-medium">{formatMarketCap(coin.market_cap)}</span>
          </div>
          
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Volume (24h)</span>
            <span className="text-foreground font-medium">{formatMarketCap(coin.total_volume)}</span>
          </div>

          {/* Sparkline Chart */}
          {coin.sparkline_in_7d?.price && (
            <div className="mt-3 h-12 w-full">
              <svg className="w-full h-full" viewBox="0 0 168 48">
                <motion.polyline
                  fill="none"
                  stroke={isPositive ? 'hsl(var(--profit))' : isNegative ? 'hsl(var(--loss))' : 'hsl(var(--muted-foreground))'}
                  strokeWidth="1.5"
                  points={coin.sparkline_in_7d.price.map((price, index) => {
                    const x = (index / (coin.sparkline_in_7d.price.length - 1)) * 168;
                    const minPrice = Math.min(...coin.sparkline_in_7d.price);
                    const maxPrice = Math.max(...coin.sparkline_in_7d.price);
                    const y = 48 - ((price - minPrice) / (maxPrice - minPrice)) * 48;
                    return `${x},${y}`;
                  }).join(' ')}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </svg>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
};