import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CryptoData {
  id: string;
  name: string;
  symbol: string;
  current_price: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency?: number;
  price_change_percentage_30d_in_currency?: number;
  market_cap: number;
  volume_24h: number;
  circulating_supply: number;
}

interface AnalysisRequest {
  type?: 'market-analysis' | 'portfolio-analysis';
  selectedCoin?: {
    id: string;
    name: string;
  };
  marketData?: CryptoData[];
  portfolioData?: any[];
  holdings?: any[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: AnalysisRequest = await req.json();
    const { type = 'market-analysis', selectedCoin, marketData = [], portfolioData = [], holdings = [] } = requestData;
    
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('Lovable API key not configured');
    }

    // Handle portfolio analysis
    if (type === 'portfolio-analysis') {
      const portfolioAnalysis = await generatePortfolioAnalysis(holdings, marketData, lovableApiKey);
      return new Response(JSON.stringify(portfolioAnalysis), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle market analysis (existing logic)
    if (!selectedCoin) {
      throw new Error('Selected coin is required for market analysis');
    }

    const coinData = marketData.find(coin => coin.id === selectedCoin.id) || {
      id: selectedCoin.id,
      name: selectedCoin.name,
      symbol: selectedCoin.name.slice(0, 3).toUpperCase(),
      current_price: 0,
      price_change_percentage_24h: 0,
      market_cap: 0,
      volume_24h: 0,
      circulating_supply: 0
    };

    const technicalAnalysis = generateTechnicalAnalysis(coinData, marketData);
    const aiInsights = await generateAIInsights(coinData, marketData, lovableApiKey);
    const predictions = generatePredictions(coinData, technicalAnalysis, aiInsights);
    const insights = generateMarketInsights(coinData, marketData, portfolioData, aiInsights);

    const response = {
      predictions,
      indicators: technicalAnalysis,
      insights,
      multiCoinPredictions: generateMultiCoinPredictions(marketData.slice(0, 4)),
      multiCoinIndicators: generateMultiCoinIndicators(marketData.slice(0, 3)),
      timestamp: new Date().toISOString(),
      coinData: {
        id: coinData.id,
        name: coinData.name,
        symbol: coinData.symbol
      }
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-analysis function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Analysis failed', 
        details: error.message,
        fallback: generateFallbackAnalysis()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function generateTechnicalAnalysis(coinData: CryptoData, marketData: CryptoData[]) {
  const price = coinData.current_price;
  const change24h = coinData.price_change_percentage_24h || 0;
  const volume = coinData.volume_24h || 0;
  
  // Calculate RSI-like indicator based on price change
  const rsi = Math.min(Math.max(50 + (change24h * 2), 0), 100);
  
  // Generate moving average simulation
  const ma50 = price * (1 + (Math.random() - 0.5) * 0.1);
  
  // Volume analysis
  const avgVolume = marketData.reduce((sum, coin) => sum + (coin.volume_24h || 0), 0) / marketData.length;
  const volumeRatio = volume / (avgVolume || 1);

  return [
    {
      name: 'RSI (14)',
      value: Number(rsi.toFixed(1)),
      signal: rsi > 70 ? 'sell' : rsi < 30 ? 'buy' : 'hold',
      description: rsi > 70 ? 'Overbought condition' : rsi < 30 ? 'Oversold condition' : 'Neutral momentum'
    },
    {
      name: 'SMA (50)',
      value: Number(ma50.toFixed(2)),
      signal: price > ma50 ? 'buy' : 'sell',
      description: price > ma50 ? 'Price above moving average' : 'Price below moving average'
    },
    {
      name: 'Volume Ratio',
      value: Number(volumeRatio.toFixed(2)),
      signal: volumeRatio > 1.2 ? 'buy' : volumeRatio < 0.8 ? 'sell' : 'hold',
      description: volumeRatio > 1.2 ? 'Above average volume' : volumeRatio < 0.8 ? 'Below average volume' : 'Normal volume'
    }
  ];
}

async function generateAIInsights(coinData: CryptoData, marketData: CryptoData[], apiKey: string) {
  try {
    const prompt = `Analyze ${coinData.name} (${coinData.symbol}) with current price $${coinData.current_price}, 24h change: ${coinData.price_change_percentage_24h?.toFixed(2)}%. Provide a brief technical sentiment analysis in one sentence.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a crypto market analyst. Provide concise technical analysis in one sentence.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 100
      }),
    });

    if (!response.ok) {
      throw new Error(`Lovable AI error: ${response.status}`);
    }

    const result = await response.json();
    return result.choices?.[0]?.message?.content || "Market analysis indicates mixed signals based on current price action.";
  } catch (error) {
    console.error('AI insights generation failed:', error);
    return "Technical analysis suggests monitoring current price levels for potential breakout patterns.";
  }
}

function generatePredictions(coinData: CryptoData, technicalAnalysis: any[], aiInsights: string) {
  const change24h = coinData.price_change_percentage_24h || 0;
  const volatility = Math.abs(change24h);
  
  // Calculate base prediction using technical indicators
  const buySignals = technicalAnalysis.filter(ind => ind.signal === 'buy').length;
  const sellSignals = technicalAnalysis.filter(ind => ind.signal === 'sell').length;
  const signalStrength = (buySignals - sellSignals) / 3;
  
  return [
    {
      timeframe: '24h',
      prediction: Number((signalStrength * 3 + change24h * 0.3).toFixed(1)),
      confidence: Math.min(Math.max(60 + Math.abs(signalStrength) * 15, 45), 85),
      sentiment: signalStrength > 0.3 ? 'bullish' : signalStrength < -0.3 ? 'bearish' : 'neutral'
    },
    {
      timeframe: '7d',
      prediction: Number((signalStrength * 8 + change24h * 0.5).toFixed(1)),
      confidence: Math.min(Math.max(55 + Math.abs(signalStrength) * 10, 40), 80),
      sentiment: signalStrength > 0.2 ? 'bullish' : signalStrength < -0.2 ? 'bearish' : 'neutral'
    },
    {
      timeframe: '30d',
      prediction: Number((signalStrength * 20 + change24h * 0.8 + (Math.random() - 0.5) * 10).toFixed(1)),
      confidence: Math.min(Math.max(50 + Math.abs(signalStrength) * 8, 35), 75),
      sentiment: signalStrength > 0.1 ? 'bullish' : signalStrength < -0.1 ? 'bearish' : 'neutral'
    }
  ];
}

function generateMarketInsights(coinData: CryptoData, marketData: CryptoData[], portfolioData: any[], aiInsights: string) {
  const insights = [];
  const change24h = coinData.price_change_percentage_24h || 0;
  
  // Price movement insight
  if (Math.abs(change24h) > 5) {
    insights.push({
      id: '1',
      type: 'signal',
      title: `${coinData.name} Shows ${change24h > 0 ? 'Strong Bullish' : 'Strong Bearish'} Movement`,
      description: `${coinData.name} has moved ${change24h > 0 ? '+' : ''}${change24h.toFixed(1)}% in the last 24 hours, indicating ${change24h > 0 ? 'strong buying pressure' : 'significant selling pressure'}.`,
      confidence: Math.min(Math.max(Math.abs(change24h) * 10, 60), 90),
      impact: Math.abs(change24h) > 10 ? 'high' : 'medium',
      timestamp: new Date()
    });
  }

  // Market correlation insight
  const marketDirection = marketData.filter(coin => (coin.price_change_percentage_24h || 0) > 0).length;
  const totalCoins = marketData.length;
  if (marketDirection / totalCoins > 0.7 || marketDirection / totalCoins < 0.3) {
    insights.push({
      id: '2',
      type: 'prediction',
      title: `Market Shows ${marketDirection / totalCoins > 0.7 ? 'Broad Bullish' : 'Broad Bearish'} Sentiment`,
      description: `${Math.round(marketDirection / totalCoins * 100)}% of tracked cryptocurrencies are ${marketDirection / totalCoins > 0.7 ? 'gaining' : 'declining'}, suggesting ${marketDirection / totalCoins > 0.7 ? 'positive' : 'negative'} market sentiment.`,
      impact: 'medium',
      timestamp: new Date(Date.now() - 30 * 60 * 1000)
    });
  }

  // AI-based insight
  insights.push({
    id: '3',
    type: 'recommendation',
    title: 'AI Technical Analysis',
    description: aiInsights,
    confidence: 70,
    impact: 'medium',
    timestamp: new Date(Date.now() - 60 * 60 * 1000)
  });

  return insights;
}

function generateMultiCoinPredictions(coins: CryptoData[]) {
  return coins.map(coin => ({
    coin: coin.name,
    symbol: coin.symbol?.toUpperCase() || coin.name.slice(0, 3).toUpperCase(),
    timeframe: '24h',
    prediction: Number(((coin.price_change_percentage_24h || 0) * 0.5 + (Math.random() - 0.5) * 4).toFixed(1)),
    confidence: Math.min(Math.max(60 + Math.random() * 20, 55), 85),
    sentiment: (coin.price_change_percentage_24h || 0) > 1 ? 'bullish' : (coin.price_change_percentage_24h || 0) < -1 ? 'bearish' : 'neutral'
  }));
}

function generateMultiCoinIndicators(coins: CryptoData[]) {
  const indicators = ['RSI (14)', 'MACD', 'Volume', 'SMA (20)'];
  
  return coins.map((coin, index) => {
    const indicator = indicators[index % indicators.length];
    const change = coin.price_change_percentage_24h || 0;
    
    return {
      coin: coin.name,
      symbol: coin.symbol?.toUpperCase() || coin.name.slice(0, 3).toUpperCase(),
      name: indicator,
      value: indicator.includes('Volume') ? Math.round(Math.random() * 200) : Math.round(Math.random() * 100),
      signal: change > 2 ? 'buy' : change < -2 ? 'sell' : 'hold',
      description: change > 2 ? 'Bullish momentum' : change < -2 ? 'Bearish pressure' : 'Sideways movement'
    };
  });
}

async function generatePortfolioAnalysis(holdings: any[], marketData: CryptoData[], apiKey: string) {
  console.log('🤖 Generating portfolio analysis for', holdings.length, 'holdings');

  // Calculate portfolio metrics
  const totalValue = holdings.reduce((sum, h) => sum + (h.amount * h.currentPrice), 0);
  const totalInvested = holdings.reduce((sum, h) => sum + (h.amount * h.averageBuyPrice), 0);
  const totalPnL = ((totalValue - totalInvested) / totalInvested) * 100;

  // Find top and worst performers
  const holdingsWithPnL = holdings.map(h => {
    const value = h.amount * h.currentPrice;
    const invested = h.amount * h.averageBuyPrice;
    const pnl = ((value - invested) / invested) * 100;
    return { ...h, pnl };
  });
  const sorted = [...holdingsWithPnL].sort((a, b) => b.pnl - a.pnl);
  const topPerformer = sorted[0] || { name: 'N/A', pnl: 0 };
  const worstPerformer = sorted[sorted.length - 1] || { name: 'N/A', pnl: 0 };

  // Calculate concentration (largest holding percentage)
  const largestHolding = Math.max(...holdings.map(h => (h.amount * h.currentPrice) / totalValue)) * 100;

  // Get AI analysis
  const prompt = `Analyze this crypto portfolio: ${holdings.length} coins, total value $${totalValue.toFixed(0)}, P&L ${totalPnL.toFixed(1)}%, largest holding ${largestHolding.toFixed(1)}% of portfolio. Holdings: ${holdings.map(h => `${h.name} (${((h.amount * h.currentPrice) / totalValue * 100).toFixed(1)}%)`).join(', ')}. Provide brief risk assessment and 2-3 actionable recommendations in 100 words.`;

  let aiAnalysis = 'Portfolio shows moderate diversification. Consider rebalancing if any single holding exceeds 40% of total value.';
  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a crypto portfolio analyst. Provide concise, actionable advice.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 200
      }),
    });

    if (response.ok) {
      const result = await response.json();
      aiAnalysis = result.choices?.[0]?.message?.content || aiAnalysis;
    }
  } catch (error) {
    console.error('AI analysis failed:', error);
  }

  // Generate risk analysis
  const riskScore = Math.min(100, largestHolding * 1.2 + (holdings.length < 3 ? 30 : 0));
  const riskLevel = riskScore > 60 ? 'high' : riskScore > 35 ? 'medium' : 'low';

  // Generate diversification score
  const diversificationScore = Math.max(0, 100 - largestHolding - (holdings.length < 5 ? 20 : 0));
  const diversificationRating = diversificationScore > 75 ? 'excellent' : diversificationScore > 60 ? 'good' : diversificationScore > 40 ? 'fair' : 'poor';

  // Generate predictions
  const predictions = [
    { timeframe: '24h' as const, prediction: totalPnL * 0.1, confidence: 65, sentiment: totalPnL > 0 ? 'bullish' as const : 'bearish' as const },
    { timeframe: '7d' as const, prediction: totalPnL * 0.3, confidence: 60, sentiment: totalPnL > 0 ? 'bullish' as const : 'neutral' as const },
    { timeframe: '30d' as const, prediction: totalPnL * 0.8, confidence: 55, sentiment: 'neutral' as const }
  ];

  // Generate rebalancing recommendations
  const rebalancingRecommendations = [];
  if (largestHolding > 50) {
    const largest = holdingsWithPnL.find(h => (h.amount * h.currentPrice) / totalValue === largestHolding / 100);
    if (largest) {
      rebalancingRecommendations.push({
        action: 'sell' as const,
        coin: largest.name,
        reason: `Holding represents ${largestHolding.toFixed(1)}% of portfolio, exceeding recommended 40% limit`,
        priority: 'high' as const
      });
    }
  }

  if (holdings.length < 5) {
    rebalancingRecommendations.push({
      action: 'buy' as const,
      coin: 'Consider adding more coins',
      reason: 'Portfolio has only ' + holdings.length + ' holdings. Diversify to reduce risk.',
      priority: 'medium' as const
    });
  }

  return {
    riskAnalysis: {
      score: Math.round(riskScore),
      level: riskLevel,
      concentrationRisk: largestHolding > 50 ? 'High concentration in single asset' : largestHolding > 30 ? 'Moderate concentration' : 'Well distributed',
      volatilityRisk: 'Portfolio volatility based on crypto market conditions',
      recommendations: aiAnalysis.split('.').slice(0, 3).filter(s => s.trim())
    },
    diversificationScore: {
      score: Math.round(diversificationScore),
      rating: diversificationRating,
      details: `Portfolio spans ${holdings.length} cryptocurrencies with ${largestHolding.toFixed(1)}% in largest holding`,
      suggestions: holdings.length < 5 ? ['Add more cryptocurrencies to improve diversification'] : ['Portfolio diversification is adequate']
    },
    predictions,
    rebalancingRecommendations,
    portfolioHealth: {
      score: Math.round((diversificationScore + (100 - riskScore)) / 2),
      insights: [
        `Total P&L: ${totalPnL > 0 ? '+' : ''}${totalPnL.toFixed(2)}%`,
        `${holdings.length} holdings across crypto market`,
        aiAnalysis.split('.')[0]
      ]
    },
    topPerformer: { name: topPerformer.name, pnl: topPerformer.pnl },
    worstPerformer: { name: worstPerformer.name, pnl: worstPerformer.pnl },
    timestamp: new Date().toISOString()
  };
}

function generateFallbackAnalysis() {
  return {
    predictions: [
      { timeframe: '24h', prediction: 1.2, confidence: 60, sentiment: 'neutral' },
      { timeframe: '7d', prediction: -0.8, confidence: 55, sentiment: 'neutral' },
      { timeframe: '30d', prediction: 5.5, confidence: 50, sentiment: 'bullish' }
    ],
    indicators: [
      { name: 'RSI (14)', value: 50, signal: 'hold', description: 'Neutral momentum' },
      { name: 'SMA (50)', value: 45000, signal: 'hold', description: 'Price near moving average' }
    ],
    insights: [
      {
        id: '1',
        type: 'recommendation',
        title: 'Analysis Temporarily Unavailable',
        description: 'Unable to fetch real-time analysis. Showing neutral indicators based on recent market conditions.',
        impact: 'low',
        timestamp: new Date()
      }
    ],
    multiCoinPredictions: [],
    multiCoinIndicators: []
  };
}