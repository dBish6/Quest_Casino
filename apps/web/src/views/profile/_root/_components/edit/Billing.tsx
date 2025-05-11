/**
 * Note: 
 * Quest Casino is just for fun and doesn't gamble real money, so this section just has
 * non-functioning payment methods. But in the future I will add a way to donate here somehow
 * for some indiction that people would actually like to see this become a real online gambling
 * site. Although, I would need a lot of money for it and would be impossible to do it myself.
 */

import type { UserProfileCredentials } from "@qc/typescript/typings/UserCredentials";
import type { LocaleEntry } from "@typings/Locale";
import type { LocaleContextValues } from "@components/LocaleProvider";

import { useState } from "react";

import getStorageKey from "@utils/getStorageKey";

import useForm from "@hooks/useForm";

import { Icon, Link, Image } from "@components/common";
import { Button, Input, Select } from "@components/common/controls";
import { Form } from "@components/form";
import { ModalTrigger } from "@components/modals";
import { ScrollArea } from "@components/scrollArea";
import { Spinner } from "@components/loaders";

import s from "../../profile.module.css";

interface PaymentCard {
  title: string;
  type: string;
  branch: "mastercard" | "visa";
  name: string;
  number: string;
  expiry: string;
  CVV: string;
  def: boolean;
}

interface PaymentState {
  cards: { [title: string]: PaymentCard; };
  thirdParty: { paypal: boolean; cashApp: boolean }
}

interface SelectedState {
  edit: { [title: string]: boolean; };
}

interface PaymentCardProps {
  localeEntry: LocaleEntry;
  user: UserProfileCredentials;
  card: Partial<PaymentCard>;
  setPayments: React.Dispatch<React.SetStateAction<PaymentState>>;
  selected: SelectedState;
  setSelected: React.Dispatch<React.SetStateAction<SelectedState>>
}

interface PaymentThirdPartyConnectProps {
  localeEntry: LocaleEntry;
  user: UserProfileCredentials;
  party: typeof THIRD_PARTIES[number];
  connected: boolean;
  setPayments: React.Dispatch<React.SetStateAction<PaymentState>>;
}

interface ProfileBillingProps {
  localeEntry: LocaleEntry;
  numberFormat: LocaleContextValues["numberFormat"];
  user: UserProfileCredentials;
}

const THIRD_PARTIES = ["PayPal", "Cash App"] as const;

const formatCard = {
  number: (num: string) => {
    const parts = num.split(" ");
    for (let i = 0; i < parts.length - 1; i++) {
      parts[i] = "xxxx";
    }
    return parts.join(" ");
  },
  form: {
    number: (e: React.FormEvent<HTMLInputElement>) => {
      const input = e.currentTarget.value.replace(/\D/g, "").slice(0, 16);
      e.currentTarget.value = input.replace(/(.{4})/g, "$1 ").trim();
    },
    expiry: (e: React.FormEvent<HTMLInputElement>) => {
      let input = e.currentTarget.value.replace(/\D/g, "");
      if (input.length >= 3) input = `${input.slice(0, 2)}/${input.slice(2, 6)}`;
      e.currentTarget.value = input.slice(0, 7);
    },
    CVV: (e: React.FormEvent<HTMLInputElement>) => {
      e.currentTarget.value = e.currentTarget.value.replace(/\D/g, "").slice(0, 3);
    },
    branch: (num: string) => {
      // Visa (starts with 4).
      if (num[0] === "4") {
        return "visa";
      }
      const firstTwoDigits = parseInt(num.slice(0, 2));
      // Mastercard (starts with 51-55 or 22-27).
      if ((firstTwoDigits >= 51 && firstTwoDigits <= 55) || (firstTwoDigits >= 22 && firstTwoDigits <= 27)) {
        return "mastercard";
      }
  
      return null;
    },
  }
};

function toCamelCase(txt: string) {
  return txt.split(" ").map((parts, i) => (i === 0 ? parts.toLowerCase() : parts)).join("");
}

