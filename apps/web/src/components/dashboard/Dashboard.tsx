import { Outlet, useSearchParams, useLocation } from "react-router-dom";
import { Fragment } from "react";

import formatCurrency from "@authFeat/utils/formatCurrency";

import useBreakpoint from "@hooks/useBreakpoint";
import useUser from "@authFeat/hooks/useUser";

import NavAside from "./aside/Aside";
import { ChatAside } from "@chatFeat/components/dashboard";

import { Blob, Image, Icon, Link } from "@components/common";
import { Button } from "@components/common/controls";
import { ModalTrigger } from "@components/modals";
import { ScrollArea } from "@components/scrollArea";

import s from "./dashboard.module.css";

export interface DashboardMainProps extends React.ComponentProps<"main"> {
  className: string;
  scrollable?: boolean | "horizontal";
}

export default function Dashboard() {
  return (
    <div className={s.dashboard}>
      <Header />
      <NavAside />
      <ChatAside />

      <Outlet />
    </div>
  );
}

export function Header() {;
  const [_, setSearchParams] = useSearchParams(),
    location = useLocation();

  const { viewport, title } = useBreakpoint();

  const user = useUser(),
    formattedBalance = user?.balance != undefined ? formatCurrency(user.balance, true) : "MISSING";

  return (
    <header id="dashHeader" className={s.header}>
      <Blob svgWidth={329.838} svgHeight={65.308}>
        <path
          d="M34 0c7.963 0 128.815 2.2 128.815 2.2s143.043-6.628 153.261 7.57 32.731 40.893-18.9 53.23c-32.279 7.713-142.529-6.38-142.529-6.38S41.8 63 34 63C15.224 63 0 48.9 0 31.5S15.224 0 34 0Z"
          fill="rgba(178,67,178,0.5)"
        />
      </Blob>
      <div className={s.inner}>
        {["medium", "small"].includes(viewport) && (
          <div className={s.ham}>
            <Button
              intent="primary"
              size={viewport === "small" ? "lrg" : "xl"}
              iconBtn
              onClick={() =>
                setSearchParams((params) => {
                  params.set("ham", "true");
                  return params;
                })
              }
            >
              <Icon id={viewport === "small" ? "hamburger-24" : "hamburger-32"} />
            </Button>
            {viewport === "small" && (
              <ModalTrigger
                query={{ param: "notif" }}
                buttonProps={{ intent: "primary", size: "lrg", iconBtn: true }}
              >
                <Icon id="bell-22" />
              </ModalTrigger>
            )}
          </div>
        )}

        <div className={s.title}>
          <Link to="/home">
            <Image
              src={title.main ? "/logo.svg" : "/images/logo-title.svg"}
              alt="Quest Casino Home" load={false}
            />
          </Link>
          {viewport === "large" && <span />}
          {/* TODO: */}
          <h1>
            About
            {/* Title Outlet */}
          </h1>
        </div>
        
        <div className={s.cash}>
          {user && (
            <div aria-label="Current Balance" title={"$" + formattedBalance}>
              <span>Balance</span>
              <span><span>$</span>{formattedBalance}</span>
            </div>
          )}
          <ModalTrigger
            aria-label="Make Payment"
            query={{ param: "bank" }}
            buttonProps={{ 
              intent: "primary", 
              ...(viewport === "small"
                ? {
                    size: "lrg",
                    iconBtn: true
                  }
                : {
                    size: "xl"
                  })
            }}
          >
            {viewport === "small" ? <Icon aria-hidden="true" id="hand-cash-24" /> : "Bank"}
          </ModalTrigger>
        </div>
        
        {["large", "medium"].includes(viewport) && (
          <div className={s.notif}>
            <ModalTrigger
              query={{ param: "menu", value: "Quests" }}
              buttonProps={{ intent: "primary", size: "xl", iconBtn: true }}
            >
              <Icon id="scroll-28" />
            </ModalTrigger>
            <ModalTrigger
              query={{ param: "notif" }}
              buttonProps={{ intent: "primary", size: "xl", iconBtn: true }}
            >
              <Icon id="bell-25" />
            </ModalTrigger>
          </div>
        )}
      </div>
    </header>
  );
}

export function Main({
  children,
  scrollable = true,
  ...props
}: React.PropsWithChildren<DashboardMainProps>) {
  const { viewport } = useBreakpoint(),
    ScrollElem = (scrollable ? ScrollArea : Fragment) as any;

  return (
    <main {...props}>
      <ScrollElem
        {...(scrollable && {
          scrollbarSize: "5",
          orientation: scrollable === "horizontal" ? "horizontal" : "vertical",
          className: "scrollMain",
          "data-horz": scrollable === "horizontal"
        })}
      >
        {children}
      </ScrollElem>
      {["medium", "small"].includes(viewport) && <span className="border left" />}
      <span className="border bottom" />
    </main>
  );
}
