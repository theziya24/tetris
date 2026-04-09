// ════════════════════════════════
// game.js – Tetris oyun motoru ve oyun mantığı
// ════════════════════════════════

// ── Oyun sabitleri ──
const COLS = 4, BW = 90, BH = 34, PAD = 4;
const CANVAS_W = COLS * BW + PAD * 2, CANVAS_H = 320;

// ── Global oyun durumu ──
let G = {
  learnLang: 'en',
  category: 'animals',
  score: 0,
  level: 1,
  combo: 0,
  wordPool: [],
  unseen: [],
  weak: [],
  ground: [],
  fallingBlock: null,
  speed: 1200,
  interval: null,
  running: false,
  particles: [],
  flashCells: [],
  groundShake: 0,
  msgTimer: null,
  popTimer: null,
  rfTimer: null,
  catTotal: 0,
  catLearned: 0,
  sessionStartTime: null,
  mixedMode: false,
  mixedCategories: [],
  merged: []
};

let canvas, ctx, lastStep = 0;

// ── Oyun mod değişkenleri ──
let G_MODE = 'kategori'; // 'kategori' | 'seviye' | 'mylist'
let G_LEVELS = [];

// ── Seviye tanımları ──
const LEVEL_DEFS = {
  a1: { name: 'A1 (Başlangıç)', premium: false },
  a2: { name: 'A2 (Temel)', premium: false },
  b1: { name: 'B1 (Orta)', premium: true },
  b2: { name: 'B2 (Üst Orta)', premium: true }
};

// ── Yardımcı fonksiyonlar ──

// Zemin bloklarının üst kenarı
function groundRowY() {
  return CANVAS_H - BH * 2 - PAD;
}

// Bir sütundaki iniş yüzeyi yüksekliği
function landingY(col) {
  const m = G.merged.find(x => x.col === col);
  if (m) return m.y;
  return groundRowY();
}

// Kelime havuzunu al
function getWordPool() {
  DB = loadDB();
  let base = [];
  const userLang = CU?.learnLang || G.learnLang || 'en';

  // Kendi listesi modu
  if (G.category === '__mylist__') {
    return [...((DB.userWords || {})[CU_ID] || [])];
  }

  // Seviye modu
  if (G.category && G.category.startsWith('__level__')) {
    if (G.mixedLevels && G.mixedLevels.length > 1) {
      let pool = [];
      for (const lvl of G.mixedLevels) {
        pool.push(...getLevelWords(lvl, userLang));
      }
      return pool;
    }
    const lvlKey = G.category.replace('__level__', '');
    return [...getLevelWords(lvlKey, userLang)];
  }

  // Karışık mod veya tek kategori
  const cats = G.mixedMode && G.mixedCategories?.length > 0 ? G.mixedCategories : [G.category];
  for (const cat of cats) {
    base.push(...getWords(cat, userLang));
  }

  // Öğretmen özel kelimeleri
  if (CU_ROLE === 'student' && CU.teacherCode) {
    const teacher = Object.values(DB.teachers || {}).find(t => t.code === CU.teacherCode);
    if (teacher?.customWords?.[G.category]) {
      return [...base, ...teacher.customWords[G.category]];
    }
  }
  if (CU_ROLE === 'teacher' && CU?.customWords?.[G.category]) {
    return [...base, ...CU.customWords[G.category]];
  }
  return [...base];
}

