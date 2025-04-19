import type { UserProfileCredentials } from "@qc/typescript/typings/UserCredentials";

import { UserStatistics } from "@authFeat/components/userStatistics";

import s from "../../profile.module.css";

interface ProfileActivityProps {
  user: UserProfileCredentials;
}

export default function Statistics({ user }: ProfileActivityProps) {
  return (
    <section aria-labelledby="hStatistics" className={s.statistics}>
      <UserStatistics
        intent="table"
        stats={user.statistics}
        username={user.username}
        scaleText
      />
    </section>
  );
}
