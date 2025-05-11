import type { LocaleEntry } from "@typings/Locale";
import type { GetQuestsResponseDto } from "@qc/typescript/dtos/GetQuestsDto";

import { useSearchParams } from "react-router-dom";

import useResourcesLoadedEffect from "@hooks/useResourcesLoadedEffect";

import { useAppSelector } from "@redux/hooks";
import { selectUserCredentials } from "@authFeat/redux/authSelectors";

import { useLazyGetQuestsQuery } from "@gameFeat/services/gameApi";

import { ModalQueryKey } from "@components/modals";
import { Spinner } from "@components/loaders";
import { QuestCard } from "@gameFeat/components/questCard";

import s from "./quests.module.css";

interface QuestsProps {
  localeEntry: LocaleEntry;
  setRenewsIn: React.Dispatch<React.SetStateAction<string>>
}

export default function Quests({ localeEntry, setRenewsIn }: QuestsProps) {
  const [searchParams] = useSearchParams(),
    slide = searchParams.get(ModalQueryKey.MENU_MODAL) === "Quests";

  const user = useAppSelector(selectUserCredentials);

  const [getQuests, { data, isFetching: questsLoading }] = useLazyGetQuestsQuery(),
    activeQuests = (data as GetQuestsResponseDto)?.quests;

  useResourcesLoadedEffect(() => {
    if (slide) {
      const query = getQuests(undefined, true);
      query.then((res) => {
        const renew = (res.data as GetQuestsResponseDto)?.renew;
        if (res.isSuccess && renew) setRenewsIn(renew);
      });

      return () => query.abort();
    }
  }, [slide]);

  return (
    <div
      role="group"
      aria-label={localeEntry.title}
      aria-roledescription="slide"
      id="lSlide"
      className={s.quests}
    >
      {questsLoading ? (
        <Spinner intent="primary" size="xxl" />
      ) : activeQuests?.length ? (
        <ul aria-describedby="stepsList" className="slideContent">
          {activeQuests.map((quest) => (
            <QuestCard
              key={quest.title}
              size="lrg"
              quest={quest}
              current={user!.statistics.progress.quest[quest.title]?.current}
            />
          ))}
        </ul>
      ) : (
        <p>{localeEntry.noResults}</p>
      )}
    </div>
  );
}
