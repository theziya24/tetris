// ════════════════════════════════
// db.js – Veritabanı (localStorage) ve temel veri yapıları
// ════════════════════════════════

// ── Varsayılan diller ──
const DEFAULT_LANGUAGES = {
    en: { name: 'English',  native: 'English', flag: '🇬🇧', active: true, order: 1 },
    fr: { name: 'French',   native: 'Français', flag: '🇫🇷', active: true, order: 2 },
    ru: { name: 'Russian',  native: 'Русский',  flag: '🇷🇺', active: true, order: 3 },
    es: { name: 'Spanish',  native: 'Español',  flag: '🇪🇸', active: true, order: 4 },
    de: { name: 'German',   native: 'Deutsch',  flag: '🇩🇪', active: true, order: 5 },
};

// ── Varsayılan kategoriler — çok dilli isimler ──
const DEFAULT_CATEGORIES = {
  animals: { names:{ tr:'Hayvanlar', en:'Animals',  de:'Tiere',      ru:'Животные',  fr:'Animaux',  es:'Animales' }, locked:false },
  food:    { names:{ tr:'Yiyecek',   en:'Food',     de:'Lebensmittel', ru:'Еда',      fr:'Nourriture', es:'Comida' }, locked:false },
  nature:  { names:{ tr:'Doğa',      en:'Nature',   de:'Natur',      ru:'Природа',   fr:'Nature',   es:'Naturaleza' }, locked:false },
  travel:  { names:{ tr:'Seyahat',   en:'Travel',   de:'Reise',      ru:'Путешествие',fr:'Voyage',   es:'Viaje' }, locked:false },
  body:    { names:{ tr:'Vücut',     en:'Body',     de:'Körper',     ru:'Тело',      fr:'Corps',    es:'Cuerpo'  }, locked:true  },
};

// ── Varsayılan seviyeler — çok dilli isimler ──
const DEFAULT_LEVELS = {
  a1: { names:{ tr:'A1 (Başlangıç)', en:'A1 (Beginner)',     de:'A1 (Anfänger)',    ru:'A1 (Начинающий)',  fr:'A1 (Débutant)',    es:'A1 (Principiante)' }, premium:false },
  a2: { names:{ tr:'A2 (Temel)',     en:'A2 (Elementary)',   de:'A2 (Grundstufe)',  ru:'A2 (Элементарный)',fr:'A2 (Élémentaire)', es:'A2 (Elemental)'    }, premium:false },
  b1: { names:{ tr:'B1 (Orta)',      en:'B1 (Intermediate)', de:'B1 (Mittelstufe)', ru:'B1 (Средний)',     fr:'B1 (Intermédiaire)',es:'B1 (Intermedio)'   }, premium:true  },
  b2: { names:{ tr:'B2 (Üst Orta)', en:'B2 (Upper-Int.)',   de:'B2 (Oberstufe)',   ru:'B2 (Выше среднего)',fr:'B2 (Supérieur)',   es:'B2 (Avanzado)'     }, premium:true  },
};

