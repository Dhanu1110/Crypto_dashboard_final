import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw } from 'lucide-react';
import { coinGeckoAPI, ChartData } from '@/services/coinGeckoAPI';

interface ChartComponentProps {
  coinId: string;
  coinName: string;
  className?: string;
}

type TimeFrame = '1' | '7' | '30' | '90' | '365';

const timeFrames: { label: string; value: TimeFrame; days: string }[] = [
  { label: '1D', value: '1', days: '1' },
  { label: '7D', value: '7', days: '7' },
  { label: '30D', value: '30', days: '30' },
  { label: '90D', value: '90', days: '90' },
  { label: '1Y', value: '365', days: '365' },
];

interface ProcessedChartData {
  timestamp: number;
  price: number;
  date: string;
  volume: number;
}

// Fallback timeframes in order of preference
const FALLBACK_TIMEFRAMES: TimeFrame[] = ['30', '7', '1', '90', '365'];

export const ChartComponent = ({ coinId, coinName, className }: ChartComponentProps) => {
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<TimeFrame>('30');
  const [actualTimeFrame, setActualTimeFrame] = useState<TimeFrame>('30'); // Track which timeframe is actually displayed
  const [chartData, setChartData] = useState<ProcessedChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchChartData = async (timeFrame: TimeFrame, isRetry = false) => {
    try {
      setLoading(true);
      if (!isRetry) {
        setError(null);
        setRetryCount(0);
      }
      
      console.log(`📊 Fetching chart data for ${coinId} (${timeFrame} days)`);
      const data = await coinGeckoAPI.getCoinChartData(coinId, 'usd', timeFrame);
      
      const processedData: ProcessedChartData[] = data.prices.map(([timestamp, price], index) => ({
        timestamp,
        price,
        date: new Date(timestamp).toLocaleDateString(),
        volume: data.total_volumes[index]?.[1] || 0,
      }));
      
      console.log(`✅ Chart data loaded: ${processedData.length} points`);

      // Iterative fallback if no data - try next timeframe in sequence
      if (processedData.length < 2) {
        const currentIndex = FALLBACK_TIMEFRAMES.indexOf(timeFrame);
        const nextTimeFrame = FALLBACK_TIMEFRAMES[currentIndex + 1];
        
        if (nextTimeFrame) {
          console.warn(`⚠️ No data for ${timeFrame}D. Trying fallback to ${nextTimeFrame}D.`);
          setActualTimeFrame(nextTimeFrame);
          await fetchChartData(nextTimeFrame, true);
          return;
        } else {
          setError('No chart data available for any period.');
          setChartData([]);
          setActualTimeFrame(timeFrame);
          return;
        }
      }

      setChartData(processedData);
      setActualTimeFrame(timeFrame);
      setError(null);
      setRetryCount(0);
    } catch (err) {
      console.error('❌ Failed to fetch chart data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load chart data';
      
      // Auto-retry up to 2 times with exponential backoff
      if (retryCount < 2) {
        const nextRetry = retryCount + 1;
        const delay = 2000 * Math.pow(2, retryCount);
        console.log(`🔄 Auto-retry ${nextRetry}/2 in ${delay}ms...`);
        setRetryCount(nextRetry);
        setTimeout(() => fetchChartData(timeFrame, true), delay);
        setError(`Loading ${coinName} chart... (Attempt ${nextRetry + 1}/3)`);
      } else {
        // Final error after all retries
        if (errorMessage.includes('Failed to fetch') || errorMessage.includes('API Error')) {
          setError(`Unable to load ${coinName} chart. This might be temporary. Click retry to try again.`);
        } else {
          setError('Failed to load chart data. Please try again.');
        }
        setActualTimeFrame(timeFrame);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Reset actual timeframe when user changes selection
    setActualTimeFrame(selectedTimeFrame);
    
    // Stagger requests to prevent overwhelming the API
    const delay = Math.random() * 1500;
    const timeoutId = setTimeout(() => {
      fetchChartData(selectedTimeFrame);
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [coinId, selectedTimeFrame]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: price < 1 ? 6 : 2,
      maximumFractionDigits: price < 1 ? 6 : 2,
    }).format(price);
  };

  const formatXAxis = (timestamp: number) => {
    const date = new Date(timestamp);
    if (selectedTimeFrame === '1') {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const calculatePriceChange = () => {
    if (chartData.length < 2) return { change: 0, percentage: 0 };
    
    const firstPrice = chartData[0].price;
    const lastPrice = chartData[chartData.length - 1].price;
    const change = lastPrice - firstPrice;
    const percentage = (change / firstPrice) * 100;
    
    return { change, percentage };
  };

  const { change, percentage } = calculatePriceChange();
  const isPositive = change > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={className}
    >
      <Card className="bg-gradient-glass border-glass-border backdrop-blur-md shadow-glass p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-foreground">{coinName} Price Chart</h2>
              {!loading && actualTimeFrame !== selectedTimeFrame && (
                <span className="text-xs text-muted-foreground bg-glass px-2 py-1 rounded">
                  Showing {timeFrames.find(tf => tf.value === actualTimeFrame)?.label} data
                </span>
              )}
            </div>
            {!loading && chartData.length > 0 && (
              <div className="flex items-center space-x-2 mt-2">
                <span className="text-2xl font-bold text-foreground">
                  {formatPrice(chartData[chartData.length - 1].price)}
                </span>
                <span className={`text-sm font-medium ${isPositive ? 'text-profit' : 'text-loss'}`}>
                  {isPositive ? '+' : ''}{formatPrice(change)} ({isPositive ? '+' : ''}{percentage.toFixed(2)}%)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Time Frame Selector */}
        <div className="flex space-x-2 mb-6">
          {timeFrames.map(({ label, value }) => (
            <Button
              key={value}
              variant={selectedTimeFrame === value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTimeFrame(value)}
              className={`${
                selectedTimeFrame === value
                  ? 'bg-gradient-primary text-primary-foreground shadow-glow'
                  : 'bg-glass border-glass-border hover:bg-gradient-primary/10'
              } transition-all duration-300`}
            >
              {label}
            </Button>
          ))}
        </div>

        {/* Chart Area */}
        <div className="h-80 w-full overflow-hidden">
          {loading ? (
            <div className="h-full w-full space-y-3">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="text-muted-foreground mb-4">
                <p className="mb-2">⚠️ Chart temporarily unavailable</p>
                <p className="text-sm max-w-md">{error}</p>
              </div>
              <Button 
                onClick={() => fetchChartData(selectedTimeFrame)}
                variant="outline"
                className="bg-glass border-glass-border hover:bg-gradient-primary/10"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%" minHeight={0}>
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={formatXAxis}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  tickFormatter={(value) => formatPrice(value)}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  domain={['dataMin', 'dataMax']}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-glass border-glass-border backdrop-blur-md rounded-lg p-3 shadow-glass">
                          <p className="text-sm text-muted-foreground">
                            {new Date(label).toLocaleString()}
                          </p>
                          <p className="text-lg font-bold text-foreground">
                            {formatPrice(payload[0].value as number)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke={isPositive ? 'hsl(var(--profit))' : 'hsl(var(--loss))'}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{
                    r: 4,
                    fill: isPositive ? 'hsl(var(--profit))' : 'hsl(var(--loss))',
                    stroke: 'hsl(var(--background))',
                    strokeWidth: 2,
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </motion.div>
  );
};