import Link from "next/link";
import { Icon } from "@/components/icons";

const links = [
  ["/projects", "Projects", "projects"],
  ["/calendar", "Calendar", "calendar"],
  ["/team", "Team", "team"],
  ["/notifications", "Notifications", "bell"],
  ["/settings", "Settings", "settings"],
] as const;

export default function MorePage() {
  return (
    <section className="more-screen">
      <div className="page-heading">
        <div>
          <p className="eyebrow">FLOWBOARD</p>
          <h1>More</h1>
          <p className="page-subtitle">Workspace tools and settings.</p>
        </div>
      </div>
      <div className="more-links">
        {links.map(([href, label, icon]) => (
          <Link href={href} key={href}>
            <Icon name={icon} size={18} />
            {label}
            <Icon className="more-link-arrow" name="arrow" size={15} />
          </Link>
        ))}
      </div>
    </section>
  );
}
