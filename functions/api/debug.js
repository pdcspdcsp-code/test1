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
    deployedCommit: env.CF_PAGES_COMMIT_SHA,
    model: 'google/gemma-4-31b-it:free',
  }, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
}
