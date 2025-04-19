import type { VariantProps } from "class-variance-authority";
import type { ViewUserProfileCredentials } from "@qc/typescript/typings/UserCredentials";

import { useSearchParams } from "react-router-dom";
import { Title } from "@radix-ui/react-dialog";
import { cva } from "class-variance-authority";

import useLocale from "@hooks/useLocale";
import useBreakpoint from "@hooks/useBreakpoint";

import { useAppSelector, useAppDispatch } from "@redux/hooks";
import { selectUserCredentials } from "@authFeat/redux/authSelectors";
import { UPDATE_CHAT_ROOM } from "@chatFeat/redux/chatSlice";

import { useManageFriendRequestMutation, useUnfriendMutation, useUpdateProfileMutation } from "@authFeat/services/authApi";

import { ModalQueryKey } from "@components/modals";
import { Avatar, Image } from "@components/common";
import { Button } from "@components/common/controls";
import { Spinner } from "@components/loaders";
import { ScrollArea } from "@components/scrollArea";
import { ModalTrigger } from "@components/modals";

import s from "./userGeneral.module.css";

const general = cva(s.generalInfo, {
  variants: {
    size: {
      full: s.full,
      compact: s.compact
    }
  }
});

export interface UserGeneralProps extends React.ComponentProps<"div">,
  VariantProps<typeof general> {
  user: ViewUserProfileCredentials;
}

export default function UserGeneral({ className, size, user, ...props }: UserGeneralProps) {
  const [_, setSearchParams] = useSearchParams(),
    { content } = useLocale("UserGeneral"),
    { viewport } = useBreakpoint();
  
  const storedUser = useAppSelector(selectUserCredentials)! || {},
    dispatch = useAppDispatch();

  const isFriend = !!storedUser.friends.list[user?.member_id || ""],
    isBlocked = !!storedUser.settings.blocked_list[user?.member_id || ""];

  const [emitManageFriends, { isLoading: manageFriendsLoading }] = useManageFriendRequestMutation(),
    [emitUnfriend, { isLoading: unfriendLoading }] = useUnfriendMutation();

  const [patchUpdateProfile, { isLoading: updateLoading }] = useUpdateProfileMutation();

  return (
    <>
      <div className={general({ className, size })} {...props}>
        <div className={s.content}>
          <Avatar
            size={size === "full" ? "xxxl" : "xxl"}
            user={user}
            linkProfile={false}
          />
          <div>
            <hgroup role="group" aria-roledescription="heading group">
              <Title asChild>
                <h2 title={user.username}>{user.username}</h2>
              </Title>
              <div role="presentation" className={s.legalName}>
                <p
                  title={`${user.legal_name.first} ${user.legal_name.last}`}
                  aria-roledescription="subtitle"
                >
                  {user.legal_name.first} {user.legal_name.last}
                </p>
                <Image
                  src="https://flagcdn.com"
                  alt="Country Flag"
                  country={user.country}
                  className={s.flag}
                />
              </div>
            </hgroup>
            {user.bio && (
              <ScrollArea orientation="vertical" className={s.bio}>
                <p aria-label={content.aria.label.bio}>{user.bio}</p>
              </ScrollArea>
            )}
          </div>
        </div>

        <div className={s.actions}>
          {isFriend && (
            <Button
              intent="primary"
              size={viewport === "small" || size  === "compact" ? "md" : "lrg"}
              disabled={storedUser.username === user.username}
              onClick={() => {
                dispatch(
                  UPDATE_CHAT_ROOM({
                    proposedId: user.member_id,
                    accessType: "private"
                  })
                );

                setSearchParams((params) => {
                  params.set("aside", "enlarged");
                  params.delete(ModalQueryKey.VIEW_PROFILE_MODAL);
                  return params;
                });
              }}
            >
              {content.sendBtn}
            </Button>
          )}
          <Button
            aria-live="polite"
            intent="primary"
            size={viewport === "small" || size  === "compact" ? "md" : "lrg"}
            disabled={unfriendLoading || manageFriendsLoading || storedUser.username === user.username}
            onClick={() => {
              if (isFriend) emitUnfriend({ username: user.username, member_id: user.member_id });
              else emitManageFriends({ toasts: true, action_type: "request", friend: user });
            }}
          >
            {unfriendLoading || manageFriendsLoading ? (
              <Spinner
                intent="primary"
                size={viewport === "small" ? "sm" : "md"}
              />
            ) : (
              isFriend ? content.friendBtn[0] : content.friendBtn[1]
            )}
          </Button>
          {size === "full" ? (
            <Button
              aria-live="polite"
              intent="secondary"
              size={viewport === "small" ? "md" : "lrg"}
              className={s.block}
              disabled={updateLoading || storedUser.username === user.username}
              onClick={() => {
                patchUpdateProfile({
                  allow500: false,
                  settings: {
                    blocked_list: [
                      { op: isBlocked ? "delete" : "add", member_id: user.member_id }
                    ]
                  }
                });
              }}
            >
              {updateLoading ? (
                <Spinner
                  intent="primary"
                  size={viewport === "small" ? "sm" : "md"}
                />
              ) : (
                isBlocked ? content.blockBtn[0] : content.blockBtn[1]
              )}
            </Button>
          ) : (
            <ModalTrigger
              aria-label={content.aria.label.view}
              query={{ param: "prof", value: encodeURIComponent(user.username) }}
              buttonProps={{
                intent: "primary",
                size: "md"
              }}
              className={s.visitorView}
            >
              {content.view}
            </ModalTrigger>
          )}
        </div>
      </div>
    </>
  )
}