// ── Varsayılan kelimeler — yeni format: DB.words[catKey][langCode] = [{tr, val}] ──
const DEFAULT_WORDS_V2 = {
  animals: {
    en:[{tr:'KEDİ',val:'CAT'},{tr:'KÖPEK',val:'DOG'},{tr:'KUŞ',val:'BIRD'},{tr:'BALIK',val:'FISH'},{tr:'ASLAN',val:'LION'},{tr:'FİL',val:'ELEPHANT'},{tr:'TAVŞAN',val:'RABBIT'},{tr:'AYI',val:'BEAR'},{tr:'ZEBRA',val:'ZEBRA'},{tr:'KAPLUMBAĞA',val:'TURTLE'}],
    de:[{tr:'KEDİ',val:'KATZE'},{tr:'KÖPEK',val:'HUND'},{tr:'KUŞ',val:'VOGEL'},{tr:'BALIK',val:'FISCH'},{tr:'ASLAN',val:'LÖWE'},{tr:'FİL',val:'ELEFANT'},{tr:'TAVŞAN',val:'HASE'},{tr:'AYI',val:'BÄR'},{tr:'ZEBRA',val:'ZEBRA'},{tr:'KAPLUMBAĞA',val:'SCHILDKRÖTE'}],
    ru:[{tr:'KEDİ',val:'КОШКА'},{tr:'KÖPEK',val:'СОБАКА'},{tr:'KUŞ',val:'ПТИЦА'},{tr:'BALIK',val:'РЫБА'},{tr:'ASLAN',val:'ЛЕВ'},{tr:'FİL',val:'СЛОН'},{tr:'TAVŞAN',val:'КРОЛИК'},{tr:'AYI',val:'МЕДВЕДЬ'},{tr:'ZEBRA',val:'ЗЕБРА'},{tr:'KAPLUMBAĞA',val:'ЧЕРЕПАХА'}],
    fr:[{tr:'KEDİ',val:'CHAT'},{tr:'KÖPEK',val:'CHIEN'},{tr:'KUŞ',val:'OISEAU'},{tr:'BALIK',val:'POISSON'},{tr:'ASLAN',val:'LION'},{tr:'FİL',val:'ÉLÉPHANT'},{tr:'TAVŞAN',val:'LAPIN'},{tr:'AYI',val:'OURS'},{tr:'ZEBRA',val:'ZÈBRE'},{tr:'KAPLUMBAĞA',val:'TORTUE'}],
    es:[{tr:'KEDİ',val:'GATO'},{tr:'KÖPEK',val:'PERRO'},{tr:'KUŞ',val:'PÁJARO'},{tr:'BALIK',val:'PEZ'},{tr:'ASLAN',val:'LEÓN'},{tr:'FİL',val:'ELEFANTE'},{tr:'TAVŞAN',val:'CONEJO'},{tr:'AYI',val:'OSO'},{tr:'ZEBRA',val:'CEBRA'},{tr:'KAPLUMBAĞA',val:'TORTUGA'}],
  },
  food: {
    en:[{tr:'ELMA',val:'APPLE'},{tr:'SU',val:'WATER'},{tr:'EKMEK',val:'BREAD'},{tr:'SÜT',val:'MILK'},{tr:'PEYNİR',val:'CHEESE'},{tr:'YUMURTA',val:'EGG'},{tr:'PORTAKAL',val:'ORANGE'},{tr:'ÇORBA',val:'SOUP'},{tr:'PİZZA',val:'PIZZA'},{tr:'ÇİKOLATA',val:'CHOCOLATE'}],
    de:[{tr:'ELMA',val:'APFEL'},{tr:'SU',val:'WASSER'},{tr:'EKMEK',val:'BROT'},{tr:'SÜT',val:'MILCH'},{tr:'PEYNİR',val:'KÄSE'},{tr:'YUMURTA',val:'EI'},{tr:'PORTAKAL',val:'ORANGE'},{tr:'ÇORBA',val:'SUPPE'},{tr:'PİZZA',val:'PIZZA'},{tr:'ÇİKOLATA',val:'SCHOKOLADE'}],
    ru:[{tr:'ELMA',val:'ЯБЛОКО'},{tr:'SU',val:'ВОДА'},{tr:'EKMEK',val:'ХЛЕБ'},{tr:'SÜT',val:'МОЛОКО'},{tr:'PEYNİR',val:'СЫР'},{tr:'YUMURTA',val:'ЯЙЦО'},{tr:'PORTAKAL',val:'АПЕЛЬСИН'},{tr:'ÇORBA',val:'СУП'},{tr:'PİZZA',val:'ПИЦЦА'},{tr:'ÇİКЛАТА',val:'ШОКОЛАД'}],
    fr:[{tr:'ELMA',val:'POMME'},{tr:'SU',val:'EAU'},{tr:'EKMEK',val:'PAIN'},{tr:'SÜT',val:'LAIT'},{tr:'PEYNİR',val:'FROMAGE'},{tr:'YUMURTA',val:'ŒUF'},{tr:'PORTAKAL',val:'ORANGE'},{tr:'ÇORBA',val:'SOUPE'},{tr:'PİZZA',val:'PIZZA'},{tr:'ÇİKOLATA',val:'CHOCOLAT'}],
    es:[{tr:'ELMA',val:'MANZANA'},{tr:'SU',val:'AGUA'},{tr:'EKMEK',val:'PAN'},{tr:'SÜT',val:'LECHE'},{tr:'PEYNİR',val:'QUESO'},{tr:'YUMURTA',val:'HUEVO'},{tr:'PORTAKAL',val:'NARANJA'},{tr:'ÇORBA',val:'SOPA'},{tr:'PİZZA',val:'PIZZA'},{tr:'ÇİKOLATA',val:'CHOCOLATE'}],
  },
  nature: {
    en:[{tr:'GÜNEŞ',val:'SUN'},{tr:'YAĞMUR',val:'RAIN'},{tr:'KAR',val:'SNOW'},{tr:'DENİZ',val:'SEA'},{tr:'DAĞ',val:'MOUNTAIN'},{tr:'AĞAÇ',val:'TREE'},{tr:'ÇİÇEK',val:'FLOWER'},{tr:'GÖKYÜZÜ',val:'SKY'},{tr:'BULUT',val:'CLOUD'},{tr:'RÜZGAR',val:'WIND'}],
    de:[{tr:'GÜNEŞ',val:'SONNE'},{tr:'YAĞMUR',val:'REGEN'},{tr:'KAR',val:'SCHNEE'},{tr:'DENİZ',val:'MEER'},{tr:'DAĞ',val:'BERG'},{tr:'AĞAÇ',val:'BAUM'},{tr:'ÇİÇEK',val:'BLUME'},{tr:'GÖKYÜZÜ',val:'HIMMEL'},{tr:'BULUT',val:'WOLKE'},{tr:'RÜZGAR',val:'WIND'}],
    ru:[{tr:'GÜNEŞ',val:'СОЛНЦЕ'},{tr:'YAГМУР',val:'ДОЖДЬ'},{tr:'КАР',val:'СНЕГ'},{tr:'DENИZ',val:'МОРЕ'},{tr:'DAГ',val:'ГОРА'},{tr:'AГAЧ',val:'ДЕРЕВО'},{tr:'ÇİЧЕК',val:'ЦВЕТОК'},{tr:'GÖKYÜZÜ',val:'НЕБО'},{tr:'BULUT',val:'ОБЛАКО'},{tr:'RÜZGAR',val:'ВЕТЕР'}],
    fr:[{tr:'GÜNEŞ',val:'SOLEIL'},{tr:'YAĞMUR',val:'PLUIE'},{tr:'KAR',val:'NEIGE'},{tr:'DENİZ',val:'MER'},{tr:'DAĞ',val:'MONTAGNE'},{tr:'AĞAÇ',val:'ARBRE'},{tr:'ÇİÇEK',val:'FLEUR'},{tr:'GÖKYÜZÜ',val:'CIEL'},{tr:'BULUT',val:'NUAGE'},{tr:'RÜZGAR',val:'VENT'}],
    es:[{tr:'GÜNEŞ',val:'SOL'},{tr:'YAĞMUR',val:'LLUVIA'},{tr:'KAR',val:'NIEVE'},{tr:'DENİZ',val:'MAR'},{tr:'DAĞ',val:'MONTAÑA'},{tr:'AĞAÇ',val:'ÁRBOL'},{tr:'ÇİÇEK',val:'FLOR'},{tr:'GÖKYÜZÜ',val:'CIELO'},{tr:'BULUT',val:'NUBE'},{tr:'RÜZGAR',val:'VIENTO'}],
  },
  travel: {
    en:[{tr:'UÇAK',val:'PLANE'},{tr:'OTEL',val:'HOTEL'},{tr:'PASAPORT',val:'PASSPORT'},{tr:'HARİTA',val:'MAP'},{tr:'BİLET',val:'TICKET'},{tr:'VALIZ',val:'SUITCASE'},{tr:'TURİST',val:'TOURIST'},{tr:'ŞEHİR',val:'CITY'}],
    de:[{tr:'UÇAK',val:'FLUGZEUG'},{tr:'OTEL',val:'HOTEL'},{tr:'PASAPORT',val:'REISEPASS'},{tr:'HARİTA',val:'KARTE'},{tr:'BİLET',val:'TICKET'},{tr:'VALIZ',val:'KOFFER'},{tr:'TURİST',val:'TOURIST'},{tr:'ŞEHİR',val:'STADT'}],
    ru:[{tr:'UЧAK',val:'САМОЛЁТ'},{tr:'OTEL',val:'ОТЕЛЬ'},{tr:'PASAPORT',val:'ПАСПОРТ'},{tr:'HARİTA',val:'КАРТА'},{tr:'BİLET',val:'БИЛЕТ'},{tr:'VALIZ',val:'ЧЕМОДАН'},{tr:'TURİST',val:'ТУРИСТ'},{tr:'ŞEHİR',val:'ГОРОД'}],
    fr:[{tr:'UÇAK',val:'AVION'},{tr:'OTEL',val:'HÔTEL'},{tr:'PASAPORT',val:'PASSEPORT'},{tr:'HARİTA',val:'CARTE'},{tr:'BİLET',val:'BILLET'},{tr:'VALIZ',val:'VALISE'},{tr:'TURİST',val:'TOURISTE'},{tr:'ŞEHİR',val:'VILLE'}],
    es:[{tr:'UÇAK',val:'AVIÓN'},{tr:'OTEL',val:'HOTEL'},{tr:'PASAPORT',val:'PASAPORTЕ'},{tr:'HARİTA',val:'MAPA'},{tr:'BİLET',val:'BILLETE'},{tr:'VALIZ',val:'MALETA'},{tr:'TURİST',val:'TURISTA'},{tr:'ŞEHİR',val:'CIUDAD'}],
  },
  body: {
    en:[{tr:'EL',val:'HAND'},{tr:'GÖZ',val:'EYE'},{tr:'BURUN',val:'NOSE'},{tr:'KULAK',val:'EAR'},{tr:'AYAK',val:'FOOT'},{tr:'KAŞ',val:'EYEBROW'},{tr:'DİL',val:'TONGUE'},{tr:'SAÇ',val:'HAIR'}],
    de:[{tr:'EL',val:'HAND'},{tr:'GÖZ',val:'AUGE'},{tr:'BURUN',val:'NASE'},{tr:'KULAK',val:'OHR'},{tr:'AYAK',val:'FUSS'},{tr:'KAŞ',val:'AUGENBRAUE'},{tr:'DİL',val:'ZUNGE'},{tr:'SAÇ',val:'HAAR'}],
    ru:[{tr:'EL',val:'РУКА'},{tr:'GÖZ',val:'ГЛАЗ'},{tr:'BURUN',val:'НОС'},{tr:'KULAK',val:'УХО'},{tr:'AYAK',val:'НОГА'},{tr:'КАШ',val:'БРОВЬ'},{tr:'DİL',val:'ЯЗЫК'},{tr:'SAÇ',val:'ВОЛОСЫ'}],
    fr:[{tr:'EL',val:'MAIN'},{tr:'GÖZ',val:'ŒIL'},{tr:'BURUN',val:'NEZ'},{tr:'KULAK',val:'OREILLE'},{tr:'AYAK',val:'PIED'},{tr:'KAШ',val:'SOURCIL'},{tr:'DİL',val:'LANGUE'},{tr:'SAÇ',val:'CHEVEUX'}],
    es:[{tr:'EL',val:'MANO'},{tr:'GÖZ',val:'OJO'},{tr:'BURUN',val:'NARIZ'},{tr:'KULAK',val:'OREJA'},{tr:'AYAK',val:'PIE'},{tr:'KAŞ',val:'CEJA'},{tr:'DİL',val:'LENGUA'},{tr:'SAÇ',val:'CABELLO'}],
  },
};

