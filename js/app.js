// ════════════════════════════════
// app.js – Ana uygulama mantığı, ekran yönetimi, render fonksiyonları
// ════════════════════════════════

// ── Ekran yönetimi ──
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(el => el.style.display = 'none');
  const target = document.getElementById('screen-' + screenId);
  if (target) target.style.display = 'flex';
  if (screenId === 'login') {
    renderGlobalStats();
  } else if (screenId === 'menu') {
    renderMenu();
  } else if (screenId === 'game') {
    // Oyun ekranına geçildiğinde canvas'ı yeniden boyutlandır
    const canvas = document.getElementById('gc');
    if (canvas) {
      canvas.width = CANVAS_W;
      canvas.height = CANVAS_H;
    }
  }
}

// ── Kategori dropdown aç/kapat ──
function toggleCatDropdown() {
  const trigger = document.getElementById('cat-dropdown-trigger');
  const list = document.getElementById('cat-dropdown-list');
  if (!trigger || !list) return;
  if (trigger.classList.contains('disabled')) return;
  const isOpen = list.classList.contains('open');
  trigger.classList.toggle('open', !isOpen);
  list.classList.toggle('open', !isOpen);
}

// ── Kategori dropdown render ──
function renderCatDropdown() {
  const list = document.getElementById('cat-dropdown-list');
  if (!list) return;
  list.innerHTML = '';
  const selectedCats = JSON.parse(localStorage.getItem('selected_categories') || '[]');
  const isPremium = CU_ROLE === 'admin' || CU_ROLE === 'teacher' || (CU && CU.premium);
  
  // Seviye seçiliyse kategori dropdown'ını pasif yap
  const trigger = document.getElementById('cat-dropdown-trigger');
  if (trigger) {
    if (G_LEVELS.length > 0 && selectedCats.length === 0) {
      trigger.classList.add('disabled');
      trigger.title = 'Seviye seçili olduğu için kategori pasif';
    } else {
      trigger.classList.remove('disabled');
      trigger.title = '';
    }
  }
  
  if (G_LEVELS.length > 0 && selectedCats.length === 0) {
    const info = document.createElement('div');
    info.className = 'cat-dropdown-warn';
    info.style.color = 'var(--text3)';
    info.textContent = 'Seviye modu aktif — kategori pasif';
    list.appendChild(info);
    const label = document.getElementById('cat-dropdown-label');
    if (label) {
      label.textContent = 'Kategori seçin...';
      label.style.color = 'var(--text3)';
    }
    return;
  }
  
  DB = loadDB();
  const userLang = CU?.learnLang || G.learnLang || 'en';
  const categories = DB.categories || DEFAULT_CATEGORIES;
  
  Object.entries(categories).forEach(([key, cat]) => {
    const isLocked = cat.locked && !isPremium;
    const isChecked = selectedCats.includes(key) && !isLocked;
    const catName = cat.names?.[userLang] || cat.names?.tr || key;
    const wordCount = getWords(key, userLang).length;
    
    const item = document.createElement('div');
    item.className = 'cat-dropdown-item' + (isLocked ? ' locked' : '');
    
    const cb = document.createElement('div');
    cb.className = 'cat-cb' + (isChecked ? ' checked' : '');
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'cat-item-name';
    nameSpan.textContent = catName;
    
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
        let selected = JSON.parse(localStorage.getItem('selected_categories') || '[]');
        if (selected.includes(key)) {
          selected = selected.filter(k => k !== key);
        } else {
          selected.push(key);
        }
        localStorage.setItem('selected_categories', JSON.stringify(selected));
        // Eğer kategori seçildiyse seviyeyi temizle
        if (selected.length > 0) {
          G_LEVELS = [];
        }
        renderCatDropdown();
        renderCatGrid();
        renderLevelDropdown();
      };
    }
    
    list.appendChild(item);
  });
  
  if (selectedCats.length === 0) {
    const warn = document.createElement('div');
    warn.className = 'cat-dropdown-warn';
    warn.textContent = 'En az bir kategori seçin';
    list.appendChild(warn);
  }
  
  const label = document.getElementById('cat-dropdown-label');
  if (label) {
    if (selectedCats.length === 0) {
      label.textContent = 'Kategori seçin...';
      label.style.color = 'var(--text3)';
    } else if (selectedCats.length === Object.keys(categories).length) {
      label.textContent = 'Tüm kategoriler';
      label.style.color = 'var(--green-dark)';
    } else {
      const catNames = selectedCats.map(k => {
        const cat = categories[k];
        return cat?.names?.[userLang] || cat?.names?.tr || k;
      });
      label.textContent = catNames.join(', ');
      label.style.color = 'var(--green-dark)';
    }
  }
}

