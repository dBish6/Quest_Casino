import type { RootState } from "@redux/store";
import type Country from "@qc/typescript/typings/Country";
import type { Regions } from "@authFeat/typings/Region";

import type { HttpResponse } from "@typings/ApiResponse";

import { buildCreateApi, coreModule, reactHooksModule, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import allow500ErrorsTransform from "./allow500ErrorsTransform";

export const API_BASE_URL =
  import.meta.env.MODE === "production"
    ? import.meta.env.VITE_API_URL
    : "/api/v2";

export const createApi = buildCreateApi(
  coreModule(),
  reactHooksModule({ unstable__sideEffectsInRender: true })
);

export function prepareHeadersAndOptions(custom?: { state: RootState }): Record<string, any> {
  return {
    ...(!custom
      ? {
          prepareHeaders: (headers: Headers, { getState }: { getState: () => RootState }) => {
            const csrfToken = getState().auth.user.token.csrf;
            if (csrfToken) headers.set("x-xsrf-token", csrfToken);

            headers.set("Content-Type", "application/json");
            headers.set("Accept-Language", document.documentElement.lang);
            return headers;
          }
        }
      : (() => {
          const csrfToken = custom.state.auth.user.token.csrf;
          return {
            headers: {
              "Content-Type": "application/json",
              "Accept-Language": document.documentElement.lang,
              ...(csrfToken && { "x-xsrf-token": csrfToken })
            }
          };
        })()),
    credentials: "same-origin"
  };
}

const api = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.MODE === "production" ? import.meta.env.VITE_API_URL : "/api/v2",
    ...prepareHeadersAndOptions(),
    timeout: 15000
  }),
  tagTypes: ["Notification"],

  endpoints: (builder) => ({
    /**
     * Gets the countries data by cdn.
     * @request
     */
    getCountries: builder.query<HttpResponse<{ countries: Country[] }>, void>({
      queryFn: async (_, {}, __, baseQuery) => {
        const res = (await baseQuery({
          url: `${import.meta.env.VITE_CDN_URL}/world/countries/countries.json`,
          method: "GET"
        }));

        if (res.error)
          return { error: allow500ErrorsTransform(res.error, res.meta) };

        return {
          data: {
            message: "Successfully retrieved countries data.",
            countries: res.data as Country[]
          }
        };
      }
    }),
    /**
     * Gets the regions data by cdn.
     * @request
     */
    getRegions: builder.query<HttpResponse<{ regions: Regions[] }>, void>({
      queryFn: async (_, {}, __, baseQuery) => {
        const res = (await baseQuery({
          url: `${import.meta.env.VITE_CDN_URL}/world/regions/regions.json`,
          method: "GET"
        }));

        if (res.error)
          return { error: allow500ErrorsTransform(res.error, res.meta) };

        return {
          data: {
            message: "Successfully retrieved regions data.",
            regions: res.data as Regions[]
          }
        };
      }
    })
  })
});

export const {
  endpoints: apiEndpoints,
  reducerPath: apiReducerPath,
  reducer: apiReducer,
  middleware: apiMiddleware,
  // enhanceEndpoints,
  injectEndpoints,
  useLazyGetCountriesQuery,
  useLazyGetRegionsQuery
} = api;

export default api;
