import type { To, Location as reactLocation } from "react-router-dom";
import parsePathWithLocale from "@utils/parsePathWithLocale";

export interface PreserveUrlOptions {
  preserveLocale?: boolean;
}

/**
 * Keeps the current URL intact when navigating, but gets rid of previous hashes.
 * 
 * - To override search parameters or hash, provide the path as a string directly (e.g., preserveUrl("/home?param=hello#section", location)).
 * - If `null` is passed for `search` or `hash` in a `To` object, it removes them.
 * 
 * @param options.preserveLocale (Optional) Defaulted to `true`. When true it will always append the current locale to the provided path.
 */
export default function preserveUrl(
  to: To,
  location: reactLocation<any> | Location,
  { preserveLocale = true }: PreserveUrlOptions = {}
) {
  if ( // This is for storybook.
    typeof window !== "undefined" &&
    (window.location.pathname === "/iframe.html" || window.parent !== window)
  )
    preserveLocale = false;

  const orgSearch = location.search,
    override = typeof to === "string" && to.includes("?") ? to.split("?") : [],
    hashOverride = override[0]?.split("#") || [];

  return {
    pathname:
      override[0] === ""
        ? location.pathname
        : override[0]
        ? preserveLocale
          ? `/${parsePathWithLocale(location.pathname)![1]}${override[0]}`
          : override[0]
        : typeof to === "string"
        ? preserveLocale
          ? `/${parsePathWithLocale(location.pathname)![1]}${to}`
          : to
        : to.pathname
        ? preserveLocale
          ? `/${parsePathWithLocale(location.pathname)![1]}${to.pathname}`
          : to.pathname
        : location.pathname,
    search:
      typeof to === "object" && to.search === null
        ? ""
        : override[1]
        ? `?${override[1]}`
        : typeof to.search === "string" // It's a object.
        ? orgSearch
          ? `${orgSearch}${to.search.replace("?", "&")}`
          : to.search
        : orgSearch,
    hash:
      typeof to === "object"
        ? to.hash === null
          ? ""
          : to.hash
        : hashOverride[1]
        ? `#${hashOverride[1]}`
        : location.hash,
  };
}
