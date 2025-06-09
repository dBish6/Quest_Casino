/**
 * Socket Auth Service
 *
 * Description:
 * Manages real-time user authentication; friend's activity, including tracking statuses, friend requests, and room management.
 */

import type { ObjectId, QueryOptions } from "mongoose";
import type { Socket, Namespace, Server } from "socket.io";
import type SocketCallback from "@typings/SocketCallback";
import type { FriendCredentials, UserCredentials, ActivityStatuses } from "@qc/typescript/typings/UserCredentials";
import type { UserDocFriends, UserDoc, UserClaims } from "@authFeat/typings/User";

import type { ManageFriendRequestEventDto } from "@qc/typescript/dtos/ManageFriendEventDto";
import type { NotificationTypes, Notification } from "@qc/typescript/dtos/NotificationsDto"

import { startSession } from "mongoose"

import { type AvailableLocales, AuthEvent } from "@qc/constants";

import { logger } from "@qc/utils";
import { handleSocketError, SocketError } from "@utils/handleError";
import { KEY } from "@authFeat/utils/activityRedisKey";
import handleMultipleTransactionPromises from "@utils/handleMultipleTransactionPromises";
import getFriendRoom from "@authFeatSocket/utils/getFriendRoom";
import getSocketId from "@utils/getSocketId";
import getUserSessionActivity from "@authFeat/utils/getUserSessionActivity";
import getLocale from "@utils/getLocale";

import { redisClient } from "@cache";
import { getUserFriends, getUser, updateUserFriends, updateUserNotifications } from "@authFeat/services/authService";

export default class SocketAuthService {
  private socket: Socket;
  private io: Namespace;

  constructor(socket: Socket, io: Namespace) {
    this.socket = socket;
    this.io = io;
  }

  /**
   * Initializes friend activity statuses and joins friend rooms for tracking statuses and private messaging, etc.
   * Sets the status for each friend and joins their appropriate rooms only if the friend is online.
   * 
   * Should only be used on login.
   */
  public async initializeFriends({ member_id }: { member_id: string }, callback: SocketCallback) {
    logger.debug("socket initializeFriends:", { member_id });

    try {
      const user = this.socket.userDecodedClaims!;
      if (member_id !== user.member_id) throw new SocketError("ACCESS_DENIED", "general", "forbidden"); // Why not.

      const userFriends = await getUserFriends(user.sub, { forClient: "pending", lean: true });
      let initFriends: UserCredentials["friends"] = {
        pending: Object.fromEntries(userFriends.pending),
        list: {}
      };

      if (!userFriends.list.size) {
        this.cacheUserActivityStatus("online", user);

        return callback({
          status: "ok",
          message: this.socket.locale.data.auth.success.INITIALIZE_FRIENDS_PARTIAL,
          friends: initFriends
        });
      } else {
        for (const [key, friend] of userFriends.list as unknown as [string, FriendCredentials & { _id: ObjectId }][]) {
          // Emits the user's new status to their friends and also joins friend rooms only the friend is online.
          await this.emitFriendActivity(user, "online", friend as any);

          const [sessionActivity, lastPrivateChatMsg] = await Promise.all([
            getUserSessionActivity(friend._id),
            redisClient.get(`chat:${getFriendRoom(user.member_id, friend.member_id)}:last_message`)
          ]);

          friend.activity = sessionActivity;
          if (lastPrivateChatMsg) friend.last_chat_message = lastPrivateChatMsg;
          delete (friend as any)._id;
          
          initFriends.list[key] = friend;
        }

        return callback({
          status: "ok",
          message: this.socket.locale.data.auth.success.INITIALIZE_FRIENDS,
          friends: initFriends
        });
      }
    } catch (error: any) {
      return handleSocketError(callback, this.socket, error, "initializeFriends service error.");
    }
  }

