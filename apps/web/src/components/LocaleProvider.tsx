import type { LocaleData, LocaleContent } from "@typings/Locale";
import type { AvailableLocales } from "@qc/constants";

import { createContext, useState, useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

import TITLE_PREFIX from "@constants/TITLE_PREFIX";

import parsePathWithLocale from "@utils/parsePathWithLocale";
import { history } from "@utils/History";

export interface NumberFormatOptions extends Omit<Intl.NumberFormatOptions, "currency"> {
  currency?: "show" | boolean;
}

export interface LocaleContextValues {
  type: string;
  initialData: LocaleData;
  getContent: (path: string) => LocaleContent;
  title: string;
  numberFormat: (options?: NumberFormatOptions) => Intl.NumberFormat;
  dateTimeFormat: (options?: Intl.DateTimeFormatOptions) => Intl.DateTimeFormat;
  setLocaleData: (locale: AvailableLocales) => Promise<void>;
}

export interface LocaleProviderProps {
  locale: string;
  initialData: LocaleData;
}

function getCurrency(locale: string) {
  switch (locale) {
    // case "de": return "EUR";
    // case "el-gr": return "EUR";
    case "en": return "USD";
    // case "es": return "EUR";
    case "fr": return "EUR";
    // case "hu": return "HUF";
    // case "it": return "EUR";
    // case "nl": return "EUR";
    // case "sk": return "EUR";
    default: return "USD";
  }
};

function getTitle(data: LocaleData, path: string) {
  return data.page[path]?.meta.title || data.page["/error-404-page"].meta.title;
}

export const LocaleContext = createContext<LocaleContextValues | undefined>(undefined);

export default function LocaleProvider({ children, locale, initialData }: React.PropsWithChildren<LocaleProviderProps>) {
  const { pathname } = useLocation();

  const [type, setType] = useState(locale),
    [data, setData] = useState(initialData),
    [title, setTitle] = useState(getTitle(initialData, parsePathWithLocale(pathname)?.[2] || ""));

  const getContent = (path: string) => ({
    ...(data.page[path]?.content ||
      data.component[path] ||
      data.hooks[path] ||
      data[path as keyof LocaleData]),
    general: data.general
  });

  const numberFormat = ({ currency, ...options }: NumberFormatOptions = {} as any) =>
      new Intl.NumberFormat(type, {
        useGrouping: false,
        ...(currency && {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
          ...(currency === "show" && {
            style: "currency",
            currency: getCurrency(type)
          })
        }),
        ...(options.style === "percent" && {
          maximumFractionDigits: 1
        }),
        ...options
      }),
    dateTimeFormat = (options?: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat(type === "en" ? "en-CA" : type, options);

  const setLocaleData = async (locale: AvailableLocales) => {
    const newData = await import(`../locales/${locale}.json`);
    setType(locale);
    setData(newData);
    window.__LOCALE_DATA__ = newData; // This is used outside of components.
    document.documentElement.lang = locale;
    history.push(`/${locale}${parsePathWithLocale(pathname)![2]}`, { preserveLocale: false });
  };

  if (typeof window !== "undefined") {
    useLayoutEffect(() => {
      const newTitle = getTitle(data, parsePathWithLocale(pathname)?.[2] || "");
      document.title = `${newTitle} ${TITLE_PREFIX}`;
      setTitle(newTitle);
    }, [pathname]);
  }

  return (
    <LocaleContext.Provider
      value={{
        type,
        initialData: data,
        getContent,
        title,
        numberFormat,
        dateTimeFormat,
        setLocaleData
      }}
    >
      {children}
    </LocaleContext.Provider>
  );
}
