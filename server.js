require('dotenv').config();
const express = require('express');
const multer = require('multer');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('이미지 파일만 업로드 가능합니다.'));
  }
});

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.use(express.static('public'));

app.post('/api/convert', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '이미지를 업로드해주세요.' });
  }

  const imageBase64 = req.file.buffer.toString('base64');
  const mediaType = req.file.mimetype;

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: imageBase64 }
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
Do NOT wrap in markdown code blocks. Do NOT add any explanation before or after.`
          }
        ]
      }]
    });

    const textBlock = response.content.find(b => b.type === 'text');
    if (!textBlock) {
      return res.status(500).json({ error: '악보 변환에 실패했습니다.' });
    }

    let musicXml = textBlock.text.trim();
    // Strip markdown code fences if model included them
    musicXml = musicXml.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();

    if (!musicXml.startsWith('<?xml')) {
      return res.status(500).json({ error: '유효하지 않은 MusicXML이 생성되었습니다.' });
    }

    res.json({ musicXml });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다: ' + error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`ScoreAI 서버 실행 중: http://localhost:${PORT}`);
});