// ── Global istatistikleri render et ──
function renderGlobalStats() {
  DB = loadDB();
  const stats = DB.globalStats || { correct: 0, wrong: 0, learned: 0 };
  const total = stats.correct + stats.wrong;
  const acc = total > 0 ? Math.round((stats.correct / total) * 100) : 0;
  document.getElementById('global-correct').textContent = stats.correct;
  document.getElementById('global-wrong').textContent = stats.wrong;
  document.getElementById('global-learned').textContent = stats.learned;
  document.getElementById('global-accuracy').textContent = acc + '%';
}

// ── Menü render ──
function renderMenu() {
  if (!CU) return;
  // Kullanıcı bilgileri
  const userSubEl = document.getElementById('menu-user-sub');
  if (userSubEl) userSubEl.textContent = (CU.name || t('name_placeholder')) + ' · ' + (
    CU_ROLE === 'normal' ? t('role_normal') :
    CU_ROLE === 'student' ? t('role_student') :
    CU_ROLE === 'teacher' ? t('role_teacher') : t('role_admin'));
  // Streak badge
  const streakNumEl = document.getElementById('streak-num');
  if (streakNumEl) streakNumEl.textContent = CU.streak || 0;
  // İstatistikler
  const muCorrect = document.getElementById('mu-correct');
  if (muCorrect) muCorrect.textContent = CU.totalCorrect || 0;
  const muWrong = document.getElementById('mu-wrong');
  if (muWrong) muWrong.textContent = CU.totalWrong || 0;
  const muLearned = document.getElementById('mu-learned');
  if (muLearned) muLearned.textContent = CU.totalLearned || 0;
  const muStreak = document.getElementById('mu-streak');
  if (muStreak) muStreak.textContent = CU.streak || 0;
  // İlerleme yüzdesi
  const total = (CU.totalCorrect || 0) + (CU.totalWrong || 0);
  const pct = total > 0 ? Math.round(((CU.totalCorrect || 0) / total) * 100) : 0;
  const pctEl = document.getElementById('menu-pct-txt');
  if (pctEl) pctEl.textContent = pct + '%';
  const fillEl = document.getElementById('menu-fill');
  if (fillEl) fillEl.style.width = pct + '%';
  // Kategori dropdown, kategori grid ve seviye dropdown'ı render et
  renderCatDropdown();
  renderCatGrid();
  renderLevelDropdown();
  // Öğretmen paneli
  if (CU_ROLE === 'teacher') {
    renderTeacherPanel();
  }
  // Admin paneli
  if (CU_ROLE === 'admin') {
    renderAdminPanel();
  }
}

// ── Kategori grid render ──
function renderCatGrid() {
  const grid = document.getElementById('cat-grid');
  if (!grid) return;
  grid.innerHTML = '';
  DB = loadDB();
  const userLang = CU?.learnLang || G.learnLang || 'en';
  const selectedCats = JSON.parse(localStorage.getItem('selected_categories') || '[]');
  const isPremium = CU_ROLE === 'admin' || CU_ROLE === 'teacher' || (CU && CU.premium);
  // Seviye seçiliyse kategori grid'ini pasif yap
  if (G_LEVELS.length > 0 && selectedCats.length === 0) {
    grid.innerHTML = '<div class="cat-warn">Seviye modu aktif — kategori seçimi pasif</div>';
    return;
  }
  // Karışık mod için "karışık" kartı
  const mixedChecked = selectedCats.length > 1;
  const mixedItem = document.createElement('div');
  mixedItem.className = 'cat-item' + (mixedChecked ? ' checked' : '');
  mixedItem.innerHTML = `
    <div class="cat-cb">${mixedChecked ? '✓' : ''}</div>
    <span class="cat-icon">🔄</span>
    <div class="cat-name">${t('mixed_categories')}</div>
    <div class="cat-count">${selectedCats.length}</div>
  `;
  mixedItem.onclick = () => {
    if (selectedCats.length > 1) {
      localStorage.setItem('selected_categories', JSON.stringify([]));
    } else {
      // En az iki kategori seçili değilse uyar
      alert('Karışık mod için en az iki kategori seçmelisiniz.');
    }
    renderCatGrid();
    renderLevelDropdown();
  };
  grid.appendChild(mixedItem);
  // Her kategori
  Object.entries(DB.categories || DEFAULT_CATEGORIES).forEach(([key, cat]) => {
    const isLocked = cat.locked && !isPremium;
    const isChecked = selectedCats.includes(key) && !isLocked;
    const item = document.createElement('div');
    item.className = 'cat-item' + (isLocked ? ' locked' : '') + (isChecked ? ' checked' : '');
    const catName = cat.names?.[userLang] || cat.names?.tr || key;
    const wordCount = getWords(key, userLang).length;
    item.innerHTML = `
      <div class="cat-cb">${isChecked ? '✓' : ''}</div>
      <span class="cat-icon">${key === 'animals' ? '🐾' : key === 'food' ? '🍎' : key === 'nature' ? '🌳' : key === 'travel' ? '✈️' : '👤'}</span>
      <div class="cat-name">${catName}</div>
      <div class="cat-count">${wordCount}</div>
    `;
    if (isLocked) {
      const lock = document.createElement('span');
      lock.className = 'cat-lock-icon';
      lock.textContent = '🔒';
      item.appendChild(lock);
    }
    if (!isLocked) {
      item.onclick = function () {
        let selected = JSON.parse(localStorage.getItem('selected_categories') || '[]');
        if (selected.includes(key)) {
          selected = selected.filter(k => k !== key);
        } else {
          selected.push(key);
        }
        localStorage.setItem('selected_categories', JSON.stringify(selected));
        // Eğer kategori seçildiyse seviyeyi temizle
        if (selected.length > 0) {
          G_LEVELS = [];
        }
        renderCatGrid();
        renderLevelDropdown();
      };
    }
    grid.appendChild(item);
  });
}

