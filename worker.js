export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Upload file
    if (request.method === 'POST' && path === '/upload') {
      try {
        const data = await request.json();
        const code = data.code;
        const payload = JSON.stringify(data);
        
        // Store in KV with 24 hour expiration
        await env.FILE_STORAGE.put(code, payload, { expirationTtl: 86400 });
        
        return new Response(JSON.stringify({ success: true, code }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Download file
    if (request.method === 'GET' && path.startsWith('/download/')) {
      try {
        const code = path.split('/')[2];
        const data = await env.FILE_STORAGE.get(code);
        
        if (!data) {
          return new Response(JSON.stringify({ error: 'Files not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        return new Response(data, {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response('File Share API', { headers: corsHeaders });
  }
};
