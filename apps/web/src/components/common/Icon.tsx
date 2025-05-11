import type { LocaleEntry } from "@typings/Locale";

import { clampify } from "css-clamper";
import useLocale from "@hooks/useLocale";

export type IconIds = keyof ReturnType<typeof iconLib>;

export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, "scale"> {
  id: IconIds;
  scaleWithText?: boolean;
}

function handleFontScale(icon: SVGSVGElement | null, width: string) {
  if (icon && icon.getAttribute("data-init") !== "true") {
    const style = icon.style,
      numWidth = parseFloat(width);

    icon.parentElement!.style.display = "inline-flex";

    style.width = clampify(`${numWidth - 4}px`, `${numWidth}px`, "615px", "1640px");
    style.height = "auto";
    icon.setAttribute("data-init", "true");
  }
}

/**
 * Renders an SVG icon.
 */
export default function Icon({ id, fill = "var(--c-purple-50)", scaleWithText, style, ...props }: IconProps) {
  const { content } = useLocale("Icon");
  
  const icon = iconLib(content.aria.label)[id],
    { width, height } = icon.size;

  return (
    <svg
      {...(scaleWithText && { ref: (node) => handleFontScale(node, width) })}
      aria-label={icon["aria-label"]}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      {...props}
    >
      <use href={`/icons/sprite.svg#${icon.id}`} fill={fill} />
    </svg>
  );
}

/**
 * The collection icons with their IDs to access the icons and default aria-labels.
 */
