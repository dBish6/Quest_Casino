import type { LocaleContent } from "@typings/Locale";
import type DeepReadonly from "@qc/typescript/typings/DeepReadonly";
import type { UserCredentials } from "@qc/typescript/typings/UserCredentials";
import type { SelectedOptions, SettingsOptionEntry } from "./_Option";
import type { UpdateUserSettingsDto } from "@qc/typescript/dtos/UpdateUserDto";

import { useRef, useEffect, useState, useMemo } from "react";

import getStorageKey from "@utils/getStorageKey";
import injectElementInText from "@utils/injectElementInText";

import useLocale from "@hooks/useLocale";
import useUser from "@authFeat/hooks/useUser";

import { useAppDispatch } from "@redux/hooks";

import { handleLogoutButton } from "@authFeat/services/handleLogout";
import { useUpdateProfileMutation } from "@authFeat/services/authApi";

import { Main } from "@components/dashboard";
import { Blob, Icon, Link } from "@components/common";
import { Button } from "@components/common/controls";
import Option from "./_Option";

import s from "./settings.module.css";

interface SettingsSectionProps {
  localeContent: LocaleContent;
  title: string;
  user: UserCredentials | null;
  selectedOptions: React.MutableRefObject<SelectedOptions>;
  blockListOpened?: boolean;
  setBlockListOpened?: React.Dispatch<React.SetStateAction<boolean>>;
}

interface BlockListProps {
  localeContent: LocaleContent;
  user: UserCredentials;
  selectedOptions: React.MutableRefObject<Omit<Partial<UserCredentials["settings"]>, "blocked_list">>;
  blockListOpened: boolean;
  setBlockListOpened: React.Dispatch<React.SetStateAction<boolean>>;
}

const getOptions = (localeSectionContent: LocaleContent["section"]): DeepReadonly<{ general: SettingsOptionEntry[]; privacy: SettingsOptionEntry[] }> => ({
  general: localeSectionContent.general.optTitle.map((title: string, i: number) => ({
      type: i === 0 ? "switch" : "list",
      title,
      text: localeSectionContent.general.optText[i]
    })
  ),
  privacy: localeSectionContent.privacy.optTitle.map((title: string, i: number) => ({
      type: "switch",
      title,
      text: localeSectionContent.privacy.optText[i]
    })
  )
});

export default function Settings() {
  const { content } = useLocale();

  const user = useUser();

  const [patchUpdateProfile] = useUpdateProfileMutation(),
    selectedOptions = useRef<SelectedOptions>({});

  const [blockListOpened, setBlockListOpened] = useState(false);

  const handlePatchPendingSettings = () => {
    if (user) {
      const key = getStorageKey(user.member_id, "settings"),
        pendingSettings: SelectedOptions = JSON.parse(localStorage.getItem(key) || "{}");

      const blockedDeleteArr = Object.entries(pendingSettings.blocked_list || {}).map(([member_id, op]) => ({ op, member_id }));
      if (Object.values(pendingSettings).length || blockedDeleteArr.length) {
        patchUpdateProfile({
          keepalive: true,
          settings: {
            ...pendingSettings,
            blocked_list: blockedDeleteArr
          } as UpdateUserSettingsDto
        }).finally(() => localStorage.removeItem(key));
      }
    }
  };

  useEffect(() => {
    window.removeEventListener("beforeunload", handlePatchPendingSettings);

    handlePatchPendingSettings();
    if (user)
      window.addEventListener("beforeunload", handlePatchPendingSettings);

    return () => {
      window.removeEventListener("beforeunload", handlePatchPendingSettings);
      handlePatchPendingSettings();
    };
  }, [user?.member_id]);

  return (
    <Main className={s.settings}>
      {["General", "Privacy"].map((title, i) => (
        <Section
          key={title}
          localeContent={content}
          title={title}
          {...getOptions(content.section)[title.toLowerCase() as keyof ReturnType<typeof getOptions>]}
          user={user}
          selectedOptions={selectedOptions}
          {...(i === 0 && {
            blockListOpened: blockListOpened,
            setBlockListOpened: setBlockListOpened
          })}
        />
      ))}
    </Main>
  );
}

function Section({ localeContent, title, user, blockListOpened, ...props }: SettingsSectionProps) {
  const dispatch = useAppDispatch();

  return (
    <section aria-labelledby={`h${title}`} className={s[title.toLowerCase()]}>
      <Blob svgWidth={210.355} svgHeight={60.057}>
        <path
          d="M44.97.096c27.657.411 71.592-.367 108.767 0s49.405 18.009 55.485 31.316-13.48 14.985-31.165 21.914-39.415 4.076-39.415 4.076-26.8.988-61.521 0-41.99 9.135-61-4.717S-16.769-.816 44.97.096Z"
          fill="rgba(178,67,178,0.6)"
        />
      </Blob>
      <div className={s.inner}>
        <hgroup className={s.title} {...(blockListOpened && { style: { marginBottom: "1rem" } })}>
          <Icon
            aria-hidden="true"
            id={title === "General" ? "settings-32" : "lock-32"}
            scaleWithText
          />
          <h2 id={`h${title}`}>
            {blockListOpened ? localeContent.section.general.optTitle[1] : localeContent.section[title.toLowerCase()].title}
          </h2>
        </hgroup>
        {user?.settings ? (
          blockListOpened ? (
            <BlockedList
              localeContent={localeContent}
              user={user}
              selectedOptions={props.selectedOptions}
              blockListOpened={blockListOpened}
              setBlockListOpened={props.setBlockListOpened!}
            />
          ) : (
            <ul aria-live="polite" className={s.options}>
              {getOptions(localeContent.section)[title.toLowerCase() as keyof ReturnType<typeof getOptions>].map((entry) => (
                <Option
                  key={entry.title}
                  localeEntry={localeContent.Option}
                  {...entry}
                  user={user}
                  selectedOptions={props.selectedOptions}
                  blockListOpened={blockListOpened}
                  setBlockListOpened={props.setBlockListOpened}
                />
              ))}
            </ul>
          )
        ) : (
          <p role="alert">
            {injectElementInText(
              localeContent.error.para,
              null,
              (text) => (
                <Link asChild intent="primary" to="">
                  <Button
                    id="settingsErrBtn"
                    onClick={() =>
                      handleLogoutButton(dispatch, user?.username || "", "settingsErrBtn")
                    }
                  >
                    {text}
                  </Button>
                </Link>
              ),
              { localeMarker: true }
            )}
          </p>
        )}
      </div>
    </section>
  );
}

function BlockedList({ localeContent, user, setBlockListOpened, ...props }: BlockListProps) {
  const blockedUsers = useMemo(() => Object.values((user.settings.blocked_list || {})), [user?.settings.blocked_list]);

  return (
    <>
      <Button
        aria-label={localeContent.section.general.aria.label.close}
        intent="exit ghost"
        size="md"
        onClick={() => setBlockListOpened(false)}
      />
      {blockedUsers.length ? (
        <ul
          aria-label={localeContent.section.general.aria.label.blockList}
          aria-live="polite"
          id="blockList"
          className={s.options}
        >
          {blockedUsers.map((blkUser) => (
            <Option
              key={blkUser.member_id}
              localeEntry={localeContent.Option}
              title={blkUser.username}
              text={blkUser.bio || ""}
              user={user}
              blkUser={blkUser}
              selectedOptions={props.selectedOptions}
            />
          ))}
        </ul>
      ) : (
        <p>{localeContent.general.noResults}</p>
      )}
    </>
  );
}
