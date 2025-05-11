import type { PanInfo } from "framer-motion";

import { useSearchParams } from "react-router-dom";
import { useMemo, useEffect, useRef } from "react";
import { useMotionValue, useAnimation, useAnimate, AnimatePresence, m } from "framer-motion";
import { isMobile } from "detect-if-mobile";
import { debounce } from "tiny-throttle";

import { fadeInOut } from "@utils/animations";

import useLocale from "@hooks/useLocale";
import useBreakpoint from "@hooks/useBreakpoint";
import useUser from "@authFeat/hooks/useUser";
import useResourcesLoadedEffect from "@hooks/useResourcesLoadedEffect";

import { Friends } from "./friends";
import { Chat } from "./chat";
import { Button } from "@components/common/controls";
import { Icon } from "@components/common";

import s from "./aside.module.css";

export type DragPointsKey = "default" | "enlarged" | "shrunk";

export const ANIMATION_DURATION = 850;
/** Drag breakpoints widths. */
const breakpoints = { shrunk: 9, default: 222, enlarged: 945 };

// FIXME: Dragging from shrunk goes too quick to default.
function keyboardTrap(e: KeyboardEvent, focusableElems: HTMLElement[]) {
  if (e.key === "Tab") {
    const firstElem = focusableElems[0];
    let lastElem = focusableElems[focusableElems.length - 1]; // The last element is the send button.
    while (lastElem && lastElem.hasAttribute("disabled")) {
      const prevIndex = focusableElems.indexOf(lastElem) - 1;
      lastElem = focusableElems[prevIndex];
    }

    if (e.shiftKey && document.activeElement === firstElem) {
      e.preventDefault();
      firstElem.focus();
    } else if (!e.shiftKey && document.activeElement === lastElem) {
      e.preventDefault();
      lastElem.focus();
    }
  }
};

