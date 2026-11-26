"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Avatar, useWorkspace } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { useBoard } from "@/lib/board-store";
import { useLanguage } from "@/lib/language";
import { createClient } from "@/lib/supabase/client";

export default function TeamPage() {
  const { workspace, profile } = useWorkspace();
  const { tasks } = useBoard();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [invited, setInvited] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const storageKey = `flowboard.invitations.v1:${profile.id}:${workspace.id}`;

  useEffect(() => {
    void (async () => {
      const supabase = createClient();
      if (!supabase) return;
      const { data } = await supabase.auth.getUser();
      setUserEmail(data.user?.email ?? "");
    })();
  }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      setInvited(stored ? (JSON.parse(stored) as string[]) : []);
    } catch {
      window.localStorage.removeItem(storageKey);
      setInvited([]);
    }
  }, [storageKey]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const address = email.trim().toLowerCase();
    if (!address.includes("@") || !address.includes(".")) {
      setMessage(t("Enter a valid email address."));
      return;
    }
    if (invited.includes(address)) {
      setMessage(t("This person has already been added."));
      return;
    }
    const next = [...invited, address];
    setInvited(next);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
    setEmail("");
    setMessage(t("Email added to the local invite list. Email delivery is not connected yet."));
  }

  const memberTasks = tasks.filter(
    (task) =>
      task.workspaceId === workspace.id && task.assignee?.id === profile.id,
  ).length;

  return (
    <section className="team-screen">
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {t(workspace.name).toUpperCase()} <span className="eyebrow-dot" /> {t("WORKSPACE")}
          </p>
          <h1>{t("Team")}</h1>
          <p className="page-subtitle">{t("Keep the people and ownership behind your work visible.")}</p>
        </div>
      </div>
      <div className="team-overview">
        <div className="panel team-count-panel">
          <span className="team-icon"><Icon name="team" size={19} /></span>
          <span><strong>{1 + invited.length}</strong><small>{t("Workspace members")}</small></span>
          <div className="avatar-stack">
            <Avatar initials={profile.initials} color={profile.color} size="sm" />
          </div>
        </div>
        <div className="panel invite-panel">
          <div>
            <h2>{t("Invite someone")}</h2>
            <p>{t("Add an email to the invite list for this workspace.")}</p>
          </div>
          <form onSubmit={submit}>
            <label className="invite-input">
              <Icon name="team" size={15} />
              <input
                type="email"
                value={email}
                onChange={(event) => { setEmail(event.target.value); setMessage(""); }}
                placeholder="name@example.com"
                aria-label={t("Email address")}
                required
              />
            </label>
            <button className="button button-primary" type="submit">
              <Icon name="plus" size={14} /> {t("Add email")}
            </button>
          </form>
          <span className="invite-message" role="status">
            {message || t("Invite emails are not sent yet. This list is saved on this device.")}
          </span>
        </div>
      </div>
      <div className="panel team-table">
        <div className="team-table-heading">
          <strong>{t("People")}</strong><span>{t("Role")}</span><span>{t("Tasks")}</span><span>{t("Status")}</span>
        </div>
        <div className="team-row">
          <div className="team-person">
            <Avatar initials={profile.initials} color={profile.color} />
            <span><strong>{profile.name}</strong><small>{t("You")} · {userEmail}</small></span>
          </div>
          <span className="role-chip owner">{t("Owner")}</span>
          <span>{memberTasks} {t("tasks")}</span>
          <span className="member-status"><i /> {t("Active")}</span>
        </div>
        {invited.map((address) => (
          <div className="team-row" key={address}>
            <div className="team-person">
              <Avatar initials={address.slice(0, 1).toUpperCase()} color="#8394a5" />
              <span><strong>{address.split("@")[0]}</strong><small>{address}</small></span>
            </div>
            <span className="role-chip">{t("Member")}</span>
            <span>0 {t("tasks")}</span>
            <span className="member-status pending"><i /> {t("Pending")}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
