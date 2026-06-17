export async function onRequestGet(context) {
  const { env } = context;
  const keys = Object.keys(env);
  const hasGeminiKey = !!env.GEMINI_API_KEY;
  const keyPreview = env.GEMINI_API_KEY
    ? env.GEMINI_API_KEY.slice(0, 8) + '...'
    : '(없음)';

  return new Response(JSON.stringify({
    envKeys: keys,
    hasGeminiKey,
    keyPreview,
  }, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
}
