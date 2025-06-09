import type Country from "@qc/typescript/typings/Country";

export let COUNTRIES_MAP = new Map<string, Country>();
let promise: Promise<Map<string, Country>> | null = null;

export async function getCountriesMap(cdnUrl: string, referer?: string) {
  if (COUNTRIES_MAP.size) return COUNTRIES_MAP;

  if (!promise) {
    promise = (async () => {
      const res = await fetch(`${cdnUrl}/world/countries/countries.json`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(typeof window === "undefined" && { Referer: referer })
          }
        }),
        data: Country[] = await res.json();
        
        if (!res.ok) {
          promise = null;
          throw new Error(`Unexpected error occurred, countries fetch failed with status ${res.status}.`);
        }
        
        COUNTRIES_MAP = new Map(data.map((country) => [country.name, country]));
        return COUNTRIES_MAP;
    })();
  }

  return promise;
}
