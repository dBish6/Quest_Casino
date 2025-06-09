import { MinUserCredentials } from "@qc/typescript/typings/UserCredentials";

export type NotificationTypes = "news" | "system" | "general";

export interface Notification {
  notification_id: string;
  type: NotificationTypes;
  title: string;
  message: string;
  link?: { sequence?: string; localeMarker?: boolean; to: string };
  created_at: string;
}

export interface DeleteNotificationsBodyDto {
  categorize: boolean;
  notifications: Notification[];
}

export interface GetNotificationsResponseDto {
  friend_requests: MinUserCredentials[];
  notifications: { [key in NotificationTypes]: Notification[] };
}
