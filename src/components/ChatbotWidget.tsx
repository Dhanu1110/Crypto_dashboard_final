import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, X, Bot, User, Search } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useCryptoData } from '@/hooks/useCryptoData';
import { usePortfolioContext } from '@/contexts/PortfolioContext';


interface ChatMessage {
  id: string;
  type: 'user' | 'bot' | 'search';
  content: string;
  timestamp: Date;
  searchResults?: SearchResult[];
}

interface SearchResult {
  title: string;
  snippet: string;
  link: string;
  type: 'organic' | 'news';
  date?: string;
}

export const ChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'bot',
      content: 'Hi! I\'m your AI crypto assistant with web search and portfolio analysis. I can:\n• Analyze your portfolio (ask "analyze my portfolio" or "portfolio risk")\n• Check market prices and trends\n• Search for latest crypto news (type "search:" + your query)\n• Provide trading insights and recommendations\n\nTry asking about your portfolio performance, diversification, or get market updates!',
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get real crypto data - these will update automatically
  const { topCryptos, globalData, trendingCoins } = useCryptoData();
  const portfolioData = usePortfolioContext();

  // Track portfolio changes for chatbot context synchronization
  const [portfolioContext, setPortfolioContext] = useState({ 
    holdings: portfolioData.holdings, 
    summary: portfolioData.summary 
  });

  const [portfolioVersion, setPortfolioVersion] = useState(0);

  // Listen for cross-component portfolio updates
  useEffect(() => {
    const onUpdate = () => {
      setPortfolioContext({
        holdings: portfolioData.holdings,
        summary: portfolioData.summary,
      });
      setPortfolioVersion(v => v + 1);
    };
    window.addEventListener('portfolio:updated', onUpdate);
    return () => window.removeEventListener('portfolio:updated', onUpdate);
  }, [portfolioData.holdings, portfolioData.summary]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, portfolioVersion]);

  // Synchronize portfolio context when portfolio data changes
  useEffect(() => {
    console.log('🔄 Portfolio data changed, updating chatbot context:', {
      previousCount: portfolioContext.holdings.length,
      newCount: portfolioData.holdings.length,
      holdings: portfolioData.holdings.map(h => ({ name: h.name, amount: h.amount }))
    });
    
    setPortfolioContext({
      holdings: portfolioData.holdings,
      summary: portfolioData.summary
    });
  }, [portfolioData.holdings, portfolioData.summary]);

  // Force chatbot to use fresh portfolio data (always from hook state)
  const getFreshPortfolioData = () => {
    const holdings = portfolioContext.holdings || [];
    const summary = portfolioContext.summary || {
      totalValue: 0,
      totalInvestment: 0,
      totalPnL: 0,
      totalPnLPercentage: 0,
      dayChangePercentage: 0
    };

    console.log('📊 Using portfolio hook context:', {
      uniqueCoins: holdings.length > 0 ? new Set(holdings.map((h: any) => h.coinId)).size : 0,
      holdingsCount: holdings.length,
    });

    return { holdings, summary };
  };

  // Web search function
  const performWebSearch = async (query: string): Promise<SearchResult[]> => {
    try {
      console.log('🔍 Performing web search...');
      const { data, error } = await supabase.functions.invoke('web-search', {
        body: { query }
      });

      if (error) {
        console.error('❌ Web search error:', error);
        throw new Error(error.message || 'Search failed');
      }

      if (!data || !data.organic_results) {
        throw new Error('No search results received');
      }

      console.log('✅ Web search completed:', data.total_results, 'results');
      
      // Combine organic and news results
      const organicResults = (data.organic_results || []).map((result: any) => ({
        title: result.title,
        snippet: result.snippet,
        link: result.link,
        type: 'organic' as const
      }));
      
      const newsResults = (data.news_results || []).map((result: any) => ({
        title: result.title,
        snippet: result.snippet,
        link: result.link,
        type: 'news' as const
      }));
      
      return [...organicResults, ...newsResults];
    } catch (error) {
      console.error('❌ Web search failed:', error);
      throw error;
    }
  };

  // Generate crypto market context
  const getCryptoContext = () => {
    const { holdings, summary } = getFreshPortfolioData();
    console.log('🤖 Generating crypto context with portfolio data:', { 
      holdingsCount: holdings.length, 
      holdings: holdings.map(h => ({ name: h.name, symbol: h.symbol, amount: h.amount })), 
      totalValue: summary.totalValue,
      portfolioContextTimestamp: Date.now()
    });
    
    const topCoinsText = topCryptos.slice(0, 10).map(coin => 
      `${coin.name} (${coin.symbol.toUpperCase()}): $${coin.current_price.toFixed(2)} (${coin.price_change_percentage_24h > 0 ? '+' : ''}${coin.price_change_percentage_24h?.toFixed(2)}%)`
    ).join(', ');

    // Detailed portfolio context
    let portfolioText = 'Portfolio: Empty';
    if (Array.isArray(holdings) && holdings.length > 0) {
      const uniqueCoins = new Set(holdings.map(h => h.coinId)).size;
      const holdingsDetails = holdings.map(holding => {
        const currentValue = holding.amount * holding.currentPrice;
        const investmentValue = holding.amount * holding.averageBuyPrice;
        const pnl = ((currentValue - investmentValue) / investmentValue) * 100;
        return `${holding.name} (${holding.symbol}): ${holding.amount} coins, bought at $${holding.averageBuyPrice.toFixed(2)}, now $${holding.currentPrice.toFixed(2)}, value $${currentValue.toFixed(2)} (${pnl > 0 ? '+' : ''}${pnl.toFixed(2)}% P&L)`;
      }).join('; ');
      
      portfolioText = `Portfolio Summary: ${uniqueCoins} coins, Total Value: $${summary.totalValue.toFixed(2)}, Total Investment: $${summary.totalInvestment.toFixed(2)}, Overall P&L: ${summary.totalPnLPercentage > 0 ? '+' : ''}${summary.totalPnLPercentage.toFixed(2)}%, Day Change: ${summary.dayChangePercentage > 0 ? '+' : ''}${summary.dayChangePercentage.toFixed(2)}%. Holdings: ${holdingsDetails}`;
    }

    const marketSentiment = globalData?.market_cap_change_percentage_24h_usd 
      ? globalData.market_cap_change_percentage_24h_usd > 0 ? 'bullish' : 'bearish'
      : 'neutral';

    return `Current crypto market context:
Market cap change 24h: ${globalData?.market_cap_change_percentage_24h_usd?.toFixed(2)}% (${marketSentiment})
Top cryptocurrencies: ${topCoinsText}
${portfolioText}
Trending: ${trendingCoins.slice(0, 5).map(coin => coin.name).join(', ')}`;
  };

  // Generate AI response using backend
  const generateAIResponse = async (userMessage: string): Promise<string> => {
    try {
      const cryptoContext = getCryptoContext();
      
      console.log('🤖 Generating AI response...');
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { 
          message: userMessage,
          cryptoContext 
        }
      });

      if (error) {
        console.error('❌ AI chat error:', error);
        return getFallbackResponse(userMessage);
      }

      if (data?.response) {
        console.log('✅ AI response received');
        return data.response;
      }

      return getFallbackResponse(userMessage);
    } catch (error) {
      console.error('❌ Failed to generate AI response:', error);
      return getFallbackResponse(userMessage);
    }
  };

  // Fallback responses using real data
  const getFallbackResponse = (userMessage: string): string => {
    const messageWords = userMessage.toLowerCase();
    const { holdings, summary } = getFreshPortfolioData();
    
    // Portfolio risk analysis
    if (messageWords.includes('risk') && messageWords.includes('portfolio')) {
      if (!holdings || holdings.length === 0) {
        return 'You don\'t have any holdings yet. Add cryptocurrencies to your portfolio to get risk analysis!';
      }
      
      const totalValue = holdings.reduce((sum, h) => sum + (h.amount * h.currentPrice), 0);
      const largestHolding = Math.max(...holdings.map(h => (h.amount * h.currentPrice) / totalValue)) * 100;
      const riskLevel = largestHolding > 50 ? 'HIGH' : largestHolding > 30 ? 'MEDIUM' : 'LOW';
      
      return `Portfolio Risk Assessment 🛡️\n\nRisk Level: ${riskLevel}\nDiversification: ${holdings.length} coins\nLargest Position: ${largestHolding.toFixed(1)}%\n\n${largestHolding > 50 ? '⚠️ High concentration risk! Consider rebalancing.' : holdings.length < 3 ? '💡 Add more coins to reduce risk.' : '✅ Good diversification!'}`;
    }

    // Portfolio diversification
    if (messageWords.includes('diversif') || (messageWords.includes('portfolio') && messageWords.includes('balance'))) {
      if (!holdings || holdings.length === 0) {
        return 'Add holdings to analyze diversification. Aim for 5-8 different cryptocurrencies for good diversification!';
      }
      
      const totalValue = holdings.reduce((sum, h) => sum + (h.amount * h.currentPrice), 0);
      const breakdown = holdings.map(h => {
        const percentage = (h.amount * h.currentPrice) / totalValue * 100;
        return `${h.name}: ${percentage.toFixed(1)}%`;
      }).join(', ');
      
      return `Portfolio Breakdown 🥧\n\n${breakdown}\n\n${holdings.length < 3 ? '💡 Consider adding more coins (aim for 5-8)' : holdings.length > 10 ? '⚠️ Might be over-diversified' : '✅ Good number of holdings'}`;
    }

    // Portfolio rebalance suggestions
    if (messageWords.includes('rebalanc') || messageWords.includes('should i sell') || messageWords.includes('should i buy')) {
      if (!holdings || holdings.length === 0) {
        const topPerformers = topCryptos.slice(0, 3).map(coin => `${coin.name} ($${coin.current_price.toLocaleString()})`).join(', ');
        return `Start by adding: ${topPerformers}. Build a diversified portfolio with 5-8 different coins!`;
      }
      
      const totalValue = holdings.reduce((sum, h) => sum + (h.amount * h.currentPrice), 0);
      const largestHolding = holdings.reduce((max, h) => {
        const value = h.amount * h.currentPrice;
        return value > max.value ? { name: h.name, value, percentage: (value / totalValue) * 100 } : max;
      }, { name: '', value: 0, percentage: 0 });
      
      if (largestHolding.percentage > 50) {
        return `Rebalancing Suggestion 🔄\n\n⚠️ ${largestHolding.name} is ${largestHolding.percentage.toFixed(1)}% of your portfolio. Consider:\n1. Take profits on ${largestHolding.name}\n2. Diversify into other top coins\n3. Aim for max 40% in any single asset`;
      }
      
      return `Portfolio Balance ✅\n\nYour portfolio looks well-balanced! Continue monitoring and rebalance if any coin exceeds 40% of total value. Consider dollar-cost averaging for accumulation.`;
    }

    // Investment and coin recommendation questions
    if (messageWords.includes('invest') || messageWords.includes('should i buy') || messageWords.includes('recommend') || messageWords.includes('what coin')) {
      const topPerformers = topCryptos.slice(0, 5).filter(coin => coin.price_change_percentage_24h && coin.price_change_percentage_24h > 0);
      const topGainer = topCryptos.reduce((max, coin) => 
        (coin.price_change_percentage_24h || 0) > (max.price_change_percentage_24h || 0) ? coin : max
      );
      
      if (topPerformers.length > 0) {
        const performersList = topPerformers.map(coin => 
          `${coin.name} (+${coin.price_change_percentage_24h?.toFixed(2)}%)`
        ).join(', ');
        
        return `Today's top performers: ${performersList}. ${topGainer.name} leads with +${topGainer.price_change_percentage_24h?.toFixed(2)}%. Remember: Past performance doesn't guarantee future results. Consider BTC/ETH for stability, but always DYOR and never invest more than you can afford to lose! 📊⚠️`;
      } else {
        const stableOptions = topCryptos.slice(0, 3).map(coin => 
          `${coin.name} ($${coin.current_price.toLocaleString()})`
        ).join(', ');
        return `Market is mixed today. Consider blue-chips: ${stableOptions}. For beginners, BTC and ETH are safer bets. Always diversify and invest only what you can afford to lose! 🛡️`;
      }
    }

    // Worst performer questions
    if (messageWords.includes('worst') || messageWords.includes('loser') || messageWords.includes('biggest drop') || messageWords.includes('down most')) {
      const worstPerformers = topCryptos.filter(coin => coin.price_change_percentage_24h && coin.price_change_percentage_24h < 0)
        .sort((a, b) => (a.price_change_percentage_24h || 0) - (b.price_change_percentage_24h || 0))
        .slice(0, 5);
      
      if (worstPerformers.length > 0) {
        const worstPerformersList = worstPerformers.map(coin => 
          `${coin.name} (${coin.price_change_percentage_24h?.toFixed(2)}%)`
        ).join(', ');
        
        const biggestLoser = worstPerformers[0];
        return `Today's worst performers: ${worstPerformersList}. ${biggestLoser.name} is down ${Math.abs(biggestLoser.price_change_percentage_24h || 0).toFixed(2)}%. This could be a dip-buying opportunity, but be cautious and check fundamentals first! 📉⚠️`;
      } else {
        return `Great day! No major losers in the top cryptocurrencies today. Most coins are holding steady or gaining. Market sentiment appears positive! 🚀`;
      }
    }

    // Portfolio analysis
    if (messageWords.includes('portfolio') || messageWords.includes('holding') || messageWords.includes('my coins') || messageWords.includes('my crypto') || messageWords.includes('how is my') || messageWords.includes('doing')) {
      console.log('💼 Portfolio analysis request:', { 
        holdingsLength: holdings.length, 
        holdings: holdings.map(h => ({ name: h.name, symbol: h.symbol, amount: h.amount })),
        totalValue: summary.totalValue,
        requestTime: Date.now()
      });
      
      if (!holdings || holdings.length === 0) {
        const suggestedCoins = topCryptos.slice(0, 3).map(coin => `${coin.name} ($${coin.current_price.toLocaleString()})`).join(', ');
        return `You don't have any portfolio holdings yet. Consider starting with blue-chip cryptos: ${suggestedCoins}. Begin with small amounts and dollar-cost average your way in! 🚀`;
      }
      
      const topHolding = holdings.reduce((max, holding) => 
        holding.amount * holding.currentPrice > max.amount * max.currentPrice ? holding : max
      );
      const isProfit = summary.totalPnLPercentage > 0;
      const holdingAnalysis = holdings.map(h => {
        const marketCoin = topCryptos.find(coin => coin.id === h.coinId || coin.symbol.toLowerCase() === h.symbol.toLowerCase());
        const currentPrice = marketCoin?.current_price || h.currentPrice;
        const dayChange = marketCoin?.price_change_percentage_24h || 0;
        const currentValue = h.amount * currentPrice;
        const invested = h.amount * h.averageBuyPrice;
        const pnl = ((currentValue - invested) / invested) * 100;
        return `${h.name}: ${h.amount} coins, $${currentValue.toFixed(0)} value (${pnl > 0 ? '+' : ''}${pnl.toFixed(1)}% P&L, ${dayChange > 0 ? '+' : ''}${dayChange.toFixed(1)}% today)`;
      }).join(' | ');
      
      return `Your Portfolio Analysis 📊\n${holdingAnalysis}\n\nTotal: $${summary.totalValue.toFixed(0)} (${isProfit ? 'Profit' : 'Loss'}: ${summary.totalPnLPercentage.toFixed(1)}%) ${isProfit ? '🚀 Nice gains!' : '📉 Stay strong, markets fluctuate.'}`;
    }

    // Price and market analysis
    if (messageWords.includes('price') || messageWords.includes('market') || messageWords.includes('btc') || messageWords.includes('bitcoin')) {
      const btc = topCryptos.find(coin => coin.symbol === 'btc');
      if (btc) {
        const trend = btc.price_change_percentage_24h && btc.price_change_percentage_24h > 0 ? 'up' : 'down';
        const marketSentiment = globalData?.market_cap_change_percentage_24h_usd && globalData.market_cap_change_percentage_24h_usd > 0 ? 'bullish' : 'bearish';
        return `Bitcoin: $${btc.current_price.toLocaleString()} (${btc.price_change_percentage_24h?.toFixed(2)}% ${trend} today). Market is ${marketSentiment} with ${globalData?.market_cap_change_percentage_24h_usd?.toFixed(2)}% total cap change. ${trend === 'up' ? '📈' : '📉'}`;
      }
    }

    // Ethereum specific
    if (messageWords.includes('eth') || messageWords.includes('ethereum')) {
      const eth = topCryptos.find(coin => coin.symbol === 'eth');
      if (eth) {
        const trend = eth.price_change_percentage_24h && eth.price_change_percentage_24h > 0 ? 'up' : 'down';
        return `Ethereum: $${eth.current_price.toLocaleString()} (${eth.price_change_percentage_24h?.toFixed(2)}% today). ETH is ${trend === 'up' ? 'gaining momentum' : 'consolidating'}. ${trend === 'up' ? '🚀' : '⏳'}`;
      }
    }

    // Trending analysis
    if (messageWords.includes('trending') || messageWords.includes('hot') || messageWords.includes('popular')) {
      const trendingNames = trendingCoins.slice(0, 5).map(coin => coin.name).join(', ');
      return `🔥 Currently trending: ${trendingNames}. These are getting significant attention right now. Always DYOR before investing!`;
    }

    // Trading advice
    if (messageWords.includes('buy') || messageWords.includes('sell') || messageWords.includes('trade')) {
      const marketDirection = globalData?.market_cap_change_percentage_24h_usd && globalData.market_cap_change_percentage_24h_usd > 2 ? 'strong bullish' : 
                            globalData?.market_cap_change_percentage_24h_usd && globalData.market_cap_change_percentage_24h_usd < -2 ? 'bearish' : 'neutral';
      return `Market sentiment is ${marketDirection}. Remember: Never invest more than you can afford to lose, always DCA for volatile assets, and set stop-losses. Consider the 24h market change: ${globalData?.market_cap_change_percentage_24h_usd?.toFixed(2)}%.`;
    }

    // DeFi and altcoins
    if (messageWords.includes('defi') || messageWords.includes('altcoin') || messageWords.includes('alt')) {
      const topAltcoins = topCryptos.slice(2, 7).map(coin => `${coin.name} (${coin.price_change_percentage_24h?.toFixed(1)}%)`).join(', ');
      return `Top altcoins today: ${topAltcoins}. DeFi and altcoins often move with BTC/ETH trends but can be more volatile. Diversification is key! 🔄`;
    }

    // Analysis request
    if (messageWords.includes('analy') || messageWords.includes('insight') || messageWords.includes('predict')) {
      const btc = topCryptos.find(coin => coin.symbol === 'btc');
      const topGainer = topCryptos.reduce((max, coin) => (coin.price_change_percentage_24h || 0) > (max.price_change_percentage_24h || 0) ? coin : max);
      return `Market Analysis: BTC at $${btc?.current_price.toLocaleString()}, top gainer is ${topGainer.name} (+${topGainer.price_change_percentage_24h?.toFixed(2)}%). ${globalData?.market_cap_change_percentage_24h_usd && globalData.market_cap_change_percentage_24h_usd > 0 ? 'Bulls are active' : 'Bears in control'} today. 📊`;
    }

    // Default intelligent response
    const btcPrice = topCryptos.find(coin => coin.symbol === 'btc')?.current_price;
    const marketTrend = globalData?.market_cap_change_percentage_24h_usd && globalData.market_cap_change_percentage_24h_usd > 0 ? 'positive' : 'cautious';
    return `Hi! I can help with crypto analysis using real market data. BTC: $${btcPrice?.toLocaleString()}, market sentiment: ${marketTrend}. Ask me about prices, portfolio, trading strategies, or trending coins! 🚀`;
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentMessage = inputMessage.trim();
    setInputMessage('');
    setIsTyping(true);

    try {
      // Check if it's a search query
      if (currentMessage.toLowerCase().startsWith('search:')) {
        const searchQuery = currentMessage.substring(7).trim();
        const searchResults = await performWebSearch(searchQuery);
        
        const searchResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'search',
          content: `Found ${searchResults.length} results for "${searchQuery}":`,
          timestamp: new Date(),
          searchResults
        };
        
        setMessages(prev => [...prev, searchResponse]);
        
        // Generate AI summary of search results
        if (searchResults.length > 0) {
          const resultsContext = searchResults.map(r => `${r.title}: ${r.snippet}`).join('\n');
          const aiSummary = await generateAIResponse(`Summarize these crypto search results: ${resultsContext}`);
          
          const aiResponse: ChatMessage = {
            id: (Date.now() + 2).toString(),
            type: 'bot',
            content: aiSummary,
            timestamp: new Date(),
          };
          
          setMessages(prev => [...prev, aiResponse]);
        }
      } else {
        // Regular AI chat
        const response = await generateAIResponse(currentMessage);
        const botResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: response,
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, botResponse]);
      }
    } catch (error) {
      console.error('Failed to process message:', error);
      const fallbackResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: getFallbackResponse(currentMessage),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, fallbackResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <motion.div
        className="fixed bottom-6 right-6 z-50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <Button
          onClick={() => setIsOpen(true)}
          className={`w-14 h-14 rounded-full bg-gradient-primary text-primary-foreground shadow-glow hover:shadow-glow/80 ${
            isOpen ? 'hidden' : 'flex'
          } items-center justify-center`}
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      </motion.div>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed bottom-6 right-6 z-50"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <Card className="w-96 h-[500px] bg-gradient-glass border-glass-border backdrop-blur-md shadow-glass flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-glass-border">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
                    <Bot className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">AI Crypto Assistant</h3>
                      <p className="text-xs text-muted-foreground">
                        Online | Portfolio: {new Set(getFreshPortfolioData().holdings.map(h => h.coinId)).size} coins | Web Search Enabled
                      </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="hover:bg-destructive/20"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className={`flex items-start space-x-2 ${
                        message.type === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {message.type === 'bot' && (
                        <div className="w-6 h-6 bg-gradient-primary rounded-full flex items-center justify-center flex-shrink-0">
                          <Bot className="w-3 h-3 text-primary-foreground" />
                        </div>
                      )}
                      {message.type === 'search' && (
                        <div className="w-6 h-6 bg-gradient-ethereum rounded-full flex items-center justify-center flex-shrink-0">
                          <Search className="w-3 h-3 text-white" />
                        </div>
                      )}
                      
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          message.type === 'user'
                            ? 'bg-gradient-primary text-primary-foreground'
                            : message.type === 'search'
                            ? 'bg-gradient-ethereum/10 border border-accent/20'
                            : 'bg-glass border border-glass-border'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        
                        {/* Search Results */}
                        {message.searchResults && message.searchResults.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {message.searchResults.slice(0, 3).map((result, index) => (
                              <div key={index} className="bg-background/50 rounded p-2 text-xs">
                                <a 
                                  href={result.link} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-accent hover:text-accent/80 font-medium block mb-1"
                                >
                                  {result.title}
                                </a>
                                <p className="text-muted-foreground">{result.snippet}</p>
                                {result.date && (
                                  <p className="text-xs text-muted-foreground/70 mt-1">{result.date}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <p className={`text-xs mt-1 ${
                          message.type === 'user' 
                            ? 'text-primary-foreground/70' 
                            : 'text-muted-foreground'
                        }`}>
                          {formatTime(message.timestamp)}
                        </p>
                      </div>

                      {message.type === 'user' && (
                        <div className="w-6 h-6 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-3 h-3 text-secondary-foreground" />
                        </div>
                      )}
                    </motion.div>
                  ))}

                  {/* Typing Indicator */}
                  {isTyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start space-x-2"
                    >
                      <div className="w-6 h-6 bg-gradient-primary rounded-full flex items-center justify-center">
                        <Bot className="w-3 h-3 text-primary-foreground" />
                      </div>
                      <div className="bg-glass border border-glass-border rounded-lg p-3">
                        <div className="flex space-x-1">
                          <motion.div
                            className="w-2 h-2 bg-muted-foreground rounded-full"
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
                          />
                          <motion.div
                            className="w-2 h-2 bg-muted-foreground rounded-full"
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
                          />
                          <motion.div
                            className="w-2 h-2 bg-muted-foreground rounded-full"
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="p-4 border-t border-glass-border">
                <div className="flex space-x-2">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask about crypto or type 'search:' for web results..."
                    className="flex-1 bg-glass border-glass-border"
                    disabled={isTyping}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isTyping}
                    className="bg-gradient-primary text-primary-foreground shadow-glow hover:shadow-glow/80"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};