// ── Varsayılan seviye kelimeleri (boş başlar) ──
const DEFAULT_LEVEL_WORDS_V2 = {
  a1:{}, a2:{}, b1:{}, b2:{}
};

// ── Global DB ve CU değişkenleri ──
let DB = null;
let CU = null; // current user object ref (from DB.users or DB.teachers)

// ── Veritabanı yükleme ──
function loadDB() {
  const saved = JSON.parse(localStorage.getItem('kt_db') || 'null');
  if (saved) {
    // Migrasyon v2: eski yapıyı yeni formata çevir
    if (!saved.categories) {
      saved.categories   = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
      saved.levels       = JSON.parse(JSON.stringify(DEFAULT_LEVELS));
      // Eski words → yeni format {catKey:{langCode:[{tr,val}]}}
      saved.words        = JSON.parse(JSON.stringify(DEFAULT_WORDS_V2));
      saved.levelWords   = JSON.parse(JSON.stringify(DEFAULT_LEVEL_WORDS_V2));
      if (!saved.languages) saved.languages = JSON.parse(JSON.stringify(DEFAULT_LANGUAGES));
      localStorage.setItem('kt_db', JSON.stringify(saved));
    }
    return saved;
  }
  return {
    languages:   JSON.parse(JSON.stringify(DEFAULT_LANGUAGES)),
    categories:  JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)),
    levels:      JSON.parse(JSON.stringify(DEFAULT_LEVELS)),
    words:       JSON.parse(JSON.stringify(DEFAULT_WORDS_V2)),
    levelWords:  JSON.parse(JSON.stringify(DEFAULT_LEVEL_WORDS_V2)),
    users: {},
    teachers: {},
    globalStats: { correct: 0, wrong: 0, learned: 0 }
  };
}