export default function Billing({ localeEntry, numberFormat, user }: ProfileBillingProps) {
  const [payments, setPayments] = useState<PaymentState>(() => {
      const init = JSON.parse(localStorage.getItem(getStorageKey(user.member_id, "pay-cards")) || "{}");

      const defaultTitle = `${localeEntry.card} ${numberFormat().format(1)}`,
        defaultState = {
          cards: {
            [defaultTitle]: {
              title: defaultTitle,
              type: "Debit",
              branch: "mastercard",
              name: `${user.legal_name?.first} ${user.legal_name?.last}`,
              number: "0784 0784 0784 0784",
              expiry: `04/${new Date().getFullYear() + 1}`,
              CVV: "784",
              def: false
            }
          },
          thirdParty: { paypal: false, cashApp: false }
        };

      return {
        cards: {
          ...(!Object.values(init.cards || {}).length && defaultState.cards)
        },
        thirdParty: {
          ...(!Object.values(init.thirdParty || {}).length && defaultState.thirdParty)
        },
        ...init
      };
    }),
    [selected, setSelected] = useState<SelectedState>({ edit: {} });

  return (
    <section className={s.billing}>
      <header>
        <hgroup className={s.title}>
          <Icon aria-hidden="true" id="debit-card-38" scaleWithText />
          <h2 id="hPersonal">{localeEntry.title}</h2>
        </hgroup>
        <ModalTrigger 
          query={{ param: "phist" }}
          intent="primary"
        >
          {localeEntry.view}
        </ModalTrigger>
      </header>

      <ul className={s.cards}>
        {[
          ...Object.values(payments.cards),
          {
            title: `${localeEntry.card} ${numberFormat().format(
              Object.values(payments.cards).length + 1
            )}`
          }
        ].map((card: any, i) => (
          <PaymentCard
            key={card?.title || i}
            localeEntry={localeEntry}
            user={user}
            card={card}
            setPayments={setPayments}
            selected={selected}
            setSelected={setSelected}
          />
        ))}
      </ul>

      <div className={s.thirdParties}>
        {THIRD_PARTIES.map((party, i) => (
          <PaymentThirdPartyConnect
            key={i}
            localeEntry={localeEntry}
            user={user}
            party={party}
            connected={payments.thirdParty[toCamelCase(party) as keyof typeof payments.thirdParty]}
            setPayments={setPayments}
          />
        ))}
      </div>
    </section>
  );
}

function PaymentCard({ localeEntry, card, ...props }: PaymentCardProps) {
  return (
    <li className={s.paymentCard}>
      {!card.name ? (
        !props.selected.edit[card.title!] ? (
          <Button
            aria-labelledby="cAddTxt"
            aria-description={localeEntry.aria.descrip.addBtn}
            onClick={() =>
              props.setSelected((prev) => ({
                ...prev,
                edit: { [card.title!]: true }
              }))
            }
          >
            <div>
              <div role="presentation">
                <Icon id="add-15" />
              </div>
              <p id="cAddTxt">{localeEntry.addBtn}</p>
            </div>
          </Button>
        ) : (
          <PaymentCardFull localeEntry={localeEntry} card={card} {...props} />
        )
      ) : (
        <PaymentCardFull localeEntry={localeEntry} card={card} {...props} />
      )}
    </li>
  );
}

