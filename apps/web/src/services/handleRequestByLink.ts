import { logger } from "@qc/utils";

/**
 * By link meaning link button.
 */
export default async function handleRequestByLink(
  triggerId: string,
  callback: () => Promise<void>
) {
  const buttons = document.querySelectorAll<HTMLButtonElement>(`#${triggerId}`);
  if (!buttons.length) return logger.error(`Button with ID '${triggerId}' was not found.`);

  const initialText: string[] = [];
  for (let i = 0; i < buttons.length; i++) {
    const elem = buttons[i];
    initialText.push(elem.innerText);

    elem.setAttribute("aria-live", "polite");
    elem.setAttribute("disabled", "");
    elem.innerText = "Loading...";
    elem.style.cursor = "not-allowed";
  }

  await callback().finally(() => {
    for (let i = 0; i < buttons.length; i++) {
      buttons[i].removeAttribute("disabled");
      buttons[i].innerText = initialText[i];
      buttons[i].style.removeProperty("cursor");
    }
  });
}