  /**
   * Manages friend request actions including sending, accepting, and declining friend requests.
   */
  public async manageFriendRequest({ action_type, friend }: ManageFriendRequestEventDto, callback: SocketCallback) {
    logger.debug("socket manageFriendRequest:", { action_type, friend });

    try {
      const user = this.socket.userDecodedClaims!,
        recipient = await getUser({ by: "username", value: friend.username }, { lean: true });
      if (!recipient)
        throw new SocketError("USER_NOT_FOUND_SYSTEM", "general", "not found");

      const { auth, notifs } = this.socket.locale.data;

      // User sending a friend request.
      if (action_type === "request") {
        if (!recipient.email_verified)
          throw new SocketError("MANAGE_FRIEND_NOT_VERIFIED", "auth", "conflict");

        const session = await startSession();
        session.startTransaction();

        let updatedFriends: UserDocFriends;
        try {
          // Adds the pending friend to the sender.
          updatedFriends = await updateUserFriends(
            { by: "_id", value: user.sub },
            { $set: { [`pending.${recipient.member_id}`]: recipient._id } },
            { session, new: true, projection: "pending" }
          );
          // Sends the friend request to the recipient and adds it to their notifications.
          await this.emitNotification(
            recipient,
            {
              type: "friend_request",
              title: user.username,
              message: notifs.general.FRIEND_REQUEST.message
            },
            { session }
          );

          await session.commitTransaction();
        } catch (error) {
          await session.abortTransaction();
          throw error;
        } finally {
          session.endSession()
        }

        return callback({
          status: "ok",
          message: auth.success.MANAGE_FRIEND_SENT.replace("{{username}}", recipient.username),
          pending_friends: updatedFriends.pending
        });
      }

      // User(recipient) accepting the friend request.
      if (action_type === "add") {
        const initialSender = recipient;

        const session = await startSession();
        session.startTransaction();

        let updatedFriends, initialSenderUpdateFriends;
        try {
          const promises = await handleMultipleTransactionPromises([
            // Removes previously sent friend request from the recipient(user in this case).
            updateUserNotifications(
              { by: "_id", value: user.sub },
              { $pull: { friend_requests: initialSender._id } },
              { session }
            ),
            updateUserFriends(
              { by: "_id", value: user.sub },
              {
                $set: { [`list.${initialSender.member_id}`]: initialSender._id }
              },
              { session, projection: "list", new: true, lean: true }
            ),
            updateUserFriends(
              { by: "_id", value: initialSender._id },
              {
                $unset: { [`pending.${user.member_id}`]: "" },
                $set: { [`list.${user.member_id}`]: user.sub }
              },
              { session, projection: "list", new: true, lean: true }
            )
          ]);

          for (let i = 0; i < 2; i++) {
            const doc = promises[i + 1],
              newFriend = i === 0 ? initialSender : user;

            const activity = await getUserSessionActivity(i === 0 ? user.sub : initialSender._id),
              serializedList = Object.fromEntries(doc.list);
            // Adds the activity needed for the client when there is a new friend since the friend won't be initialized.
            (serializedList[newFriend.member_id] as any) = { ...serializedList[newFriend.member_id], activity };
            doc.list = serializedList;
          }

          updatedFriends = promises[1];
          initialSenderUpdateFriends = promises[2];

          await session.commitTransaction();
        } catch (error) {
          await session.abortTransaction();
          throw error;
        } finally {
          session.endSession()
        }

        const friendSocketIds = await getSocketId(initialSender.member_id, "auth");
        for (const socketId of friendSocketIds)
          this.emitFriendUpdate(
            {
              update: { list: initialSenderUpdateFriends.list },
              remove: { pending: user.member_id }
            },
            socketId
          );

        this.emitFriendUpdate({ update: { list: updatedFriends.list } });

        await this.emitNotification(initialSender, {
          type: "general",
          title: notifs.general.FRIEND_ACCEPT.title,
          message: notifs.general.FRIEND_ACCEPT.message.replace("{{username}}", user.username)
        });

        return callback({
          status: "ok",
          message: auth.success.MANAGE_FRIEND_ADDED.replace("{{username}}", initialSender.username)
        });
      }

      // User declining the friend request.
      if (action_type === "decline") {
        const initialSender = recipient,
          session = await startSession();
        session.startTransaction();

        try {
          await handleMultipleTransactionPromises([
            // Removes the previously sent friend request from the recipient(user in this case).
            updateUserNotifications(
              { by: "_id", value: user.sub },
              { $pull: { friend_requests: initialSender._id } },
              { session }
            ),
            // Removes the pending friend from the initial sender of the request.
            updateUserFriends(
              { by: "_id", value: initialSender._id },
              { $unset: { [`pending.${user.member_id}`]: "" } },
              { session }
            )
          ]);

          await session.commitTransaction();
        } catch (error) {
          await session.abortTransaction();
          throw error;
        } finally {
          session.endSession();
        }

        const socketIds = await getSocketId(initialSender.member_id, "auth");
        for (const socketId of socketIds)
          this.emitFriendUpdate({ remove: { pending: user.member_id } }, socketId);

        // Issues the general notification to the initial sender without the NEW_NOTIFICATION event call (silent).
        await this.emitNotification(
          initialSender,
          {
            type: "general",
            title: notifs.general.FRIEND_DECLINE.title,
            message: notifs.general.FRIEND_DECLINE.message.replace("{{username}}", user.username)
          },
          { silent: true }
        );

        return callback({
          status: "ok",
          message: auth.success.MANAGE_FRIEND_DECLINED.replace(
            "{{username}}",
            recipient.username + (this.socket.locale.type === "en" ? "'s" : "")
          )
        });
      }

      return callback({
        status: "bad request",
        message: auth.error.MANAGE_FRIEND_NO_DATA
      });
    } catch (error: any) {
      return handleSocketError(callback, this.socket, error, "manageFriendRequest service error.");
    }
  }

