import type { LinkProps as RouterLinkProps } from "react-router-dom";
import type { VariantProps } from "class-variance-authority";

import { forwardRef } from "react";
import { useLocation, Link as RouterLink, NavLink as RouterNavLink } from "react-router-dom";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";

import preserveUrl from "@utils/preserveUrl";
import keyPress from "@utils/keyPress";

import s from "./link.module.css";

const link = cva(s.link, {
  variants: {
    intent: {
      primary: s.primary
    }
  }
});

export interface LinkProps extends RouterLinkProps, VariantProps<typeof link> {
  asChild?: boolean;
  external?: boolean;
  nav?: boolean;
}

const Link = forwardRef<HTMLAnchorElement, LinkProps>(
  ({ children, to = "", className, intent, asChild, external, nav, ...props }, ref) => {
    const location = useLocation();

    const Element = asChild ? Slot : external ? "a" : nav ? RouterNavLink : RouterLink;

    const handleTo = () => {
      const { pathname, search, hash } = preserveUrl(to, location);

      const ignore =
        (Element === RouterLink || Element === RouterNavLink) &&
        ({
          to: { pathname, search, ...(hash && { hash: hash }) }
        } as unknown);

      return ignore as { to: string };
    };

    return (
      <Element
        {...handleTo()}
        {...(external &&
          (Element !== "a"
            ? {
                onClick: () =>
                  window.open(to as string, "_blank", "noopener,noreferrer")
              }
            : {
                href: to as string,
                target: "_blank",
                rel: "noopener noreferrer"
              }))}
        ref={ref}
        className={link({ className, intent })}
        {...props}
        onKeyDown={(e: React.KeyboardEvent<HTMLAnchorElement>) => {
          keyPress(e, () =>
            (e.target as HTMLAnchorElement).setAttribute(
              "data-key-press",
              "true"
            )
          );
          if (props.onKeyDown) props.onKeyDown(e);
        }}
        onKeyUp={(e: React.KeyboardEvent<HTMLAnchorElement>) => {
          keyPress(e, () =>
            (e.target as HTMLAnchorElement).removeAttribute("data-key-press")
          );
          if (props.onKeyDown) props.onKeyDown(e);
        }}
      >
        {children}
      </Element>
    );
  }
);

export default Link;
