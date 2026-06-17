let currentFile = null;
let currentXml = null;
let osmd = null;

// --- Drag & Drop ---
function handleDragOver(e) {
  e.preventDefault();
  document.getElementById('dropZone').classList.add('drag-over');
}

function handleDragLeave(e) {
  document.getElementById('dropZone').classList.remove('drag-over');
}

function handleDrop(e) {
  e.preventDefault();
  document.getElementById('dropZone').classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    loadFile(file);
  }
}

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) loadFile(file);
}

function loadFile(file) {
  currentFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('previewImg').src = e.target.result;
    document.getElementById('fileName').textContent = file.name;
    show('previewSection');
    hide('uploadSection');
    hide('resultSection');
    hide('errorSection');
    hide('loadingSection');
  };
  reader.readAsDataURL(file);
}

// --- Convert ---
async function convertScore() {
  if (!currentFile) return;

  show('loadingSection');
  hide('previewSection');
  hide('resultSection');
  hide('errorSection');

  const formData = new FormData();
  formData.append('image', currentFile);

  try {
    const res = await fetch('/api/convert', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || '변환 실패');
    }

    currentXml = data.musicXml;
    document.getElementById('xmlPreview').textContent = currentXml;

    hide('loadingSection');
    show('resultSection');

    try {
      await renderScore(currentXml);
    } catch (renderErr) {
      document.getElementById('scoreContainer').innerHTML =
        '<p style="color:#f88;padding:16px">악보 미리보기를 표시할 수 없습니다. MusicXML 파일을 다운로드해서 MuseScore에서 열어보세요.</p>';
    }
  } catch (err) {
    hide('loadingSection');
    document.getElementById('errorMsg').textContent = err.message;
    show('errorSection');
  }
}

// --- OSMD Render ---
async function renderScore(xml) {
  const container = document.getElementById('scoreContainer');
  container.innerHTML = '';

  if (!osmd) {
    osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay(container, {
      autoResize: true,
      drawTitle: true,
      drawSubtitle: true,
      drawComposer: true,
      drawLyricist: true,
      drawMetronomeMarks: true,
      drawPartNames: true,
      drawMeasureNumbers: true,
      stretchLastSystemLine: false,
      backend: 'svg',
    });
  } else {
    osmd.setOptions({ backend: 'svg' });
  }

  await osmd.load(xml);
  osmd.render();
}

// --- Download ---
function downloadXml() {
  if (!currentXml) return;
  const blob = new Blob([currentXml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (currentFile ? currentFile.name.replace(/\.[^.]+$/, '') : 'score') + '.musicxml';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// --- Reset ---
function resetUI() {
  currentFile = null;
  currentXml = null;
  osmd = null;
  document.getElementById('fileInput').value = '';
  document.getElementById('previewImg').src = '';
  document.getElementById('scoreContainer').innerHTML = '';
  show('uploadSection');
  hide('previewSection');
  hide('loadingSection');
  hide('resultSection');
  hide('errorSection');
}

// --- Helpers ---
function show(id) {
  document.getElementById(id).classList.remove('hidden');
}
function hide(id) {
  document.getElementById(id).classList.add('hidden');
}
