import { cva, type VariantProps } from "class-variance-authority";

import s from "./spinner.module.css";

const spinner = cva(s.spinner, {
  variants: {
    intent: {
      primary: s.primary,
      secondary: s.secondary
    },
    size: {
      sm: s.sm,
      md: s.md,
      lrg: s.lrg,
      xl: s.xl,
      xxl: s.xxl
    }
  },
  defaultVariants: {
    size: "md"
  }
});

export interface SpinnerProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof spinner> {}

export default function Spinner({
  className,
  intent,
  size,
  ...props
}: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={spinner({ className, intent, size })}
      {...props}
    />
  );
}
