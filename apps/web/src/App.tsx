/**
 * Quest Casino Web (front-end)
 * Version: 2.0.0-pre
 *
 * Author: David Bishop
 * Creation Date: April 16, 2024
 * Last Updated: June 8, 2025
 *
 * Description:
 * .
 *
 * Features:
 *  -
 *
 * Change Log (Not yet, when it's released it would be):
 * The log is in the changelog.txt file at the base of this web directory.
 */

import { type RouteObject, Navigate } from "react-router-dom";

// import ErrorBoundary from "@components/ErrorBoundary";

import HistoryProvider from "@utils/History";
import { ToastsProvider } from "@components/toast";

import LocaleProvider from "@components/LocaleProvider";
import SocketPredefinedListenersProvider from "@components/SocketPredefinedListenersProvider";
import VerificationHandler from "@authFeat/components/VerificationHandler";
import AwayActivityTracker from "@components/AwayActivityTracker";

import { routes as initialRoutes, AppCore } from "./routes";

import validateUserAction from "@authFeat/actions/validateUser";

export const routes: RouteObject[] = initialRoutes({
  // These values don't matter, it gets overwritten below for the client, these are just dummy values. 
  type: "en",
  data: {} as any
}).map((route) => {
  if (route.path === "/:locale/") {
    route.element = (
      <>
        {/* <ErrorBoundary> */}
        <HistoryProvider />

        <LocaleProvider
          locale={document.documentElement.lang}
          initialData={window.__LOCALE_DATA__}
        >
          <ToastsProvider />
          <AppCore>
            <SocketPredefinedListenersProvider />
            <VerificationHandler />
            <AwayActivityTracker />
          </AppCore>
        </LocaleProvider>
        {/* </ErrorBoundary> */}

        {/* They get redirected on the server, this is just in case for the client. */}
        {window.location.pathname === "/" && (
          // FIXME: Would this even work now (/en/)?
          <Navigate to="/home" replace />
        )}
      </>
    );
  } else if (route.path === "/action") {
    route.children!.push({
      path: "user",
      children: [
        {
          path: "validate",
          action: validateUserAction
        }
      ]
    });
  }
  return route;
});
