import type { MinUserCredentials } from "@qc/typescript/typings/UserCredentials";

import { useRef, useMemo } from "react";
import { Title } from "@radix-ui/react-dialog";

import { isFetchBaseQueryError } from "@utils/isFetchBaseQueryError";

import useUser from "@authFeat/hooks/useUser";
import { useLazyGetUsersQuery, useManageFriendRequestMutation } from "@authFeat/services/authApi";

import { ModalTemplate, ModalQueryKey } from "@components/modals";
import { Icon, Avatar } from "@components/common";
import { Button, Input } from "@components/common/controls";
import { Form } from "@components/form";
import { Spinner } from "@components/loaders";

import s from "./addFriendsModal.module.css";

export default function AddFriendsModal() {
  const inputRef = useRef<HTMLInputElement>(null),
   [getUsers, { data: searchData, error: searchError, isFetching: searchLoading }] = useLazyGetUsersQuery();

  const user = useUser(),
    pendingFriendsArr = useMemo(() => Object.values(user?.friends.pending || {}), [user?.friends.pending]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const value = inputRef.current!.value;
    if (value.length) getUsers(value.trim());
  };
  
  return (
    <ModalTemplate
      aria-description="Search for users to add as friends by entering their username. View search results and manage pending friend requests."
      queryKey={ModalQueryKey.ADD_FRIENDS_MODAL}
      width="455px" 
      className={s.modal}
    >
      {() => (
        <>
          <hgroup className="head">
            <Icon aria-hidden="true" id="user-45" />
            <Title asChild>
              <h2>Add Friends</h2>
            </Title>
          </hgroup>

          <Form
            onSubmit={handleSubmit}
            formLoading={searchLoading}
            resError={searchError as any}
          >
            <Input
              ref={inputRef}
              label="Search by Username"
              intent="primary"
              size="xl"
              id="search"
              disabled={searchLoading}
              Button={() => (
                <Button
                  intent="primary"
                  size="xl"
                  type="submit"
                  iconBtn
                >
                  <Icon id="search-24" />
                </Button>
              )}
            />
          </Form>

          <section aria-label="Search Results" aria-live="polite" className={s.results}>
            {searchLoading ? (
              <Spinner intent="primary" size="xl" />
            ) : searchData?.users.length ? (
              <>
                <small>{searchData.users.length} Results</small>
                <ul aria-label="Users" className={s.list}>
                {searchData.users.map((usr) =>
                    user!.username === usr.username ? null : (
                      <li key={usr.username}>
                        <SearchUserCard user={usr} />
                      </li>
                    )
                  )}
                </ul>
              </>
            ) : (
              <p>No Results</p>
            )}
          </section>

          {pendingFriendsArr!.length > 0 && (
            <section aria-labelledby="hPending" className={s.pending}>
              <h3 id="hPending">Pending Friend Requests</h3>

              <ul aria-live="polite">
                {pendingFriendsArr!.map((request) => (
                  <li>
                     <article
                      title={`${user!.username} | ${user!.legal_name.first} ${user!.legal_name.last}`}
                      aria-label={`Pending ${request.username}`}
                      className={s.user}
                    >
                      <Details user={request} />
                    </article>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </ModalTemplate>
  );
}

function SearchUserCard({ user }: { user: MinUserCredentials }) {
  const [emitManageFriends, 
    { data: manageFriendsData, error: manageFriendsError, isLoading: manageFriendsLoading }] = useManageFriendRequestMutation();

  const resError = isFetchBaseQueryError(manageFriendsError) && (manageFriendsError.data as any)?.ERROR;
  
  return (
    <>
      <Button
        title={`${user.username} | ${user.legal_name.first} ${user.legal_name.last}`}
        aria-label={`Add ${user.username}`}
        {...((resError || manageFriendsData) && { "aria-describedby": "msg" })}
        className={s.user}
        disabled={!!(manageFriendsError || manageFriendsData) || manageFriendsLoading}
        onClick={() => emitManageFriends({ action_type: "request", friend: user })}
      >
        <Details user={user} />

        {manageFriendsLoading ? <Spinner intent="primary" size="md" /> : <Icon id="add-24" />}
      </Button>
      {(resError || manageFriendsData) && (
          <small role={resError ? "alert" : "status"} id="msg">
            {resError || manageFriendsData!.message}
          </small>
        )}
    </>
  )
}

function Details({ user }: { user: MinUserCredentials }) {
  return (
    <div>
      <Avatar
        size="md"
        user={{ avatar_url: user.avatar_url }}
      />
      <hgroup role="group" aria-roledescription="heading group">
        <h4>{user.username}</h4>
        <p aria-roledescription="subtitle">{`${user.legal_name.first} ${user.legal_name.last}`}</p>
      </hgroup>
    </div>
  )
}

AddFriendsModal.restricted = "loggedOut";
