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

    const apiKey = env.ANTHROPIC_API_KEY || env.CLAUDE_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API 키가 설정되지 않았습니다.' }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = arrayBufferToBase64(arrayBuffer);
    const mediaType = file.type || 'image/jpeg';

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-8',
        max_tokens: 16000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
            {
              type: 'text',
              text: `You are a professional music engraver and OMR (Optical Music Recognition) expert. Carefully analyze this sheet music image and generate valid, error-free MusicXML 4.0.

STEP 1 — READ THE SCORE:
- Clef: identify treble/bass/alto/tenor for each staff
- Key signature: count sharps or flats exactly
- Time signature: read numerator and denominator (e.g. 4/4, 3/4, 6/8)
- Pickup measure (anacrusis): if the first measure is incomplete, mark it with implicit="yes" and include only the beats present
- Count every barline to determine exact measure count
- For each note: step (C D E F G A B), octave (use 2–6 range), duration type, dots, accidentals, ties
- For each rest: duration type and dots
- Verify each measure's total duration equals the time signature before proceeding

STEP 2 — MUSICXML RULES:
- Use <divisions>4</divisions> (quarter note = 4 divisions)
- Duration values: whole=16, half=8, quarter=4, eighth=2, 16th=1, dotted quarter=6, dotted half=12, dotted eighth=3
- Every <note> must have: <pitch> (or <rest/>), <duration>, <type>
- Pickup measure: <measure number="0" implicit="yes">
- Each measure's note durations must sum exactly to (divisions × beats-per-measure)
- Valid octaves: 2 through 6 for most instruments (never 0 or 1 for treble clef)
- Ties: add <tie type="start"/> and <notations><tied type="start"/></notations> on first note, <tie type="stop"/> on second

STEP 3 — OUTPUT:
Return ONLY the raw MusicXML. No markdown. No explanation. Start with:
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">`,
            },
          ],
        }],
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error?.message || `Anthropic API 오류 (${res.status})`);
    }

    let musicXml = data.content?.find(b => b.type === 'text')?.text?.trim() || '';
    musicXml = musicXml.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();

    if (!musicXml.startsWith('<?xml')) {
      return new Response(JSON.stringify({
        error: '유효하지 않은 MusicXML이 생성되었습니다.',
        raw: musicXml.slice(0, 300),
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
