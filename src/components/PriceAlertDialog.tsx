import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PriceAlertDialogProps {
  coinId: string;
  coinName: string;
  symbol: string;
  currentPrice: number;
  onAddAlert: (alert: { coinId: string; coinName: string; symbol: string; targetPrice: number; direction: 'above' | 'below' }) => void;
}

export const PriceAlertDialog = ({ coinId, coinName, symbol, currentPrice, onAddAlert }: PriceAlertDialogProps) => {
  const [open, setOpen] = useState(false);
  const [targetPrice, setTargetPrice] = useState('');
  const [direction, setDirection] = useState<'above' | 'below'>('above');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(targetPrice);
    if (isNaN(price) || price <= 0) return;
    onAddAlert({ coinId, coinName, symbol, targetPrice: price, direction });
    setTargetPrice('');
    setOpen(false);
  };

  const formatPrice = (p: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: p < 1 ? 6 : 2, maximumFractionDigits: p < 1 ? 6 : 2 }).format(p);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-primary"
          onClick={(e) => { e.stopPropagation(); }}
        >
          <Bell className="w-3.5 h-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[360px]" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            Price Alert — {symbol.toUpperCase()}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Current price: {formatPrice(currentPrice)}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="flex gap-2">
            <Select value={direction} onValueChange={(v) => setDirection(v as 'above' | 'below')}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="above">Goes above</SelectItem>
                <SelectItem value="below">Goes below</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              step="any"
              min="0"
              placeholder="Target price"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              className="flex-1"
              required
            />
          </div>
          <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground shadow-glow">
            Set Alert
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
