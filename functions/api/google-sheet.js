export async function onRequest(context) {
  const { request } = context;
  
  // URL script Google Apps Script dari netlify.toml
  const targetUrl = 'https://script.google.com/macros/s/AKfycbwXf765Dm8vSlwfMvEC1OR_tUExynqAuFQtooQyWNMtLIZhOfgLuAkuMSIaFoQNU-Mb/exec';

  try {
    // Forward request ke Google Script
    // Ambil query string dari URL asli
    const url = new URL(request.url);
    const searchParams = url.search;
    
    // Siapkan body jika ada (untuk POST)
    let body;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      body = await request.arrayBuffer();
    }

    const modifiedRequest = new Request(targetUrl + searchParams, {
      method: request.method,
      headers: request.headers,
      body: body,
      redirect: 'follow' // Penting untuk Google Script
    });

    const response = await fetch(modifiedRequest);
    
    // Kembalikan response asli
    // Kita buat response baru untuk memastikan headers bisa dimodifikasi jika perlu
    const responseHeaders = new Headers(response.headers);
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: "Proxy error", 
      details: error.message 
    }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
}