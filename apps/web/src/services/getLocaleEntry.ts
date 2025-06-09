import type { LocaleData } from "@typings/Locale";

/**
 * Get the route/emitter locale entry content or if no `name` is provided then all api content is 
 * returned.
 */
export default function apiEntry(): any;
export default function apiEntry(name: string): LocaleData["api"][string];
export default function apiEntry(name = ""): any {
  return window.__LOCALE_DATA__.api[name] || window.__LOCALE_DATA__.api;
}
