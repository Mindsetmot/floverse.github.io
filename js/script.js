let isYouTube = false, subtitles = [], activeIndices = new Set();
let history = [], redoStack = [];
const video = document.getElementById('video-player');
const subInput = document.getElementById('subtitle-input');
let confirmCallback = null;

// --- FUNGSI DIALOG & HISTORY ---
function niceConfirm(msg, callback) {
    document.getElementById('confirm-msg').innerText = msg;
    document.getElementById('custom-confirm').style.display = 'flex';
    confirmCallback = callback;
}
function closeConfirm(result) {
    document.getElementById('custom-confirm').style.display = 'none';
    if(confirmCallback) confirmCallback(result);
}

function saveHistory() {
    const snapshot = JSON.stringify(subtitles);
    // Kita tetap simpan snapshot
    history.push(snapshot);
    if (history.length > 50) history.shift();
    redoStack = [];
    updateUndoButtons();
    localStorage.setItem('web_sub_draft_v2', snapshot);
}

function undo() {
    if (history.length <= 1) return;
    // Pindahkan state saat ini ke redo
    redoStack.push(history.pop());
    // Ambil state sebelumnya
    const lastState = history[history.length - 1];
    subtitles = JSON.parse(lastState);
    
    // PENTING: Render ulang agar angka di input START kembali ke semula
    renderEditor(subtitles, false);
}

function undo() {
    if (history.length <= 1) return;
    // Pindahkan state sekarang ke redo stack
    redoStack.push(history.pop());
    // Ambil state sebelumnya
    subtitles = JSON.parse(history[history.length - 1]);
    // Render ulang semua elemen agar UI sinkron dengan data history
    renderEditor(subtitles, false);
}

function redo() {
    if (redoStack.length === 0) return;
    const snapshot = redoStack.pop();
    history.push(snapshot);
    subtitles = JSON.parse(snapshot);
    renderEditor(subtitles, false);
}

function updateUndoButtons() {
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    if(undoBtn) undoBtn.disabled = history.length <= 1;
    if(redoBtn) redoBtn.disabled = redoStack.length === 0;
}

