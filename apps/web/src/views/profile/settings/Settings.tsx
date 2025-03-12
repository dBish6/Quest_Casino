import type DeepReadonly from "@qc/typescript/typings/DeepReadonly";
import type { UserCredentials } from "@qc/typescript/typings/UserCredentials";
import type { SelectedOptions, SettingsOptionEntry } from "./_Option";
import type { UpdateUserSettingsDto } from "@qc/typescript/dtos/UpdateUserDto";

import { useRef, useEffect, useState, useMemo } from "react";

import getStorageKey from "@utils/getStorageKey";

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
  title: string;
  user: UserCredentials | null;
  selectedOptions: React.MutableRefObject<SelectedOptions>;
  blockListOpened?: boolean;
  setBlockListOpened?: React.Dispatch<React.SetStateAction<boolean>>;
}

interface BlockListProps {
  user: UserCredentials;
  selectedOptions: React.MutableRefObject<Omit<Partial<UserCredentials["settings"]>, "blocked_list">>;
  blockListOpened: boolean;
  setBlockListOpened: React.Dispatch<React.SetStateAction<boolean>>;
}

const OPTIONS: DeepReadonly<{ general: SettingsOptionEntry[]; privacy: SettingsOptionEntry[] }> = {
  general: [
    {
      type: "switch",
      title: "Notifications",
      text: "Enable the sound effect on new notifications and indicator."
    },
    {
      type: "list",
      title: "Blocked List",
      text: "Add or delete any profile you have blocked."
    }
  ],
  privacy: [
    {
      type: "switch",
      title: "Visibility",
      text: "Let others see your game activity and statistics when viewing your profile."
    },
    {
      type: "switch",
      title: "Block Cookies",
      text: "Block cookies that are not essential for the app to run properly."
    }
  ]
};

export default function Settings() {
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
  }

  useEffect(() => {
    window.removeEventListener("beforeunload", handlePatchPendingSettings);

    handlePatchPendingSettings();
    if (user)
      window.addEventListener("beforeunload", handlePatchPendingSettings);
    
    return () => {
      window.removeEventListener("beforeunload", handlePatchPendingSettings);
      handlePatchPendingSettings();
    }
  }, [user?.member_id]);

  return (
    <Main className={s.settings}>
      {["General", "Privacy"].map((title, i) => (
        <Section
          key={title}
          title={title}
          {...OPTIONS[title.toLowerCase() as keyof typeof OPTIONS]}
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

function Section({ title, user, blockListOpened, ...props }: SettingsSectionProps) {
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
          <h2 id={`h${title}`}>{blockListOpened ? "Blocked List" : title}</h2>
        </hgroup>
        {user?.settings ? (
          blockListOpened ? (
            <BlockedList
              user={user}
              selectedOptions={props.selectedOptions}
              blockListOpened={blockListOpened}
              setBlockListOpened={props.setBlockListOpened!}
            />
          ) : (
            <ul aria-live="polite" className={s.options}>
              {OPTIONS[title.toLowerCase() as keyof typeof OPTIONS].map((entry) => (
                  <Option
                    key={entry.title}
                    {...entry}
                    user={user}
                    selectedOptions={props.selectedOptions}
                    blockListOpened={blockListOpened}
                    setBlockListOpened={props.setBlockListOpened}
                  />
                )
              )}
            </ul>
          )
        ) : (
          <p role="alert">
            We encountered an unexpected issue with your user settings. Please
            try logging in again,{" "}
            <Link asChild intent="primary" to="">
              <Button
                id="settingsErrBtn"
                onClick={() =>
                  handleLogoutButton(dispatch, user?.username || "", "settingsErrBtn")
                }
              >
                Logout
              </Button>
            </Link>
            .
          </p>
        )}
      </div>
    </section>
  );
}

function BlockedList({ user, setBlockListOpened, ...props }: BlockListProps) {
  const blockedUsers = useMemo(() => Object.values((user.settings.blocked_list || {})), [user?.settings.blocked_list]);

  return (
    <>
      <Button
        aria-label="Close Block List"
        intent="exit ghost"
        size="md"
        onClick={() => setBlockListOpened(false)}
      />
      {blockedUsers.length ? (
        <ul aria-label="Your Blocked Users" aria-live="polite" id="blockList" className={s.options}>
          {blockedUsers.map((blkUser) => (
            <Option
              key={blkUser.member_id}
              title={blkUser.username}
              text={blkUser.bio || ""}
              user={user}
              blkUser={blkUser}
              selectedOptions={props.selectedOptions}
            />
          ))}
        </ul>
      ) : (
        <p>No Results</p>
      )}
    </>
  );
}
