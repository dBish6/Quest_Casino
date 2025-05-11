import type { ToastProps as RadixToastProps } from "@radix-ui/react-toast";
import type { VariantProps } from "class-variance-authority";
import type { ToastPayload } from "@redux/toast/toastSlice";

import { useRef, Fragment } from "react";
import { Provider, Root, Title, Description, Close, Viewport } from "@radix-ui/react-toast";
import { Portal } from "@radix-ui/react-portal";
import { cva } from "class-variance-authority";

import useLocale from "@hooks/useLocale";

import { useAppSelector, useAppDispatch } from "@redux/hooks";
import { selectToasts } from "@redux/toast/toastSelectors";
import { REMOVE_TOAST } from "@redux/toast/toastSlice";

import { Button } from "@components/common/controls";
import { Icon, Link } from "@components/common";

import s from "./toast.module.css";

const toast = cva(s.toast, {
  variants: {
    intent: {
      success: s.success,
      error: s.error,
      info: s.info
    },
    defaultVariants: {
      intent: "info"
    }
  }
});

export interface ToastProps
  extends RadixToastProps,
    VariantProps<typeof toast>,
    Omit<ToastPayload, "id" | "intent"> {
  close: () => void;
}


const ANIMATION_DURATION = 490;

export default function Toast({
  message,
  close,
  className,
  title,
  intent,
  options,
  ...props
}: ToastProps) {
  const { content } = useLocale("Toast");

  const toastRef = useRef<HTMLLIElement>(null),
    { link, button } = options || {};

  let messageParts = [message];
  if (link || button)
    messageParts = message.split(link?.sequence || button?.sequence || "");

  return (
    <Root
      ref={toastRef}
      className={toast({ className, intent })}
      open
      onOpenChange={() => {
        toastRef.current?.setAttribute("data-state", "closed");
        close();
      }}
      {...props}
    >
      <div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 402 12.775"
          preserveAspectRatio="xMidYMin meet"
          aria-hidden="true"
          className={s.borderTop}
        >
          <path d="M.025 12.775A12.33 12.33 0 0 1 0 12 12 12 0 0 1 12 0h378a12 12 0 0 1 12 12c0 .253-.008.509-.024.76A10.531 10.531 0 0 0 391.5 3h-381A10.525 10.525 0 0 0 .025 12.775Z" />
        </svg>
      </div>
      <Close asChild>
        <Button intent="exit" size="sm" className={s.exit} />
      </Close>

      <div>
        {intent === "success" ? (
          <Icon id="check-mark-24" />
        ) : intent === "error" ? (
          <Icon id="warning-24" />
        ) : (
          <Icon id="info-24" />
        )}
      </div>
      <Title asChild>
        <h3>{title ?? content[intent || "info"]}</h3>
      </Title>
      <Description asChild>
        <p>
          {messageParts.map((part, index) => (
            <Fragment key={index}>
              {part}
              {index < messageParts.length - 1 && (
                <>
                  {(link || button) && (
                    <Link
                      {...(button && { asChild: true })}
                      intent="primary"
                      to={link ? link.to : ""}
                    >
                      {link
                        ? link.sequence
                        : button && (
                            <Button id="toastBtn" onClick={button.onClick}>
                              {button.sequence}
                            </Button>
                          )}
                    </Link>
                  )}
                </>
              )}
            </Fragment>
          ))}
        </p>
      </Description>
    </Root>
  );
}

export function ToastsProvider() {
  const toasts = useAppSelector(selectToasts),
    dispatch = useAppDispatch();

  return (
    toasts.length > 0 && (
      <Portal>
        <Provider>
          {toasts.map((toast) => {
            const { id, ...rest } = toast;

            return (
              <Toast
                key={id}
                close={() => {
                  setTimeout(() => {
                    dispatch(REMOVE_TOAST({ id: id! }));
                  }, ANIMATION_DURATION);
                }}
                duration={toast.duration || Infinity}
                {...rest}
              />
            );
          })}
          <Viewport className={s.viewport} />
        </Provider>
      </Portal>
    )
  );
}
