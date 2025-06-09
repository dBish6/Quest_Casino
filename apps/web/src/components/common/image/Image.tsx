import { forwardRef, useRef, useLayoutEffect } from "react";

import s from "./image.module.css";

import { COUNTRIES_MAP, getCountriesMap } from "@qc/utils";

import { useAppSelector } from "@redux/hooks";
import { selectUserCredentials } from "@authFeat/redux/authSelectors";

const handleLazyLoad = (img: HTMLImageElement, load: boolean) => {
  if (load && img.getAttribute("data-loaded") !== "true") {
    const complete = () => {
      img.parentElement!.setAttribute("data-loaded", "true");
      img.setAttribute("aria-busy", "false");

      img.onload = null;
      img.onerror = null;
    }

    if (img.complete) {
      complete();
    } else {
      img.onload = () => {
        complete();
      }
      img.onerror = () => {
        img.src = "/images/no-image.webp";
        complete();
      }
    }
  }
};

const handleFlagSrc = (
  imgInnerRef: React.MutableRefObject<HTMLImageElement | null>,
  countryName = "",
  load: boolean
) => {
  const abbr = COUNTRIES_MAP.get(countryName)?.abbr;
  if (!abbr) imgInnerRef.current!.src = "/images/no-image.webp";

  const src = `https://flagcdn.com/${abbr?.toLowerCase()}.svg`;

  imgInnerRef.current!.src = src;
  handleLazyLoad(imgInnerRef.current!, load);
};

export interface ImageProps extends Omit<React.ComponentProps<"img">, "loading" | "aria-busy"> {
  src: string;
  alt: string;
  load?: boolean;
  size?: {
    width?: string;
    height?: string;
    fit?: React.CSSProperties["objectFit"];
    position?: string;
  };
  fill?: boolean;
  country?: string;
}

const Image = forwardRef<HTMLImageElement, ImageProps>(
  ({ src, alt, load = true, size, fill, country, ...props }, ref) => {
    const imgInnerRef = useRef<HTMLImageElement | null>(null);

    if (typeof window !== "undefined" && src.startsWith("https://flagcdn.com")) {
      const targetCountry = country ?? useAppSelector(selectUserCredentials)?.country;

      useLayoutEffect(() => {
        if (!COUNTRIES_MAP.size) {
          getCountriesMap(import.meta.env.VITE_CDN_URL!).finally(() =>
            handleFlagSrc(imgInnerRef, targetCountry, load)
          );
        } else {
          handleFlagSrc(imgInnerRef, targetCountry, load);
        }
      }, [country]);
    }

    return (
      <div
        role="presentation"
        className={`${s.container}${load ? " " + s.load : ""}`}
        style={{
          ...(fill
            ? { width: "100%", height: "100%" }
            : size &&
              Object.keys(size).length && {
                ...(size.width && {
                  width: "100%",
                  maxWidth: size.width ?? ""
                }),
                ...(size.height && {
                  height: "100%",
                  maxHeight: size.height ?? ""
                })
              })
        }}
      >
        <img
          ref={(node) => {
            imgInnerRef.current = node;

            if (typeof ref === "function") ref(node);
            else if (ref) ref.current = node;

            if (node && !node.src.startsWith("https://flagcdn.com"))
              handleLazyLoad(node, load);
          }}
          src={src}
          alt={alt}
          {...props}

          {...(load && { "aria-busy": "true", loading: "lazy" })}
          style={{
            ...(fill
              ? { width: "100%", height: "100%", objectFit: "cover" }
              : size &&
                Object.keys(size).length && {
                  ...(size.width && {
                    width: "100%"
                  }),
                  ...(size.height && {
                    height: "100%",
                    maxHeight: size.height ?? ""
                  }),
                  objectFit: size.fit || "cover",
                  objectPosition: size.position || "center",
                  ...props.style
                })
          }}
        />
      </div>
    );
  }
);

export default Image;