// ── Öğretmen paneli render ──
function renderTeacherPanel() {
  const panel = document.getElementById('teacher-panel');
  if (!panel) return;
  panel.style.display = 'flex';
  // Öğrenci listesi
  const studentList = document.getElementById('teacher-student-list');
  if (studentList) {
    studentList.innerHTML = '';
    DB = loadDB();
    const students = Object.values(DB.users).filter(u => u.role === 'student' && u.teacherId === CU_ID);
    students.forEach(s => {
      const li = document.createElement('div');
      li.className = 'student-item' + (selectedStudentId === s.id ? ' selected' : '');
      li.innerHTML = `
        <div>${s.name}</div>
        <div class="student-stats">${s.totalCorrect || 0} / ${s.totalWrong || 0}</div>
      `;
      li.onclick = () => {
        selectedStudentId = s.id;
        renderTeacherPanel();
        renderStudentStats(s);
      };
      studentList.appendChild(li);
    });
  }
  // Öğretmen kodu
  const codeEl = document.getElementById('teacher-code');
  if (codeEl) codeEl.textContent = CU.code || '???';
}

// ── Öğrenci istatistiklerini render et ──
function renderStudentStats(student) {
  const panel = document.getElementById('student-stats-panel');
  if (!panel) return;
  panel.style.display = 'flex';
  document.getElementById('stats-name').textContent = student.name;
  document.getElementById('stats-correct').textContent = student.totalCorrect || 0;
  document.getElementById('stats-wrong').textContent = student.totalWrong || 0;
  document.getElementById('stats-learned').textContent = student.totalLearned || 0;
  document.getElementById('stats-streak').textContent = student.streak || 0;
}

// ── Admin paneli render ──
function renderAdminPanel() {
  const panel = document.getElementById('admin-panel');
  if (!panel) return;
  panel.style.display = 'flex';
  // Dil yönetimi
  renderLangManager();
  // Kategori yönetimi
  renderCatManager();
  // Seviye yönetimi
  renderLevelManager();
  // Kullanıcı istatistikleri
  renderUserStats();
}

// ── Dil yöneticisi ──
function renderLangManager() {
  const list = document.getElementById('admin-lang-list');
  if (!list) return;
  list.innerHTML = '';
  DB = loadDB();
  const langs = DB.languages || DEFAULT_LANGUAGES;
  Object.entries(langs).forEach(([code, lang]) => {
    const li = document.createElement('div');
    li.className = 'admin-lang-item';
    li.innerHTML = `
      <div class="lang-flag">${lang.flag}</div>
      <div class="lang-info">
        <div class="lang-name">${lang.name} (${lang.native})</div>
        <div class="lang-code">${code}</div>
      </div>
      <div class="lang-toggle">
        <label class="switch">
          <input type="checkbox" ${lang.active ? 'checked' : ''} onchange="toggleLangActive('${code}', this.checked)">
          <span class="slider"></span>
        </label>
      </div>
    `;
    list.appendChild(li);
  });
}

// ── Dil aktif/pasif toggle ──
function toggleLangActive(code, active) {
  DB = loadDB();
  if (!DB.languages[code]) return;
  DB.languages[code].active = active;
  saveDB(DB);
  renderLangManager();
}

