import { useContext } from "react";
import { ResourceLoaderContext } from "@components/loaders";

export default function useResourceLoader() {
  const context = useContext(ResourceLoaderContext);
  if (!context && !import.meta.env.DEV)
    throw new Error("useResourceLoader must be used within a ResourceLoaderProvider.");

  return context || { resourcesLoaded: false };
}
