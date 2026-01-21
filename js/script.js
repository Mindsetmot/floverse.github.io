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
    history.push(snapshot);
    if (history.length > 50) history.shift();
    redoStack = [];
    updateUndoButtons();
    localStorage.setItem('web_sub_draft_v2', snapshot);
}

function undo() {
    if (history.length <= 1) return;
    redoStack.push(history.pop());
    subtitles = JSON.parse(history[history.length - 1]);
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

// --- FUNGSI RESET / HAPUS DRAFT ---
function clearDraft() {
    niceConfirm("Hapus semua draft dan reset editor?", (ok) => { 
        if(ok) { 
            localStorage.removeItem('web_sub_draft_v2'); 
            location.reload(); 
        } 
    });
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

// --- FUNGSI SYNC ---
function setMarkerAt(index, type) {
    if (!video.src) return alert("Pilih video terlebih dahulu!");
    saveHistory();
    const now = video.currentTime;
    const sub = subtitles[index];
    if (type === 'start') {
        sub.start = now;
    } else {
        if (now < sub.start) {
            alert("Waktu selesai tidak boleh kurang dari waktu mulai!");
            history.pop();
            updateUndoButtons();
            return;
        }
        sub.end = now;
    }
    const sStr = formatTime(sub.start).replace('.', ',');
    const eStr = formatTime(sub.end).replace('.', ',');
    sub.timeLine = `${sStr} --> ${eStr}`;

    const allInputs = document.querySelectorAll('.timestamp-input');
    if (allInputs[index]) {
        allInputs[index].value = sub.timeLine;
    }
    localStorage.setItem('web_sub_draft_v2', JSON.stringify(subtitles));
}

function applyMusicFormat(index) {
    saveHistory();
    let sub = subtitles[index];
    let text = sub.rawText.trim();
    if (text.includes('<b><i>')) {
        sub.rawText = text.replace(/\{\\an[1-9]\}/g, '').replace(/<b><i>/g, '').replace(/<\/i><\/b>/g, '').trim();
    } else {
        sub.rawText = `{\\an8}<b><i>${text}</i></b>`;
    }
    renderEditor(subtitles, false);
}

// --- CORE EDITOR ---
function renderEditor(data, recordHistory = true) {
    subtitles = data;
    if (recordHistory) saveHistory();
    const container = document.getElementById('cue-container');
    container.innerHTML = '';
    subtitles.forEach((sub, i) => {
        const div = document.createElement('div');
        div.className = 'subtitle-cue';
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <div style="display:flex; align-items:center; gap:10px; flex:1;">
                    <span style="font-weight:bold; color:var(--primary-color); min-width:25px;">#${i+1}</span>
                    <input class="timestamp-input" value="${sub.timeLine}" onchange="updateTimestamp(${i}, this.value)" style="flex:1; border:none; background:rgba(255,255,255,0.05); color:white; padding:4px 8px; border-radius:4px;">
                </div>
                <div style="display:flex; gap:5px; margin-left:10px;">
                    <button class="btn-small" onclick="seekTo(${sub.start})"><i class="fas fa-play"></i></button>
                    <button class="btn-small" onclick="addNewCue(${i+1})"><i class="fas fa-plus"></i></button>
                    <button class="btn-small btn-del" onclick="deleteCue(${i})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr 50px; gap:8px; margin-bottom:8px;">
                <button class="btn-sync-touch btn-start" onclick="setMarkerAt(${i}, 'start')">START</button>
                <button class="btn-sync-touch btn-end" onclick="setMarkerAt(${i}, 'end')">END</button>
                <button class="btn-sync-touch btn-music" onclick="applyMusicFormat(${i})"><i class="fas fa-music"></i></button>
            </div>
            <textarea class="edit-area" rows="2" oninput="liveUpdateText(${i}, this.value)" onchange="saveHistoryText()">${sub.rawText}</textarea>
        `;
        container.appendChild(div);
    });
    updateUndoButtons();
}

function liveUpdateText(i, val) {
    subtitles[i].rawText = val;
    localStorage.setItem('web_sub_draft_v2', JSON.stringify(subtitles));
}

function saveHistoryText() {
    saveHistory();
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
    niceConfirm("Hapus baris ini?", (ok) => { 
        if(ok) { saveHistory(); subtitles.splice(i, 1); renderEditor(subtitles, false); } 
    });
}

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

function saveSubtitle() {
    if(subtitles.length === 0) return;
    let output = "";
    subtitles.forEach((s, i) => { 
        output += `${i + 1}\n${s.timeLine.replace('.', ',')}\n${s.rawText}\n\n`; 
    });
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = "subtitle.srt"; a.click();
}

// --- OVERLAY & LOOP ---
function getCurrentTime() { return video.currentTime; }
function seekTo(t) { video.currentTime = t; }

function applyStyles(el) {
    const fs = document.getElementById('font-size').value;
    const sw = document.getElementById('stroke-width').value;
    const globalColor = document.getElementById('text-color').value;
    el.style.fontSize = fs + 'px';
    if (!el.innerHTML.includes('color=')) el.style.color = globalColor;
    el.style.textShadow = sw > 0 ? `-${sw}px -${sw}px 0 #000, ${sw}px -${sw}px 0 #000, -${sw}px ${sw}px 0 #000, ${sw}px ${sw}px 0 #000` : "none";
}

function updateLoop() {
    const now = getCurrentTime();
    const timeDisplay = document.getElementById('current-time-display');
    if(timeDisplay) timeDisplay.textContent = formatTime(now);
    
    const topOverlay = document.getElementById('overlay-top');
    const bottomOverlay = document.getElementById('overlay-bottom');
    
    if(topOverlay && bottomOverlay) {
        topOverlay.innerHTML = '';
        bottomOverlay.innerHTML = '';

        const activeSubs = subtitles.filter(sub => now >= sub.start && now < sub.end);
        activeSubs.forEach(sub => {
            const span = document.createElement('span'); 
            span.className = 'subtitle-text';
            let displayText = sub.rawText;
            const tagMatch = displayText.match(/\{\\an([1-9])\}/);
            const pos = tagMatch ? parseInt(tagMatch[1]) : 2;
            displayText = displayText.replace(/\{\\an[1-9]\}/g, '').trim();
            
            // Render manual tags
            span.innerHTML = displayText.replace(/\n/g, '<br>'); 
            applyStyles(span);

            const isTop = pos >= 7;
            const isMiddle = pos >= 4 && pos <= 6;
            const targetOverlay = isTop ? topOverlay : bottomOverlay;

            if (isMiddle) {
                targetOverlay.style.justifyContent = 'center';
                targetOverlay.style.height = '100%'; 
            } else if (isTop) {
                targetOverlay.style.justifyContent = 'flex-start';
                targetOverlay.style.height = 'auto';
            } else {
                targetOverlay.style.justifyContent = 'flex-end';
                targetOverlay.style.height = 'auto';
                targetOverlay.style.bottom = document.getElementById('y-pos').value + '%';
            }

            if ([1, 4, 7].includes(pos)) {
                targetOverlay.style.alignItems = 'flex-start';
                span.style.textAlign = 'left';
            } else if ([3, 6, 9].includes(pos)) {
                targetOverlay.style.alignItems = 'flex-end';
                span.style.textAlign = 'right';
            } else {
                targetOverlay.style.alignItems = 'center';
                span.style.textAlign = 'center';
            }
            targetOverlay.appendChild(span);
        });
    }

    const currentActive = new Set(subtitles.map((s, i) => (now >= s.start && now < s.end ? i : -1)).filter(i => i !== -1));
    if (JSON.stringify([...currentActive]) !== JSON.stringify([...activeIndices])) {
        activeIndices = currentActive;
        document.querySelectorAll('.subtitle-cue').forEach((el, idx) => {
            if (activeIndices.has(idx)) {
                el.classList.add('highlight');
                if (activeIndices.size === 1) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else el.classList.remove('highlight');
        });
    }
    requestAnimationFrame(updateLoop);
}

// --- SETUP ---
function togglePlay() { video.paused ? video.play() : video.pause(); updatePlayIcon(); }
function updatePlayIcon() {
    const btn = document.getElementById('play-pause-btn');
    if(btn) btn.innerHTML = video.paused ? '<i class="fas fa-play"></i>' : '<i class="fas fa-pause"></i>';
}
function toggleSettings() { document.getElementById('settings-bar').classList.toggle('active'); }
function toggleRatio() { 
    const vp = document.getElementById('video-viewport'), btn = document.getElementById('ratio-btn');
    vp.classList.toggle('portrait'); 
    btn.innerHTML = vp.classList.contains('portrait') ? '<i class="fas fa-display"></i>' : '<i class="fas fa-mobile-screen"></i>';
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
    requestAnimationFrame(updateLoop);
};

window.onload = () => {
    const saved = localStorage.getItem('web_sub_draft_v2');
    if (saved) { 
        subtitles = JSON.parse(saved);
        renderEditor(subtitles, false);
        saveHistory();
    }
    updatePlayIcon();
}