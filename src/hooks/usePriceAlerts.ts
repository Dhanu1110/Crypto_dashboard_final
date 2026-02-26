import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface PriceAlert {
  id: string;
  coinId: string;
  coinName: string;
  symbol: string;
  targetPrice: number;
  direction: 'above' | 'below';
  createdAt: number;
  triggered: boolean;
}

interface DbAlert {
  id: string;
  user_id: string;
  coin_id: string;
  coin_name: string;
  symbol: string;
  target_price: number;
  direction: string;
  triggered: boolean;
  created_at: string;
}

const toLocal = (db: DbAlert): PriceAlert => ({
  id: db.id,
  coinId: db.coin_id,
  coinName: db.coin_name,
  symbol: db.symbol,
  targetPrice: Number(db.target_price),
  direction: db.direction as 'above' | 'below',
  createdAt: new Date(db.created_at).getTime(),
  triggered: db.triggered,
});

export const usePriceAlerts = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const alertsRef = useRef(alerts);
  alertsRef.current = alerts;

  // Fetch alerts from DB
  const fetchAlerts = useCallback(async () => {
    if (!user) { setAlerts([]); return; }
    const { data, error } = await supabase
      .from('price_alerts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.error('Failed to fetch alerts:', error); return; }
    setAlerts((data as DbAlert[]).map(toLocal));
  }, [user]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const addAlert = useCallback(async (alert: Omit<PriceAlert, 'id' | 'createdAt' | 'triggered'>) => {
    if (!user) { toast.error('Sign in to set price alerts'); return; }
    const { error } = await supabase.from('price_alerts').insert({
      user_id: user.id,
      coin_id: alert.coinId,
      coin_name: alert.coinName,
      symbol: alert.symbol,
      target_price: alert.targetPrice,
      direction: alert.direction,
    });
    if (error) { toast.error('Failed to save alert'); console.error(error); return; }
    toast.success(`Alert set: ${alert.coinName} ${alert.direction} $${alert.targetPrice.toLocaleString()}`);
    fetchAlerts();
  }, [user, fetchAlerts]);

  const removeAlert = useCallback(async (id: string) => {
    await supabase.from('price_alerts').delete().eq('id', id);
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  const clearTriggered = useCallback(async () => {
    if (!user) return;
    await supabase.from('price_alerts').delete().eq('user_id', user.id).eq('triggered', true);
    setAlerts(prev => prev.filter(a => !a.triggered));
  }, [user]);

  const checkAlerts = useCallback(async (prices: Record<string, number>) => {
    const current = alertsRef.current;
    const active = current.filter(a => !a.triggered);
    if (active.length === 0) return;

    for (const alert of active) {
      const price = prices[alert.coinId];
      if (price == null) continue;
      const hit =
        (alert.direction === 'above' && price >= alert.targetPrice) ||
        (alert.direction === 'below' && price <= alert.targetPrice);
      if (hit) {
        toast(`🔔 ${alert.coinName} (${alert.symbol.toUpperCase()}) hit $${price.toLocaleString()}!`, {
          description: `Your alert for ${alert.direction} $${alert.targetPrice.toLocaleString()} was triggered.`,
          duration: 8000,
        });
        await supabase.from('price_alerts').update({ triggered: true }).eq('id', alert.id);
      }
    }
    fetchAlerts();
  }, [fetchAlerts]);

  const activeAlerts = alerts.filter(a => !a.triggered);
  const triggeredAlerts = alerts.filter(a => a.triggered);

  return { alerts, activeAlerts, triggeredAlerts, addAlert, removeAlert, clearTriggered, checkAlerts };
};
