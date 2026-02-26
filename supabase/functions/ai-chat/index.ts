import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration constants
const REQUEST_TIMEOUT_MS = 15000;
const DEFAULT_MODEL = 'google/gemini-2.5-flash';
const MAX_TOKENS = 500;

interface ChatRequest {
  message: string;
  cryptoContext?: string; // Full context string with market and portfolio data
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🤖 AI chat request received');
    
    const { message, cryptoContext }: ChatRequest = await req.json();
    
    if (!message || typeof message !== 'string') {
      console.error('❌ Invalid message parameter');
      return new Response(
        JSON.stringify({ error: 'Message parameter is required and must be a string' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      console.error('❌ GEMINI_API_KEY not found in environment');
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`💬 Processing message: "${message.substring(0, 50)}..."`);

    // Use the full crypto context string (includes market data and portfolio)
    const contextPrompt = cryptoContext || '';
    console.log('📊 Context length:', contextPrompt.length, 'chars');

    const systemPrompt = `You are a helpful cryptocurrency portfolio assistant. Use the provided market and portfolio context to give personalized, actionable advice. Be concise but informative. Always reference the user's actual portfolio data when analyzing their holdings.`;
    const userPrompt = contextPrompt ? `${contextPrompt}\n\nUser question: ${message}` : message;

    // Call Gemini API
    console.log('🎯 Calling Gemini API...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  { text: systemPrompt + '\n\n' + userPrompt }
                ]
              }
            ],
            generationConfig: {
              maxOutputTokens: MAX_TOKENS,
            }
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Gemini error: ${response.status}`, errorText);
        throw new Error(`Gemini error: ${response.status}`);
      }

      const data = await response.json();
      console.log('📊 Gemini response received');

      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (aiResponse && aiResponse.length > 10) {
        console.log('✅ Gemini successful');
        return new Response(JSON.stringify({ 
          response: aiResponse.trim(),
          model: DEFAULT_MODEL
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      console.log('⚠️ Gemini response inadequate, using fallback');
    } catch (error) {
      console.log('❌ Gemini failed:', error.message);
    }

    // Fallback responses based on keywords
    console.log('🔄 Using predefined responses');
    
    const keywords = message.toLowerCase();
    let fallbackResponse = '';
    
    if (keywords.includes('bitcoin') || keywords.includes('btc')) {
      fallbackResponse = 'Bitcoin is the world\'s first cryptocurrency and digital gold. It\'s often used as a store of value and hedge against inflation.';
    } else if (keywords.includes('ethereum') || keywords.includes('eth')) {
      fallbackResponse = 'Ethereum is a blockchain platform that enables smart contracts and decentralized applications (dApps). It\'s the foundation for much of DeFi.';
    } else if (keywords.includes('price') || keywords.includes('cost')) {
      fallbackResponse = 'Crypto prices are highly volatile and depend on many factors like adoption, regulation, and market sentiment. Always check current prices from reliable sources.';
    } else if (keywords.includes('invest') || keywords.includes('buy')) {
      fallbackResponse = 'Cryptocurrency investing carries significant risk. Consider your risk tolerance, do research, and never invest more than you can afford to lose.';
    } else {
      fallbackResponse = 'I\'m having trouble with AI services right now. For real-time crypto data, try asking about specific coin prices or market trends!';
    }

    return new Response(JSON.stringify({ 
      response: fallbackResponse,
      model: 'fallback'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('🚨 AI chat error:', error);
    
    return new Response(JSON.stringify({ 
      error: 'AI service temporarily unavailable',
      response: 'I\'m experiencing technical difficulties. Please try asking about crypto prices, market analysis, or portfolio management!',
      model: 'error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
