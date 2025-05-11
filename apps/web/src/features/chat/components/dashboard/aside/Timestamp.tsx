import type { ActivityStatuses } from "@qc/typescript/typings/UserCredentials";
import type { LocaleContextValues } from "@components/LocaleProvider";

import { useRef } from "react";

import useLocale from "@hooks/useLocale";

interface TimestampProps extends Omit<React.ComponentProps<"span">, "prefix"> {
  activity: { status?: ActivityStatuses, timestamp?: string };
  prefix?: boolean;
}

function handleTimestamp(
  localeContent: ReturnType<LocaleContextValues["getContent"]>,
  dateTimeFormat: LocaleContextValues["dateTimeFormat"],
  date: string,
  prefix?: boolean
) {
  const timestamp = new Date(date),
    currentDate = new Date();

  const startOfToday = new Date(currentDate.setHours(0, 0, 0, 0)),
    startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);

  if (timestamp >= startOfToday) {
    // Timestamp is within today.
    return `${prefix ? localeContent.para[2] : ""}${dateTimeFormat({
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(timestamp)}`;
  } else if (timestamp >= startOfYesterday && timestamp < startOfToday) {
    // Timestamp is within yesterday.
    return localeContent.para[3];
  }

  return dateTimeFormat().format(timestamp);
}


export default function Timestamp({ activity, prefix, ...props }: TimestampProps) {
  const { content, dateTimeFormat } = useLocale("Timestamp"),
    timestamp = useRef(
      !activity.timestamp
        ? content.para[0]
        : activity.status === "online"
        ? content.para[1]
        : handleTimestamp(content, dateTimeFormat, activity.timestamp, prefix)
    );

  return (
    <span className="timestamp" {...props}>
      {prefix ? content.lastSeen : ""}
      <time dateTime={activity.timestamp}>{timestamp.current}</time>
    </span>
  );
}