// Dil ayarla
function setLang(l, btn) {
  G.learnLang = l;
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

// Dil dropdown
const LANG_NAMES = { en: 'İngilizce', de: 'Almanca', ru: 'Rusça' };

function toggleLangDropdown() {
  const trigger = document.getElementById('lang-dropdown-trigger');
  const list = document.getElementById('lang-dropdown-list');
  if (!trigger || !list) return;
  const isOpen = list.classList.contains('open');
  trigger.classList.toggle('open', !isOpen);
  list.classList.toggle('open', !isOpen);
}

function setLangDropdown(l) {
  G.learnLang = l;
  ['en', 'de', 'ru'].forEach(code => {
    const ind = document.getElementById('lang-ind-' + code);
    if (ind) ind.textContent = code === l ? '►' : '';
  });
  const label = document.getElementById('lang-dropdown-label');
  if (label) label.textContent = LANG_NAMES[l] || l;
  document.getElementById('lang-dropdown-trigger').classList.remove('open');
  document.getElementById('lang-dropdown-list').classList.remove('open');
}

// Kelime havuzu oluştur
function buildPool() {
  const pool = getWordPool();
  shuffle(pool);
  G.wordPool = [...pool];
  const now = Date.now();
  const srData = (CU && CU.srData) || {};
  const due = pool.filter(w => {
    const sr = srData[w.tr];
    return !sr || sr.dueDate <= now;
  });
  const notDue = pool.filter(w => {
    const sr = srData[w.tr];
    return sr && sr.dueDate > now;
  });
  shuffle(due);
  shuffle(notDue);
  G.unseen = [...due, ...notDue];
  G.catTotal = pool.length;
  G.catLearned = pool.filter(w => {
    const sr = srData[w.tr];
    return sr && sr.reps >= 2;
  }).length;
  document.getElementById('due-count').textContent = due.length;
  updateProgressBar();
}

// Görülmemiş kelime al
function nextUnseen() {
  let word;
  if (G.weak.length > 0 && Math.random() < 0.35) {
    const wk = G.weak[Math.floor(Math.random() * G.weak.length)];
    if (!G.ground.some(g => g && g.tr === wk.tr)) word = { ...wk };
  }
  if (!word) {
    if (G.unseen.length === 0) {
      G.unseen = [...G.wordPool];
      shuffle(G.unseen);
      G.unseen = G.unseen.filter(w => !G.ground.some(g => g && g.tr === w.tr));
      if (G.unseen.length === 0) {
        G.unseen = [...G.wordPool];
        shuffle(G.unseen);
      }
    }
    word = G.unseen.shift();
  }
  if (word) word._color = randomPastel();
  return word;
}

// Oyun başlat
function startGame() {
  const selectedCats = JSON.parse(localStorage.getItem('selected_categories') || '[]');

  // Kendi listesi modu
  if (G_MODE === 'mylist') {
    DB = loadDB();
    const myWords = (DB.userWords || {})[CU_ID] || [];
    if (myWords.length === 0) {
      alert('Listenizde kelime yok. Önce Excel veya görsel ile kelime ekleyin.');
      return;
    }
    G.mixedMode = false;
    G.category = '__mylist__';
    G.mixedCategories = [];
    G.mixedLevels = [];
    launchGame();
    return;
  }

  // Seviye seçili mi?
  if (G_LEVELS.length > 0 && selectedCats.length === 0) {
    DB = loadDB();
    let levelWords = [];
    for (const lvl of G_LEVELS) {
      levelWords.push(...((DB.levelWords || {})[lvl] || []));
    }
    if (levelWords.length === 0) {
      alert('Seçili seviyelerde henüz kelime yok. Admin panelinden ekleyin.');
      return;
    }
    G.mixedMode = G_LEVELS.length > 1;
    G.category = '__level__' + G_LEVELS[0];
    G.mixedLevels = [...G_LEVELS];
    G.mixedCategories = [];
    G_MODE = 'seviye';
    launchGame();
    return;
  }

  // Kategori seçili mi?
  if (selectedCats.length > 0) {
    G.mixedMode = selectedCats.length > 1;
    G.category = selectedCats[0];
    G.mixedCategories = selectedCats.length > 1 ? [...selectedCats] : [];
    G.mixedLevels = [];
    G_MODE = 'kategori';
    launchGame();
    return;
  }

  alert('Lütfen önce bir kategori veya seviye seçin!');
}

// Oyunu başlat (görüntüle)
function launchGame() {
  showScreen('game');
  canvas = document.getElementById('gc');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  ctx = canvas.getContext('2d');
  buildPool();
  G.score = 0;
  G.level = 1;
  G.combo = 0;
  G.particles = [];
  G.flashCells = [];
  G.merged = [];
  G.ground = Array(COLS).fill(null);
  G.sessionStartTime = Date.now();
  initGround();
  spawnFalling();
  G.running = true;
  G.speed = 1200;
  clearInterval(G.interval);
  G.interval = setInterval(tick, 16);
  updateHUD();
  updateCombo();
  updateProgressBar();
  document.getElementById('game-overlay').style.display = 'none';
  setupDrag();
}

// Oyunu durdur
function stopGame() {
  G.running = false;
  clearInterval(G.interval);
  if (G.sessionStartTime && CU && CU_ROLE !== 'admin') {
    CU.gameMinutes = (CU.gameMinutes || 0) + Math.round((Date.now() - G.sessionStartTime) / 60000);
    saveUser();
  }
}

// Zemin bloklarını başlat
function initGround() {
  G.ground = Array(COLS).fill(null);
  const pos = [0, 1, 2, 3];
  shuffle(pos);
  const usedTrs = new Set();
  let filled = 0;
  for (const i of pos) {
    if (filled >= 3) break;
    const w = nextUnseen();
    if (w && !usedTrs.has(w.tr)) {
      G.ground[i] = w;
      usedTrs.add(w.tr);
      filled++;
    }
  }
}

// Düşen blok oluştur
function spawnFalling() {
  const gw = G.ground.filter(w => w);
  if (gw.length === 0) {
    refillGround();
    return;
  }
  const target = gw[Math.floor(Math.random() * gw.length)];
  G.fallingBlock = {
    col: Math.floor(Math.random() * COLS),
    y: 0,
    word: target,
    label: target[G.learnLang] || target.en,
    color: randomPastel(),
    isWeak: G.weak.some(w => w.tr === target.tr)
  };
  if (document.getElementById('set-tts')?.checked) {
    speak(G.fallingBlock.label);
  }
}

// Seslendirme
function speak(text) {
  if (!window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = G.learnLang === 'en' ? 'en-US' : G.learnLang === 'de' ? 'de-DE' : 'ru-RU';
  u.rate = 0.85;
  window.speechSynthesis.speak(u);
}

// Pastel renkler
const PASTEL_COLORS = ['#A8D8B9', '#A8C8E8', '#C8B8E8', '#F5D4A0', '#F0B8C8'];
function randomPastel() {
  return PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)];
}

