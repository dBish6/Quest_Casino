import { type AvailableLocales, LANGUAGES } from "@qc/constants";
import type { LocaleData } from "@typings/Locale";

import { createRequire } from "node:module";

import errorNotLocalized from "./errorNotLocalized";

const require = createRequire(import.meta.url);

export default class LocaleProvider {
  public readonly type: AvailableLocales;
  public readonly data: LocaleData;

  constructor(locale: AvailableLocales, data: any) {
    this.type = locale;
    this.data = data;
  }

  public static init(locale: string) {
    if (!LANGUAGES[locale as keyof typeof LANGUAGES]) locale = "en";
    const data = require(`${process.env.NODE_ENV === "production" ? "./locales" : "@locales"}/${locale}.json`);
    return new LocaleProvider(locale as AvailableLocales, data);
  }

  public resolveErrorMsg(category: string, name: string, vars?: Record<string, string>) {
    if (errorNotLocalized(name)) return name; // For errors that don't need to be localized, the name is the message.

    const message: string =
      this.data?.[category as keyof LocaleData]?.error?.[name] ||
      this.data?.general?.error?.[name] ||
      this.data?.general?.error?.UNEXPECTED ||
      "An unexpected error occurred.";

    return vars
      ? message.replace(/\{\{(.*?)\}\}/g, (_, key: string) => {
          const val = vars[key.trim()];
          return typeof val === "number"
            ? this.numberFormat().format(val)
            : val ?? "";
        })
      : message;
  }

  public numberFormat(options?: Intl.NumberFormatOptions) {
    return new Intl.NumberFormat(this.type, { useGrouping: false, ...options });
  }
}
