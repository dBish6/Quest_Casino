import { useContext } from "react";
import { BreakpointContext } from "@components/BreakpointProvider";

export default function useBreakpoint() {
  const context = useContext(BreakpointContext);
  if (!context)
    throw new Error("useBreakpoint must be used within a BreakpointProvider.");

  return context;
}
