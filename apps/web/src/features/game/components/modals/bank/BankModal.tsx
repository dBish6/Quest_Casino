import type { TransactionType } from "@qc/constants";

import { useState } from "react";
import { Title } from "@radix-ui/react-dialog";

import { TRANSACTION_TYPES } from "@qc/constants";

import injectElementInText from "@utils/injectElementInText";

import useLocale from "@hooks/useLocale";
import useForm from "@hooks/useForm";
import { useTransactionMutation } from "@gameFeat/services/gameApi";

import { ModalTemplate } from "@components/modals";
import { Form } from "@components/form";
import { Button, Input } from "@components/common/controls";
import { Icon, Link } from "@components/common";
import { Spinner } from "@components/loaders";

import s from "./bankModal.module.css";

const MAX_AMOUNT = 1000000;

function formatAmount(e: React.FormEvent<HTMLInputElement>) {
  e.currentTarget.value = e.currentTarget.value.replace(/\D/g, "");
}

export default function BankModal() {
  const [transactionType, setTransactionType] = useState<TransactionType>("deposit");

  const { content, numberFormat } = useLocale("BankModal");

  const { form, setLoading, setError, setErrors } = useForm<{ amount: string }>();

  const [
    postTransaction,
    {
      data: transactionData,
      error: transactionError,
      isSuccess: transactionSuccess,
      reset: transactionReset
    },
  ] = useTransactionMutation();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    transactionReset();

    const form = e.currentTarget as HTMLFormElement,
      fields = form.querySelectorAll<HTMLInputElement>("input");

    try {
      let reqBody: { amount: number } = {} as any;
      for (const field of fields) {
        if (field.type === "hidden") {
          if (field.value.length) (document.querySelector(".exitXl") as HTMLButtonElement).click();
          continue;
        }
        const key = field.name as keyof typeof reqBody,
          value = parseInt(field.value);

        if (value < 5) {
          setError("amount", "The minimum amount is $5.");
          return;
        }
        if (value > MAX_AMOUNT) {
          setError("amount", `The maximum amount is $${MAX_AMOUNT.toLocaleString("en-CA")}.`);
          return;
        }

        reqBody[key] = parseFloat(field.value);
      }

      if (reqBody.amount) {
        const res = await postTransaction({ type: transactionType, body: reqBody });
        if (res.data?.message?.startsWith("Successful")) form.reset();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalTemplate
      aria-description={content.aria.descrip.modal}
      queryKey="bank"
      width="368px"
      className={s.modal}
      onCloseAutoFocus={() => {
        setErrors({});
        transactionReset();
      }}
    >
      {() => (
        <>
          <div className={s.tabs}>
            {TRANSACTION_TYPES.map((type) => (
              <Button
                aria-pressed={transactionType === type}
                key={type}
                intent="secondary"
                size="lrg"
                disabled={form.processing}
                onClick={() => setTransactionType(type)}
              >
                {content[type]}
              </Button>
            ))}
          </div>

          <hgroup className="head">
            <Icon aria-hidden="true" id="hand-cash-48" />
            <Title asChild>
              <h2>{content.title[transactionType === "deposit" ? 0 : 1]}</h2>
            </Title>
          </hgroup>

          <Form
            onSubmit={handleSubmit}
            formLoading={form.processing}
            resSuccessMsg={transactionSuccess && transactionData.message}
            resError={transactionError}
            clearErrors={() => setErrors({})}
            noBots
          >
            <div className="inputs">
              <Input
                label={content.amount}
                intent="primary"
                size="lrg"
                id="amount"
                name="amount"
                defaultValue={0}
                className="formBtn"
                required
                error={form.error.amount}
                disabled={form.processing}
                onInput={(e) => {
                  formatAmount(e);
                  setError("amount", "");
                }}
              >
                <span aria-hidden="true" className={s.symbol}>
                  {numberFormat({ currency: "show" })
                    .formatToParts(1).find(part => part.type === "currency")!.value}
                </span>
              </Input>
            </div>

            <Button
              aria-live="polite"
              intent="primary"
              size="xl"
              type="submit"
              className="formBtn"
              disabled={form.processing}
            >
              {form.processing ? (
                <Spinner intent="primary" size="md" />
              ) : (
                content[transactionType]
              )}
            </Button>
          </Form>

          <div className={s.or}>
            <span />
            <p
              id="orUse"
              aria-label={content.aria.label.orUse}
            >
              {content.orUse}
            </p>
            <span aria-hidden="true" />
          </div>
          <Button
            aria-describedby="orUse"
            intent="secondary"
            size="xl"
            className={s.paypal}
            disabled={form.processing}
            onClick={() => alert(content.disclaimer)}
          >
            <img aria-hidden="true" src="/images/paypal.png" alt="PayPal Logo" loading="lazy" />
            PayPal
          </Button>
          <Button
            aria-label="Cash App"
            aria-describedby="orUse"
            intent="secondary"
            size="xl"
            className={s.paypal}
            disabled={form.processing}
            onClick={() => alert(content.disclaimer)}

          >
            <img
              aria-hidden="true"
              src="/images/cash-app.png"
              alt="Cash App Logo"
              loading="lazy"
            />
            Cash App
          </Button>

          <span className={s.support}>
            {injectElementInText(
              content.help,
              null,
              (text) => (
                <Link intent="primary" to="/support">
                  {text}
                </Link>
              ),
              { localeMarker: true }
            )}
          </span>
        </>
      )}
    </ModalTemplate>
  );
}

BankModal.restricted = "loggedOut";
