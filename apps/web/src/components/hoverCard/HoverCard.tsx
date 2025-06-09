import type { HoverCardContentProps } from "@radix-ui/react-hover-card";
import type { VariantProps } from "class-variance-authority";

import { forwardRef, cloneElement } from "react";
import { Root, Trigger as RTrigger, Portal, Content, Arrow } from "@radix-ui/react-hover-card";
import { cva } from "class-variance-authority";

import s from "./hoverCard.module.css";

const hoverCard = cva(s.hoverCard, {
  variants: {
    intent: {
      primary: s.primary
    }
  },
  defaultVariants: {
    intent: "primary"
  }
});

export interface HoverCardProps
  extends Omit<HoverCardContentProps, "children">,
    VariantProps<typeof hoverCard> {
  children: (props: { Arrow: typeof Arrow }) => React.ReactElement;
  Trigger: React.ReactElement;
  open?: boolean;
  openDelay?: number;
}

const HoverCard = forwardRef<HTMLDivElement, HoverCardProps>(
  ({ children, Trigger, className, intent, open, openDelay, ...props }, ref) => { 
    return (
      <Root open={open} openDelay={openDelay}>
        <RTrigger asChild>
          {cloneElement(Trigger)}
        </RTrigger>

        <Portal>
          <Content
            ref={ref}
            className={hoverCard({ className, intent })}
            sideOffset={6}
            arrowPadding={12}
            {...props}
          >
            {children({ Arrow })}
          </Content>
        </Portal>
      </Root>
    );
  }
);

export default HoverCard;
