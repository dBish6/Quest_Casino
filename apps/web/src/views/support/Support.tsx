import { Main } from "@components/dashboard";
import { Link } from "@components/common";

import useLocale from "@hooks/useLocale";

import s from "./support.module.css";

export default function Support() {
  const { content } = useLocale();

  return (
    <Main className={s.support}>
      <p>{content.para}</p>
      <ul>
        {content.list.map((item: string, i: number) => (
          <li>
            {i === 0 ? (
              <>
                {item}{" "}
                <Link
                  intent="primary"
                  to="mailto:davidbish2002@hotmail.com"
                  external
                >
                  davidbish2002@hotmail.com
                </Link>
              </>
            ) : (
              item
            )}
          </li>
        ))}
      </ul>
    </Main>
  );
}
