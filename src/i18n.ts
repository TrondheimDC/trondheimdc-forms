import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import enCommon from "../public/locales/en/common.json"
import noCommon from "../public/locales/no/common.json"

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      no: { common: noCommon },
      en: { common: enCommon },
    },
    lng: "no",
    fallbackLng: "no",
    supportedLngs: ["no", "en"],
    ns: ["common"],
    defaultNS: "common",
    interpolation: {
      escapeValue: false,
    },
  })

  // This is a static export: every page is prerendered once as Norwegian,
  // and there's no server-side locale routing to set <html lang> per
  // request. Language switching happens entirely client-side after
  // hydration, via i18n.changeLanguage(), so <html lang> has to be kept
  // in sync by hand, here, rather than by any i18next/Next.js feature.
  if (typeof document !== "undefined") {
    i18n.on("languageChanged", (lng) => {
      document.documentElement.lang = lng
    })
  }
}

export default i18n
