import { useState } from 'react';
import { Bell, BellOff, Trash2, CheckCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PriceAlert } from '@/hooks/usePriceAlerts';

interface AlertsManagementPanelProps {
  activeAlerts: PriceAlert[];
  triggeredAlerts: PriceAlert[];
  onRemoveAlert: (id: string) => void;
  onClearTriggered: () => void;
}

export const AlertsManagementPanel = ({
  activeAlerts,
  triggeredAlerts,
  onRemoveAlert,
  onClearTriggered,
}: AlertsManagementPanelProps) => {
  const [expanded, setExpanded] = useState(true);
  const total = activeAlerts.length + triggeredAlerts.length;

  if (total === 0) return null;

  const formatPrice = (p: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: p < 1 ? 6 : 2,
      maximumFractionDigits: p < 1 ? 6 : 2,
    }).format(p);

  const timeAgo = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <Card className="bg-gradient-glass border-glass-border backdrop-blur-md shadow-glass">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Price Alerts
            <Badge variant="secondary" className="ml-1 text-xs">
              {activeAlerts.length} active
            </Badge>
            {triggeredAlerts.length > 0 && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                {triggeredAlerts.length} triggered
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent className="space-y-4">
              {/* Active Alerts */}
              {activeAlerts.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Watching
                  </h4>
                  <div className="space-y-2">
                    {activeAlerts.map((alert) => (
                      <motion.div
                        key={alert.id}
                        layout
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${alert.direction === 'above' ? 'bg-profit' : 'bg-loss'}`} />
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {alert.coinName}
                              <span className="text-muted-foreground ml-1">
                                ({alert.symbol.toUpperCase()})
                              </span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {alert.direction === 'above' ? '↑ Above' : '↓ Below'}{' '}
                              {formatPrice(alert.targetPrice)} · {timeAgo(alert.createdAt)}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => onRemoveAlert(alert.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Triggered Alerts */}
              {triggeredAlerts.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Triggered
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground hover:text-destructive"
                      onClick={onClearTriggered}
                    >
                      <BellOff className="w-3 h-3 mr-1" />
                      Clear all
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {triggeredAlerts.map((alert) => (
                      <motion.div
                        key={alert.id}
                        layout
                        className="flex items-center justify-between p-3 rounded-lg bg-background/30 border border-border/30 opacity-60"
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle className="w-3.5 h-3.5 text-profit" />
                          <div>
                            <p className="text-sm font-medium text-foreground line-through">
                              {alert.coinName}
                              <span className="text-muted-foreground ml-1">
                                ({alert.symbol.toUpperCase()})
                              </span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {alert.direction === 'above' ? '↑ Above' : '↓ Below'}{' '}
                              {formatPrice(alert.targetPrice)}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => onRemoveAlert(alert.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};
