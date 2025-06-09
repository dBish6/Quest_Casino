export const LANGUAGES = {
  en: { name: "English", locale: "en" },
  fr: { name: "Français", locale: "fr" },
  // es: { name: "Español", locale: "es" },
  // de: { name: "Deutsch", locale: "de" },
  // it: { name: "Italiano", locale: "it" },
  // nl: { name: "Nederlands", locale: "nl" },
  // hu: { name: "Magyar", locale: "hu" },
  // sk: { name: "Slovenský", locale: "sk" },
  // "el-gr": { name: "Ελληνικά", locale: "el-gr" }
} as const;

export type AvailableLocales = typeof LANGUAGES[keyof typeof LANGUAGES]["locale"];
