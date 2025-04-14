import { useContext } from "react";
import { LocaleContext } from "@components/LocaleProvider";

export default function useLocale() {
  const context = useContext(LocaleContext);
  if (!context)
    throw new Error("useLocale must be used within a LocaleProvider.");

  return context;
}
