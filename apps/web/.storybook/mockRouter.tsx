import { createMemoryRouter } from "react-router-dom";
import LocaleProvider from "@components/LocaleProvider";
import localeData from "@locales/en.json";

export default function mockRouter(Story: any) {
  return createMemoryRouter(
    [
      {
        path: "*",
        element: (
          <LocaleProvider locale="en" initialData={localeData}>
            <Story />
          </LocaleProvider>
        )
      }
    ],
    {
      initialEntries: ["/"]
    }
  );
}
