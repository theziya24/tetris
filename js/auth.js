// ════════════════════════════════
// auth.js – Kullanıcı kimlik doğrulama ve oturum yönetimi
// ════════════════════════════════

// ── Oturum değişkenleri ──
let CU_ID = null;          // current user ID
let CU_ROLE = null;        // 'normal' | 'student' | 'teacher' | 'admin'
let pendingSmsCode = null;
let pendingTeacherData = null;
let selectedStudentId = null;
let adminCatTab = 'animals'; // default category tab for admin
let teacherCatTab = 'animals'; // default category tab for teacher

// ── Yardımcı fonksiyonlar ──

// Cihaz kimliği al veya oluştur
function getOrCreateDeviceId() {
  let id = localStorage.getItem('kt_device_id');
  if (!id) {
    // Tarayıcı parmak izi (basit)
    if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
      navigator.userAgentData.getHighEntropyValues(['architecture', 'model', 'platformVersion'])
        .then(values => {
          const str = values.architecture + values.model + values.platformVersion;
          id = 'dev_' + btoa(str).replace(/[^a-zA-Z0-9]/g, '').substr(0, 8);
          localStorage.setItem('kt_device_id', id);
        })
        .catch(() => {
          id = 'user_' + Math.random().toString(36).substr(2, 5) + Math.random().toString(36).substr(2, 5);
          localStorage.setItem('kt_device_id', id);
        });
    } else {
      id = 'user_' + Math.random().toString(36).substr(2, 5) + Math.random().toString(36).substr(2, 5);
      localStorage.setItem('kt_device_id', id);
    }
  }
  return id;
}

// Rastgele oyuncu adı oluştur
function generateRandomName() {
  const emojis = ['🦊', '🦁', '🐺', '🦅', '🐬', '🦋', '🐉', '🦄', '🐯', '🦈', '🦚', '🦜', '🐻', '🦞', '🦝'];
  const num = Math.floor(1000 + Math.random() * 9000);
  const emoji = emojis[Math.floor(Math.random() * emojis.length)];
  return emoji + ' Player_' + num;
}

// Kullanıcıyı kaydet
function saveUser() {
  if (!CU || !CU_ID) return;
  if (CU_ROLE === 'normal' || CU_ROLE === 'student') {
    DB.users[CU_ID] = CU;
  } else if (CU_ROLE === 'teacher') {
    DB.teachers[CU_ID] = CU;
  }
  saveDB(DB);
}

// Streak güncelle
function updateStreak() {
  if (!CU) return;
  const today = new Date().toLocaleDateString('tr-TR');
  if (CU.lastPlayDate === today) return;
  if (CU.lastPlayDate) {
    const last = new Date(CU.lastPlayDate.split('.').reverse().join('-'));
    const now = new Date();
    const diffDays = Math.floor((now - last) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      CU.streak = (CU.streak || 0) + 1;
    } else if (diffDays > 1) {
      CU.streak = 0;
    }
  }
  CU.lastPlayDate = today;
  saveUser();
}

// ── Giriş işlemleri ──

// Otomatik giriş — "Oynamaya Başla" butonu
function autoLogin() {
  DB = loadDB();
  const deviceId = getOrCreateDeviceId();

  // Daha önce bu cihazda hesap var mı?
  if (DB.users[deviceId]) {
    CU_ID = deviceId;
    CU_ROLE = 'normal';
    CU = DB.users[deviceId];
  } else {
    // Yeni kullanıcı oluştur
    const name = generateRandomName();
    DB.users[deviceId] = {
      id: deviceId,
      name,
      role: 'normal',
      cloudLinked: false,
      cloudEmail: null,
      totalScore: 0,
      totalCorrect: 0,
      totalWrong: 0,
      totalLearned: 0,
      streak: 0,
      lastPlayDate: null,
      srData: {},
      learnedWords: [],
      gameMinutes: 0,
      premium: false,
      createdAt: new Date().toLocaleDateString('tr-TR')
    };
    saveDB(DB);
    CU_ID = deviceId;
    CU_ROLE = 'normal';
    CU = DB.users[deviceId];
  }
  enterApp();
}