  /**
   * Deletes a friend from both the user's friend list and the friend. 
   */
  public async unfriend({ member_id }: { member_id: string }, callback: SocketCallback) {
    logger.debug("socket unfriend:", { member_id });

    try {
      const user = this.socket.userDecodedClaims!,
        { auth, notifs } = this.socket.locale.data;

      const { _id: friendId } = await getUser(
        { by: "member_id", value: member_id },
        {
          projection: "_id",
          lean: true,
          throwDefault404: true
        }
      );

      const session = await startSession();
      session.startTransaction();

      try {
        await handleMultipleTransactionPromises([
          updateUserFriends(
            { by: "_id", value: user.sub },
            { $unset: { [`list.${member_id}`]: "" } },
            { session }
          ),
          updateUserFriends(
            { by: "_id", value: friendId },
            { $unset: { [`list.${user.member_id}`]: "" } },
            { session }
          )
        ]);

        await session.commitTransaction();
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession()
      }

      const friendSocketIds = await getSocketId(member_id, "auth");
      for (const socketId of friendSocketIds)
        this.emitFriendUpdate(
          { remove: { list: user.member_id } },
          socketId
        );

      this.emitFriendUpdate({ remove: { list: member_id } });

      await this.emitNotification(
        { _id: friendId, member_id },
        {
          type: "general",
          title: notifs.general.UNFRIENDED.title,
          message: notifs.general.UNFRIENDED.message.replace("{{username}}", user.username)
        },
        { silent: true }
      );
  
      return callback({
        status: "ok",
        message: auth.success.UNFRIENDED
      });
    } catch (error: any) {
      return handleSocketError(callback, this.socket, error, "unfriend service error.");
    }
  }

  /**
   * Handles new incoming activity of the user (inactivity_timestamp, and user status). 
   */
  public async userActivity({ status }: { status: ActivityStatuses }, callback: SocketCallback) {
    logger.debug("socket userActivity:", { status });

    try {
      const user = this.socket.userDecodedClaims!,
        userFriends = await getUserFriends(user.sub, { lean: true });

      // The client only shows the timestamp if their away or offline because the user would just be "Last Seen Just Now" if they're online.
      if (["away", "offline"].includes(status))
        await redisClient.set(`user:${user.sub}:activity:inactivity_timestamp`, new Date().toISOString(), { EX: 60 * 60 * 24 * 7 }); // 1 week.

      await this.emitFriendActivity(user, status, userFriends.list.values());

      return callback({
        status: "ok",
        message: this.socket.locale.data.auth.success.USER_ACTIVITY
      });
    } catch (error: any) {
      return handleSocketError(callback, this.socket, error, "newActivity service error.");
    }
  }

  /**
   * Handles socket instance disconnection; Sends that they're offline to all friends of the user and removes 
   * the user's redis socket ids.
   */
  public async disconnect() {
    logger.debug(`Auth socket instance disconnected; ${this.socket.id}.`);

    try {
      const user = this.socket.userDecodedClaims!;

      await redisClient.sRem(`user:${user.member_id}:auth:socket_ids`, this.socket.id);
      
      const userFriends = await getUserFriends(user.sub, { lean: true }),
        promises: Promise<void>[] = [];
      for (const friend of userFriends.list.values()) {
        promises.push(this.emitFriendActivity(user, "offline", friend));
      }
      await Promise.all(promises);
    } catch (error: any) {
      logger.error("auth/disconnect service error:\n", error.message);
    }
  }