// ── Kategori yöneticisi ──
function renderCatManager() {
  const tabs = document.getElementById('admin-cat-tabs');
  const content = document.getElementById('admin-cat-content');
  if (!tabs || !content) return;
  // Tab'lar
  tabs.innerHTML = '';
  DB = loadDB();
  Object.keys(DB.categories || DEFAULT_CATEGORIES).forEach(catKey => {
    const btn = document.createElement('button');
    btn.className = 'admin-tab-btn' + (adminCatTab === catKey ? ' active' : '');
    btn.textContent = getCatName(catKey, 'tr');
    btn.onclick = () => {
      adminCatTab = catKey;
      renderCatManager();
    };
    tabs.appendChild(btn);
  });
  // İçerik
  content.innerHTML = '';
  const cat = DB.categories[adminCatTab] || DEFAULT_CATEGORIES[adminCatTab];
  const words = DB.words?.[adminCatTab]?.[G.learnLang] || DEFAULT_WORDS_V2[adminCatTab]?.[G.learnLang] || [];
  // Kategori adı düzenleme
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.value = cat.names?.tr || '';
  nameInput.placeholder = 'Türkçe ad';
  nameInput.onchange = () => {
    cat.names = cat.names || {};
    cat.names.tr = nameInput.value;
    saveDB(DB);
  };
  content.appendChild(nameInput);
  // Kelime listesi
  const wordList = document.createElement('div');
  wordList.className = 'admin-word-list';
  words.forEach((w, idx) => {
    const row = document.createElement('div');
    row.className = 'admin-word-row';
    row.innerHTML = `
      <div class="word-tr">${w.tr}</div>
      <div class="word-val">${w.val}</div>
      <button onclick="deleteWord('${adminCatTab}', '${G.learnLang}', ${idx})">Sil</button>
    `;
    wordList.appendChild(row);
  });
  content.appendChild(wordList);
  // Yeni kelime ekle
  const newRow = document.createElement('div');
  newRow.className = 'admin-word-new';
  newRow.innerHTML = `
    <input id="new-tr" placeholder="Türkçe">
    <input id="new-val" placeholder="Çeviri">
    <button onclick="addWord('${adminCatTab}', '${G.learnLang}')">Ekle</button>
  `;
  content.appendChild(newRow);
}

// ── Seviye yöneticisi ──
function renderLevelManager() {
  const list = document.getElementById('admin-level-list');
  if (!list) return;
  list.innerHTML = '';
  DB = loadDB();
  const levels = DB.levels || DEFAULT_LEVELS;
  Object.entries(levels).forEach(([key, level]) => {
    const li = document.createElement('div');
    li.className = 'admin-level-item';
    li.innerHTML = `
      <div class="level-key">${key.toUpperCase()}</div>
      <div class="level-name">${level.names?.tr || level.names?.en || key}</div>
      <div class="level-premium">${level.premium ? '🔒 Premium' : 'Ücretsiz'}</div>
      <div class="level-words">${Object.keys(DB.levelWords?.[key] || {}).length} kelime</div>
    `;
    list.appendChild(li);
  });
}

// ── Kullanıcı istatistikleri ──
function renderUserStats() {
  const list = document.getElementById('admin-user-list');
  if (!list) return;
  list.innerHTML = '';
  DB = loadDB();
  const users = Object.values(DB.users);
  users.forEach(u => {
    const li = document.createElement('div');
    li.className = 'admin-user-item';
    li.innerHTML = `
      <div class="user-name">${u.name}</div>
      <div class="user-role">${u.role}</div>
      <div class="user-stats">${u.totalCorrect || 0} / ${u.totalWrong || 0}</div>
      <div class="user-learned">${u.totalLearned || 0} kelime</div>
    `;
    list.appendChild(li);
  });
}

// ── Ayarlar render ──
function renderSettings() {
  const panel = document.getElementById('settings-panel');
  if (!panel) return;
  // Öğrenilen dil
  const select = document.getElementById('sett-learn-lang');
  if (select) {
    select.innerHTML = '';
    const activeLangs = getActiveLangs();
    activeLangs.forEach(lang => {
      const opt = document.createElement('option');
      opt.value = lang.code;
      opt.textContent = `${lang.flag} ${lang.name}`;
      select.appendChild(opt);
    });
    select.value = G.learnLang || 'en';
  }
  // TTS toggle
  const tts = document.getElementById('set-tts');
  if (tts) {
    tts.checked = localStorage.getItem('kt_tts') === '1';
  }
}

