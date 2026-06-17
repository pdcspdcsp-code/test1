export async function onRequestPost(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  try {
    const formData = await request.formData();
    const file = formData.get('image');

    if (!file) {
      return new Response(JSON.stringify({ error: '이미지를 업로드해주세요.' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    if (!env.AI) {
      return new Response(JSON.stringify({ error: 'AI 바인딩이 설정되지 않았습니다. wrangler.toml에 [ai] 설정이 필요합니다.' }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const prompt = `You are an expert Optical Music Recognition (OMR) system. Analyze this sheet music image and convert it to valid MusicXML 4.0 format.

Follow these steps:
1. Identify clef, key signature, and time signature
2. Read every note: pitch (C4, D5, etc.), duration (whole/half/quarter/eighth/sixteenth), accidentals, dots
3. Read every rest and its duration
4. Identify barlines and group notes into measures
5. Note dynamics, articulations, ties, slurs if visible

Output ONLY raw MusicXML starting with <?xml version="1.0" encoding="UTF-8"?>
Do NOT use markdown code blocks. No explanation before or after.`;

    const response = await env.AI.run('@cf/llava-1.5-7b-hf', {
      image: [...uint8Array],
      prompt,
      max_tokens: 4096,
    });

    let musicXml = (response.description || response.response || '').trim();
    musicXml = musicXml.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();

    if (!musicXml.startsWith('<?xml')) {
      return new Response(JSON.stringify({
        error: '유효하지 않은 MusicXML이 생성되었습니다.',
        raw: musicXml.slice(0, 500),
      }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ musicXml }), { headers: corsHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ error: '서버 오류: ' + error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
