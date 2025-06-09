import type { VariantProps } from "class-variance-authority";
import type { Quest } from "@qc/typescript/dtos/GetQuestsDto";

import { useRef } from "react";
import { cva } from "class-variance-authority";

import useLocale from "@hooks/useLocale";

import { Icon } from "@components/common";

import s from "./questCard.module.css";

const questCard = cva(s.card, {
  variants: {
    size: {
      md: s.md,
      lrg: s.lrg
    }
  }
});

export interface QuestCardProps extends React.ComponentProps<"div">,
    VariantProps<typeof questCard> {
  quest: Quest;
  /** The user's current progress for quest completion. */
  current?: number;
}

export default function QuestCard({ className, size, quest, current = 0 }: QuestCardProps) {
  const { content, numberFormat } = useLocale("QuestCard");

  const label = useRef({
    title: "title-" + quest.title.toLowerCase().replace(/'/g, "").replace(/\s+/g, "-"),
    description: "descrip-" + quest.title.toLowerCase().replace(/'/g, "").replace(/\s+/g, "-"),
    progress: "progress-" + quest.title.toLowerCase().replace(/'/g, "").replace(/\s+/g, "-")
  });

  const completed = current >= quest.cap;

  return (
    <li
      aria-labelledby={label.current.title}
      aria-describedby={`${label.current.description} ${label.current.progress}`}
    >
      <article
        className={questCard({ className, size })}
        data-completed={completed}
      >
        <div className={s.content}>
          <div>
            <h3 id={label.current.title} className="hUnderline">
              {quest.title}
            </h3>
            <p id={label.current.description}>{quest.description}</p>
          </div>
          <p>
            <span>{content.reward}</span>
            <span>
              {quest.reward.type === "spins"
                ? `${numberFormat().format(quest.reward.value)} ${content.freeSpins}`
                : numberFormat({ currency: "show" }).format(quest.reward.value)}
            </span>
          </p>
        </div>

        <div className={s.progress}>
          <div
            role="meter"
            aria-label={content.aria.label.progress}
            aria-describedby={label.current.progress}
            aria-valuemin={0}
            aria-valuemax={quest.cap}
            aria-valuenow={current}
            className={s.meter}
          >
            <div className={s.fill} style={{ width: `${(current / quest.cap) * 100}%` }} />
          </div>
          <div className={s.completion}>
            <span id={label.current.progress}>
              {numberFormat().format(current)}/{numberFormat().format(quest.cap)}
            </span>
            {completed && (
              <Icon
                aria-label={content.aria.label.completed}
                id={`check-mark-${size === "lrg" ? "16" : "14"}`}
                fill="var(--c-status-green)"
              />
            )}
          </div>
        </div>
      </article>
    </li>
  );
}