export default function Aside() {
  const { content } = useLocale("AsideChat"),
    { viewport } = useBreakpoint(),
    onMobile = useRef(isMobile()); // TODO: Check on a phone.

  const [searchParams, setSearchParams] = useSearchParams(),
    asideState = (searchParams.get("aside") || (viewport === "small" ? "shrunk" : "default")) as DragPointsKey;
  const asideDrawerRef = useRef<HTMLDivElement>(null),
    keyboardTrapRef = useRef<(e: KeyboardEvent) => void>(() => {});

  const width = useMotionValue<number>(breakpoints[asideState]),
    snapControls = useAnimation(),
    [scope, animate] = useAnimate<HTMLDivElement>(),
    fadeVariant = fadeInOut();

  const user = useUser(),
    friendsListArr = useMemo(() => Object.values(user?.friends.list || {}), [user?.friends.list]);

  const handleDrag = (e: PointerEvent, info: PanInfo) => {
    if (
      onMobile.current
        ? (e.target as HTMLElement).closest("input, textarea, select")
        : document.activeElement?.ariaLabel !== content.aria.label.dragBtn
    )
      return;

    const { shrunk, enlarged } = breakpoints;

    let newWidth = width.get() || breakpoints[asideState];
    if (asideState === "enlarged") {
      // Range of [enlarged, enlarged]
      newWidth = Math.max(enlarged / 1.5, Math.min(enlarged, newWidth - info.delta.x));
    } else {
      // Range of [shrunk, enlarged].
      newWidth = Math.max(shrunk + 147, Math.min(Math.min(557, enlarged / 1.8), newWidth - info.delta.x));
    }

    width.set(newWidth);
  };

  const snapToPoint = (point: keyof typeof breakpoints) =>
    snapControls.start({
      width: breakpoints[point],
      transition: {
        width: { type: "spring", duration: ANIMATION_DURATION / 1000 }
      }
    });

  const handleSnapPoint = (key?: string, override?: DragPointsKey) => {
    let point = override || asideState;

    if (!override) {
      switch (asideState) {
        case "default":
          if (key === "ArrowLeft" || width.get()! > breakpoints.default + 50) point = "enlarged";
          else if (key === "ArrowRight" || width.get()! < breakpoints.default - 50) point = "shrunk";
          break;

        case "shrunk":
          if (key === "ArrowLeft" || viewport !== "small") point = "default";
          else point = "enlarged";
          break;

        case "enlarged":
          if (key === "ArrowRight" || width.get()! <= Math.min(breakpoints.enlarged, window.innerWidth) - 65)
            point = viewport === "small" ? "shrunk" : "default";
          else point = "enlarged";
          break;

        default:
          break;
      }
    }
    if (asideState === point) snapToPoint(point);
    
    setSearchParams((params) => {
      point === "default" || (point === "shrunk" && viewport === "small")
        ? params.delete("aside")
        : params.set("aside", point);
      return params;
    });
  };
  const handleKeySnap = debounce((e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (["ArrowLeft", "ArrowRight"].includes(e.key)) handleSnapPoint(e.key);
  }, 200);

  useResourcesLoadedEffect(() => {
    if (viewport === "small") handleSnapPoint("", "shrunk");
  }, [viewport]);
  
  // NOTE: No need to clear eventListeners on unmount because this component will always be on screen, can't anyways.
  useEffect(() => {
    const handleResize = () => breakpoints.enlarged = Math.min(window.innerWidth, 945);
    handleResize();
    window.addEventListener("resize", handleResize);

    const handleKeyNavigation = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "q") 
        document.querySelector<HTMLButtonElement>(`button[aria-label="Drag Panel"`)!.focus()
    };
    window.addEventListener("keydown", handleKeyNavigation);
  }, []);

  useEffect(() => {
    snapToPoint(asideState);

    if (scope.current)
      animate(scope.current,
        { opacity: [0, 1] },
        { opacity: { duration: ANIMATION_DURATION / 1000 - .33 } }
      );
  }, [asideState]);

  useEffect(() => {
    // Hides all content for screen readers when aside is enlarged.
    const elems = document.querySelectorAll("#dashHeader, #asideLeft, main");
    for (const elem of elems) {
      if (asideState === "enlarged") elem.setAttribute("aria-hidden", "true")
      else elem.removeAttribute("aria-hidden")
    }

    // Traps keyboard navigation inside the aside when it's enlarged.
    if (asideState === "enlarged") {
      const focusableElems = Array.from(
        asideDrawerRef.current!.querySelectorAll<HTMLElement>(
          `button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])`
        )
      );
    
      keyboardTrapRef.current = (e: KeyboardEvent) => keyboardTrap(e, focusableElems);
      asideDrawerRef.current!.addEventListener("keydown", keyboardTrapRef.current);
    } else {
      asideDrawerRef.current!.removeEventListener("keydown", keyboardTrapRef.current);
    }
  }, [asideState]);

  return (
    <>
      <AnimatePresence>
        {asideState === "enlarged" && (
          <m.div
            className={s.backdrop}
            variants={fadeVariant}
            initial="hidden"
            animate="visible"
            exit="hidden"
          />
        )}
      </AnimatePresence>
      <aside id="asideRight" className={s.aside}>
        <m.div
          ref={asideDrawerRef}
          aria-roledescription="drawer"
          id="asideDrawer"
          className={s.drawer}
          animate={snapControls}
          onPan={handleDrag}
          onPanEnd={() => handleSnapPoint()}
          style={{ width }}
          data-aside-state={asideState}
        >
          <Button
            aria-label={content.aria.label.dragBtn}
            aria-controls="asideDrawer"
            aria-expanded={asideState === "enlarged"}
            className={s.dragger}
            onKeyDown={handleKeySnap}
          >
            <div />
          </Button>

          <m.div ref={scope} className={s.content}>
            {asideState !== "shrunk" && asideState !== "enlarged" && (
              <hgroup className={s.head}>
                <div
                  role="presentation"
                  {...(!searchParams.has("chat") && {
                    role: "button",
                    tabIndex: 0,
                    "aria-label": content.aria.label.shrinkBtn,
                    "aria-controls": "chat",
                    "aria-expanded": !searchParams.has("chat"),
                    onClick: () =>
                      setSearchParams((params) => {
                        params.set("chat", "shrunk");
                        return params;
                      })
                  })}
                >
                  <Icon aria-hidden="true" id="user-24" />
                  <h3 aria-label={content.aria.label.title}>{content.title}</h3>
                </div>
              </hgroup>
            )}

            {asideState !== "shrunk" && (
              <Friends user={user} asideState={asideState} friendsListArr={friendsListArr} />
            )}

            <Chat user={user} friendsListArr={friendsListArr} asideState={asideState} />
          </m.div>
        </m.div>
      </aside>
    </>
  );
}