// Oyun döngüsü
function tick() {
  const now = performance.now();
  const spd = Math.max(280, G.speed - (G.level - 1) * 80);
  if (now - lastStep > spd) {
    lastStep = now;
    stepFalling();
  }
  updateParticles();
  draw();
}

// Düşen bloğu hareket ettir
function stepFalling() {
  if (!G.fallingBlock) return;
  const b = G.fallingBlock;
  if (b.showingTranslation) return; // çeviri gösterilirken hareket etme

  const surface = landingY(b.col);
  if (b.y + BH >= surface) {
    b.y = surface - BH;
    landBlock();
  } else {
    b.y += BH;
  }
}

// Blok yere indi
function landBlock() {
  const b = G.fallingBlock;
  const col = b.col;

  // Önce merged blok var mı kontrol et
  const mIdx = G.merged.findIndex(m => m.col === col);
  if (mIdx >= 0) {
    const m = G.merged[mIdx];
    if (m.tr === b.word.tr) {
      triggerMergedCorrect(b, m, mIdx, col);
    } else {
      triggerMergedWrong(b, m, mIdx, col);
    }
    return;
  }

  // Normal zemin bloğu
  const gw = G.ground[col];
  if (gw && gw.tr === b.word.tr) {
    triggerMatch(b, col);
  } else if (gw === null) {
    triggerEmpty(b, col);
  } else {
    triggerMismatch(b, gw, col);
  }
}

// Eşleşme tetikle
function triggerMatch(b, col) {
  const base = b.isWeak ? 200 : 100;
  const mult = G.combo >= 7 ? 3 : G.combo >= 5 ? 2 : G.combo >= 3 ? 1.5 : 1;
  const pts = Math.round(base * mult);
  G.score += pts;
  G.combo++;
  if (CU && CU_ROLE !== 'admin') {
    CU.totalCorrect = (CU.totalCorrect || 0) + 1;
    CU.totalScore = (CU.totalScore || 0) + pts;
  }

  // Patlama efekti
  const gY = groundRowY();
  spawnParticles(PAD + col * BW + BW / 2, gY + BH / 2, '#1d9e75', 18);
  spawnParticles(PAD + col * BW + BW / 2, gY + BH / 2, '#ffffff', 8);
  addFlash(col, 'rgba(29,158,117,.3)');
  showScorePopup('+' + pts, PAD + col * BW + BW / 2, gY - 10, '#1d9e75');
  showResultFlash(true);
  if (G.combo >= 7) showMsg('MUHTEŞEM! 🔥');
  else if (G.combo >= 5) showMsg('Harika!');
  else if (G.combo >= 3) showMsg('Kombo!');
  doVibrate([30]);

  updateSR(b.word.tr, true);
  G.weak = G.weak.filter(w => w.tr !== b.word.tr);
  if (CU && CU_ROLE !== 'admin') {
    const sr = (CU.srData || {})[b.word.tr];
    if (sr && sr.reps >= 2 && !(CU.learnedWords || []).includes(b.word.tr)) {
      if (!CU.learnedWords) CU.learnedWords = [];
      CU.learnedWords.push(b.word.tr);
      CU.totalLearned = (CU.totalLearned || 0) + 1;
    }
    CU.lastPlayDate = new Date().toDateString();
    saveUser();
    DB = loadDB();
    DB.globalStats = DB.globalStats || { correct: 0, wrong: 0, learned: 0 };
    DB.globalStats.correct++;
    DB.globalStats.learned = Object.values(DB.users).reduce((s, u) => s + (u.totalLearned || 0), 0);
    saveDB(DB);
  }
  if (G.combo > 0 && G.combo % 3 === 0) triggerGroundChange();

  // İki kutu yok olur, yeni kelime gelir
  G.ground[col] = null;
  G.fallingBlock = null;
  setTimeout(() => {
    G.ground[col] = nextUnseen();
  }, 350);

  G.catLearned = (G.wordPool || []).filter(w => {
    const s = (CU && CU.srData || {})[w.tr];
    return s && s.reps >= 2;
  }).length;
  updateProgressBar();
  updateCombo();
  updateHUD();
  setTimeout(spawnFalling, 400);
}