// Giriş modalını aç
function openLoginModal(type) {
  const backdrop = document.getElementById('login-modal-backdrop');
  backdrop.style.display = 'flex';
  // Direkt ilgili paneli aç
  document.querySelectorAll('.login-panel').forEach(p => p.style.display = 'none');
  const panel = document.getElementById('panel-' + (type || 'student'));
  if (panel) panel.style.display = 'flex';
  const smsStep = document.getElementById('teacher-sms-step');
  if (smsStep) smsStep.style.display = 'none';
}

// Giriş modalını kapat
function closeLoginModal() {
  document.getElementById('login-modal-backdrop').style.display = 'none';
}

// Öğrenci girişi
function loginStudent() {
  const code = document.getElementById('s-code').value.trim().toUpperCase();
  if (!code) {
    alert(t('teacher_code_placeholder'));
    return;
  }
  DB = loadDB();
  const teacher = Object.values(DB.teachers).find(t => t.code === code);
  if (!teacher) {
    alert('Geçersiz öğretmen kodu.');
    return;
  }
  const sid = 'S_' + teacher.id + '_' + Date.now().toString(36);
  if (!DB.users[sid]) {
    DB.users[sid] = {
      id: sid,
      name: t('name_placeholder'),
      role: 'student',
      teacherId: teacher.id,
      totalScore: 0,
      totalCorrect: 0,
      totalWrong: 0,
      totalLearned: 0,
      streak: 0,
      lastPlayDate: null,
      srData: {},
      learnedWords: [],
      gameMinutes: 0,
      premium: false,
      createdAt: new Date().toLocaleDateString('tr-TR')
    };
    saveDB(DB);
  }
  CU_ID = sid;
  CU_ROLE = 'student';
  CU = DB.users[sid];
  enterApp();
}

// Öğretmen girişi (SMS doğrulama)
function loginTeacher() {
  const name = document.getElementById('t-name').value.trim();
  const cls = document.getElementById('t-class').value.trim();
  const phone = document.getElementById('t-phone').value.trim().replace(/\D/g, '');
  if (!name || !cls || !phone) {
    alert('Lütfen tüm alanları doldurun.');
    return;
  }
  // SMS simülasyonu (gerçekte bir API çağrısı olurdu)
  pendingSmsCode = Math.floor(100000 + Math.random() * 900000).toString();
  pendingTeacherData = { name, cls, phone };
  alert(`SMS kodu gönderildi: ${pendingSmsCode} (simülasyon)`);
  document.getElementById('teacher-sms-step').style.display = 'flex';
}

// SMS doğrulama
function verifySMS() {
  const entered = document.getElementById('t-sms').value.trim();
  if (entered !== pendingSmsCode) {
    alert('Kod hatalı.');
    return;
  }
  DB = loadDB();
  const { name, cls, phone } = pendingTeacherData;
  const tid = 'T_' + phone.replace(/\D/g, '');

  if (!DB.teachers[tid]) {
    // Benzersiz 8 haneli öğrenci kodu üret
    let code;
    const existing = new Set(Object.values(DB.teachers).map(t => t.code));
    do {
      code = 'T' + Math.random().toString(36).substr(2, 7).toUpperCase();
    } while (existing.has(code));

    DB.teachers[tid] = {
      id: tid,
      name,
      cls,
      phone,
      code,
      role: 'teacher',
      customWords: {},
      createdAt: new Date().toLocaleDateString('tr-TR')
    };
    saveDB(DB);
  }
  CU_ID = tid;
  CU_ROLE = 'teacher';
  CU = DB.teachers[tid];
  enterApp();
}

// Uygulamaya giriş yap
function enterApp() {
  closeLoginModal();
  updateStreak();
  // Kayıtlı dil tercihini yükle
  if (CU && CU.learnLang) G.learnLang = CU.learnLang;
  showScreen('menu');
  renderMenu();
  maybeShowWelcomeModal();
  // İlk girişte öğrenilen dil seçim ekranı
  const langKey = 'learn_lang_set_' + (CU_ID || 'guest');
  if (!localStorage.getItem(langKey)) {
    setTimeout(() => showLangSelectScreen(), 400);
  }
}

