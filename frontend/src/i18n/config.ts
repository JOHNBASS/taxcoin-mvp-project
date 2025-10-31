import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from '../locales/en.json';
import zh from '../locales/zh.json';

// i18n configuration with imported JSON files
const resources = {
  en: {
    translation: en
  },
  zh: {
    translation: zh
  },
  'zh-TW': {
    translation: zh
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    debug: import.meta.env.DEV,
    lng: 'zh', // 預設語言
    fallbackLng: 'zh',
    supportedLngs: ['zh', 'zh-TW', 'en'],

    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },

    interpolation: {
      escapeValue: false, // React already escapes
    },

    react: {
      useSuspense: false,
    },
  })
  .then(() => {
    console.log('✅ i18next initialized successfully');
    console.log('Current language:', i18n.language);
    console.log('Available languages:', i18n.languages);
  })
  .catch((error) => {
    console.error('❌ i18next initialization failed:', error);
  });

export default i18n;
