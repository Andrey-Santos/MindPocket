"use client"

import { getSiteDictionary, type Locale, type SiteTranslationDict } from "@repo/i18n"
import React from "react"

export type SiteLocale = Locale

const STORAGE_KEY = "mindpocket-site-locale"

interface SiteI18nContextValue {
  locale: SiteLocale
  setLocale: (locale: SiteLocale) => void
  t: SiteTranslationDict
}

const HTML_LANG: Record<SiteLocale, string> = { zh: "zh-CN", en: "en", pt: "pt-BR" }

const SiteI18nContext = React.createContext<SiteI18nContextValue | null>(null)

export function SiteI18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = React.useState<SiteLocale>("zh")

  React.useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved === "zh" || saved === "en" || saved === "pt") {
      setLocaleState(saved)
      return
    }
    const lang = navigator.language.toLowerCase()
    if (lang.startsWith("zh")) {
      setLocaleState("zh")
    } else if (lang.startsWith("pt")) {
      setLocaleState("pt")
    } else {
      setLocaleState("en")
    }
  }, [])

  React.useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, locale)
    document.documentElement.lang = HTML_LANG[locale]
  }, [locale])

  const value = React.useMemo(
    () => ({
      locale,
      setLocale: setLocaleState,
      t: getSiteDictionary(locale),
    }),
    [locale]
  )

  return <SiteI18nContext.Provider value={value}>{children}</SiteI18nContext.Provider>
}

export function useSiteI18n() {
  const context = React.useContext(SiteI18nContext)
  if (!context) {
    throw new Error("useSiteI18n must be used within SiteI18nProvider")
  }
  return context
}
