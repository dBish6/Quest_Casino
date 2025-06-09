import type { VariantProps } from "class-variance-authority";
import type { FriendCredentials } from "@qc/typescript/typings/UserCredentials";

import { forwardRef, Fragment } from "react";
import { cva } from "class-variance-authority";

import { ModalTrigger } from "@components/modals";
import { Image } from "@components/common";
import { HoverCard } from "@components/hoverCard";
import { ScrollArea } from "@components/scrollArea";

import s from "./avatar.module.css";

const avatar = cva(s.avatar, {
  variants: {
    intent: {
      primary: s.primary
    },
    size: {
      sm: s.sm,
      md: s.md,
      lrg: s.lrg,
      xl: s.xl,
      xxl: s.xxl,
      xxxl: s.xxxl
    }
  },
  defaultVariants: {
    intent: "primary",
    size: "sm"
  }
});

export interface AvatarProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof avatar> {
  user?: Partial<FriendCredentials>; // Not only friends would be passed.
  showShortView?: boolean;
  linkProfile?: boolean;
}

const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, intent = "primary", size = "sm", user, showShortView = true, linkProfile = true, ...props }, ref) => {
    const ProfileShortView = showShortView && user?.legal_name && user?.username && user?.country ? ProfileHoverCard : Fragment,
      ProfileLink = linkProfile && user?.username ? ModalTrigger : "a"; // it has to be an "a" to match the server.
    const userStatus = user?.activity?.status;

    return (
      // @ts-ignore
      <ProfileShortView
        {...(ProfileShortView !== Fragment && {
          intent: intent,
          size: size,
          user: user
        })}
      >
        {/* @ts-ignore */}
        <ProfileLink
          {...(ProfileLink !== "a" 
            ? { query: { param: "prof", value: encodeURIComponent(user!.username!) } }
            : {
                role: "presentation",
                tabIndex: -1,
                onClick: (e) => e.preventDefault(),
                style: { cursor: "default" }
              })}
        >
          <div
            ref={ref}
            className={avatar({ className, intent, size })}
            {...props}
          >
            <Image
              src={user?.avatar_url || "/images/default.svg"}
              alt="Profile Picture"
              fill
            />
            <span
              aria-label={userStatus}
              {...(!userStatus && {
                "aria-hidden": "true",
                style: { display: "none" }
              })}
              className={s.activityIndie}
              data-status={userStatus}
            />
          </div>
        </ProfileLink>
      </ProfileShortView>
    );
  }
);
export default Avatar;

function ProfileHoverCard(
  { children, intent, size, user }: { children: React.ReactElement; user: FriendCredentials } & VariantProps<typeof avatar>
) {
  return (
    <HoverCard
      className={`${s.profileCard} ${s[intent!]} ${s[size!]}`}
      Trigger={children}
      asChild
    >
      {({ Arrow }) => (
        <article>
          <Arrow />
          <ScrollArea orientation="vertical">
            <hgroup role="group" aria-roledescription="heading group">
              <h4 title={user.username}>{user.username}</h4>
              <div role="presentation">
                {user.legal_name && (
                  <p
                    title={`${user.legal_name.first} ${user.legal_name.last}`}
                    aria-roledescription="subtitle"
                  >
                    {user.legal_name.first} {user.legal_name.last}
                  </p>
                )}
                {user.country && (
                  <Image
                    src="https://flagcdn.com"
                    alt="Country Flag"
                    country={user.country}
                    className={s.flag}
                  />
                )}
              </div>
            </hgroup>

            {user.bio && <p className={s.bio}>{user.bio}</p>}
          </ScrollArea>
        </article>
      )}
    </HoverCard>
  );
}
