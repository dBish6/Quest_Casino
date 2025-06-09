import type Country from "@qc/typescript/typings/Country";
import type { Region, Regions } from "@authFeat/typings/Region";
import type { LocaleData } from "@typings/Locale";

import { useEffect, useState } from "react";

import useLocale from "@hooks/useLocale";

import { useLazyGetCountriesQuery, useLazyGetRegionsQuery } from "@services/api";

function getSelectedRegion(
  localeHook: LocaleData["hooks"],
  regions: Regions[],
  countryName: string,
  setError?: any
) {
  const region = regions.find((region) => region.countryName === countryName);

  if (region) {
    return region.regions;
  } else {
    setError && setError(localeHook.regionNotFound);
    return localeHook.regionNotFound;
  }
}

export default function useWorldData(
  setError: React.Dispatch<any> | ((key: any, value: string) => void),
  defaultSelected?: { country?: string; }
) {
  const [worldData, setWorldData] = useState<{
      countries: Country[] | string | null;
      regions: Regions[];
    }>({ countries: null, regions: [] }),
    [selected, setSelected] = useState<{
      country: string;
      regions: Region[] | string;
    }>({ country: defaultSelected?.country || "", regions: [] });

  const { content } = useLocale("useWorldData");

  const [fetchRegions] = useLazyGetRegionsQuery(),
    [fetchCountries] = useLazyGetCountriesQuery();

  const getCountries = async () => {
    if (!worldData.countries?.length) {
      setWorldData((prev) => ({ ...prev, countries: [] }));

      try {
        const countries = (await fetchCountries(undefined, true).unwrap())?.countries;
        setWorldData((prev) => ({ ...prev, countries }));
      } catch (error) {
        setWorldData((prev) => ({
          ...prev,
          countries: content.countryUnexpected
        }));
      }
    }
  };

  const getRegions = async () => {
    if (!worldData.regions?.length) {
      setWorldData((prev) => ({ ...prev, regions: [] }));

      try {
        const regions = (await fetchRegions(undefined, true).unwrap())?.regions;
        setWorldData((prev) => ({ ...prev, regions }));
      } catch (error) {
        setSelected((prev) => ({
          ...prev,
          regions: content.regionUnexpected
        }));
      }
    }
  };

  useEffect(() => {
    if (defaultSelected?.country) getRegions();
  }, [defaultSelected?.country]);

  useEffect(() => {
    if (selected.country && worldData.regions?.length) {
      setSelected((prev) => ({
        ...prev,
        regions: getSelectedRegion(
          content,
          worldData.regions,
          selected.country,
          setError
        )
      }));
    }
  }, [selected.country, worldData.regions]);

  return {
    worldData,
    setWorldData,
    selected,
    setSelected,
    getCountries,
    getRegions,
    loading: {
      countries: !!worldData.countries && !worldData.countries.length,
      regions: !!selected.country && !selected.regions.length
    }
  };
}