// --- FUNGSI WAKTU ---
function formatTime(seconds) {
    const h = Math.floor(seconds / 3600), 
          m = Math.floor((seconds % 3600) / 60), 
          s = Math.floor(seconds % 60), 
          ms = Math.floor((seconds % 1) * 1000);
    return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}.${ms.toString().padStart(3,'0')}`;
}

function timeToSec(str) {
    if (!str) return 0;
    const parts = str.replace(',', '.').split(':');
    if (parts.length === 3) return (+parts[0]) * 3600 + (+parts[1]) * 60 + (+parts[2]);
    if (parts.length === 2) return (+parts[0]) * 60 + (+parts[1]);
    return +parts[0] || 0;
}

// --- FUNGSI SYNC (SANGAT PENTING UNTUK UNDO) ---
function setMarkerAt(index, type) {
    if (!video.src) return alert("Pilih video terlebih dahulu!");
    
    // SIMPAN HISTORY SEBELUM PERUBAHAN
    saveHistory();

    const now = video.currentTime;
    const sub = subtitles[index];

    if (type === 'start') {
        sub.start = now;
    } else {
        if (now < sub.start) {
            alert("Waktu selesai tidak boleh kurang dari waktu mulai!");
            history.pop(); // Batalkan simpan history jika error
            updateUndoButtons();
            return;
        }
        sub.end = now;
    }

    // Update data timeline
    const sStr = formatTime(sub.start).replace('.', ',');
    const eStr = formatTime(sub.end).replace('.', ',');
    sub.timeLine = `${sStr} --> ${eStr}`;

    // Update tampilan input secara instan
    const allInputs = document.querySelectorAll('.timestamp-input');
    if (allInputs[index]) {
        allInputs[index].value = sub.timeLine;
        allInputs[index].style.backgroundColor = 'rgba(40, 167, 69, 0.3)';
        setTimeout(() => { allInputs[index].style.backgroundColor = ''; }, 300);
    }

    if (navigator.vibrate) navigator.vibrate(30);

    // PAKSA UPDATE STORAGE & TOMBOL UNDO
    localStorage.setItem('web_sub_draft_v2', JSON.stringify(subtitles));
    updateUndoButtons(); 
}

// --- CORE EDITOR ---
function parseSRT(data) {
    const subs = [];
    const blocks = data.trim().split(/\r?\n\s*\r?\n/);
    blocks.forEach(block => {
        const lines = block.split(/\r?\n/).map(l => l.trim()).filter(l => l !== "");
        const timeLine = lines.find(l => l.includes('-->'));
        if (timeLine) {
            const [startStr, endStr] = timeLine.split('-->').map(t => t.trim());
            const text = lines.slice(lines.indexOf(timeLine) + 1).join('\n');
            subs.push({ start: timeToSec(startStr), end: timeToSec(endStr), timeLine, rawText: text });
        }
    });
    return subs;
}

function renderEditor(data, recordHistory = true) {
    subtitles = data;
    if (recordHistory) saveHistory();
    const container = document.getElementById('cue-container');
    container.innerHTML = '';
    subtitles.forEach((sub, i) => {
        const div = document.createElement('div');
        div.className = 'subtitle-cue';
        div.innerHTML = `
            <div class="cue-row">
                <span style="font-weight:bold; color:var(--primary-color)">#${i+1}</span>
                <input class="timestamp-input" value="${sub.timeLine}" onchange="updateTimestamp(${i}, this.value)">
                <div class="manage-btns">
                    <button class="btn-small" onclick="seekTo(${sub.start})"><i class="fas fa-play"></i></button>
                    <button class="btn-small" onclick="addNewCue(${i+1})" title="Tambah di bawah"><i class="fas fa-plus"></i></button>
                    <button class="btn-small btn-del" onclick="deleteCue(${i})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            
            <div class="cue-row" style="margin-top:8px; gap:8px;">
                <button class="btn-sync-touch btn-start" onclick="setMarkerAt(${i}, 'start')">
                    <i class="fas fa-clock"></i> START
                </button>
                <button class="btn-sync-touch btn-end" onclick="setMarkerAt(${i}, 'end')">
                    <i class="fas fa-check-circle"></i> END
                </button>
                <button class="btn-sync-touch btn-music" onclick="applyMusicFormat(${i})">
                    <i class="fas fa-music"></i>
                </button>
            </div>

            <textarea class="edit-area" rows="2" onchange="updateText(${i}, this.value)">${sub.rawText}</textarea>
        `;
        container.appendChild(div);
    });
    updateUndoButtons();
}

function applyMusicFormat(index) {
    saveHistory(); // Simpan state sebelum diformat

    let sub = subtitles[index];
    let text = sub.rawText.trim();
    
    if (text.includes('<b><i>')) {
        text = text.replace(/\{\\an[1-9]\}/g, '').replace(/<b><i>/g, '').replace(/<\/i><\/b>/g, '').trim();
    } else {
        text = `{\\an8}<b><i>${text}</i></b>`;
    }

    sub.rawText = text;

    const allTextareas = document.querySelectorAll('.edit-area');
    if (allTextareas[index]) {
        allTextareas[index].value = text;
        allTextareas[index].style.backgroundColor = 'rgba(111, 66, 193, 0.2)';
        setTimeout(() => { allTextareas[index].style.backgroundColor = ''; }, 300);
    }

    if (navigator.vibrate) navigator.vibrate(35);
    localStorage.setItem('web_sub_draft_v2', JSON.stringify(subtitles));
}

function updateText(i, val) { 
    saveHistory();
    subtitles[i].rawText = val; 
    localStorage.setItem('web_sub_draft_v2', JSON.stringify(subtitles));
}

function updateTimestamp(i, val) {
    saveHistory();
    subtitles[i].timeLine = val;
    const pts = val.split('-->');
    if(pts.length === 2) {
        subtitles[i].start = timeToSec(pts[0].trim());
        subtitles[i].end = timeToSec(pts[1].trim());
    }
    localStorage.setItem('web_sub_draft_v2', JSON.stringify(subtitles));
}

function addNewCue(index) {
    saveHistory();
    let startTime = "00:00:00.000", endTime = "00:00:03.000";
    if (index > 0 && subtitles[index-1]) {
        const prevEnd = subtitles[index-1].end + 0.1;
        startTime = formatTime(prevEnd).replace('.', ',');
        endTime = formatTime(prevEnd + 3).replace('.', ',');
    }
    const newSub = { start: timeToSec(startTime), end: timeToSec(endTime), timeLine: `${startTime} --> ${endTime}`, rawText: "" };
    subtitles.splice(index, 0, newSub);
    renderEditor(subtitles, false); 
}

function deleteCue(i) {
    niceConfirm("Hapus baris subtitle ini?", (ok) => { 
        if(ok) { 
            saveHistory();
            subtitles.splice(i, 1); 
            renderEditor(subtitles, false); 
        } 
    });
}

function clearDraft() {
    niceConfirm("Hapus semua draft dan reset editor?", (ok) => { if(ok) { localStorage.removeItem('web_sub_draft_v2'); location.reload(); } });
}

function saveSubtitle() {
    if(subtitles.length === 0) return alert("Belum ada subtitle untuk disimpan!");
    let output = "";
    subtitles.forEach((s, i) => { 
        const tLine = s.timeLine.includes(',') ? s.timeLine : s.timeLine.replace('.', ',');
        output += `${i + 1}\n${tLine}\n${s.rawText}\n\n`; 
    });
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = "subtitle_edited.srt"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
}

// --- KONTROL VIDEO & LOOP ---
function getCurrentTime() { return video.currentTime; }
function seekTo(t) { video.currentTime = t; }

function togglePlay() {
    video.paused ? video.play() : video.pause();
    updatePlayIcon();
}

function updatePlayIcon() {
    const btn = document.getElementById('play-pause-btn');
    if(btn) btn.innerHTML = video.paused ? '<i class="fas fa-play"></i>' : '<i class="fas fa-pause"></i>';
}

function applyStyles(el) {
    const fs = document.getElementById('font-size').value, 
          sw = document.getElementById('stroke-width').value, 
          color = document.getElementById('text-color').value;
    el.style.fontSize = fs + 'px'; el.style.color = color;
    el.style.textShadow = sw > 0 ? `-${sw}px -${sw}px 0 #000, ${sw}px -${sw}px 0 #000, -${sw}px ${sw}px 0 #000, ${sw}px ${sw}px 0 #000, 0px ${sw}px 0 #000, 0px -${sw}px 0 #000, ${sw}px 0px 0 #000, -${sw}px 0px 0 #000` : "0 0 5px rgba(0,0,0,0.8)";
}

