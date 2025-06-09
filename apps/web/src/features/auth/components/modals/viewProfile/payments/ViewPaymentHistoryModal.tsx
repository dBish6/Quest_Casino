import type { PaymentHistoryEntry } from "@qc/typescript/dtos/PaymentHistoryDto";
import type { LocaleContextValues } from "@components/LocaleProvider";

import { useSearchParams } from "react-router-dom";
import { useState } from "react";
import { Title } from "@radix-ui/react-dialog";

import useLocale from "@hooks/useLocale";
import useResourcesLoadedEffect from "@hooks/useResourcesLoadedEffect";
import { useLazyGetPaymentHistoryQuery } from "@gameFeat/services/gameApi";

import { ModalQueryKey, ModalTemplate } from "@components/modals";
import { Select } from "@components/common/controls";
import { Spinner } from "@components/loaders";

import s from "./viewPaymentHistoryModal.module.css";

interface PaymentCard {
  type: string;
  numberFormat: LocaleContextValues["numberFormat"];
  dateTimeFormat: LocaleContextValues["dateTimeFormat"];
  history: PaymentHistoryEntry;
}

export default function ViewPaymentHistoryModal() {
  const [searchParams] = useSearchParams(),
    modalParam = searchParams.get(ModalQueryKey.PROFILE_PAYMENT_HISTORY_MODAL);

  const { content, numberFormat, dateTimeFormat } = useLocale("ViewPaymentHistoryModal");

  const [getPaymentHistory, { data: historyData, isFetching: historyLoading }] = useLazyGetPaymentHistoryQuery(),
    [history, setHistory] = useState<PaymentHistoryEntry[]>([]);

  useResourcesLoadedEffect(() => {
    if (modalParam) {
      const query = getPaymentHistory();
      query.then((res) => {
        if (res.isSuccess && res.data?.user.payment_history) {
          setHistory(res.data?.user.payment_history);
        }
      });

      return () => query.abort();
    }
  }, [modalParam]);

  const handleSort = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (history) {
      const type = e.target.value,
        filterData = historyData!.user.payment_history;

      setHistory(type === "all" ? filterData : filterData.filter((entry) => entry.type === type));
    }
  };

  return (
    <ModalTemplate
      aria-description={content.aria.descrip.modal}
      queryKey="phist"
      width="455px"
      className={s.modal}
    >
      {() => (
        <>
          <Title asChild>
            <h2>{content.title}</h2>
          </Title>
          <p>{content.para}</p>

          <div>
            <Select
              aria-controls="payHistoryList"
              label={content.filterBy}
              intent="ghost"
              id="paymentTypeSelect"
              defaultValue="all"
              onInput={handleSort}
            >
              <option value="all">{content.all}</option>
              <option value="deposit">{content.deposit}</option>
              <option value="withdraw">{content.withdraw}</option>
            </Select>
            <small>{numberFormat().format(history.length)} {content.general.results}</small>
          </div>
          {historyLoading ? (
            <Spinner intent="primary" size="xl" />
          ) : history.length ? (
            <>
              <ul id="payHistoryList" aria-live="polite" className={s.list}>
                {history.map((history) => (
                  <PaymentCard
                    key={history.timestamp}
                    numberFormat={numberFormat}
                    dateTimeFormat={dateTimeFormat}
                    type={content[history.type]}
                    history={history}
                  />
                ))}
              </ul>
            </>
          ) : (
            <p>{content.general.noResults}</p>
          )}
        </>
      )}
    </ModalTemplate>
  );
}

function PaymentCard({ numberFormat, dateTimeFormat, type, history }: PaymentCard) {
  return (
    <li>
      <article data-type={history.type}>
        <div>
          <h4>{type}</h4>
          <time dateTime={history.timestamp}>
            {dateTimeFormat({
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false
            }).format(new Date(history.timestamp))}
          </time>
        </div>
        <p>{numberFormat({ currency: "show" }).format(history.amount)}</p>
      </article>
    </li>
  );
}

ViewPaymentHistoryModal.restricted = "loggedOut";