// Öğrenilen dil seçim ekranını göster
function showLangSelectScreen() {
  const bd = document.getElementById('lang-select-backdrop');
  if (!bd) return;
  // Aktif dilleri DB'den al
  const optWrap = document.getElementById('lang-select-options');
  if (optWrap) {
    optWrap.innerHTML = '';
    const activeLangs = getActiveLangs();
    activeLangs.forEach(lang => {
      const btn = document.createElement('button');
      btn.className = 'lang-select-opt';
      btn.id = 'lsopt-' + lang.code;
      btn.innerHTML = `
        <span style="font-size:22px">${lang.flag}</span>
        <div>
          <div style="font-size:14px;font-weight:500">${lang.name}</div>
          <div style="font-size:11px;color:var(--text3)">${lang.code.toUpperCase()}</div>
        </div>`;
      btn.onclick = () => selectLearnLang(lang.code);
      optWrap.appendChild(btn);
    });
    if (activeLangs.length === 0) {
      optWrap.innerHTML = '<div style="font-size:13px;color:var(--text3);text-align:center">Henüz aktif dil yok. Admin panelinden ekleyin.</div>';
    }
  }
  applyTranslations();
  bd.style.display = 'flex';
}

// Öğrenilen dili seç
function selectLearnLang(lang) {
  G.learnLang = lang;
  if (CU) {
    CU.learnLang = lang;
    saveUser();
  }
  localStorage.setItem('learn_lang_set_' + (CU_ID || 'guest'), '1');
  // Ayarlar select güncelle
  const sel = document.getElementById('sett-learn-lang');
  if (sel) sel.value = lang;
  document.getElementById('lang-select-backdrop').style.display = 'none';
}

// Ayarlardan öğrenilen dili değiştir
function setLearnLangFromSettings(lang) {
  G.learnLang = lang;
  if (CU) {
    CU.learnLang = lang;
    saveUser();
  }
  localStorage.setItem('learn_lang_set_' + (CU_ID || 'guest'), '1');
  // Seçili kategorileri temizle (dil değişince eski kategoriler geçersiz)
  localStorage.removeItem('selected_categories');
  G_LEVELS = [];
  // Menü varsa yenile
  renderCatGrid();
  renderLevelDropdown();
}

// Çıkış yap
function logout() {
  CU = null;
  CU_ID = null;
  CU_ROLE = null;
  showScreen('login');
  renderGlobalStats();
}

// Hesabı sıfırla
function resetAccount() {
  if (!confirm('Tüm verilerini silmek istiyor musun?')) return;
  if (CU_ROLE === 'normal' || CU_ROLE === 'student') {
    DB = loadDB();
    const fresh = {
      ...DB.users[CU_ID],
      totalScore: 0,
      totalCorrect: 0,
      totalWrong: 0,
      totalLearned: 0,
      streak: 0,
      lastPlayDate: null,
      srData: {},
      learnedWords: [],
      gameMinutes: 0
    };
    DB.users[CU_ID] = fresh;
    CU = fresh;
    saveDB(DB);
    renderMenu();
    alert('Veriler sıfırlandı.');
  }
}

// ── Hoşgeldin modalı ──
function maybeShowWelcomeModal() {
  const key = 'kt_welcomed_' + CU_ID;
  if (!localStorage.getItem(key)) {
    localStorage.setItem(key, '1');
    document.getElementById('welcome-modal-backdrop').style.display = 'flex';
  }
}

function closeWelcomeModal() {
  document.getElementById('welcome-modal-backdrop').style.display = 'none';
}

// ── Global export ──
window.getOrCreateDeviceId = getOrCreateDeviceId;
window.generateRandomName = generateRandomName;
window.autoLogin = autoLogin;
window.openLoginModal = openLoginModal;
window.closeLoginModal = closeLoginModal;
window.loginStudent = loginStudent;
window.loginTeacher = loginTeacher;
window.verifySMS = verifySMS;
window.enterApp = enterApp;
window.showLangSelectScreen = showLangSelectScreen;
window.selectLearnLang = selectLearnLang;
window.setLearnLangFromSettings = setLearnLangFromSettings;
window.logout = logout;
window.resetAccount = resetAccount;
window.updateStreak = updateStreak;
window.saveUser = saveUser;
window.maybeShowWelcomeModal = maybeShowWelcomeModal;
window.closeWelcomeModal = closeWelcomeModal;