// Yanlış eşleşme
function triggerMismatch(b, gw, col) {
  addFlash(col, 'rgba(226,75,74,.2)');
  spawnParticles(PAD + col * BW + BW / 2, groundRowY() - BH / 2, '#e24b4a', 6);
  doVibrate([15, 10, 15]);
  showResultFlash(false);
  if (!G.weak.some(w => w.tr === gw.tr)) G.weak.push(gw);
  updateSR(gw.tr, false);
  if (CU && CU_ROLE !== 'admin') {
    CU.totalWrong = (CU.totalWrong || 0) + 1;
    saveUser();
    DB = loadDB();
    DB.globalStats = DB.globalStats || { correct: 0, wrong: 0, learned: 0 };
    DB.globalStats.wrong++;
    saveDB(DB);
  }
  G.combo = 0;
  updateCombo();
  // Blok zemin bloğuna dönüşür
  G.merged.push({
    col,
    y: groundRowY(),
    tr: gw.tr,
    val: gw[G.learnLang] || gw.en,
    color: gw._color || randomPastel()
  });
  G.ground[col] = null;
  G.fallingBlock = null;
  setTimeout(spawnFalling, 300);
}

// Boş sütuna inme
function triggerEmpty(b, col) {
  G.weak = G.weak.filter(w => w.tr !== b.word.tr);
  G.ground[col] = b.word;
  G.fallingBlock = null;
  setTimeout(spawnFalling, 300);
}

// Merge blok doğru eşleşme
function triggerMergedCorrect(b, m, mIdx, col) {
  const pts = 150;
  G.score += pts;
  G.combo++;
  if (CU && CU_ROLE !== 'admin') {
    CU.totalCorrect = (CU.totalCorrect || 0) + 1;
    CU.totalScore = (CU.totalScore || 0) + pts;
  }
  spawnParticles(PAD + col * BW + BW / 2, m.y + BH / 2, '#1d9e75', 15);
  addFlash(col, 'rgba(29,158,117,.3)');
  showScorePopup('+' + pts, PAD + col * BW + BW / 2, m.y - 10, '#1d9e75');
  showResultFlash(true);
  doVibrate([30]);
  updateSR(b.word.tr, true);
  G.weak = G.weak.filter(w => w.tr !== b.word.tr);
  G.merged.splice(mIdx, 1);
  G.fallingBlock = null;
  if (CU && CU_ROLE !== 'admin') {
    const sr = (CU.srData || {})[b.word.tr];
    if (sr && sr.reps >= 2 && !(CU.learnedWords || []).includes(b.word.tr)) {
      if (!CU.learnedWords) CU.learnedWords = [];
      CU.learnedWords.push(b.word.tr);
      CU.totalLearned = (CU.totalLearned || 0) + 1;
    }
    saveUser();
    DB = loadDB();
    DB.globalStats.correct++;
    saveDB(DB);
  }
  if (G.combo % 3 === 0) triggerGroundChange();
  updateCombo();
  updateHUD();
  setTimeout(spawnFalling, 400);
}

