import type { Preview } from "@storybook/react";

import { RouterProvider } from "react-router-dom";
import { Provider } from "react-redux";
import { LazyMotion, domMax } from "framer-motion";

import mockRouter from "./mockRouter";
import mockStore from "./mockStore";

import "../src/index.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i
      }
    },
    backgrounds: {
      default: "Dashboard",
      values: [{ name: "Dashboard", value: "#19142E" }]
    }
  },
  decorators: [
    (Story) => {
      const router = mockRouter(Story);

      return (
        <Provider store={mockStore}>
          <LazyMotion features={domMax} strict>
            <RouterProvider router={router} fallbackElement={<Story />} />
          </LazyMotion>
        </Provider>
      );
    }
  ]
};

export default preview;
