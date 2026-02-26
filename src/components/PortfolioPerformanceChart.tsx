import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { getHistoricalChartData } from '@/utils/portfolioSnapshots';
import type { PortfolioHolding } from '@/hooks/usePortfolio';

interface PortfolioPerformanceChartProps {
  holdings: PortfolioHolding[];
  className?: string;
}

export const PortfolioPerformanceChart = ({ holdings, className }: PortfolioPerformanceChartProps) => {
  const { chartData, hasRealData } = useMemo(() => {
    if (holdings.length === 0) return { chartData: [], hasRealData: false };

    // Try to get real historical data
    const historicalData = getHistoricalChartData(30);
    
    if (historicalData.length > 0) {
      return { chartData: historicalData, hasRealData: true };
    }
    
    // Fallback: Generate simulated data for new portfolios
    const days = 30;
    const data = [];
    
    const currentValue = holdings.reduce((sum, h) => sum + (h.amount * h.currentPrice), 0);
    const investedValue = holdings.reduce((sum, h) => sum + (h.amount * h.averageBuyPrice), 0);
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Simulate historical performance with some randomness
      const volatility = 0.02;
      const trend = (currentValue - investedValue) / days;
      const randomChange = (Math.random() - 0.5) * 2 * volatility;
      
      const portfolioValue = investedValue + (trend * (days - i)) + (investedValue * randomChange * (days - i));
      
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: Math.max(0, portfolioValue),
        invested: investedValue
      });
    }
    
    return { chartData: data, hasRealData: false };
  }, [holdings]);

  const formatCurrency = (value: number) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  if (holdings.length === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Portfolio Performance (30 Days)</CardTitle>
            <CardDescription>
              {hasRealData ? 'Historical tracked value' : 'Simulated historical data'}
            </CardDescription>
          </div>
          {!hasRealData && (
            <Badge variant="outline" className="text-xs">
              Simulated
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              tickFormatter={formatCurrency}
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <div className="text-sm font-semibold mb-1">{payload[0].payload.date}</div>
                      {payload.map((entry: any, index: number) => (
                        <div key={index} className="text-sm" style={{ color: entry.color }}>
                          {entry.name}: {formatCurrency(entry.value)}
                        </div>
                      ))}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="value" 
              name="Portfolio Value"
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={false}
            />
            <Line 
              type="monotone" 
              dataKey="invested" 
              name="Initial Investment"
              stroke="hsl(var(--muted-foreground))" 
              strokeWidth={1}
              strokeDasharray="5 5"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};