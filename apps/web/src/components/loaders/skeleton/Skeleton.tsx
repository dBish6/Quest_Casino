import type { VariantProps } from "class-variance-authority";

import { forwardRef } from "react";
import { cva } from "class-variance-authority";
import { m } from "framer-motion";

import s from "./skeleton.module.css";

const skeletonTitle = cva(`${s.skeleton} ${s.title}`, {
    variants: {
      size: {
        h4: s.h4,
        h3: s.h3,
        h2: s.h2,
        h1: s.h1
      }
    }
  }),
  skeletonText = cva(`${s.skeleton} ${s.text}`, {
    variants: {
      size: {
        paraXxSmall: s.paraXxSmall,
        paraXSmall: s.paraXSmall,
        paraSmall: s.paraSmall,
        paraRegular: s.paraRegular,
        paraMedium: s.paraMedium,
        paraLarge: s.paraLarge
      }
    }
  }),
  skeletonAvatar = cva(`${s.skeleton} ${s.avatar}`, {
    variants: {
      size: {
        sm: s.sm,
        md: s.md,
        lrg: s.lrg,
        xl: s.xl,
        xxl: s.xxl
      }
    }
  });

export interface SkeletonProps extends React.ComponentProps<"div"> {}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(({ className, ...props }, ref) => {
  return <SkeletonBase ref={ref} className={`${s.skeleton}${className ?  " " + className : ""}`} {...props} />
});

export const SkeletonTitle = forwardRef<HTMLDivElement, SkeletonProps & VariantProps<typeof skeletonTitle>>(
  ({ className, size, ...props }, ref) => {
    return <SkeletonBase ref={ref} className={skeletonTitle({ className, size })} {...props} />
  }
);

export const SkeletonText = forwardRef<HTMLDivElement, SkeletonProps & VariantProps<typeof skeletonText>>(
  ({ className, size, ...props }, ref) => {
    return <SkeletonBase ref={ref} className={skeletonText({ className, size })} {...props} />
  }
);

export const SkeletonAvatar = forwardRef<HTMLDivElement, SkeletonProps & VariantProps<typeof skeletonAvatar>>(
  ({ className, size, ...props }, ref) => {
    return <SkeletonBase ref={ref} className={skeletonAvatar({ className, size })} {...props} />
  }
);

// /**
//  * General Skeleton to create whatever you want.
//  */
export const SkeletonBase = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => {
    return (
      <div ref={ref} className={className} {...props}>
        <m.div
          aria-hidden="true"
          className={s.shimmer}
          initial={{ x: "-100%", skewX: "-20deg" }}
          animate={{ x: "104%" }}
          transition={{
            ease: "linear",
            repeat: Infinity,
            duration: 1.65,
            repeatDelay: 1.1
          }}
        />
      </div>
    );
  }
);
