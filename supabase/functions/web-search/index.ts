import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    const serpApiKey = Deno.env.get('SERPAPI_KEY');
    
    if (!serpApiKey) {
      throw new Error('SerpAPI key not found');
    }

    // Use SerpAPI to get real-time search results
    const searchUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(query + ' cryptocurrency crypto')}&api_key=${serpApiKey}&num=5`;
    
    const response = await fetch(searchUrl);
    const data = await response.json();
    
    console.log('SerpAPI Response:', data);

    if (data.error) {
      throw new Error(data.error);
    }

    // Extract relevant search results
    const organicResults = data.organic_results || [];
    const newsResults = data.news_results || [];

    return new Response(JSON.stringify({ 
      organic_results: organicResults.slice(0, 3),
      news_results: newsResults.slice(0, 2),
      query: query
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in web-search function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      results: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});