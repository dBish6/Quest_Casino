import type { GetUserQuestsProgressResponseDto } from "@qc/typescript/dtos/GetQuestsDto";

import { useSearchParams } from "react-router-dom";
import { useState } from "react";
import { Title } from "@radix-ui/react-dialog";

import useLocale from "@hooks/useLocale";
import useResourcesLoadedEffect from "@hooks/useResourcesLoadedEffect";
import { useLazyGetQuestsQuery } from "@gameFeat/services/gameApi";

import { ModalQueryKey, ModalTemplate } from "@components/modals";
import { Icon } from "@components/common";
import { Spinner } from "@components/loaders";
import { QuestCard } from "@gameFeat/components/questCard";

import s from "./viewCompletedQuestsModal.module.css";

type QuestUserEntry = GetUserQuestsProgressResponseDto["quests"]["statistics"]["progress"]["quest"][number];
interface QuestsState {
  active: QuestUserEntry[];
  inactive: QuestUserEntry[];
}

export default function ViewCompletedQuestsModal() {
  const [searchParams] = useSearchParams(),
    username = searchParams.get(ModalQueryKey.PROFILE_QUESTS_HISTORY_MODAL);

  const { content, numberFormat } = useLocale("ViewCompletedQuestsModal");

  const [completedQuests, setCompletedQuests] = useState<QuestsState>({ active: [], inactive: [] });

  const [getQuests] = useLazyGetQuestsQuery(),
    [loading, setLoading] = useState(false);

  useResourcesLoadedEffect(() => {
    if (username) {
      setLoading(true);

      const query = getQuests({ username });
      query.then((res) => {
        if (res.isSuccess && res.data?.quests) {
          const state: QuestsState = { active: [], inactive: [] };

          for (const entry of Object.values((res.data as GetUserQuestsProgressResponseDto).quests.statistics.progress.quest)) {
            if (entry.current >= entry.quest.cap)
              state[entry.quest.status as keyof typeof state].push(entry);
          }
          setCompletedQuests(state);
        }
      }).finally(() => setLoading(false));

      return () => query.abort();
    }
  }, [username]);

  return (
    <ModalTemplate
      aria-description={content.aria.descrip.modal.replace("{{username}}", username)}
      aria-live="polite"
      queryKey="qhist"
      width="674px"
      className={s.modal}
    >
      {() => (
        <>
          <hgroup className="head">
            <Icon aria-hidden="true" id="scroll-48" scaleWithText />
            <Title asChild>
              <h2 title={content.title}>{content.title}</h2>
            </Title>
          </hgroup>

          {loading ? (
            <Spinner intent="primary" size="xxl" />
          ) : (
            <>
              <span className={s.username}>{username}</span>

              <section
                aria-label={content.section.active.aria.label.section}
                className={s.active}
              >
                <div>
                  <h3 id="hRequest">{content.section.active.title}</h3>
                  <small>
                    {numberFormat().format(completedQuests.active.length)}{" "}
                    {content.general.results}
                  </small>
                </div>
                {completedQuests.active.length ? (
                  <ul>
                    {completedQuests.active.map((entry) => (
                      <QuestCard
                        key={entry.quest.title}
                        size="md"
                        quest={entry.quest}
                        current={entry.current}
                      />
                    ))}
                  </ul>
                ) : (
                  <p>{content.general.noResults}</p>
                )}
              </section>

              <section
                aria-label={content.section.previous.aria.label.section}
                className={s.inactive}
              >
                <div>
                  <h3 id="hRequest">{content.section.previous.title}</h3>
                  <small>
                    {numberFormat().format(completedQuests.inactive.length)}{" "}
                    {content.general.results}
                  </small>
                </div>
                {completedQuests.inactive.length ? (
                  <ul>
                    {completedQuests.inactive.map((entry) => (
                      <QuestCard
                        key={entry.quest.title}
                        size="md"
                        quest={entry.quest}
                        current={entry.current}
                      />
                    ))}
                  </ul>
                ) : (
                  <p>{content.general.noResults}</p>
                )}
              </section>
            </>
          )}
        </>
      )}
    </ModalTemplate>
  );
}

ViewCompletedQuestsModal.restricted = "loggedOut";
