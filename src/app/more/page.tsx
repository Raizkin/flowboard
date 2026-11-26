"use client";

import Link from "next/link";
import { Icon } from "@/components/icons";
import { useLanguage } from "@/lib/language";

const links = [
  ["/projects", "Projects", "projects"],
  ["/calendar", "Calendar", "calendar"],
  ["/team", "Team", "team"],
  ["/notifications", "Notifications", "bell"],
  ["/settings", "Settings", "settings"],
] as const;

export default function MorePage() {
  const { t } = useLanguage();
  return (
    <section className="more-screen">
      <div className="page-heading">
        <div>
          <p className="eyebrow">FLOWBOARD</p>
          <h1>{t("More")}</h1>
          <p className="page-subtitle">{t("Workspace tools and settings.")}</p>
        </div>
      </div>
      <div className="more-links">
        {links.map(([href, label, icon]) => (
          <Link href={href} key={href}>
            <Icon name={icon} size={18} />
            {t(label)}
            <Icon className="more-link-arrow" name="arrow" size={15} />
          </Link>
        ))}
      </div>
    </section>
  );
}