// Merge blok yanlış eşleşme
function triggerMergedWrong(b, m, mIdx, col) {
  showResultFlash(false);
  doVibrate([15, 10, 15]);
  updateSR(m.tr, false);
  if (CU && CU_ROLE !== 'admin') {
    CU.totalWrong = (CU.totalWrong || 0) + 1;
    saveUser();
    DB = loadDB();
    DB.globalStats.wrong++;
    saveDB(DB);
  }
  G.combo = 0;
  updateCombo();
  // Merge blok değişmez, falling blok zemin olur
  G.ground[col] = b.word;
  G.fallingBlock = null;
  setTimeout(spawnFalling, 300);
}

// Zemin değişimi tetikle
function triggerGroundChange() {
  if (G.ground.filter(w => w).length <= 1) return;
  const cols = G.ground.map((w, idx) => w ? idx : -1).filter(idx => idx >= 0);
  if (cols.length < 2) return;
  shuffle(cols);
  const c1 = cols[0];
  const c2 = cols[1];
  const temp = G.ground[c1];
  G.ground[c1] = G.ground[c2];
  G.ground[c2] = temp;
  addFlash(c1, 'rgba(255,193,7,.25)');
  addFlash(c2, 'rgba(255,193,7,.25)');
  doVibrate([10]);
}

// SR (Spaced Repetition) güncelle
function updateSR(tr, correct) {
  if (!CU || CU_ROLE === 'admin') return;
  if (!CU.srData) CU.srData = {};
  let rec = CU.srData[tr] || { reps: 0, ease: 2.5, dueDate: Date.now() };
  if (correct) {
    rec.reps++;
    const int = Math.floor(rec.ease * (rec.reps === 1 ? 1 : rec.reps === 2 ? 3 : 6));
    rec.dueDate = Date.now() + int * 24 * 60 * 60 * 1000;
    rec.ease = Math.min(rec.ease + 0.1, 3.0);
  } else {
    rec.reps = Math.max(0, rec.reps - 1);
    rec.ease = Math.max(1.3, rec.ease - 0.2);
    rec.dueDate = Date.now() + 24 * 60 * 60 * 1000;
  }
  CU.srData[tr] = rec;
}

// Parçacık güncelleme
function updateParticles() {
  for (let i = G.particles.length - 1; i >= 0; i--) {
    const p = G.particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.1;
    p.life--;
    if (p.life <= 0) {
      G.particles.splice(i, 1);
    }
  }
}

// Flash hücreleri güncelle
function updateFlashCells() {
  for (let i = G.flashCells.length - 1; i >= 0; i--) {
    G.flashCells[i].life--;
    if (G.flashCells[i].life <= 0) G.flashCells.splice(i, 1);
  }
}

// Zemin sarsıntısı güncelle
function updateGroundShake() {
  if (G.groundShake > 0) G.groundShake -= 0.5;
}

// Çizim
function draw() {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  drawBackground();
  drawGround();
  drawFalling();
  drawParticles();
  drawFlash();
  drawMerged();
  if (G.groundShake > 0) {
    const shakeX = (Math.random() - 0.5) * G.groundShake;
    const shakeY = (Math.random() - 0.5) * G.groundShake;
    ctx.translate(shakeX, shakeY);
  }
}

// Arka plan çiz
function drawBackground() {
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#f7f7f6';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  // Grid çizgileri
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border').trim() || '#e8e7e6';
  ctx.lineWidth = 0.5;
  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(PAD + c * BW, 0);
    ctx.lineTo(PAD + c * BW, CANVAS_H);
    ctx.stroke();
  }
  // Zemin çizgisi
  ctx.beginPath();
  ctx.moveTo(PAD, groundRowY());
  ctx.lineTo(PAD + COLS * BW, groundRowY());
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--green').trim() || '#1d9e75';
  ctx.lineWidth = 1;
  ctx.stroke();
}

// Zemin bloklarını çiz
function drawGround() {
  const gY = groundRowY();
  for (let c = 0; c < COLS; c++) {
    const w = G.ground[c];
    if (!w) continue;
    const x = PAD + c * BW;
    ctx.fillStyle = w._color || randomPastel();
    ctx.fillRect(x, gY, BW, BH);
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border2').trim() || '#d8d7d6';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x, gY, BW, BH);
    // Türkçe kelime
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#333';
    ctx.font = 'bold 12px "Roboto Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(w.tr, x + BW / 2, gY + BH / 2);
    // Dil çevirisi (küçük)
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text3').trim() || '#888';
    ctx.font = '10px "Roboto Condensed", sans-serif';
    ctx.fillText(w[G.learnLang] || w.en, x + BW / 2, gY + BH - 8);
  }
}

