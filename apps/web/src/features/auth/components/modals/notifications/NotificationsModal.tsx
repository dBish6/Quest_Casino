import type { MinUserCredentials } from "@qc/typescript/typings/UserCredentials";
import type { NotificationTypes, Notification, GetNotificationsResponseDto } from "@qc/typescript/dtos/NotificationsDto";
import type { LocaleEntry } from "@typings/Locale";
import type { LocaleContextValues } from "@components/LocaleProvider";

import { Fragment, useRef, useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, m } from "framer-motion";
import { Title } from "@radix-ui/react-dialog";

import { fadeInOut } from "@utils/animations";
import injectElementInText from "@utils/injectElementInText";
import { isFetchBaseQueryError } from "@utils/isFetchBaseQueryError";

import useLocale from "@hooks/useLocale";
import useResourcesLoadedEffect from "@hooks/useResourcesLoadedEffect";

import { useLazyGetUserQuery, useDeleteUserNotificationsMutation, useManageFriendRequestMutation } from "@authFeat/services/authApi";

import { ModalTemplate, ModalQueryKey } from "@components/modals";
import { Icon, Link, Avatar } from "@components/common";
import { ScrollArea } from "@components/scrollArea";
import { Button } from "@components/common/controls";
import { Spinner } from "@components/loaders";

import s from "./notificationsModal.module.css";

interface FriendRequestCardProps extends MinUserCredentials {
  locale: string;
  localeEntry: LocaleEntry
}

interface NotificationCardProps {
  dateTimeFormat: LocaleContextValues["dateTimeFormat"];
  notif: Notification;
  selectNotifs: Map<string, Notification> | null;
  setSelectNotifs: React.Dispatch<React.SetStateAction<Map<string, Notification> | null>>;
}

interface NotificationSectionProps extends Omit<NotificationCardProps, "notif"> {
  localeEntry: LocaleEntry;
  numberFormat: LocaleContextValues["numberFormat"];
  dateTimeFormat: LocaleContextValues["dateTimeFormat"];
  type: NotificationTypes | null;
  notifs: Notification[];
}

