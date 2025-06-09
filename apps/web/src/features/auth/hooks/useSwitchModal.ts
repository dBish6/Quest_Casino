import type { ModalQueryKeyValues } from "@components/modals";

import { useSearchParams } from "react-router-dom";
import { ANIMATION_DURATION } from "@components/modals";
import { history } from "@utils/History";

export default function useSwitchModal(queryKey: ModalQueryKeyValues) {
  const [_, setSearchParams] = useSearchParams();

  const handleSwitch = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    e.preventDefault();

    setSearchParams((prev) => {
      prev.delete(queryKey);
      return prev;
    });
    setTimeout(() => {
      history.push((e.target as HTMLAnchorElement).getAttribute("href")!, {
        preserveLocale: false
      });
    }, ANIMATION_DURATION - 500);
  };

  return { handleSwitch };
}
