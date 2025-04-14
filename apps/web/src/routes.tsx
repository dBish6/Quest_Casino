import type { CarouselContentResponseDto } from "@views/home/_components/Carousel";

import { type RouteObject, Navigate } from "react-router-dom";

import { ResourceLoaderProvider } from "@components/loaders";
import BreakpointProvider from "@components/BreakpointProvider";
import { LeaderboardProvider } from "@gameFeat/components/modals/menu/slides";
import { Dashboard } from "@components/dashboard";
import { ModalsProvider } from "@components/modals";

import { RestrictView, About, Home, Support, PrivacyPolicy, Terms, Error } from "@views/index";

export const getCarouselContentLoader = async () => {
  try {
    const res = await fetch(`${import.meta.env.VITE_CDN_URL}/carousel/carousel.json`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(typeof window === "undefined" && { Referer: process.env.VITE_APP_URL })
          }
        }
      ),
      data: CarouselContentResponseDto = await res.json();

    if (!res.ok)
      return Response.json(
        { ERROR: (data as any).message || "Unexpectedly failed to fetch carousel content." },
        { status: res.status }
      );

    return Response.json({ message: "Successfully retrieved carousel content", ...data }, { status: res.status });
  } catch (error) {
    return Response.json(
      { ERROR: "Unexpectedly failed to initiate carousel content request." },
      { status: 500 }
    );
  }
};

export const routes: RouteObject[] = [
  {
    path: "/:locale/",
    element: (
      <>
        <ResourceLoaderProvider>
          <BreakpointProvider>
            <LeaderboardProvider>
              <Dashboard />

              <ModalsProvider />
            </LeaderboardProvider>
          </BreakpointProvider>
        </ResourceLoaderProvider>
      </>
    ),
    children: [
      {
        index: true,
        path: "about",
        element: <About />
      },
      {
        path: "home",
        element: <Home />,
        shouldRevalidate: () => false,
        loader: getCarouselContentLoader
      },
      {
        path: "profile",
        element: <RestrictView />,
        children: [
          {
            path: "",
            lazy: async () => {
              const { Profile } = await import("@views/index");
              return { Component: Profile };
            }
          },
          {
            path: "settings",
            lazy: async () => {
              const { Settings } = await import("@views/index");
              return { Component: Settings };
            }
          }
        ]
      },
      {
        path: "support",
        element: <Support />
      },
      {
        path: "privacy-policy",
        element: <PrivacyPolicy />
      },
      {
        path: "terms",
        element: <Terms />
      },
      {
        path: "error-401",
        element: <Error status={401} />
      },
      {
        path: "error-403",
        element: <Error status={403} />
      },
      {
        path: "error-404-page",
        element: <Error status={404} />
      },
      {
        path: "error-404-user",
        element: <Error status={404} />
      },
      {
        path: "error-429",
        element: <Error status={429} />
      },
      {
        path: "error-500",
        element: <Error status={500} />
      },
      {
        ...(typeof window !== "undefined" && {
          path: "*",
          element: <Navigate to="/error-404-page" replace />
        })
      }
    ]
  },
  {
    path: "/action",
    children: []
  }
];
