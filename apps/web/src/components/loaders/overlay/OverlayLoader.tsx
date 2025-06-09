import { useLayoutEffect, useRef } from "react";
import { Portal } from "@radix-ui/react-portal";

import useLocale from "@hooks/useLocale";

import Spinner from "../spinner/Spinner";

import s from "./overlayLoader.module.css";

export interface OverlayLoaderProps extends React.ComponentProps<"div"> {
  message?: string;
}

export default function OverlayLoader({
  message,
  ...props
}: OverlayLoaderProps) {
  const { content } = useLocale();

  const loaderRef = useRef<HTMLDivElement>(null);

  if (typeof window !== "undefined") {
    useLayoutEffect(() => {
      const content = document.getElementById("root")!;
      content.setAttribute("aria-hidden", "true");

      const prevFocus = document.activeElement as HTMLElement;
      loaderRef.current?.focus();

      return () => {
        content.removeAttribute("aria-hidden");
        if (prevFocus) prevFocus.focus();
      };
    }, []);
  }

  return (
    <Portal className={s.portal}>
      <div
        ref={loaderRef}
        role="status"
        tabIndex={-1}
        className={s.loader}
        style={{ outline: "none" }}
        {...props}
      >
        <Spinner role="" intent="primary" size="xxl" />
        <span>{message ? message : content.para}</span>
      </div>
    </Portal>
  );
}