// Düşen bloğu çiz
function drawFalling() {
  const b = G.fallingBlock;
  if (!b) return;
  const x = PAD + b.col * BW;
  ctx.fillStyle = b.color;
  ctx.fillRect(x, b.y, BW, BH);
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border2').trim() || '#d8d7d6';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(x, b.y, BW, BH);
  // Dil çevirisi
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#333';
  ctx.font = 'bold 12px "Roboto Condensed", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(b.label, x + BW / 2, b.y + BH / 2);
  // Türkçe kelime (küçük)
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text3').trim() || '#888';
  ctx.font = '10px "Roboto Condensed", sans-serif';
  ctx.fillText(b.word.tr, x + BW / 2, b.y + BH - 8);
}

// Parçacıkları çiz
function drawParticles() {
  G.particles.forEach(p => {
    ctx.globalAlpha = p.life / 20;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

// Flash efektlerini çiz
function drawFlash() {
  G.flashCells.forEach(f => {
    const x = PAD + f.col * BW;
    const y = groundRowY();
    ctx.globalAlpha = f.life / 10;
    ctx.fillStyle = f.color;
    ctx.fillRect(x, y, BW, BH);
  });
  ctx.globalAlpha = 1;
}

// Merge blokları çiz
function drawMerged() {
  G.merged.forEach(m => {
    const x = PAD + m.col * BW;
    ctx.fillStyle = m.color;
    ctx.fillRect(x, m.y, BW, BH);
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border2').trim() || '#d8d7d6';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x, m.y, BW, BH);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#333';
    ctx.font = 'bold 12px "Roboto Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(m.val, x + BW / 2, m.y + BH / 2);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text3').trim() || '#888';
    ctx.font = '10px "Roboto Condensed", sans-serif';
    ctx.fillText(m.tr, x + BW / 2, m.y + BH - 8);
  });
}

// HUD güncelle
function updateHUD() {
  document.getElementById('score-num').textContent = G.score;
  document.getElementById('level-num').textContent = G.level;
}

// Combo güncelle
function updateCombo() {
  const el = document.getElementById('combo-num');
  if (!el) return;
  el.textContent = G.combo;
  if (G.combo >= 7) el.style.color = 'var(--orange)';
  else if (G.combo >= 5) el.style.color = 'var(--green)';
  else el.style.color = 'var(--text)';
}

// İlerleme çubuğu güncelle
function updateProgressBar() {
  const bar = document.getElementById('prog-bar-fill');
  const pct = document.getElementById('prog-bar-pct');
  if (!bar || !pct) return;
  const perc = G.catTotal > 0 ? Math.min(100, Math.round((G.catLearned / G.catTotal) * 100)) : 0;
  bar.style.width = perc + '%';
  pct.textContent = G.catLearned + '/' + G.catTotal;
}

// Parçacık oluştur
function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    G.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4 - 2,
      r: Math.random() * 3 + 1,
      color,
      life: 20
    });
  }
}

// Flash ekle
function addFlash(col, color) {
  G.flashCells.push({ col, color, life: 10 });
}

// Skor popup'ı göster
function showScorePopup(text, x, y, color) {
  const pop = document.getElementById('score-popup');
  if (!pop) return;
  pop.textContent = text;
  pop.style.left = x + 'px';
  pop.style.top = y + 'px';
  pop.style.color = color;
  pop.style.display = 'block';
  clearTimeout(G.popTimer);
  G.popTimer = setTimeout(() => {
    pop.style.display = 'none';
  }, 800);
}

// Sonuç flash'ı göster
function showResultFlash(correct) {
  const el = document.getElementById('result-flash');
  if (!el) return;
  el.textContent = correct ? 'DOĞRU' : 'YANLIŞ';
  el.className = correct ? 'result-flash correct' : 'result-flash wrong';
  el.style.display = 'block';
  clearTimeout(G.rfTimer);
  G.rfTimer = setTimeout(() => {
    el.style.display = 'none';
  }, 1200);
}

// Mesaj göster
function showMsg(text) {
  const el = document.getElementById('msg-bubble');
  if (!el) return;
  el.textContent = text;
  el.style.display = 'block';
  clearTimeout(G.msgTimer);
  G.msgTimer = setTimeout(() => {
    el.style.display = 'none';
  }, 1800);
}