  /**
   * Emits the `friends_update` event.
   */
  public emitFriendUpdate(
    updatedFriends: { update: Partial<UserDocFriends>; } | { remove: { pending?: string; list?: string } },
    socketId?: string | null
  ) {
    try {
      if (socketId) this.io.to(socketId).emit(AuthEvent.FRIENDS_UPDATE, updatedFriends);
      else this.socket.emit(AuthEvent.FRIENDS_UPDATE, updatedFriends);
    } catch (error: any) {
      logger.error("emitFriendUpdate service error:\n", error.message);
      throw error;
    }
  }

  /**
   * Updates the user activity status and sends an the updated status to a friend(s) of the user.
   */
  public async emitFriendActivity(
    user: UserClaims,
    status: ActivityStatuses,
    friend: UserDoc | IterableIterator<UserDoc>,
  ) {
    try {
      const handleActivity = async (friend: UserDoc) => {
        const friendId = friend.member_id,
          userId = user.member_id;

        const friendSocketIds = await getSocketId(friendId, "auth");
        // If there is a socketId, it means they're connected, so they're online or away.
        if (friendSocketIds.length) {
          for (const socketId of friendSocketIds)
            this.io
              .to(socketId)
              .emit(AuthEvent.FRIEND_ACTIVITY, { member_id: userId, status });
        }
      };

      await this.cacheUserActivityStatus(status, user);

      if ((typeof friend as any)[Symbol.iterator] === "function") {
        for (const fri of friend as Iterable<UserDoc>) await handleActivity(fri);
      } else {
        await handleActivity(friend as UserDoc);
      }
    } catch (error: any) {
      logger.error("emitFriendActivity service error:\n", error.message);
      throw error;
    }
  }

  /**
   * Sends a notification to a connected user. Supports all `NotificationTypes`, and even friend requests
   * to allow the client-side the ability to send the add or decline event.
   * @param options.silent (Optional) When `true` the `NEW_NOTIFICATION` event is not emitted, only the database is updated.
   */
  public async emitNotification(
    to: Partial<UserClaims | UserDoc>,
    notification: Omit<Notification, "type" | "notification_id" | "created_at"> & { type: NotificationTypes | "friend_request" },
    options: QueryOptions & { silent?: boolean } = {}
  ) {
    try {
      const { type } = notification,
        { silent, ...restOpts } = options;

      await updateUserNotifications(
        { by: "_id", value: to._id || (to as UserClaims).sub },
        {
          $push: {
            ...(type === "friend_request"
              ? { friend_requests: this.socket.userDecodedClaims!.sub }
              : { [`notifications.${type}`]: notification })
          }
        },
        restOpts
      );

      if (!silent) {
        const socketIds = await getSocketId(to.member_id!, "auth");
        for (const socketId of socketIds)
          this.io.to(socketId).emit(AuthEvent.NEW_NOTIFICATION, { notification });
      }
    } catch (error: any) {
      logger.error("emitNotification service error:\n", error.message);
      throw error;
    }
  }

  /**
   * Stores the user's activity status in the cache only for `online` and `away` for up to 1.5 days.
   * If no cached value exists, the user is offline.
   */
  private async cacheUserActivityStatus(status: ActivityStatuses, user: UserClaims) {
    try {
      if (status === "offline") await redisClient.del(KEY(user.sub).status);
      else await redisClient.set(KEY(user.sub).status, status, { EX: 60 * 60 * 36 }); // 1.5 days.
      await redisClient.set(KEY(user.sub).inactivityTimestamp, new Date().toISOString(), { EX: 60 * 60 * 24 * 7 });
    } catch (error: any) {
      logger.error("cacheUserActivityStatus service error:\n", error.message);
      throw error;
    }
  }
}

/**
 * Changes the locale (language) of the user for all their connections. 
 */
export function localeChangeListener(socket: Socket, io: Server, namespaces: any) {
  socket.on(AuthEvent.LOCALE_CHANGE, async ({ locale }: { locale: AvailableLocales }, callback) => {
    logger.debug("socket locale_change:", { locale });

    try {
      const memberId = socket.userDecodedClaims!.member_id;

      // Loop through all known features/namespaces
      for (const { nsp } of namespaces) {
        const socketIds = await redisClient.sMembers(
          `user:${memberId}:${nsp.split("/")[4]}:socket_ids`
        );

        for (const sid of socketIds) {
          const targetSocket = io.of(nsp).sockets.get(sid);
          if (targetSocket) getLocale(locale, targetSocket);
        }
      }

      callback({
        status: "ok",
        message: "Successfully changed locale for all namespaces"
      });
    } catch (error: any) {
      return handleSocketError(callback, socket, error, "localeChange service error.");
    }
  });
}
