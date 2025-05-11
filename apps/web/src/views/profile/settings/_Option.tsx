import type { UserCredentials, MinUserCredentials } from "@qc/typescript/typings/UserCredentials";
import type { LocaleEntry } from "@typings/Locale";

import { useState } from "react";

import getStorageKey from "@utils/getStorageKey";
import keyPress from "@utils/keyPress";

import useBreakpoint from "@hooks/useBreakpoint";

import { Icon, Avatar } from "@components/common";
import { Button } from "@components/common/controls";

import s from "./settings.module.css";

export interface SelectedOptions extends Omit<Partial<UserCredentials["settings"]>, "blocked_list"> {
  blocked_list?: { [member_id: string]: "delete" }
}

export interface SettingsOptionEntry {
  type?: "switch" | "list";
  title?: string;
  text?: string;
}

interface SettingsOptionProps extends SettingsOptionEntry {
  localeEntry: LocaleEntry;
  user: UserCredentials;
  blkUser?: MinUserCredentials,
  selectedOptions: React.MutableRefObject<SelectedOptions>;
  blockListOpened?: boolean;
  setBlockListOpened?: React.Dispatch<React.SetStateAction<boolean>>;
}

function toSnakeCase(txt: string) {
  return txt.replace(" ", "_").toLowerCase();
}

export default function Option({
  localeEntry,
  type = "" as any,
  title,
  text,
  user,
  blkUser,
  selectedOptions,
  ...props
}: SettingsOptionProps) {
  const { viewport } = useBreakpoint()

  const titleSnake = toSnakeCase(title || "") as keyof typeof selectedOptions["current"],
    [isEnabled, setIsEnabled] = useState(!!user.settings[titleSnake]);

  const handleSettingSelected = (e: React.MouseEvent<Element, MouseEvent>) => {
    if (type === "list") {
      e.currentTarget.setAttribute("aria-expanded", "true");
      props.setBlockListOpened!(true);
      return
    }

    let enabled = true;
    if (type === "switch") {
      enabled = e.currentTarget.getAttribute("aria-checked") === "true";
      if (enabled === !user.settings[titleSnake]) delete selectedOptions.current[titleSnake];
      else if (enabled) (selectedOptions.current[titleSnake] as boolean) = false;
      else (selectedOptions.current[titleSnake] as boolean) = true;
    } else if (blkUser) {
      enabled = e.currentTarget.getAttribute("aria-checked") === "true";
      if (!selectedOptions.current.blocked_list) selectedOptions.current.blocked_list = {};

      if (enabled) delete selectedOptions.current.blocked_list![blkUser.member_id];
      else selectedOptions.current.blocked_list![blkUser.member_id] = "delete";
    }

    localStorage.setItem(
      getStorageKey(user!.member_id, "settings"), JSON.stringify(selectedOptions.current)
    );
    setIsEnabled(!enabled);
  };

  return (
    <li>
      <div
        {...(["switch", "list"].includes(type)
          ? {
              role: "button",
              tabIndex: 0,
              onClick: handleSettingSelected,
              onKeyDown: (e) => {
                keyPress(e, () =>
                  e.currentTarget.setAttribute("data-key-press", "true")
                );
              },
              ...(type === "switch"
                ? {
                    "aria-label": isEnabled
                      ? localeEntry.aria.label.disable.replace("{{title}}", title)
                      : localeEntry.aria.label.enable.replace("{{title}}", title),
                    "aria-checked": isEnabled
                  }
                : {
                    "aria-label": localeEntry.aria.label.open,
                    "aria-controls": "blockList",
                    "aria-expanded": props.blockListOpened
                  }),
            }
          : blkUser && {
              "aria-label": localeEntry.aria.label.unblock.replace("{{username}}", blkUser.username),
              "data-checked": isEnabled
            })}
      >
        <div>
          {blkUser ? (
            <>
              <Avatar
                size="lrg"
                user={{ avatar_url: blkUser.avatar_url }}
                linkProfile={false}
              />
              <hgroup role="group" aria-roledescription="heading group">
                <h3>{blkUser.username}</h3>
                <p aria-roledescription="subtitle">
                  {`${blkUser.legal_name.first} ${blkUser.legal_name.last}`}
                </p>
              </hgroup>
            </>
          ) : (
            <>
              <h3>{title}</h3>
              <p>{text}</p>
            </>
          )}
        </div>
        <Button
          aria-checked={isEnabled}
          iconBtn
          {...(["switch", "list"].includes(type)
            ? {
                visual: true,
                ...(type === "switch" ? {
                  intent: "switch",
                  size: viewport === "small" ? "sm" : "md",
                  className: s.switch
                } : {
                  size: "md"
                })
              }
            : {
                intent: "ghost",
                size: viewport === "small" ? "md" : "lrg",
                onClick: handleSettingSelected
              })}
        >
          {(type === "list" || blkUser) && (
            <Icon
              aria-hidden="true"
              id={blkUser ? `delete-${viewport === "small" ? "19" : "22"}` : "expand-23"}
            />
          )}
        </Button>
      </div>
    </li>
  );
}