// Titreşim (eğer destekleniyorsa)
function doVibrate(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

// Zemin doldur
function refillGround() {
  const emptyCols = G.ground.map((w, idx) => w ? -1 : idx).filter(idx => idx >= 0);
  if (emptyCols.length === 0) return;
  shuffle(emptyCols);
  const usedTrs = new Set(G.ground.filter(w => w).map(w => w.tr));
  for (const col of emptyCols) {
    let word;
    for (let i = 0; i < 10; i++) {
      word = nextUnseen();
      if (word && !usedTrs.has(word.tr)) break;
    }
    if (!word) word = nextUnseen();
    G.ground[col] = word;
    usedTrs.add(word.tr);
  }
}

// Sürükleme ayarla
function setupDrag() {
  const ctrl = document.getElementById('ctrl-row');
  if (!ctrl) return;
  ctrl.innerHTML = '';
  for (let i = 0; i < COLS; i++) {
    const btn = document.createElement('div');
    btn.className = 'cbtn';
    btn.textContent = '⇓';
    btn.dataset.col = i;
    btn.onclick = () => moveFalling(i);
    btn.ontouchstart = e => {
      e.preventDefault();
      moveFalling(i);
    };
    ctrl.appendChild(btn);
  }
}

// Düşen bloğu hareket ettir
function moveFalling(col) {
  if (!G.fallingBlock) return;
  G.fallingBlock.col = col;
  // Eğer hemen yere düşecekse düşür
  const surface = landingY(col);
  if (G.fallingBlock.y + BH >= surface) {
    G.fallingBlock.y = surface - BH;
    landBlock();
  }
}

// Oyun modunu ayarla
function setGameMode(mode) {
  G_MODE = mode;
  const myPanel = document.getElementById('mode-panel-mylist');
  if (myPanel) myPanel.style.display = (mode === 'mylist') ? 'flex' : 'none';
  if (mode === 'mylist') renderMyListQuota();
  renderCatGrid();
  renderLevelDropdown();
}

// Seviye dropdown'ı render et
function renderLevelDropdown() {
  const list = document.getElementById('level-dropdown-list');
  if (!list) return;
  list.innerHTML = '';
  const isPremium = CU_ROLE === 'admin' || CU_ROLE === 'teacher' || (CU && CU.premium);
  DB = loadDB();
  const catsActive = (JSON.parse(localStorage.getItem('selected_categories') || '[]')).length > 0;

  // Kategori seçiliyse seviyeyi pasifleştir
  const trigger = document.getElementById('level-dropdown-trigger');
  if (trigger) {
    if (catsActive) {
      trigger.classList.add('disabled');
      trigger.title = 'Kategori seçili olduğu için seviye pasif';
    } else {
      trigger.classList.remove('disabled');
      trigger.title = '';
    }
  }

  if (catsActive) {
    const info = document.createElement('div');
    info.className = 'cat-dropdown-warn';
    info.style.color = 'var(--text3)';
    info.textContent = 'Kategori seçili — seviye pasif';
    list.appendChild(info);
    const label = document.getElementById('level-dropdown-label');
    if (label) {
      label.textContent = 'Seviye seçin...';
      label.style.color = 'var(--text3)';
    }
    return;
  }

  // Kullanıcı diline göre seviyeler
  const userLang2 = (CU && CU.learnLang) || G.learnLang || 'en';
  const allLvls = getAllLevels(userLang2);
  if (Object.keys(allLvls).length === 0 && !catsActive) {
    const noLvl = document.createElement('div');
    noLvl.className = 'cat-dropdown-warn';
    noLvl.style.color = 'var(--text3)';
    noLvl.textContent = 'Henüz seviye yok. Admin panelinden ekleyin.';
    list.appendChild(noLvl);
    return;
  }

  Object.entries(allLvls).forEach(([key, localName]) => {
    const isLocked = isLevelPremium(key) && !isPremium;
    const isChecked = G_LEVELS.includes(key) && !isLocked;
    const def = { name: localName, premium: isLevelPremium(key) };

    const item = document.createElement('div');
    item.className = 'cat-dropdown-item' + (isLocked ? ' locked' : '');

    const cb = document.createElement('div');
    cb.className = 'cat-cb' + (isChecked ? ' checked' : '');

    const nameSpan = document.createElement('span');
    nameSpan.className = 'cat-item-name';
    nameSpan.textContent = def.name;

    item.appendChild(cb);
    item.appendChild(nameSpan);

    if (isLocked) {
      const lock = document.createElement('span');
      lock.className = 'cat-lock-icon';
      lock.textContent = '🔒';
      item.appendChild(lock);
    }

    if (!isLocked) {
      item.onclick = function () {
        if (G_LEVELS.includes(key)) {
          G_LEVELS = G_LEVELS.filter(k => k !== key);
        } else {
          G_LEVELS.push(key);
        }
        renderLevelDropdown();
        renderCatGrid();
      };
    }

    list.appendChild(item);
  });

  if (G_LEVELS.length === 0) {
    const warn = document.createElement('div');
    warn.className = 'cat-dropdown-warn';
    warn.textContent = 'En az bir seviye seçin';
    list.appendChild(warn);
  }

  const label = document.getElementById('level-dropdown-label');
  if (label) {
    const allDefs = DB.levelDefs || LEVEL_DEFS;
    if (G_LEVELS.length === 0) {
      label.textContent = 'Seviye seçin...';
      label.style.color = 'var(--text3)';
    } else if (G_LEVELS.length === Object.keys(allDefs).length) {
      label.textContent = 'Tüm seviyeler';
      label.style.color = 'var(--green-dark)';
    } else {
      label.textContent = G_LEVELS.map(k => (allDefs[k] || {}).name || k).join(', ');
      label.style.color = 'var(--green-dark)';
    }
  }
}

// Seviye dropdown'ı aç/kapat
function toggleLevelDropdown() {
  const trigger = document.getElementById('level-dropdown-trigger');
  const list = document.getElementById('level-dropdown-list');
  if (!trigger || !list) return;
  if (trigger.classList.contains('disabled')) return;
  const isOpen = list.classList.contains('open');
  trigger.classList.toggle('open', !isOpen);
  list.classList.toggle('open', !isOpen);
}

// Oyun bitti ekranı
function showGameOver() {
  stopGame();
  const overlay = document.getElementById('game-overlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  const title = overlay.querySelector('.over-title');
  const sub = overlay.querySelector('.over-sub');
  if (title) title.textContent = t('game_over');
  if (sub) sub.textContent = `Skor: ${G.score}`;
}

// Oyunu yeniden başlat
function restartGame() {
  document.getElementById('game-overlay').style.display = 'none';
  launchGame();
}

// Menüye dön
function backToMenuFromGame() {
  stopGame();
  showScreen('menu');
}

// ── Global export ──
window.G = G;
window.G_MODE = G_MODE;
window.G_LEVELS = G_LEVELS;
window.startGame = startGame;
window.launchGame = launchGame;
window.stopGame = stopGame;
window.restartGame = restartGame;
window.backToMenuFromGame = backToMenuFromGame;
window.showGameOver = showGameOver;
window.setGameMode = setGameMode;
window.toggleLevelDropdown = toggleLevelDropdown;
window.renderLevelDropdown = renderLevelDropdown;
window.setLang = setLang;
window.setLangDropdown = setLangDropdown;
window.toggleLangDropdown = toggleLangDropdown;
window.moveFalling = moveFalling;
window.groundRowY = groundRowY;
window.landingY = landingY;
window.getWordPool = getWordPool;
window.buildPool = buildPool;
window.nextUnseen = nextUnseen;
window.initGround = initGround;
window.spawnFalling = spawnFalling;
window.speak = speak;
window.randomPastel = randomPastel;
window.stepFalling = stepFalling;
window.landBlock = landBlock;
window.triggerMatch = triggerMatch;
window.triggerMismatch = triggerMismatch;
window.triggerEmpty = triggerEmpty;
window.triggerMergedCorrect = triggerMergedCorrect;
window.triggerMergedWrong = triggerMergedWrong;
window.triggerGroundChange = triggerGroundChange;
window.updateSR = updateSR;
window.updateParticles = updateParticles;
window.updateFlashCells = updateFlashCells;
window.updateGroundShake = updateGroundShake;
window.draw = draw;
window.updateHUD = updateHUD;
window.updateCombo = updateCombo;
window.updateProgressBar = updateProgressBar;
window.spawnParticles = spawnParticles;
window.addFlash = addFlash;
window.showScorePopup = showScorePopup;
window.showResultFlash = showResultFlash;
window.showMsg = showMsg;
window.doVibrate = doVibrate;
window.refillGround = refillGround;
window.setupDrag = setupDrag;