import { useContext } from "react";
import { useLocation } from "react-router-dom";

import { LocaleContext } from "@components/LocaleProvider";

import parsePathWithLocale from "@utils/parsePathWithLocale";

export default function useLocale(componentName?: string) {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useLocale must be used within a LocaleProvider");

  const { pathname } = useLocation();

  return {
    ...context,
    get content() {
      return context.getContent(
        componentName || parsePathWithLocale(pathname)![2]
      );
    }
  };
}
