function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

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

    if (!env.OPENROUTER_API_KEY) {
      return new Response(JSON.stringify({ error: 'API 키가 설정되지 않았습니다.' }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = arrayBufferToBase64(arrayBuffer);
    const mimeType = file.type || 'image/jpeg';

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://test1-4w0.pages.dev',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp:free',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64}` },
            },
            {
              type: 'text',
              text: `You are an expert Optical Music Recognition (OMR) system. Analyze this sheet music image and convert it to valid MusicXML 4.0 format.

Follow these steps carefully:
1. Identify: clef (treble/bass/alto/tenor), key signature (sharps/flats count), time signature (e.g. 4/4, 3/4)
2. Read every note: pitch (C4, D5, etc.), duration (whole/half/quarter/eighth/sixteenth), accidentals, dots
3. Read every rest and its duration
4. Identify barlines and group notes into correct measures
5. Note ties, slurs, dynamics (pp p mp mf f ff), tempo markings, articulations (staccato, accent, etc.)
6. For multiple staves (piano grand staff etc.), handle each part correctly

Generate complete, valid MusicXML. The XML must be well-formed and playable.

CRITICAL: Output ONLY the raw MusicXML starting with <?xml version="1.0" encoding="UTF-8"?>
Do NOT wrap in markdown code blocks. Do NOT add any explanation before or after.`,
            },
          ],
        }],
        max_tokens: 8192,
        temperature: 0.1,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error?.message || 'OpenRouter API 오류');
    }

    let musicXml = data.choices?.[0]?.message?.content?.trim();

    if (!musicXml) {
      throw new Error('악보 변환에 실패했습니다.');
    }

    musicXml = musicXml.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();

    if (!musicXml.startsWith('<?xml')) {
      throw new Error('유효하지 않은 MusicXML이 생성되었습니다.');
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