// ── Ayarları kaydet ──
function saveSettings() {
  const lang = document.getElementById('sett-learn-lang').value;
  setLearnLangFromSettings(lang);
  const tts = document.getElementById('set-tts').checked;
  localStorage.setItem('kt_tts', tts ? '1' : '0');
  alert('Ayarlar kaydedildi.');
}

// ── Kendi listesi render ──
function renderMyListQuota() {
  DB = loadDB();
  const myWords = (DB.userWords || {})[CU_ID] || [];
  document.getElementById('mylist-count').textContent = myWords.length;
}

// ── Excel'den kelime ekle ──
function importExcel() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.xlsx,.xls,.csv';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (event) {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
      const words = [];
      rows.forEach(row => {
        if (row.length >= 2 && row[0] && row[1]) {
          words.push({ tr: String(row[0]).trim().toUpperCase(), val: String(row[1]).trim() });
        }
      });
      DB = loadDB();
      if (!DB.userWords) DB.userWords = {};
      if (!DB.userWords[CU_ID]) DB.userWords[CU_ID] = [];
      DB.userWords[CU_ID].push(...words);
      saveDB(DB);
      alert(`${words.length} kelime eklendi.`);
      renderMyListQuota();
    };
    reader.readAsArrayBuffer(file);
  };
  input.click();
}

// ── Görselden kelime ekle ──
function importImage() {
  alert('Bu özellik geliştirme aşamasında. Yakında gelecek!');
}

// ── Kelime ekle ──
function addWord(catKey, langCode) {
  const tr = document.getElementById('new-tr').value.trim().toUpperCase();
  const val = document.getElementById('new-val').value.trim();
  if (!tr || !val) return alert('Lütfen her iki alanı da doldurun.');
  DB = loadDB();
  if (!DB.words[catKey]) DB.words[catKey] = {};
  if (!DB.words[catKey][langCode]) DB.words[catKey][langCode] = [];
  DB.words[catKey][langCode].push({ tr, val });
  saveDB(DB);
  document.getElementById('new-tr').value = '';
  document.getElementById('new-val').value = '';
  renderCatManager();
}

// ── Kelime sil ──
function deleteWord(catKey, langCode, idx) {
  if (!confirm('Bu kelimeyi silmek istediğinize emin misiniz?')) return;
  DB = loadDB();
  if (DB.words[catKey] && DB.words[catKey][langCode]) {
    DB.words[catKey][langCode].splice(idx, 1);
    saveDB(DB);
    renderCatManager();
  }
}

// ── Yardımcı fonksiyonlar ──

// Shuffle array
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Belirli bir kategorinin kelimelerini al
function getWords(catKey, lang) {
  DB = loadDB();
  const cat = DB.words?.[catKey] || DEFAULT_WORDS_V2[catKey];
  if (!cat) return [];
  return cat[lang] || cat['en'] || [];
}

// Belirli bir seviyenin kelimelerini al
function getLevelWords(levelKey, lang) {
  DB = loadDB();
  return DB.levelWords?.[levelKey]?.[lang] || [];
}

// Tüm seviyeleri isimleriyle al
function getAllLevels(lang) {
  DB = loadDB();
  const levels = DB.levels || DEFAULT_LEVELS;
  const result = {};
  Object.entries(levels).forEach(([key, level]) => {
    result[key] = level.names?.[lang] || level.names?.tr || key;
  });
  return result;
}

// Seviye premium mu kontrol et
function isLevelPremium(levelKey) {
  DB = loadDB();
  const level = (DB.levels || DEFAULT_LEVELS)[levelKey];
  return level ? level.premium : false;
}

// ── Global export ──
window.showScreen = showScreen;
window.toggleCatDropdown = toggleCatDropdown;
window.renderCatDropdown = renderCatDropdown;
window.renderGlobalStats = renderGlobalStats;
window.renderMenu = renderMenu;
window.renderCatGrid = renderCatGrid;
window.renderTeacherPanel = renderTeacherPanel;
window.renderStudentStats = renderStudentStats;
window.renderAdminPanel = renderAdminPanel;
window.renderLangManager = renderLangManager;
window.toggleLangActive = toggleLangActive;
window.renderCatManager = renderCatManager;
window.renderLevelManager = renderLevelManager;
window.renderUserStats = renderUserStats;
window.renderSettings = renderSettings;
window.saveSettings = saveSettings;
window.renderMyListQuota = renderMyListQuota;
window.importExcel = importExcel;
window.importImage = importImage;
window.addWord = addWord;
window.deleteWord = deleteWord;
window.shuffle = shuffle;
window.getWords = getWords;
window.getLevelWords = getLevelWords;
window.getAllLevels = getAllLevels;
window.isLevelPremium = isLevelPremium;