const iconLib = (localeLabel: LocaleEntry["aria"]["label"]) => ({
  "add-15": {
    id: "add",
    size: { width: "15", height: "15" },
    "aria-label": localeLabel.add
  },
  "add-10": {
    id: "add",
    size: { width: "10", height: "10" },
    "aria-label": localeLabel.add
  },

  "adjust-16": {
    id: "adjust",
    size: { width: "16", height: "16.656" },
    "aria-label": ""
  },
  "adjust-14": {
    id: "adjust",
    size: { width: "13.996", height: "14.515" },
    "aria-label": ""
  },

  "alarm-clock-32": {
    id: "alarm-clock",
    size: { width: "31.998", height: "29.844" },
    "aria-label": ""
  },

  "badge-48": {
    id: "badge",
    size: { width: "48.003", height: "39.507" },
    "aria-label": ""
  },
  "badge-38": {
    id: "badge",
    size: { width: "37.95", height: "36.111" },
    "aria-label": ""
  },

  "bar-chart-38": {
    id: "bar-chart",
    size: { width: "38.931", height: "27.893" },
    "aria-label": ""
  },
  "bar-chart-28": {
    id: "bar-chart",
    size: { width: "28", height: "20.062" },
    "aria-label": ""
  },

  "bell-45": {
    id: "bell",
    size: { width: "44.999", height: "48.866" },
    "aria-label": localeLabel.bell
  },
  "bell-25": {
    id: "bell",
    size: { width: "25.782", height: "27.998" },
    "aria-label": localeLabel.bell
  },
  "bell-22": {
    id: "bell",
    size: { width: "21.1", height: "23.999" },
    "aria-label": localeLabel.bell
  },

  "border-horizontal-24": {
    id: "border-horizontal",
    size: { width: "24.001", height: "24.085" },
    "aria-label": ""
  },

  "cards-24": {
    id: "cards",
    size: { width: "24", height: "24.799" },
    "aria-label": ""
  },

  "check-mark-24": {
    id: "check-mark",
    size: { width: "24", height: "16.961" },
    "aria-label": localeLabel["check-mark"]
  },
  "check-mark-20": {
    id: "check-mark",
    size: { width: "20.002", height: "14.136" },
    "aria-label": localeLabel["check-mark"]
  },
  "check-mark-18": {
    id: "check-mark",
    size: { width: "18", height: "12.721" },
    "aria-label": localeLabel["check-mark"]
  },
  "check-mark-16": {
    id: "check-mark",
    size: { width: "16", height: "11.308" },
    "aria-label": localeLabel["check-mark"]
  },
  "check-mark-14": {
    id: "check-mark",
    size: { width: "14", height: "9.894" },
    "aria-label": localeLabel["check-mark"]
  },

  "debit-card-38": {
    id: "debit-card",
    size: { width: "37.95", height: "28.455" },
    "aria-label": localeLabel["debit-card"]
  },

  "delete-22": {
    id: "delete",
    size: { width: "22.004", height: "28.003" },
    "aria-label": localeLabel.delete
  },
  "delete-19": {
    id: "delete",
    size: { width: "18.858", height: "23.999" },
    "aria-label": localeLabel.delete
  },
  "delete-15": {
    id: "delete",
    size: { width: "15.002", height: "19.092" },
    "aria-label": localeLabel.delete
  },

  "dice-24": {
    id: "dice",
    size: { width: "23.999", height: "23.536" },
    "aria-label": ""
  },

  "discord-20": {
    id: "discord",
    size: { width: "19.997", height: "15.21" },
    "aria-label": localeLabel.discord
  },
  "discord-18": {
    id: "discord",
    size: { width: "18", height: "13.691" },
    "aria-label": localeLabel.discord
  },

  "edit-26": {
    id: "edit",
    size: { width: "26", height: "26.079" },
    "aria-label": localeLabel.edit
  },
  "edit-16": {
    id: "edit",
    size: { width: "16", height: "16.049" },
    "aria-label": localeLabel.edit
  },
  "edit-14": {
    id: "edit",
    size: { width: "14.004", height: "14.047" },
    "aria-label": localeLabel.edit
  },

  "enter-45": {
    id: "enter",
    size: { width: "45", height: "45.562" },
    "aria-label": ""
  },

  "exit-19": {
    id: "exit",
    size: { width: "19", height: "19" },
    "aria-label": localeLabel.exit
  },
  "exit-14": {
    id: "exit",
    size: { width: "14", height: "14" },
    "aria-label": localeLabel.exit
  },
  "exit-10": {
    id: "exit",
    size: { width: "10", height: "10" },
    "aria-label": localeLabel.exit
  },

  "expand-35": {
    id: "expand-bold",
    size: { width: "35.5", height: "15" },
    "aria-label": localeLabel.expand
  },
  "expand-23": {
    id: "expand-wide",
    size: { width: "23", height: "12" },
    "aria-label": localeLabel.expand
  },
  "expand-22": {
    id: "expand-wide",
    size: { width: "22", height: "12" },
    "aria-label": localeLabel.expand
  },
  "expand-18": {
    id: "expand-sharp",
    size: { width: "18", height: "10" },
    "aria-label": localeLabel.expand
  },
  "expand-16": {
    id: "expand-sharp",
    size: { width: "16", height: "8.889" },
    "aria-label": localeLabel.expand
  },
  "expand-14": {
    id: "expand-sharp",
    size: { width: "14", height: "7.778" },
    "aria-label": localeLabel.expand
  },
  "expand-10": {
    id: "expand-sharp",
    size: { width: "10", height: "6" },
    "aria-label": localeLabel.expand
  },

  "eye-18": {
    id: "eye",
    size: { width: "18.002", height: "9.061" },
    "aria-label": ""
  },
  "eye-14": {
    id: "eye",
    size: { width: "14", height: "7.047" },
    "aria-label": ""
  },

  "facebook-18": {
    id: "facebook",
    size: { width: "18", height: "18" },
    "aria-label": localeLabel.facebook
  },
  "facebook-16": {
    id: "facebook",
    size: { width: "16", height: "16" },
    "aria-label": localeLabel.facebook
  },

  "gift-48": {
    id: "gift",
    size: { width: "48", height: "50.155" },
    "aria-label": localeLabel.gift
  },
  "gift-20": {
    id: "gift",
    size: { width: "20", height: "20.898" },
    "aria-label": localeLabel.gift
  },
  "gift-16": {
    id: "gift",
    size: { width: "15.996", height: "16.714" },
    "aria-label": localeLabel.gift
  },
  "gift-14": {
    id: "gift",
    size: { width: "13.997", height: "14.625" },
    "aria-label": localeLabel.gift
  },

  "google-24": {
    id: "google",
    size: { width: "24.002", height: "24.484" },
    "aria-label": "Google"
  },

  "hamburger-32": {
    id: "hamburger",
    size: { width: "32.049", height: "23" },
    "aria-label": localeLabel.menu
  },
  "hamburger-24": {
    id: "hamburger",
    size: { width: "24.099", height: "17" },
    "aria-label": localeLabel.menu
  },

  "hand-cash-48": {
    id: "hand-cash",
    size: { width: "48", height: "38.17" },
    "aria-label": ""
  },
  "hand-cash-24": {
    id: "hand-cash",
    size: { width: "23.998", height: "19.083" },
    "aria-label": ""
  },

  "heart-24": {
    id: "heart",
    size: { width: "24", height: "19.849" },
    "aria-label": localeLabel.heart
  },
  "heart-13": {
    id: "heart",
    size: { width: "13.319", height: "11.015" },
    "aria-label": localeLabel.heart
  },

  "infinity-24": {
    id: "infinity",
    size: { width: "24", height: "11.111" },
    "aria-label": ""
  },

  "info-24": {
    id: "info",
    size: { width: "24", height: "24" },
    "aria-label": localeLabel.info
  },
  "info-21": {
    id: "info",
    size: { width: "21", height: "21" },
    "aria-label": localeLabel.info
  },
  "info-12": {
    id: "info",
    size: { width: "12", height: "12" },
    "aria-label": localeLabel.info
  },

  "instagram-18": {
    id: "instagram",
    size: { width: "18", height: "18" },
    "aria-label": localeLabel.instagram
  },
  "instagram-16": {
    id: "instagram",
    size: { width: "16", height: "16" },
    "aria-label": localeLabel.instagram
  },

  "joystick-32": {
    id: "joystick",
    size: { width: "31.997", height: "35.432" },
    "aria-label": ""
  },
  "joystick-16": {
    id: "joystick",
    size: { width: "15.996", height: "17.714" },
    "aria-label": ""
  },
  "joystick-14": {
    id: "joystick",
    size: { width: "13.996", height: "15.499" },
    "aria-label": ""
  },

  "list-48": {
    id: "list",
    size: { width: "47.996", height: "48.41" },
    "aria-label": localeLabel.list
  },
  "list-20": {
    id: "list",
    size: { width: "19.999", height: "20.411" },
    "aria-label": localeLabel.list
  },
  "list-16": {
    id: "list",
    size: { width: "15.998", height: "16.328" },
    "aria-label": localeLabel.list
  },
  "list-14": {
    id: "list",
    size: { width: "13.997", height: "14.285" },
    "aria-label": localeLabel.list
  },

  "lock-32": {
    id: "lock",
    size: { width: "31.222", height: "36.821" },
    "aria-label": ""
  },

  "notepad-32": {
    id: "notepad",
    size: { width: "32", height: "37.958" },
    "aria-label": ""
  },
  "notepad-24": {
    id: "notepad",
    size: { width: "23.605", height: "28" },
    "aria-label": ""
  },

  "quote-12": {
    id: "quote",
    size: { width: "12", height: "9.455" },
    "aria-label": localeLabel.quote
  },

  "refresh-24": {
    id: "refresh",
    size: { width: "23.998", height: "19.595" },
    "aria-label": localeLabel.refresh
  },
  "refresh-18": {
    id: "refresh",
    size: { width: "17.999", height: "14.697" },
    "aria-label": localeLabel.refresh
  },

  "scroll-48": {
    id: "scroll",
    size: { width: "47.996", height: "43.425" },
    "aria-label": localeLabel.scroll
  },
  "scroll-28": {
    id: "scroll",
    size: { width: "28", height: "25.333" },
    "aria-label": localeLabel.scroll
  },
  "scroll-20": {
    id: "scroll",
    size: { width: "19.999", height: "18.094" },
    "aria-label": localeLabel.scroll
  },
  "scroll-16": {
    id: "scroll",
    size: { width: "16", height: "14.476" },
    "aria-label": localeLabel.scroll
  },
  "scroll-14": {
    id: "scroll",
    size: { width: "14", height: "12.667" },
    "aria-label": localeLabel.scroll
  },


  "search-24": {
    id: "search",
    size: { width: "24", height: "24.11" },
    "aria-label": localeLabel.search
  },
  "search-21": {
    id: "search",
    size: { width: "20.996", height: "21.022" },
    "aria-label": localeLabel.search
  },
  "search-18": {
    id: "search",
    size: { width: "18.003", height: "18.085" },
    "aria-label": localeLabel.search
  },

  "send-24": {
    id: "send",
    size: { width: "24", height: "24.038" },
    "aria-label": localeLabel.send
  },
  "send-18": {
    id: "send",
    size: { width: "18", height: "18.028" },
    "aria-label": localeLabel.send
  },

  "settings-32": {
    id: "settings",
    size: { width: "32", height: "33.603" },
    "aria-label": ""
  },

  "slot-machine-24": {
    id: "slot-machine",
    size: { width: "24", height: "23.982" },
    "aria-label": ""
  },

  "speech-bubble-32": {
    id: "speech-bubble",
    size: { width: "32", height: "29.584" },
    "aria-label": ""
  },
  "speech-bubble-24": {
    id: "speech-bubble",
    size: { width: "24", height: "21.377" },
    "aria-label": ""
  },

  "user-45": {
    id: "user",
    size: { width: "45.01", height: "48.471" },
    "aria-label": ""
  },
  "user-24": {
    id: "user",
    size: { width: "23.998", height: "25.844" },
    "aria-label": ""
  },

  "warning-24": {
    id: "warning",
    size: { width: "24", height: "24.327" },
    "aria-label": localeLabel.warning
  }
});
