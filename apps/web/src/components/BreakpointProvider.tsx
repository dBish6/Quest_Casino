import { createContext, useState, useLayoutEffect } from "react";

export interface BreakpointContextValues {
  viewport: "large" | "medium" | "small";
  title: { main: boolean; games: boolean };
  welCarousel: boolean;
}

export const BreakpointContext = createContext<BreakpointContextValues | undefined>(undefined);

export default function BreakpointProvider({ children }: React.PropsWithChildren<{}>) {
  const [breakpoint, setBreakpoint] = useState<BreakpointContextValues>({
    viewport: "large",
    title: { main: false, games: false },
    welCarousel: false
  });

  if (typeof window !== "undefined") {
    useLayoutEffect(() => {
      const styles = getComputedStyle(document.documentElement),
        viewports = ["--large-breakpoint", "--medium-breakpoint", "--small-breakpoint"].map(
          (breakpoint) => ({
            name: breakpoint.split("-")[2] as BreakpointContextValues["viewport"],
            value: parseInt(styles.getPropertyValue(breakpoint).trim().split("px")[0], 10)
          })
        );

      const handleBreakpoint = () => {
        const viewport = viewports.reduce((prev, { name, value }) => {
          if (
            name === "large" ? window.innerWidth >= value : window.innerWidth <= value
          )
            return name;

          return prev;
        }, "large" as BreakpointContextValues["viewport"]);

        setBreakpoint({
          viewport,
          title: { main: window.innerWidth <= 780, games: window.innerWidth <= 800 },
          welCarousel: window.innerWidth <= 722
        });
      };
      handleBreakpoint();

      window.addEventListener("resize", handleBreakpoint);
      return () => window.removeEventListener("resize", handleBreakpoint);
    }, []);
  }

  return (
    <BreakpointContext.Provider value={breakpoint}> 
      {children}
    </BreakpointContext.Provider>
  );
}