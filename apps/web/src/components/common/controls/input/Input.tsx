import type { VariantProps } from "class-variance-authority";
import type { ButtonProps } from "../button/Button";
import type { IconProps } from "@components/common/Icon";
import type { LocaleContent } from "@typings/Locale";

import { forwardRef, useRef, cloneElement, isValidElement } from "react";
import { Label } from "@radix-ui/react-label";
import { cva } from "class-variance-authority";

import { Button as ButtonComp } from "@components/common/controls";
import IconComp from "@components/common/Icon";

import "../input-select.css";
import s from "./input.module.css";

const input = cva("inputInner", {
  variants: {
    intent: {
      primary: "primary"
    },
    size: {
      lrg: "lrg",
      xl: "xl",
      md: "md"
    }
  },
  defaultVariants: {
    size: "lrg"
  }
});

export interface InputProps extends Omit<React.ComponentProps<"input">, "size" | "required" | "onChange">,
    VariantProps<typeof input> {
  label: string;
  id: string;
  hideLabel?: boolean;
  textarea?: boolean;
  required?: boolean | "show";
  Button?: React.ReactElement<ButtonProps> | "password";
  Icon?: React.ReactElement<IconProps>;
  error?: string | React.JSX.Element | boolean | null;
}

const Input = forwardRef<HTMLInputElement | HTMLTextAreaElement, React.PropsWithChildren<InputProps>>(
  ({ children, label, hideLabel, className, intent, size, style, textarea, required, Button, Icon, error, onFocus, onBlur, ...props }, ref) => {
    const inputContainerRef = useRef<HTMLDivElement>(null),
      InputElem = textarea ? "textarea" : "input";

    return (
      <div
        role="presentation"
        aria-live="assertive"
        className={`control ${s.control}`}
      >
        <div
          ref={inputContainerRef}
          className={
            `${input({ className, intent, size })}${textarea ? " " + s.textarea : ""}${Button ? " " + s.button : ""}${Icon ? " " + s.icon : ""}`
          }
          style={style}
          data-disabled={props.disabled}

          {...(props.defaultValue != null && { "data-typing": true })} // So the label stays up when there is a default value initially.
        >
          {Icon && cloneElement(Icon, { "aria-hidden": true })}
          <Label htmlFor={props.id} {...((hideLabel || Icon || textarea) && { style: { position: "absolute", opacity: 0 } })}>
            {label}
            {required === "show" && (
              <span aria-hidden="true" className="required">
                *
              </span>
            )}
          </Label>
          {/* @ts-ignore */}
          <InputElem
            {...(error && { "aria-errormessage": "formError", "aria-invalid": true })}
            {...(Icon && { placeholder: label })}

            ref={ref as any}
            required={required ? true : false}
            onFocus={(e) => {
              inputContainerRef.current!.setAttribute("data-focused", "true");
              onFocus && onFocus(e as any);
            }}
            onBlur={(e) => {
              inputContainerRef.current!.removeAttribute("data-focused");
              onBlur && onBlur(e as any);
            }}
            {...props}

            onChange={(e) => {
              const inputContainer = inputContainerRef.current!;
              !e.target.value.length
                ? inputContainer.removeAttribute("data-typing")
                : inputContainer.setAttribute("data-typing", "true");
            }}
          />
          {Button === "password"
            ? (() => {
                const content = (
                  typeof window !== "undefined"
                    ? window.__LOCALE_DATA__.component.Input
                    : {}
                ) as LocaleContent;

                return (
                  <ButtonComp
                    aria-label={content.aria.label.showPassword}
                    aria-controls="password"
                    aria-expanded="false"
                    aria-pressed="false"
                    intent="ghost"
                    size={size === "md" ? "md" : "lrg"}
                    type="button"
                    iconBtn
                    onClick={(e) => {
                      const target = e.currentTarget,
                        isInactive = target.getAttribute("aria-pressed") === "false";
      
                      (target.previousSibling as HTMLInputElement).type = isInactive ? "text" : "password";
      
                      target.setAttribute("aria-expanded", String(target.getAttribute("aria-expanded") === "false"));
                      target.setAttribute("aria-pressed", String(isInactive));
                      target.setAttribute(
                        "aria-label",
                        isInactive ? content.aria.label.hidePassword : content.aria.label.showPassword
                      );
                    }}
                  >
                    <IconComp aria-hidden="true" id={size === "md" ? "eye-14" : "eye-18"} />
                  </ButtonComp>
                );
              })()
            : Button && cloneElement(Button)}
        </div>

        {children}

        {error && typeof error !== "boolean" && (
          <small role="alert" id="formError" className={s.error}>
            {isValidElement(error) ? cloneElement(error) : error}
          </small>
        )}
      </div>
    );
  }
);

export default Input;
