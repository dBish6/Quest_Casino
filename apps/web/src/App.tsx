/**
 * Quest Casino Web (front-end)
 * Version: 2.0.0-pre
 *
 * Author: David Bishop
 * Creation Date: April 16, 2024
 * Last Updated: April 13, 2025
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

import { ResourceLoaderProvider } from "@components/loaders";
import { LeaderboardProvider } from "@gameFeat/components/modals/menu/slides";
import SocketPredefinedListenersProvider from "@components/SocketPredefinedListenersProvider";
import BreakpointProvider from "@components/BreakpointProvider";
import { Dashboard } from "@components/dashboard";
import { ModalsProvider } from "@components/modals";
import VerificationHandler from "@authFeat/components/VerificationHandler";
import AwayActivityTracker from "@components/AwayActivityTracker";

import { routes as initialRoutes } from "./routes";

import validateUserAction from "@authFeat/actions/validateUser";

export const routes: RouteObject[] = initialRoutes.map((route) => {
  if (route.path === "/:locale/") {
    route.element = (
      <>
        {/* <ErrorBoundary> */}
        <HistoryProvider />
        <ToastsProvider />

        <ResourceLoaderProvider>
          <BreakpointProvider>
            <LeaderboardProvider>
              <SocketPredefinedListenersProvider />

              <Dashboard />

              <ModalsProvider />
              <VerificationHandler />
              <AwayActivityTracker />
            </LeaderboardProvider>
          </BreakpointProvider>
        </ResourceLoaderProvider>
        {/* </ErrorBoundary> */}

        {/* They get redirected on the server, this is just in case for the client. */}
        {window.location.pathname === "/" && (
          // FIXME: Would this even work now?
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