// ── Veritabanı kaydetme ──
function saveDB(db) {
  localStorage.setItem('kt_db', JSON.stringify(db));
}

// ── DB ve CU'yu başlat ──
function initDB() {
  DB = loadDB();
  CU = null;
}

// ── Aktif diller ──
function getActiveLangs() {
  DB = loadDB();
  return Object.values(DB.languages || DEFAULT_LANGUAGES).filter(l => l.active).sort((a, b) => a.order - b.order);
}

// ── Kullanıcı diline göre kategori adını getir ──
function getCatName(catKey, lang) {
  DB = loadDB();
  const cat = (DB.categories || {})[catKey] || DEFAULT_CATEGORIES[catKey];
  if (!cat) return catKey;
  return cat.names?.[lang] || cat.names?.tr || catKey;
}

// ── Seviye adını getir ──
function getLevelName(levelKey, lang) {
  DB = loadDB();
  const level = (DB.levels || {})[levelKey] || DEFAULT_LEVELS[levelKey];
  if (!level) return levelKey;
  return level.names?.[lang] || level.names?.tr || levelKey;
}

// ── Kullanıcıya ait istatistikleri güncelle ──
function updateUserStats(correctInc = 0, wrongInc = 0, learnedInc = 0) {
  if (!CU) return;
  if (correctInc) CU.correct = (CU.correct || 0) + correctInc;
  if (wrongInc) CU.wrong = (CU.wrong || 0) + wrongInc;
  if (learnedInc) CU.learned = (CU.learned || 0) + learnedInc;
  DB.globalStats.correct += correctInc;
  DB.globalStats.wrong += wrongInc;
  DB.globalStats.learned += learnedInc;
  saveDB(DB);
}

// ── Global export ──
window.DB = DB;
window.CU = CU;
window.loadDB = loadDB;
window.saveDB = saveDB;
window.initDB = initDB;
window.getActiveLangs = getActiveLangs;
window.getCatName = getCatName;
window.getLevelName = getLevelName;
window.updateUserStats = updateUserStats;
window.DEFAULT_CATEGORIES = DEFAULT_CATEGORIES;
window.DEFAULT_LEVELS = DEFAULT_LEVELS;
window.DEFAULT_WORDS_V2 = DEFAULT_WORDS_V2;
window.DEFAULT_LEVEL_WORDS_V2 = DEFAULT_LEVEL_WORDS_V2;
window.DEFAULT_LANGUAGES = DEFAULT_LANGUAGES;