function updateLoop() {
    const now = getCurrentTime();
    const display = document.getElementById('current-time-display');
    if(display) display.textContent = formatTime(now);
    
    const topOverlay = document.getElementById('overlay-top');
    const bottomOverlay = document.getElementById('overlay-bottom');
    if(topOverlay && bottomOverlay) {
        topOverlay.innerHTML = '';
        bottomOverlay.innerHTML = '';
        bottomOverlay.style.bottom = document.getElementById('y-pos').value + '%';

        const activeSubs = subtitles.filter(sub => now >= sub.start && now < sub.end);
        activeSubs.forEach(sub => {
            const span = document.createElement('span'); 
            span.className = 'subtitle-text';
            let displayText = sub.rawText;
            const tagMatch = displayText.match(/\{\\an([1-9])\}/);
            const pos = tagMatch ? parseInt(tagMatch[1]) : 2;
            displayText = displayText.replace(/\{\\an[1-9]\}/g, '').trim();
            span.innerHTML = displayText.replace(/\n/g, '<br>'); 
            applyStyles(span);

            const isTop = pos >= 7;
            const targetOverlay = isTop ? topOverlay : bottomOverlay;

            if ([1, 4, 7].includes(pos)) {
                targetOverlay.style.alignItems = 'flex-start';
                span.style.textAlign = 'left';
                span.style.marginLeft = '5%';
            } else if ([3, 6, 9].includes(pos)) {
                targetOverlay.style.alignItems = 'flex-end';
                span.style.textAlign = 'right';
                span.style.marginRight = '5%';
            } else {
                targetOverlay.style.alignItems = 'center';
                span.style.textAlign = 'center';
            }

            if ([4, 5, 6].includes(pos)) span.style.marginBottom = '20vh'; 
            else span.style.marginBottom = '0';

            targetOverlay.appendChild(span);
        });
    }
    
    const settingsBar = document.getElementById('settings-bar');
    const isSettingsActive = settingsBar ? settingsBar.classList.contains('active') : false;
    const currentActive = new Set(subtitles.map((s, i) => (now >= s.start && now < s.end ? i : -1)).filter(i => i !== -1));
    
    if (JSON.stringify([...currentActive]) !== JSON.stringify([...activeIndices])) {
        activeIndices = currentActive;
        document.querySelectorAll('.subtitle-cue').forEach((el, idx) => {
            if (activeIndices.has(idx)) {
                el.classList.add('highlight');
                if (!isSettingsActive && activeIndices.size === 1) {
                    const txt = el.querySelector('textarea');
                    if (txt && !txt.matches(':focus')) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
            } else el.classList.remove('highlight');
        });
    }
    requestAnimationFrame(updateLoop);
}

function toggleSettings() { 
    const bar = document.getElementById('settings-bar');
    if(bar) {
        bar.classList.toggle('active'); 
        window.scrollTo(0,0);
    }
}

function toggleRatio() { 
    const vp = document.getElementById('video-viewport'), btn = document.getElementById('ratio-btn');
    if(vp) vp.classList.toggle('portrait'); 
    if(btn && vp) btn.innerHTML = vp.classList.contains('portrait') ? '<i class="fas fa-display"></i>' : '<i class="fas fa-mobile-screen"></i>';
}

subInput.onchange = e => {
    const reader = new FileReader();
    reader.onload = (ev) => renderEditor(parseSRT(ev.target.result));
    reader.readAsText(e.target.files[0]);
};

document.getElementById('video-input').onchange = e => {
    if(!e.target.files[0]) return;
    video.style.display = 'block'; 
    video.src = URL.createObjectURL(e.target.files[0]); 
    video.pause();
    updatePlayIcon();
    activeIndices = new Set();
    requestAnimationFrame(updateLoop);
};

window.onload = () => {
    const saved = localStorage.getItem('web_sub_draft_v2');
    if (saved) { 
        niceConfirm("Lanjutkan draft editan terakhir?", (ok) => { 
            if(ok) {
                subtitles = JSON.parse(saved);
                renderEditor(subtitles, false);
                saveHistory(); // Tambahkan ini untuk mendaftarkan state awal
            }
        }); 
    }
    updatePlayIcon();
}