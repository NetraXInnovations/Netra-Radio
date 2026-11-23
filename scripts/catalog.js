'use strict';

// Languages and categories for Netra eBooks and Netra Radio. The app shows only what the server
// sends, so lists change here (or in Firestore app_config/content_catalog) without an app update.
// `ia` = values of the Internet Archive "language" field; `radio` = Radio Browser language name.

const LANGUAGES = [
  { id: 'telugu', name: 'Telugu', native: 'తెలుగు', ia: ['Telugu', 'tel'], radio: 'telugu', region: 'india' },
  { id: 'hindi', name: 'Hindi', native: 'हिन्दी', ia: ['Hindi', 'hin'], radio: 'hindi', region: 'india' },
  { id: 'tamil', name: 'Tamil', native: 'தமிழ்', ia: ['Tamil', 'tam'], radio: 'tamil', region: 'india' },
  { id: 'kannada', name: 'Kannada', native: 'ಕನ್ನಡ', ia: ['Kannada', 'kan'], radio: 'kannada', region: 'india' },
  { id: 'malayalam', name: 'Malayalam', native: 'മലയാളം', ia: ['Malayalam', 'mal'], radio: 'malayalam', region: 'india' },
  { id: 'bengali', name: 'Bengali', native: 'বাংলা', ia: ['Bengali', 'ben'], radio: 'bengali', region: 'india' },
  { id: 'marathi', name: 'Marathi', native: 'मराठी', ia: ['Marathi', 'mar'], radio: 'marathi', region: 'india' },
  { id: 'gujarati', name: 'Gujarati', native: 'ગુજરાતી', ia: ['Gujarati', 'guj'], radio: 'gujarati', region: 'india' },
  { id: 'punjabi', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', ia: ['Punjabi', 'pan'], radio: 'punjabi', region: 'india' },
  { id: 'odia', name: 'Odia', native: 'ଓଡ଼ିଆ', ia: ['Oriya', 'Odia', 'ori'], radio: 'odia', region: 'india' },
  { id: 'urdu', name: 'Urdu', native: 'اردو', ia: ['Urdu', 'urd'], radio: 'urdu', region: 'india' },
  { id: 'sanskrit', name: 'Sanskrit', native: 'संस्कृतम्', ia: ['Sanskrit', 'san'], radio: 'sanskrit', region: 'india' },
  { id: 'english', name: 'English', native: 'English', ia: ['English', 'eng'], radio: 'english', region: 'world' },
  { id: 'arabic', name: 'Arabic', native: 'العربية', ia: ['Arabic', 'ara'], radio: 'arabic', region: 'world' },
  { id: 'spanish', name: 'Spanish', native: 'Español', ia: ['Spanish', 'spa'], radio: 'spanish', region: 'world' },
  { id: 'french', name: 'French', native: 'Français', ia: ['French', 'fre', 'fra'], radio: 'french', region: 'world' },
  { id: 'german', name: 'German', native: 'Deutsch', ia: ['German', 'ger', 'deu'], radio: 'german', region: 'world' },
  { id: 'portuguese', name: 'Portuguese', native: 'Português', ia: ['Portuguese', 'por'], radio: 'portuguese', region: 'world' },
  { id: 'russian', name: 'Russian', native: 'Русский', ia: ['Russian', 'rus'], radio: 'russian', region: 'world' },
  { id: 'turkish', name: 'Turkish', native: 'Türkçe', ia: ['Turkish', 'tur'], radio: 'turkish', region: 'world' },
  { id: 'chinese', name: 'Chinese', native: '中文', ia: ['Chinese', 'chi', 'zho'], radio: 'chinese', region: 'world' },
  { id: 'japanese', name: 'Japanese', native: '日本語', ia: ['Japanese', 'jpn'], radio: 'japanese', region: 'world' },
];

// `q` is a fixed Internet Archive subject clause. The app sends only the id.
const BOOK_CATEGORIES = [
  { id: 'all', name: 'All books', q: '' },
  { id: 'fiction', name: 'Novels and stories', q: 'subject:(fiction OR novel OR stories OR కథలు OR నవల)' },
  { id: 'poetry', name: 'Poetry', q: 'subject:(poetry OR poems OR కవిత్వం)' },
  { id: 'history', name: 'History', q: 'subject:history' },
  { id: 'religion', name: 'Religion and spirituality', q: 'subject:(religion OR spirituality OR hinduism OR bhakti)' },
  { id: 'philosophy', name: 'Philosophy', q: 'subject:philosophy' },
  { id: 'biography', name: 'Biography', q: 'subject:(biography OR autobiography)' },
  { id: 'children', name: 'Children', q: 'subject:(children OR juvenile)' },
  { id: 'science', name: 'Science', q: 'subject:science' },
  { id: 'education', name: 'Education', q: 'subject:(education OR textbook)' },
  { id: 'health', name: 'Health', q: 'subject:(health OR medicine OR ayurveda)' },
  { id: 'law', name: 'Law', q: 'subject:law' },
  { id: 'language', name: 'Language and grammar', q: 'subject:(grammar OR dictionary OR language)' },
];

// `tag` is a Radio Browser tag.
const RADIO_CATEGORIES = [
  { id: 'all', name: 'All stations', tag: '' },
  { id: 'music', name: 'Music', tag: 'music' },
  { id: 'film', name: 'Film songs', tag: 'bollywood' },
  { id: 'news', name: 'News', tag: 'news' },
  { id: 'talk', name: 'Talk', tag: 'talk' },
  { id: 'devotional', name: 'Devotional', tag: 'devotional' },
  { id: 'classical', name: 'Classical', tag: 'classical' },
  { id: 'pop', name: 'Pop', tag: 'pop' },
  { id: 'oldies', name: 'Old songs', tag: 'oldies' },
  { id: 'sports', name: 'Sports', tag: 'sports' },
  { id: 'jazz', name: 'Jazz', tag: 'jazz' },
  { id: 'rock', name: 'Rock', tag: 'rock' },
];

// Audio books: `q` is a fixed Internet Archive subject clause. The app sends only the id.
const AUDIO_CATEGORIES = [
  { id: 'all', name: 'All audio books', q: '' },
  { id: 'fiction', name: 'Novels and stories', q: 'subject:(fiction OR novel OR stories OR story OR katha OR kathalu)' },
  { id: 'devotional', name: 'Devotional', q: 'subject:(devotional OR spiritual OR religion OR bhakti OR prayer OR bhagavad OR ramayana OR mahabharata)' },
  { id: 'children', name: 'Children', q: 'subject:(children OR kids OR juvenile OR fairy)' },
  { id: 'poetry', name: 'Poetry', q: 'subject:(poetry OR poems OR poem)' },
  { id: 'history', name: 'History', q: 'subject:(history OR historical)' },
  { id: 'biography', name: 'Biography', q: 'subject:(biography OR autobiography)' },
  { id: 'philosophy', name: 'Philosophy', q: 'subject:philosophy' },
  { id: 'education', name: 'Learning', q: 'subject:(education OR textbook OR science OR language)' },
];

// News: Google News topic sections. `top` is the headlines page.
const NEWS_CATEGORIES = ['top', 'world', 'nation', 'business', 'technology', 'entertainment', 'sports', 'science', 'health'];

// News category names in each news language (shown to the user).
const NEWS_NAMES = {
  telugu: ['టాప్ హెడ్‌లైన్స్', 'ప్రపంచం', 'దేశం', 'వ్యాపారం', 'సాంకేతికత', 'వినోదం', 'క్రీడలు', 'విజ్ఞానం', 'ఆరోగ్యం'],
  hindi: ['शीर्ष समाचार', 'दुनिया', 'देश', 'व्यापार', 'तकनीक', 'मनोरंजन', 'खेल', 'विज्ञान', 'स्वास्थ्य'],
  tamil: ['முக்கிய செய்திகள்', 'உலகம்', 'நாடு', 'வணிகம்', 'தொழில்நுட்பம்', 'பொழுதுபோக்கு', 'விளையாட்டு', 'அறிவியல்', 'சுகாதாரம்'],
  kannada: ['ಪ್ರಮುಖ ಸುದ್ದಿ', 'ವಿಶ್ವ', 'ರಾಷ್ಟ್ರ', 'ವ್ಯಾಪಾರ', 'ತಂತ್ರಜ್ಞಾನ', 'ಮನರಂಜನೆ', 'ಕ್ರೀಡೆ', 'ವಿಜ್ಞಾನ', 'ಆರೋಗ್ಯ'],
  malayalam: ['മുൻനിര വാർത്തകൾ', 'ലോകം', 'രാജ്യം', 'വ്യാപാരം', 'സാങ്കേതികവിദ്യ', 'വിനോദം', 'കായികം', 'ശാസ്ത്രം', 'ആരോഗ്യം'],
  marathi: ['मुख्य बातम्या', 'जग', 'देश', 'व्यवसाय', 'तंत्रज्ञान', 'मनोरंजन', 'क्रीडा', 'विज्ञान', 'आरोग्य'],
  gujarati: ['મુખ્ય સમાચાર', 'વિશ્વ', 'રાષ્ટ્ર', 'વ્યવસાય', 'ટેક્નોલોજી', 'મનોરંજન', 'રમતગમત', 'વિજ્ઞાન', 'સ્વાસ્થ્ય'],
  bengali: ['শীর্ষ সংবাদ', 'বিশ্ব', 'দেশ', 'ব্যবসা', 'প্রযুক্তি', 'বিনোদন', 'খেলাধুলা', 'বিজ্ঞান', 'স্বাস্থ্য'],
  punjabi: ['ਮੁੱਖ ਖ਼ਬਰਾਂ', 'ਦੁਨੀਆ', 'ਦੇਸ਼', 'ਕਾਰੋਬਾਰ', 'ਤਕਨਾਲੋਜੀ', 'ਮਨੋਰੰਜਨ', 'ਖੇਡਾਂ', 'ਵਿਗਿਆਨ', 'ਸਿਹਤ'],
  urdu: ['سرفہرست خبریں', 'دنیا', 'قوم', 'کاروبار', 'ٹیکنالوجی', 'تفریح', 'کھیل', 'سائنس', 'صحت'],
  english: ['Top headlines', 'World', 'India', 'Business', 'Technology', 'Entertainment', 'Sports', 'Science', 'Health'],
  german: ['Top-Schlagzeilen', 'Welt', 'Deutschland', 'Wirtschaft', 'Technologie', 'Unterhaltung', 'Sport', 'Wissenschaft', 'Gesundheit'],
  french: ['Titres principaux', 'Monde', 'France', 'Économie', 'Technologie', 'Divertissement', 'Sports', 'Science', 'Santé'],
  japanese: ['トップニュース', '世界', '日本', 'ビジネス', 'テクノロジー', 'エンタメ', 'スポーツ', '科学', '健康'],
  portuguese: ['Principais notícias', 'Mundo', 'Brasil', 'Negócios', 'Tecnologia', 'Entretenimento', 'Esportes', 'Ciência', 'Saúde'],
};

function newsCatalog(languages) {
  return Object.keys(NEWS_NAMES).map((id) => {
    const l = languages.find((x) => x.id === id) || { name: id, native: id, region: 'world' };
    return {
      id, name: l.name, native: l.native, region: l.region,
      categories: NEWS_CATEGORIES.map((c, i) => ({ id: c, name: NEWS_NAMES[id][i] })),
    };
  });
}

/** What the app sees (no query internals). */
function publicCatalog(c) {
  return {
    version: c.version || 1,
    languages: c.languages.map(({ id, name, native, region }) => ({ id, name, native, region })),
    bookCategories: c.bookCategories.map(({ id, name }) => ({ id, name })),
    radioCategories: c.radioCategories.map(({ id, name }) => ({ id, name })),
    audioCategories: c.audioCategories.map(({ id, name }) => ({ id, name })),
    news: newsCatalog(c.languages),
  };
}

module.exports = { LANGUAGES, BOOK_CATEGORIES, RADIO_CATEGORIES, AUDIO_CATEGORIES, NEWS_CATEGORIES, NEWS_NAMES, publicCatalog };