export default function NotificationsModal() {
  const [searchParams] = useSearchParams(),
    modalParam = searchParams.get(ModalQueryKey.NOTIFICATIONS_MODAL);

  const { type, content, numberFormat, dateTimeFormat } = useLocale("NotificationsModal");

  const fadeVariant = fadeInOut({ in: 0.3, out: 0.58 });

  const [ getNotifications, { data, isFetching: notifsLoading }] = useLazyGetUserQuery(),
    userNotifData = data?.user as GetNotificationsResponseDto;

  const [notifications, setNotifications] = useState<GetNotificationsResponseDto["notifications"] | Notification[]>([]),
    categorizedNotificationsArr = useMemo(() => Object.entries(notifications), [notifications]);
  
  const categorize = useRef(true),
    unCategorizedNotifications = useRef<Notification[]>([]),
    categorizedNotifications = useRef<GetNotificationsResponseDto["notifications"]>({ general: [], news: [], system: [] });

  const [selectNotifs, setSelectNotifs] = useState<Map<string, Notification> | null>(null),
    [postDeleteNotifications, { isLoading: deletionLoading }] = useDeleteUserNotificationsMutation();

  useResourcesLoadedEffect(() => {
    if (modalParam) {
      if (unCategorizedNotifications.current) unCategorizedNotifications.current = [];
      const query = getNotifications({ notifications: true });

      return () => query.abort();
    }
  }, [modalParam]);
  useEffect(() => {
    if (userNotifData) {
      setNotifications(userNotifData.notifications);
      categorizedNotifications.current = { ...userNotifData.notifications }; // Shallow-copy to make it not read-only.
    }
  }, [userNotifData]);

  const toggleCategorization = () => {
    if (selectNotifs !== null) setSelectNotifs(new Map());

    if (userNotifData) {
      if (categorize.current) {
        if (!unCategorizedNotifications.current.length) {
          for (const type in notifications) {
            unCategorizedNotifications.current = [
              ...unCategorizedNotifications.current,
              ...(notifications as GetNotificationsResponseDto["notifications"])[type as NotificationTypes]
            ];
          }
          unCategorizedNotifications.current =
            unCategorizedNotifications.current.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }

        setNotifications(unCategorizedNotifications.current);
      } else {
        setNotifications(categorizedNotifications.current);
      }

      categorize.current = !categorize.current;
    }
  };

  const initializeDeletion = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) =>
    setSelectNotifs((prev) => {
      const target = e.currentTarget as HTMLButtonElement;

      if (prev === null) {
        target.setAttribute("aria-pressed", "true");
        return new Map();
      } else {
        target.setAttribute("aria-pressed", "false");
        return null;
      }
    });

  const handleDeleteNotifications = () => {
    postDeleteNotifications({ categorize: categorize.current, notifications: Array.from(selectNotifs!.values()) })
      .then((res) => {
        if (res.data?.message?.startsWith("Successfully")) {
          const newNotifications = res.data.user.notifications;
          if (Array.isArray(newNotifications)) {
            unCategorizedNotifications.current = newNotifications;

            for (const deletedNotif of selectNotifs!.values()) {
              categorizedNotifications.current[deletedNotif.type] =
                categorizedNotifications.current[deletedNotif.type].filter(
                  (notif) => notif.notification_id === deletedNotif.notification_id
                );
            }
          } else {
            unCategorizedNotifications.current = [];
            categorizedNotifications.current = newNotifications
          }

          setNotifications(newNotifications);
          setSelectNotifs(new Map()); // Closes the confirm delete button.
        }
      })
  };

  return (
    <ModalTemplate
      aria-description={content.aria.descrip.modal}
      queryKey={ModalQueryKey.NOTIFICATIONS_MODAL}
      width="455px"
      className={s.modal}
      onCloseAutoFocus={() => selectNotifs && setSelectNotifs(null)}
    >
      {() => (
        <>
          <hgroup className="head">
            <Icon aria-hidden="true" id="bell-45" />
            <Title asChild>
              <h2>{content.title}</h2>
            </Title>
          </hgroup>

          <AnimatePresence>
            {selectNotifs && selectNotifs.size ? (
              <m.div
                role="dialog"
                aria-labelledby="deleteBtn"
                aria-description={content.aria.descrip.deleteBtn}
                id="delete"
                className={s.confirmDelete}
                variants={fadeVariant}
                initial="hidden"
                animate="visible"
                exit="hidden"
              >
                <Button
                  aria-live="polite"
                  intent="primary"
                  size="md"
                  id="deleteBtn"
                  className="formBtn"
                  disabled={deletionLoading}
                  onClick={handleDeleteNotifications}
                >
                  {deletionLoading ? (
                    <Spinner intent="primary" size="sm" />
                  ) : (
                    content.deleteBtn
                  )}
                </Button>
              </m.div>
            ) : null}
          </AnimatePresence>

          {notifsLoading ? (
            <Spinner intent="primary" size="xxl" />
          ) : (
            <div>
              <section aria-labelledby="hRequest" className={s.friendRequests}>
                <h3 id="hRequest">{content.section.requests.title}</h3>

                {userNotifData?.friend_requests.length ? (
                  <ScrollArea id="friendScroll" orientation="horizontal">
                    <ul aria-live="polite">
                      {userNotifData.friend_requests.map((friendRequest, i) => (
                        <li key={i}>
                          <FriendRequestCard
                            locale={type}
                            localeEntry={content.section.requests}
                            {...friendRequest}
                          />
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                ) : (
                  <p>{content.section.requests.noResults}</p>
                )}
              </section>

              <div aria-live="polite" className={s.notifications}>
                <div
                  role="region"
                  aria-label={content.aria.descrip.notifControls}
                  className={s.controls}
                >
                  <Button
                    title={content.aria.title.sort}
                    aria-label={content.aria.label.sort}
                    aria-pressed={categorize.current}
                    intent="primary"
                    size="lrg"
                    iconBtn
                    onClick={toggleCategorization}
                  >
                    <Icon aria-hidden="true" id="border-horizontal-24" />
                  </Button>
                  <Button
                    title={content.aria.title.delete}
                    aria-label={content.aria.label.delete}
                    aria-haspopup="true"
                    aria-expanded={!!selectNotifs}
                    aria-controls="radio"
                    intent="primary"
                    size="lrg"
                    iconBtn
                    onClick={initializeDeletion}
                  >
                    <Icon aria-hidden="true" id="delete-19" />
                  </Button>
                </div>

                {Array.isArray(notifications) ? (
                  notifications.length ? (
                    <NotificationSection
                      localeEntry={{
                        ...content.section.notif,
                        localeGeneral: content.general
                      }}
                      numberFormat={numberFormat}
                      dateTimeFormat={dateTimeFormat}
                      type={null}
                      notifs={notifications}
                      selectNotifs={selectNotifs}
                      setSelectNotifs={setSelectNotifs}
                    />
                  ) : (
                    <p>{content.noResults}</p>
                  )
                ) : (
                  categorizedNotificationsArr.map(([type, notifs]) => (
                    <NotificationSection
                      key={type}
                      localeEntry={{
                        ...content.section.notif,
                        localeGeneral: content.general
                      }}
                      numberFormat={numberFormat}
                      dateTimeFormat={dateTimeFormat}
                      type={type as NotificationTypes}
                      notifs={notifs}
                      selectNotifs={selectNotifs}
                      setSelectNotifs={setSelectNotifs}
                    />
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}
    </ModalTemplate>
  );
}

// TODO: Make the content in the sections collapsible when length.
function NotificationSection({
  localeEntry,
  numberFormat,
  dateTimeFormat,
  type,
  notifs,
  selectNotifs,
  setSelectNotifs,
}: NotificationSectionProps) {
  const Element = type ? "section" : Fragment;

  return (
    <Element {...(type && { "aria-labelledby": type })}>
      <div className={s.sectionHead} data-categories={!!type}>
        {type && <h3 id={type}>{localeEntry[type]}</h3>}
        <small>
          {numberFormat().format(notifs.length)}{" "}
          {localeEntry.localeGeneral.results}
        </small>
      </div>

      <ul aria-label={localeEntry.aria.label.list.replace("{{type}}", localeEntry[type || ""])}>
        {notifs.map((notif) => (
          <li key={notif.notification_id}>
            <NotificationCard
              dateTimeFormat={dateTimeFormat}
              notif={{ ...notif, type: type ?? notif.type }}
              selectNotifs={selectNotifs}
              setSelectNotifs={setSelectNotifs}
            />
          </li>
        ))}
      </ul>
    </Element>
  );
}

function NotificationCard({ dateTimeFormat, notif, selectNotifs, setSelectNotifs }: NotificationCardProps) {
  const btnRef = useRef<HTMLButtonElement>(null),
    { title, message, link, created_at } = notif;
  
  const handleSelection = () => {
    const radio = btnRef.current!;

    if (radio.getAttribute("aria-checked") === "false") {
      radio.setAttribute("aria-checked", "true")
      // Sadly, React only notices state changes for maps only if the reference to the Map changes.
      setSelectNotifs((prev) =>
        prev!.size
          ? prev!.set(notif.notification_id, notif) : new Map(prev).set(notif.notification_id, notif)
      );
    } else {
      radio.setAttribute("aria-checked", "false")
      setSelectNotifs((prev) => {
        prev!.delete(notif.notification_id)
        return prev!.size ? prev : new Map();
      });
    }
  }

  return (
    <article>
      <div>
        <h4>{title}</h4>
        <time dateTime={created_at}>
          {dateTimeFormat({
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
          }).format(new Date(created_at))}
        </time>
      </div>

      <div>
        <p>
          {injectElementInText(message, link?.sequence, (text) => (
            <Link intent="primary" to={link!.to}>
              {text}
            </Link>
          ))}
        </p>
      
        {selectNotifs && (
          <Button
            role="radio"
            aria-checked="false"
            aria-haspopup="dialog"
            aria-expanded={Boolean(selectNotifs?.size)}
            aria-controls="delete"
            ref={btnRef}
            intent="secondary"
            size="xsm"
            id="radio"
            iconBtn
            onClick={handleSelection}
          />
        )}
      </div>
    </article>
  );
}

function FriendRequestCard({ locale, localeEntry, ...friend }: FriendRequestCardProps) {
  const { avatar_url, legal_name, username } = friend,
    actions = ["add", "decline"] as const;

  const [emitManageFriends, { data: manageFriendsData, error: manageFriendsError }] = useManageFriendRequestMutation(),
    [loading, setLoading] = useState({ add: false, decline: false, fulfilled: false });

  const resError = isFetchBaseQueryError(manageFriendsError) && (manageFriendsError.data as any)?.ERROR;

  const handleAction = (action: typeof actions[number]) => {
    setLoading((prev) => ({ ...prev, [action]: true }));

    emitManageFriends({ action_type: action, friend })
      .then((res) => {
        setLoading((prev) => ({ ...prev, fulfilled: !!res.data }));
        document.getElementById("friendScroll")!
          .style.setProperty("--_res-message-height", "20px");
      })
      .finally(() => setLoading((prev) => ({ ...prev, [action]: false })));
  };

  return (
    <>
      <article
        title={`${username} | ${legal_name.first} ${legal_name.last}`}
        aria-label={localeEntry.aria.label.accept.replace(
          "{{username}}",
          locale === "en" ? username + "'s" : username
        )}
        {...(loading.fulfilled && { style: { opacity: 0.68 } })}
      >
        <div>
          <Avatar size="md" user={{ avatar_url }} />
          <hgroup role="group" aria-roledescription="heading group">
            <h4>{username}</h4>
            <p aria-roledescription="subtitle">{`${legal_name.first} ${legal_name.last}`}</p>
          </hgroup>
        </div>
        <div>
          {actions.map((action) => {
            const loadingAction = loading[action as keyof typeof loading];

            return (
              <Button
                key={action}
                aria-live="polite"
                {...((resError || manageFriendsData) && { "aria-describedby": "msg" })}
                intent={action === "add" ? "primary" : "ghost"}
                size="xsm"
                className="formBtn"
                disabled={loadingAction || loading.fulfilled}
                onClick={() => handleAction(action)}
              >
                {loadingAction ? (
                  <Spinner intent="primary" size="sm" />
                ) : action === "add" ? (
                  localeEntry.accept
                ) : (
                  localeEntry.decline
                )}
              </Button>
            );
          })}
        </div>
      </article>
      {(resError || manageFriendsData) && (
        <small role={resError ? "alert" : "status"} id="msg">
          {resError || manageFriendsData!.message}
        </small>
      )}
    </>
  );
}

NotificationsModal.restricted = "loggedOut";
