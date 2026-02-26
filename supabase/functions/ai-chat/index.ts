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

interface LovableAIResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: string;
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

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      console.error('❌ LOVABLE_API_KEY not found in environment');
      return new Response(
        JSON.stringify({ error: 'Lovable AI API key not configured' }),
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

    // Call Lovable AI Gateway
    console.log('🎯 Calling Lovable AI with Gemini...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(
        'https://ai.gateway.lovable.dev/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: DEFAULT_MODEL,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            max_tokens: MAX_TOKENS,
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      // Handle rate limit errors
      if (response.status === 429) {
        console.error('❌ Rate limit exceeded');
        return new Response(
          JSON.stringify({ 
            error: 'Rate limit exceeded. Please try again in a moment.',
            response: 'I\'m receiving too many requests right now. Please wait a moment and try again.',
            model: 'error'
          }),
          { 
            status: 429, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Handle payment required errors
      if (response.status === 402) {
        console.error('❌ Payment required - credits exhausted');
        return new Response(
          JSON.stringify({ 
            error: 'AI credits exhausted. Please add credits to continue.',
            response: 'The AI service requires additional credits. Please contact support or add credits to your workspace.',
            model: 'error'
          }),
          { 
            status: 402, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Lovable AI error: ${response.status}`, errorText);
        throw new Error(`Lovable AI error: ${response.status}`);
      }

      const data: LovableAIResponse = await response.json();
      console.log('📊 Lovable AI response received');

      const aiResponse = data.choices?.[0]?.message?.content;

      if (aiResponse && aiResponse.length > 10) {
        console.log('✅ Lovable AI successful');
        return new Response(JSON.stringify({ 
          response: aiResponse.trim(),
          model: DEFAULT_MODEL
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      console.log('⚠️ Lovable AI response inadequate, using fallback');
    } catch (error) {
      console.log('❌ Lovable AI failed:', error.message);
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