function PaymentCardFull({
  localeEntry,
  user,
  card,
  setPayments,
  selected,
  setSelected
}: PaymentCardProps) {
  const isEditing = selected?.edit[card.title!];

  const { form, setLoading, setError } = useForm<Record<string, string>>(),
    [success, setSuccess] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("global", "");
    setSuccess("");

    const billForm = e.currentTarget as HTMLFormElement,
      fields = billForm.querySelectorAll<HTMLInputElement>("input, select");

    try {
      let newCard: Record<string, any> = {};
      for (const field of fields) {
        const key = field.name;
        let value = field.value;

        if (!field.value.length) {
          setError(
            key,
            `${field.previousSibling!.textContent} ${localeEntry.general.form.user.error.required}`
          );
          continue;
        }

        if (key === "number" && value.length !== 19) {
          setError("number", localeEntry.form.error.number);
          continue;
        }
        if (key === "expiry") {
          const [month, year] = value.split("/").map((val) => parseInt(val)),
            currentDate = new Date(),
            currentMonth = currentDate.getMonth() + 1,
            currentYear = currentDate.getFullYear();

          if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
            setError("expiry", localeEntry.form.error.expiry[0]);
            continue;
          }

          if (year < currentYear || (year === currentYear && month < currentMonth)) {
            setError("expiry", localeEntry.form.error.expiry[1]);
            continue;
          }
        }
        if (key === "cvv") {
          if (value.length !== 3) setError("cvv", localeEntry.form.error.ccv);
          else newCard.CVV = value;
          continue;
        }

        newCard[key] = value;
      }
      const branch = formatCard.form.branch(newCard.number);
      if (branch === null)
        return setError(
          "global",
          localeEntry.form.error.global[0]
        );
      
      newCard.branch = branch;

      (newCard as any).name = `${newCard.first_name} ${newCard.last_name}`;
      ["first_name", "last_name"].forEach((key) => {
        delete newCard[key];
      });

      newCard.def = card.def!;

      if (Object.keys(newCard).length === 8) {
        setPayments((prev) => {
          const newState = {
            ...prev,
            cards: { ...prev.cards, [card.title!]: { ...prev.cards[card.title!], ...newCard } }
          };

          if (Object.values(newState.cards).length >= 4) {
            setError(
              "global",
              localeEntry.form.error.global[1]
            );
            return prev;
          }

          localStorage.setItem(getStorageKey(user!.member_id, "pay-cards"), JSON.stringify(newState));
          setSuccess(localeEntry.form.success);

          return newState;
        });
      } 
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <article data-editing={!!isEditing}>
        {!isEditing ? (
          <>
            <header>
              <hgroup
                {...(!isEditing && {
                  role: "group",
                  "aria-roledescription": "heading group"
                })}
              >
                <h3>{card.title}</h3>
                <p aria-roledescription="subtitle">{card.type} {localeEntry.card}</p>
              </hgroup>
              <Button
                aria-label={`${localeEntry.edit} ${card.title}`}
                intent="primary"
                size="md"
                onClick={() =>
                  setSelected((prev) => ({
                    ...prev,
                    edit: { [card.title!]: true }
                  }))
                }
              >
                <Icon aria-hidden="true" id="edit-14" /> {localeEntry.edit}
              </Button>
            </header>

            <div className={s.content}>
              <div className={s.imgContainer}>
                <Image
                  src={`/images/${card.branch}.webp`}
                  alt={`${card.branch} ${localeEntry.logo}`}
                />
              </div>
              <div className={s.info}>
                <div>
                  <p>{card.name}</p>
                  <span aria-label={localeEntry.aria.label.cardNumber}>
                    {formatCard.number(card.number!)}
                  </span>
                  <time aria-label={localeEntry.aria.label.cardExp} dateTime={card.expiry}>
                    {card.expiry}
                  </time>
                </div>

                <Link asChild intent="primary" to="">
                  <Button
                    onClick={() =>
                      setPayments((prev) => {
                        const newState = {
                          ...prev,
                          cards: { ...prev.cards, [card.title!]: { ...prev.cards[card.title!], def: true } }
                        };
                        localStorage.setItem(getStorageKey(user!.member_id, "pay-cards"), JSON.stringify(newState));
                        return newState;
                      })
                    }
                  >
                    {card.def ? localeEntry.defaultBtn[1] : localeEntry.defaultBtn[0]}
                  </Button>
                </Link>
              </div>
            </div>
          </>
        ) : (
          <ScrollArea orientation="vertical">
            <div>
              <Button
                aria-label={localeEntry.aria.label.exitBtn}
                intent="exit ghost"
                size="md"
                onClick={() => 
                  setSelected((prev) => ({
                    ...prev,
                    edit: { [card.title!]: false }
                  }))
                }
              />
              <Button
                aria-label={localeEntry.aria.label.deleteBtn}
                intent="ghost"
                size="md"
                iconBtn
                onClick={() => {
                  setPayments((prev) => {
                    const newState = { ...prev };
                    delete newState.cards[card.title!];
                    localStorage.setItem(getStorageKey(user!.member_id, "pay-cards"), JSON.stringify(prev));
                    return prev;
                  });
                  setSelected((prev) => ({
                    ...prev,
                    edit: { [card.title!]: false }
                  }));
                }}
              >
                <Icon id="delete-15" />
              </Button>
            </div>
            <Form
              onSubmit={handleSubmit}
              formLoading={form.processing}
              resSuccessMsg={success}
              resError={form.error.global}
            >
              <div role="presentation" className={s.inline}>
                <Input
                  label={localeEntry.form.title}
                  intent="primary"
                  size="md"
                  id="title"
                  name="title"
                  defaultValue={card.title}
                  error={form.error.title}
                  disabled={form.processing}
                  onInput={() => setError("title", "")}
                />
                <Select
                  label={localeEntry.form.type}
                  intent="primary"
                  size="md"
                  id="type"
                  name="type"
                  defaultValue={card.type}
                  error={form.error.type}
                  disabled={form.processing}
                  onInput={() => setError("type", "")}
                >
                  <option value={localeEntry.debit}>
                    {localeEntry.debit}
                  </option>
                  <option value={localeEntry.credit}>
                    {localeEntry.credit}
                  </option>
                </Select>
              </div>
              <div role="group" className={s.inline}>
                <Input
                  label={localeEntry.general.form.user.first_name}
                  intent="primary"
                  size="md"
                  id="first_name"
                  name="first_name"
                  defaultValue={card.name?.split(" ")[0]}
                  error={form.error.first_name}
                  disabled={form.processing}
                  onInput={() => setError("first_name", "")}
                />
                <Input
                  label={localeEntry.general.form.user.last_name}
                  intent="primary"
                  size="md"
                  id="last_name"
                  name="last_name"
                  defaultValue={card.name?.split(" ")[1]}
                  error={form.error.last_name}
                  disabled={form.processing}
                  onInput={() => setError("last_name", "")}
                />
              </div>
              <Input
                label={localeEntry.form.cardNumber}
                intent="primary"
                size="md"
                id="number"
                name="number"
                defaultValue={card.number}
                error={form.error.number}
                disabled={form.processing}
                onInput={(e) => {
                  setError("number", "");
                  formatCard.form.number(e);
                }}
              />
              <div role="presentation" className={s.inline}>
                <Input
                  label={localeEntry.form.cardExp}
                  intent="primary"
                  size="md"
                  id="expiry"
                  name="expiry"
                  defaultValue={card.expiry}
                  error={form.error.expiry}
                  disabled={form.processing}
                  onInput={(e) => {
                    setError("expiry", "");
                    formatCard.form.expiry(e);
                  }}
                />
                <Input
                  label={localeEntry.form.ccv}
                  intent="primary"
                  size="md"
                  id="cvv"
                  name="cvv"
                  type="password"
                  defaultValue={card.CVV}
                  Button="password"
                  error={form.error.cvv}
                  disabled={form.processing}
                  onInput={(e) => {
                    setError("cvv", "");
                    formatCard.form.CVV(e);
                  }}
                />
              </div>
              <Button
                aria-label={localeEntry.general.update}
                aria-live="polite"
                intent="primary"
                size="md"
                type="submit"
                disabled={form.processing}
              >
                {form.processing ? (
                  <Spinner intent="primary" size="sm" />
                ) : (
                  localeEntry.general.update
                )}
              </Button>
            </Form>
            <p className={s.disc}>{localeEntry.disclaimer}</p>
          </ScrollArea>
        )}
      </article>
    </>
  );
}

function PaymentThirdPartyConnect({
  localeEntry,
  user,
  party,
  connected,
  setPayments
}: PaymentThirdPartyConnectProps) {
  return (
    <Button 
      intent="secondary" 
      size="xl"
      onClick={() =>
        setPayments((prev) => {
          const newState = {
            ...prev,
            thirdParty: { ...prev.thirdParty, [toCamelCase(party)]: !connected }
          };
          localStorage.setItem(getStorageKey(user!.member_id, "pay-cards"), JSON.stringify(newState));
          return newState;
        })
      }
    >
      <Image
        aria-hidden="true"
        src={`/images/${party.replace(" ", "-").toLowerCase()}.png`}
        alt={`${party} ${localeEntry.logo}`}
        load={false}
      />
      {connected ? (
        <>
          {party} {localeEntry.connectBtn[1]}
          <Icon id="check-mark-18" fill="var(--c-status-green)" />
        </>
      ) : (
        <>{localeEntry.connectBtn[0]} {party}</>
      )}
    </Button>
  );
}
