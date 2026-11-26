"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Avatar, useWorkspace } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { currentUser } from "@/lib/seed-data";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/language";

type Preferences = { email: boolean; mentions: boolean; dueDates: boolean };
const defaultPreferences: Preferences = {
  email: true,
  mentions: true,
  dueDates: false,
};

export default function SettingsPage() {
  const { workspace } = useWorkspace();
  const { t, language, setLanguage } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [preferences, setPreferences] = useState(defaultPreferences);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    void (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return;
      setName(
        typeof user.user_metadata.full_name === "string"
          ? user.user_metadata.full_name
          : (user.email?.split("@")[0] ?? ""),
      );
      setEmail(user.email ?? "");
      const storedPrefs = window.localStorage.getItem(
        `flowboard.preferences.v1:${user.id}`,
      );
      if (storedPrefs) {
        try {
          setPreferences({ ...defaultPreferences, ...JSON.parse(storedPrefs) });
        } catch {
          window.localStorage.removeItem(`flowboard.preferences.v1:${user.id}`);
        }
      }
    })();
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const supabase = createClient();
    if (!supabase) return;
    if (!name.trim()) {
      setError(t("Enter your name."));
      return;
    }
    {
      const { error: updateError } = await supabase.auth.updateUser({
        email,
        data: { full_name: name.trim() },
      });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      const { data } = await supabase.auth.getUser();
      if (data.user)
        window.localStorage.setItem(
          `flowboard.preferences.v1:${data.user.id}`,
          JSON.stringify(preferences),
        );
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  }

  function updatePreference(key: keyof Preferences, checked: boolean) {
    const next = { ...preferences, [key]: checked };
    setPreferences(next);
    const supabase = createClient();
    if (!supabase) return;
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        window.localStorage.setItem(
          `flowboard.preferences.v1:${data.user.id}`,
          JSON.stringify(next),
        );
      }
    })();
  }

  return (
    <section className="settings-screen">
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {t("PREFERENCES")} <span className="eyebrow-dot" /> {t(workspace.name).toUpperCase()}
          </p>
          <h1>{t("Settings")}</h1>
          <p className="page-subtitle">
            {t("Make Flowboard feel like your workspace.")}
          </p>
        </div>
      </div>
      <div className="settings-layout">
        <nav className="panel settings-nav">
          <a className="selected" href="#profile">
            <Icon name="team" size={16} /> {t("Profile")}
          </a>
          <a href="#workspace">
            <Icon name="projects" size={16} /> {t("Workspace")}
          </a>
          <a href="#notifications">
            <Icon name="bell" size={16} /> {t("Notifications")}
          </a>
        </nav>
        <div className="settings-content">
          <form className="panel settings-panel" id="profile" onSubmit={save}>
            <div className="settings-title">
              <div>
                <h2>{t("Profile")}</h2>
                <p>{t("Update the information your teammates see.")}</p>
              </div>
              <Avatar
                initials={name
                  .split(/\s+/)
                  .map((part) => part[0] ?? "")
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
                color={currentUser.color}
                size="lg"
              />
            </div>
            <label className="form-field">
              <span>{t("Full name")}</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={100}
                required
              />
            </label>
            <label className="form-field">
              <span>{t("Email address")}</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <div className="settings-save">
              <span>{saved ? t("Changes saved") : t("Profile preferences")}</span>
              <button className="button button-primary" type="submit">
                {t("Save changes")}
              </button>
            </div>
          </form>
          <section className="panel settings-panel" id="workspace">
            <div className="settings-title">
              <div>
                <h2>{t("Workspace")}</h2>
                <p>{t("Basic information about the selected workspace.")}</p>
              </div>
            </div>
            <div className="workspace-setting">
              <span className={`workspace-mark workspace-mark-${workspace.id}`}>
                {workspace.initials.slice(0, 1)}
              </span>
              <span>
                <strong>{t(workspace.name)}</strong>
                <small>{t(workspace.kind)}</small>
              </span>
              <span className="role-chip owner">{t("Owner")}</span>
            </div>
          </section>
          <section className="panel settings-panel" id="language">
            <div className="settings-title"><div><h2>{t("Language")}</h2><p>{t("Choose the language for Flowboard.")}</p></div></div>
            <label className="form-field"><span>{t("Language")}</span><select value={language} onChange={(event) => setLanguage(event.target.value as "en" | "uk")}><option value="en">English</option><option value="uk">Українська</option></select></label>
          </section>
          <section className="panel settings-panel" id="notifications">
            <div className="settings-title">
              <div>
                <h2>{t("Notifications")}</h2>
                <p>{t("Choose the updates you want to receive.")}</p>
              </div>
            </div>
            {(
              [
                [
                  "email",
                  "Email notifications",
                  "A short digest when there’s something to catch up on.",
                ],
                [
                  "mentions",
                  "Mentions and comments",
                  "When teammates discuss a task you own.",
                ],
                [
                  "dueDates",
                  "Deadline reminders",
                  "A reminder before your assigned tasks are due.",
                ],
              ] as const
            ).map(([key, label, description]) => (
              <label className="preference-row" key={key}>
                <span>
                <strong>{t(label)}</strong>
                  <small>{t(description)}</small>
                </span>
                <input
                  type="checkbox"
                  checked={preferences[key]}
                  onChange={(event) =>
                    updatePreference(key, event.target.checked)
                  }
                />
              </label>
            ))}
          </section>
        </div>
      </div>
    </section>
  );
}
