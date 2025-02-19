import type { FriendsDefaultProps } from "./FriendsDefault";
import type { FriendCredentials } from "@qc/typescript/typings/UserCredentials";
import type { ChatRoomState } from "@chatFeat/redux/chatSlice";

import { useRef, useState, useMemo } from "react";

import { useAppDispatch } from "@redux/hooks";
import { UPDATE_USER_FRIEND_IN_LIST } from "@authFeat/redux/authSlice";
import { UPDATE_CHAT_ROOM } from "@chatFeat/redux/chatSlice";

import { ScrollArea } from "@components/scrollArea";
import { Avatar, Blob, Icon } from "@components/common";
import { Form } from "@components/form";
import { Input } from "@components/common/controls";
import { ModalTrigger } from "@components/modals";
import Timestamp from "../Timestamp";

import s from "../aside.module.css";

interface FriendsDisplayEnlargedProps {
  friend: FriendCredentials;
  targetFriend?: ChatRoomState["targetFriend"];
  isPrev?: boolean;
}

interface FriendsEnlargedProps extends FriendsDefaultProps {
  chatRoom: ChatRoomState;
}

export default function FriendsEnlarged({ user, chatRoom, friendsListArr }: FriendsEnlargedProps) {
  const friendsWithPrevChatsArr = useMemo(
    () => friendsListArr.filter((friend) => friend.last_chat_message !== undefined),
    [friendsListArr]
  );

  const [search, setSearch] = useState<{
    start: boolean;
    results: FriendCredentials[];
  }>({ start: false, results: [] });

  const mergedFriendsArr = useRef<FriendCredentials[]>([]);
  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const value = (e.currentTarget.elements[0] as HTMLInputElement).value;

    if (value.trim().length > 0) {
      if (!search.start)
        mergedFriendsArr.current = [...friendsListArr, ...friendsWithPrevChatsArr]

      const results = mergedFriendsArr.current.filter((friend) =>
        friend.username.toLowerCase().includes(value.toLowerCase())
      );
      setSearch({ start: true, results });
    } else {
      setSearch({ start: false, results: [] });
      mergedFriendsArr.current = []
    }
  }
  
  return (
    <section className={s.friendsEnlarged}>
      {chatRoom.targetFriend?.friend && (
        <Blob svgWidth={220.83} svgHeight={169.179}>
          <path
            d="M60.948.044C144.617 2.63 224.816-11.08 217.212 39.866s26.97 89.089-29.53 126.707c-32.606 1.552-36.1-2.081-83.159-4.867s-56.909 25.769-82.672-13.307S-22.721-2.542 60.948.044Z"
            fill="rgba(178,67,178,0.6)"
          />
        </Blob>
      )}
      <div className={s.inner} role="group" aria-roledescription="chat room management">
        {user && (
          <>
            <header className={s.targetFriend}>
              {chatRoom.accessType === "private" && (
                <>
                  <Avatar
                    size="xxl"
                    {...(chatRoom.targetFriend?.friend && { user: { avatar_url: chatRoom.targetFriend.friend.avatar_url } })}
                  />

                  <hgroup
                    {...(chatRoom.targetFriend?.friend
                      ? {
                          role: "group",
                          "aria-roledescription": "heading group",
                          "aria-label": "Selected Recipient",
                        }
                      : {
                          "aria-label":
                            "Select a Recipient to Start a Conversation",
                        })}
                    id="targetFriendDetails"
                    className={s.details}
                  >
                    {chatRoom.targetFriend?.friend ? (
                      <>
                        <h3>{chatRoom.targetFriend.friend.username}</h3>
                        <p aria-roledescription="subtitle">
                          {chatRoom.targetFriend.friend.legal_name.first} {chatRoom.targetFriend.friend.legal_name.last}
                        </p>
                      </>
                    ) : (
                      <h3>Select a Recipient</h3>
                    )}
                  </hgroup>

                  <span className={s.divider} />
                </>
              )}
            </header>

            <Form onSubmit={(e) => handleSearch(e)}>
              <Input
                aria-label="Search for Friends or Previous Chats"
                aria-controls="searchResults"
                aria-expanded={search.start}
                label="Search"
                intent="primary"
                size="lrg"
                id="searchFriends"
                Icon={<Icon id="search-18" />}
                onInput={(e) => {
                  if (!e.currentTarget.value.length) setSearch((prev) => ({ ...prev, start: false }));
                }}
              />
            </Form>
            <div className={s.lists} aria-live="polite" data-friend-targeted={!!chatRoom.targetFriend?.friend}>
              {search.start ? (
                <ScrollArea orientation="vertical" id="searchResults" className={s.searchResults}>
                  <ul>
                    {!search.results.length ? (
                      <p className={s.noResults}>No Results</p>
                    ) : (
                      <ul>
                        {search.results.map((friend) => (
                          <FriendsDisplayEnlarged
                            key={friend.member_id}
                            friend={friend}
                            targetFriend={chatRoom.targetFriend}
                          />
                        ))}
                      </ul>
                    )}
                  </ul>
                </ScrollArea>
              ) : (
                <>
                  <section className={s.prevChatsContainer}>
                    <h4 className="hUnderline">Previous Chats</h4>

                    <ScrollArea orientation="vertical" className={s.prevChats}>
                      {!friendsWithPrevChatsArr.length ? (
                        <p className={s.noResults}>No Results</p>
                      ) : (
                        <ul>
                          {friendsWithPrevChatsArr.map((friend) => (
                            <FriendsDisplayEnlarged
                              key={friend.member_id}
                              friend={friend}
                              targetFriend={chatRoom.targetFriend}
                              isPrev={true}
                            />
                          ))}
                        </ul>
                      )}
                    </ScrollArea>
                  </section>

                  <hr className={s.divider} />

                  <section className={s.friendsListContainer}>
                    <div>
                      <h4 className="hUnderline">Friends</h4>
                      <ModalTrigger query={{ param: "add" }} intent="primary">
                        Add Friends
                      </ModalTrigger>
                    </div>

                    <ScrollArea
                      orientation="vertical"
                      className={s.friendsList}
                    >
                      {!friendsListArr.length ? (
                        <p className={s.noResults}>No Results</p>
                      ) : (
                        <ul>
                          {friendsListArr.map((friend) => (
                            <FriendsDisplayEnlarged
                              key={friend.member_id}
                              friend={friend}
                              targetFriend={chatRoom.targetFriend}
                            />
                          ))}
                        </ul>
                      )}
                    </ScrollArea>
                  </section>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function FriendsDisplayEnlarged({ friend, isPrev, targetFriend }: FriendsDisplayEnlargedProps) {
  const { status, inactivity_timestamp: timestamp } = friend.activity,
    isTarget = friend.member_id === targetFriend?.friend?.member_id;

  const dispatch = useAppDispatch();

  return (
    <li className={s.friend} data-target={isTarget}>
      <Avatar size="md" user={friend} />
      
      {isPrev ? (
        <button
          {...(!isTarget && { title: "Enter Previous Chat Conversation" })}
          aria-label={`Enter Previous Chat Conversation With ${friend.username}`}
          aria-pressed={isTarget}
          aria-controls="targetFriendDetails"
          aria-expanded={!!targetFriend?.friend}
          onClick={() => 
            dispatch!(UPDATE_CHAT_ROOM({ proposedId: friend.member_id, accessType: "private" }))
          }
          disabled={isTarget}
        >
          <div>
            <h5>{friend.username}</h5>
            <Timestamp activity={{ status, timestamp }} prefix />
          </div>

          <p>{friend.last_chat_message || `Introduce yourself to ${friend.username}!`}</p>
        </button>
      ) : (
        <button
          {...(!isTarget && { title: "Start or Enter Previous Chat Conversation" })}
          aria-label={`Start a New Chat Conversation With ${friend.username}`}
          aria-pressed={isTarget}
          aria-controls="targetFriendDetails"
          aria-expanded={!!targetFriend?.friend}
          onClick={() => {
            dispatch!(UPDATE_CHAT_ROOM({ proposedId: friend.member_id, accessType: "private" }));
            if (!friend.last_chat_message)
              dispatch!(
                UPDATE_USER_FRIEND_IN_LIST({
                  memberId: friend.member_id!,
                  update: { last_chat_message: "" }
                })
              );
          }}
          disabled={isTarget}
        >
          <h5>{friend.username}</h5>
          <Timestamp activity={{ status, timestamp }} prefix />
        </button>
      )}
    </li>
  );
}
