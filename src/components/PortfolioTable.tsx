import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Edit, Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePortfolioContext } from '@/contexts/PortfolioContext';
import type { PortfolioHolding } from '@/hooks/usePortfolio';
import { useCryptoData } from '@/hooks/useCryptoData';

interface AddHoldingFormProps {
  onAdd: (coinId: string, symbol: string, name: string, amount: number, price: number, image?: string) => void;
  cryptoOptions: Array<{ id: string; symbol: string; name: string; image: string }>;
}

const AddHoldingForm = ({ onAdd, cryptoOptions }: AddHoldingFormProps) => {
  const [formData, setFormData] = useState({
    coinId: '',
    amount: '',
    price: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [open, setOpen] = useState(false);

  const filteredOptions = cryptoOptions.filter(coin =>
    coin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    coin.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedCoin = cryptoOptions.find(coin => coin.id === formData.coinId);
    if (selectedCoin && formData.amount && formData.price) {
      onAdd(
        selectedCoin.id,
        selectedCoin.symbol,
        selectedCoin.name,
        parseFloat(formData.amount),
        parseFloat(formData.price),
        selectedCoin.image
      );
      setFormData({ coinId: '', amount: '', price: '' });
      setSearchTerm('');
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-primary text-primary-foreground shadow-glow hover:shadow-glow/80">
          <Plus className="w-4 h-4 mr-2" />
          Add Holding
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-glass border-glass-border backdrop-blur-md">
        <DialogHeader>
          <DialogTitle>Add New Holding</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Search Cryptocurrency</label>
            <Input
              placeholder="Search coins..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-glass border-glass-border"
            />
            {searchTerm && (
              <div className="mt-2 max-h-40 overflow-y-auto bg-glass border-glass-border rounded-md">
                {filteredOptions.slice(0, 10).map(coin => (
                  <button
                    key={coin.id}
                    type="button"
                    className="w-full p-2 text-left hover:bg-accent/10 flex items-center space-x-2"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, coinId: coin.id }));
                      setSearchTerm(coin.name);
                    }}
                  >
                    <img src={coin.image} alt={coin.name} className="w-6 h-6 rounded-full" loading="lazy" />
                    <span>{coin.name} ({coin.symbol.toUpperCase()})</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div>
            <label className="text-sm font-medium">Amount</label>
            <Input
              type="number"
              step="any"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              className="bg-glass border-glass-border"
              required
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Average Buy Price (USD)</label>
            <Input
              type="number"
              step="any"
              placeholder="0.00"
              value={formData.price}
              onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
              className="bg-glass border-glass-border"
              required
            />
          </div>
          
          <Button type="submit" className="w-full bg-gradient-primary" disabled={!formData.coinId || !formData.amount || !formData.price}>
            Add Holding
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export const PortfolioTable = ({ className }: { className?: string }) => {
  const { holdings, summary, loading, addHolding, removeHolding } = usePortfolioContext();
  const { topCryptos } = useCryptoData();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const cryptoOptions = topCryptos.map(coin => ({
    id: coin.id,
    symbol: coin.symbol,
    name: coin.name,
    image: coin.image,
  }));

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
            <div>
              <h2 className="text-xl font-bold text-foreground">Portfolio</h2>
              {holdings.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center space-x-4">
                    <span className="text-2xl font-bold text-foreground">
                      {formatCurrency(summary.totalValue)}
                    </span>
                    <div className={`flex items-center space-x-1 ${
                      summary.totalPnL >= 0 ? 'text-profit' : 'text-loss'
                    }`}>
                      {summary.totalPnL >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      <span className="font-medium">
                        {formatCurrency(Math.abs(summary.totalPnL))} ({formatPercentage(summary.totalPnLPercentage)})
                      </span>
                    </div>
                  </div>
                  <div className={`text-sm ${
                    summary.dayChange >= 0 ? 'text-profit' : 'text-loss'
                  }`}>
                    Today: {formatCurrency(summary.dayChange)} ({formatPercentage(summary.dayChangePercentage)})
                  </div>
                </div>
              )}
            </div>
            <AddHoldingForm onAdd={addHolding} cryptoOptions={cryptoOptions} />
          </div>

          {holdings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No holdings added yet</p>
              <p className="text-sm text-muted-foreground">
                Start building your portfolio by adding your first cryptocurrency holding
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Avg. Buy Price</TableHead>
                    <TableHead>Current Price</TableHead>
                    <TableHead>Market Value</TableHead>
                    <TableHead>P&L</TableHead>
                    <TableHead>24h Change</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {holdings.map((holding) => {
                      const marketValue = holding.amount * holding.currentPrice;
                      const totalCost = holding.amount * holding.averageBuyPrice;
                      const pnl = marketValue - totalCost;
                      const pnlPercentage = (pnl / totalCost) * 100;
                      const dayChange = holding.amount * (holding.currentPrice * (holding.priceChange24h || 0) / 100);

                      return (
                        <motion.tr
                          key={holding.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.3 }}
                        >
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <img
                                src={holding.image}
                                alt={holding.name}
                                className="w-8 h-8 rounded-full"
                                loading="lazy"
                              />
                              <div>
                                <div className="font-medium">{holding.symbol}</div>
                                <div className="text-xs text-muted-foreground">{holding.name}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono">
                            {holding.amount.toLocaleString(undefined, {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 8,
                            })}
                          </TableCell>
                          <TableCell className="font-mono">{formatCurrency(holding.averageBuyPrice)}</TableCell>
                          <TableCell className="font-mono">{formatCurrency(holding.currentPrice)}</TableCell>
                          <TableCell className="font-mono font-medium">{formatCurrency(marketValue)}</TableCell>
                          <TableCell className={`font-mono ${pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                            {formatCurrency(pnl)}
                            <div className="text-xs">
                              ({formatPercentage(pnlPercentage)})
                            </div>
                          </TableCell>
                          <TableCell className={`font-mono ${(holding.priceChange24h || 0) >= 0 ? 'text-profit' : 'text-loss'}`}>
                            {formatCurrency(dayChange)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeHolding(holding.id)}
                              className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
};