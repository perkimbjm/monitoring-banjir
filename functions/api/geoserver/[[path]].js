export async function onRequest(context) {
  const { request, params } = context;
  const url = new URL(request.url);
  
  // Geoserver target URL base dari netlify.toml
  const targetBase = 'https://dikayuh.banjarmasinkota.go.id/geoserver';
  
  // Ambil path setelah /api/geoserver
  // params.path adalah array jika menggunakan [[path]].js
  const splat = params.path ? `/${params.path.join('/')}` : '';
  const targetUrl = targetBase + splat + url.search;
  
  try {
    // Siapkan body hanya jika bukan GET/HEAD
    let body;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      body = await request.arrayBuffer();
    }

    const modifiedRequest = new Request(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: body,
      redirect: 'follow',
    });

    const response = await fetch(modifiedRequest);
    
    // Copy response
    const newHeaders = new Headers(response.headers);
    // Pastikan content-encoding dan content-length tidak konflik jika body diubah, 
    // tapi di sini kita hanya forward. Cloudflare biasanya menangani ini.
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: "Geoserver proxy error", 
      details: error.message 
    }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
}
