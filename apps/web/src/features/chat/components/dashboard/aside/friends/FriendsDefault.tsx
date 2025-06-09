import type { LocaleContent } from "@typings/Locale";
import type { FriendCredentials } from "@qc/typescript/typings/UserCredentials";
import type { AppDispatch } from "@redux/store";
import type { FriendsProps } from "./Friends";

import { type SetURLSearchParams, useSearchParams } from "react-router-dom";

import injectElementInText from "@utils/injectElementInText";

import useLocale from "@hooks/useLocale";

import { useAppDispatch } from "@redux/hooks";
import { UPDATE_CHAT_ROOM } from "@chatFeat/redux/chatSlice";

import { ScrollArea } from "@components/scrollArea";
import { ModalTrigger } from "@components/modals";
import { Avatar, Link } from "@components/common";
import { Button } from "@components/common/controls";

import s from "../aside.module.css";

interface FriendsDisplayDefaultProps {
  localeContent: LocaleContent;
  friend: FriendCredentials;
  setSearchParams: SetURLSearchParams;
  dispatch: AppDispatch
}

export interface FriendsDefaultProps extends Omit<FriendsProps, "asideState"> {}

/**
 * Used when the chat isn't enlarged, shown at the 'base' of the aside.
 */
export default function FriendsDefault({ user, friendsListArr }: FriendsDefaultProps) {
  const [_, setSearchParams] = useSearchParams(),
    { content } = useLocale("FriendsDefault");

  const dispatch = useAppDispatch();

  return (
    <section className={s.friendsDefault}>
      <ModalTrigger query={{ param: "add" }} intent="primary">
        {content.add}
      </ModalTrigger>

      {!user ? (
        <p className={s.loginToSee}>
          {injectElementInText(content.loginRequired, null,
            (text) => (
              <ModalTrigger query={{ param: "login" }} intent="primary">
                {text}
              </ModalTrigger>
            ),
            { localeMarker: true }
          )}
        </p>
      ) : friendsListArr?.length ? (
        <ScrollArea orientation="vertical" className={s.friendsList}>
          <ul aria-label={content.aria.label.list}>
            {friendsListArr.map((friend) => (
              <FriendsDisplayDefault
                key={friend.member_id}
                localeContent={content}
                friend={friend}
                dispatch={dispatch}
                setSearchParams={setSearchParams}
              />
            ))}
          </ul>
        </ScrollArea>
      ) : (
        <p aria-label={content.aria.label.noFriends} className={s.noFriends}>
          {injectElementInText(
            content.noFriends,
            null,
            (text) => (
              <Link intent="primary" to={{ search: "?hs=Players" }}>
                {text}
              </Link>
            ),
            { localeMarker: true }
          )}
        </p>
      )}
    </section>
  );
}

function FriendsDisplayDefault({ localeContent, friend, setSearchParams, dispatch }: FriendsDisplayDefaultProps) {
  return (
    <li className={s.friend}>
      <Avatar size="lrg" user={friend} showShortView={false} />
      <h4>{friend.username}</h4>
      <Link asChild to="">
        <Button
          aria-controls="asideDrawer"
          aria-haspopup="true"
          onClick={() => {
            dispatch(
              UPDATE_CHAT_ROOM({
                proposedId: friend.member_id,
                accessType: "private"
              })
            );

            setSearchParams((params) => {
              params.set("aside", "enlarged");
              return params;
            });
          }}
        >
          {localeContent.message}
        </Button>
      </Link>
    </li>
  )
}
