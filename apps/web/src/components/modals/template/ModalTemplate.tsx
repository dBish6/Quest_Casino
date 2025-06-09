import type { DialogContentProps } from "@radix-ui/react-dialog";
import type { Variants } from "framer-motion";

import { forwardRef, useState, useRef, useLayoutEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, m } from "framer-motion";
import { Root, Portal, Overlay, Content } from "@radix-ui/react-dialog";

import preventScroll from "@utils/preventScroll";
import { fadeInOut } from "@utils/animations";

import { useAppSelector, useAppDispatch } from "@redux/hooks";
import { selectUserCredentials } from "@authFeat/redux/authSelectors";
import { ADD_TOAST } from "@redux/toast/toastSlice";

import { ScrollArea } from "@components/scrollArea";
import { type ButtonProps, Button } from "@components/common/controls";
import { type LinkProps, Link } from "@components/common";

import "./modalTemplate.css";

export enum ModalQueryKey {
  ADD_FRIENDS_MODAL = "add",
  BANK_MODAL = "bank",
  FORGOT_PASSWORD_MODAL = "forgot",
  LOGIN_MODAL = "login",
  MENU_MODAL = "menu",
  NOTIFICATIONS_MODAL = "notif",
  PROFILE_PAYMENT_HISTORY_MODAL = "phist",
  PROFILE_QUESTS_HISTORY_MODAL = "qhist",
  REGISTER_MODAL = "register",
  RESET_PASSWORD_MODAL = "reset",
  VIEW_PROFILE_MODAL = "prof"
}
export type ModalQueryKeyValues = `${ModalQueryKey}`;

export interface ModalTemplateProps
  extends Omit<DialogContentProps, "children" | "onInteractOutside"> {
  children: (props: { close: () => void }) => React.ReactNode;
  queryKey: ModalQueryKeyValues;
  width: React.CSSProperties["maxWidth"];
}

export const ANIMATION_DURATION = 1100;
const modalPopInOut: Variants = {
  visible: {
    y: "0",
    opacity: 1,
    transition: {
      y: { type: "spring", stiffness: 50 },
      opacity: { ease: "easeInOut", duration: 1 }
    }
  },
  hidden: {
    y: "-200%",
    opacity: 0,
    transition: {
      y: { type: "tween", duration: ANIMATION_DURATION / 1000 },
      opacity: { ease: "easeOut", duration: 0.5 }
    }
  }
};

export const ModalTemplate = forwardRef<HTMLDivElement, ModalTemplateProps>(
  ({ children, className, style, queryKey, width, ...props }, ref) => {
    const [searchParams, setSearchParams] = useSearchParams();

    const [modal, setModal] = useState({ show: false, render: false }),
      fadeVariant = fadeInOut();

    const handleToggle = () => {
      const toggle = !modal.show;
      if (toggle) {
        searchParams.set(queryKey, "true");
      } else if (queryKey.startsWith(ModalQueryKey.MENU_MODAL)) {
        searchParams.delete(queryKey);
        // Deletes any of the slide keys.
        for (const slide of ["Leaderboard", "Quests", "Bonuses"]) {
          searchParams.delete(slide);
        }
      } else {
        searchParams.delete(queryKey);
      }

      preventScroll(toggle);
      setSearchParams(searchParams);
    };

    const prevOpen = useRef<string | null>(null);
    if (typeof window !== "undefined") {
      useLayoutEffect(() => {
        const incomingQuery = searchParams.get(queryKey);

        if (
          searchParams.has(queryKey) ||
          prevOpen.current === queryKey
        ) {
          prevOpen.current = null;

          let timeout: NodeJS.Timeout;
          const showModal = Boolean(incomingQuery);
          if (!showModal)
            timeout = setTimeout(
              () => setModal((prev) => ({ ...prev, render: false })),
              ANIMATION_DURATION
            );

          setModal({ show: showModal, render: true });
          prevOpen.current = queryKey;

          return () => timeout && clearTimeout(timeout);
        }
      }, [searchParams]);
    }

    return (
      <Root open={modal.render} onOpenChange={handleToggle} modal>
        <Portal>
          <AnimatePresence>
            {modal.show && (
              <m.div
                role="presentation"
                key="backdrop"
                className="modalBackdrop"
                variants={fadeVariant}
                initial="hidden"
                animate="visible"
                exit="hidden"
              >
                <Overlay />
                <m.div
                  role="presentation"
                  key="modal"
                  className="modalContainer"
                  style={{ maxWidth: width }}
                  variants={modalPopInOut}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                >
                  <Content
                    id={queryKey}
                    ref={ref}
                    onInteractOutside={(e) => e.preventDefault()}
                    {...props}
                  >
                    <Button
                      intent="exit"
                      size="xl"
                      className="exitXl"
                      onClick={() => handleToggle()}
                    />
                    <ScrollArea
                      className={`modal ${className ? " " + className : ""}`}
                      orientation="vertical"
                    >
                      {children({ close: handleToggle })}
                    </ScrollArea>
                  </Content>
                </m.div>
              </m.div>
            )}
          </AnimatePresence>
        </Portal>
      </Root>
    );
  }
);

const RESTRICTED_MODALS: ReadonlySet<ModalQueryKeyValues> = new Set([
  ModalQueryKey.NOTIFICATIONS_MODAL,
  ModalQueryKey.ADD_FRIENDS_MODAL,
  ModalQueryKey.BANK_MODAL,
  ModalQueryKey.MENU_MODAL
]);

export const ModalTrigger = forwardRef<
  HTMLAnchorElement,
  Omit<LinkProps, "to"> & {
    query: { pathname?: string, param: ModalQueryKeyValues; value?: string };
    buttonProps?: ButtonProps;
  }
>(({ children, query, buttonProps, ...props }, ref) => {
  const [searchParams] = useSearchParams();

  const user = useAppSelector(selectUserCredentials),
    dispatch = useAppDispatch()

  return (
    <Button asChild {...buttonProps} >
      <Link
        aria-haspopup="dialog"
        aria-expanded={searchParams.has(query.param)}
        aria-controls={query.param}
        ref={ref}
        to={{ pathname: query.pathname, search: `?${query.param}=${query.value || "true"}` }}
        {...props}
        onClick={(e) => {
          if (RESTRICTED_MODALS.has(query.param) && !user)
            dispatch(
              ADD_TOAST({
                title: "Login Session Required",
                message: "You must be logged in to have access to this feature.",
                intent: "error",
                duration: 6500
              })
            )
            // FIXME:
            // requestAnimationFrame(() =>
            //   setSearchParams((params) => {
            //     params.delete(queryKey);
            //     return params;
            //   })
            // );

          if (props.onClick) props.onClick(e);
        }}
      >
        {children}
      </Link>
    </Button>
  );
});
