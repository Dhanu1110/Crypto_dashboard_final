import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProxyRequest {
  url: string;
}

function isAllowedUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    // Only allow CoinGecko public API v3
    return (
      (u.hostname === 'api.coingecko.com' || u.hostname.endsWith('.coingecko.com')) &&
      u.pathname.startsWith('/api/v3')
    );
  } catch {
    return false;
  }
}

// Simple timeout helper
async function fetchWithTimeout(resource: string, options: RequestInit = {}, timeout = 15000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(resource, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(id);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { url }: ProxyRequest = await req.json();

    if (!url || !isAllowedUrl(url)) {
      return new Response(JSON.stringify({ error: 'Invalid or disallowed URL' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const upstream = await fetchWithTimeout(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    }, 20000);

    const data = await upstream.json();

    return new Response(JSON.stringify(data), {
      status: upstream.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=30, s-maxage=60',
      },
    });
  } catch (error) {
    console.error('coingecko-proxy error', error);
    return new Response(JSON.stringify({ error: 'Proxy failed' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
