export async function onRequestGet() {
  return new Response(JSON.stringify({ ok: true, from: "pages-functions" }), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}