"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Avatar, useWorkspace } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { currentUser } from "@/lib/seed-data";
import { createClient } from "@/lib/supabase/client";

type Preferences = { email: boolean; mentions: boolean; dueDates: boolean };
const defaultPreferences: Preferences = {
  email: true,
  mentions: true,
  dueDates: false,
};

export default function SettingsPage() {
  const { workspace } = useWorkspace();
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState("jordan@northstar.studio");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [preferences, setPreferences] = useState(defaultPreferences);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      const profile = window.localStorage.getItem("flowboard.demo.profile.v1");
      const storedPrefs = window.localStorage.getItem(
        "flowboard.demo.preferences.v1",
      );
      if (profile) {
        try {
          const parsed = JSON.parse(profile);
          setName(parsed.name);
          setEmail(parsed.email);
        } catch {
          window.localStorage.removeItem("flowboard.demo.profile.v1");
        }
      }
      if (storedPrefs) {
        try {
          setPreferences({ ...defaultPreferences, ...JSON.parse(storedPrefs) });
        } catch {
          window.localStorage.removeItem("flowboard.demo.preferences.v1");
        }
      }
      return;
    }
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
    if (supabase) {
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
    } else {
      window.localStorage.setItem(
        "flowboard.demo.profile.v1",
        JSON.stringify({ name: name.trim(), email }),
      );
      window.localStorage.setItem(
        "flowboard.demo.preferences.v1",
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
    if (!supabase) {
      window.localStorage.setItem(
        "flowboard.demo.preferences.v1",
        JSON.stringify(next),
      );
      return;
    }
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
            PREFERENCES <span className="eyebrow-dot" />{" "}
            {workspace.name.toUpperCase()}
          </p>
          <h1>Settings</h1>
          <p className="page-subtitle">
            Make Flowboard feel like your workspace.
          </p>
        </div>
      </div>
      <div className="settings-layout">
        <nav className="panel settings-nav">
          <a className="selected" href="#profile">
            <Icon name="team" size={16} /> Profile
          </a>
          <a href="#workspace">
            <Icon name="projects" size={16} /> Workspace
          </a>
          <a href="#notifications">
            <Icon name="bell" size={16} /> Notifications
          </a>
        </nav>
        <div className="settings-content">
          <form className="panel settings-panel" id="profile" onSubmit={save}>
            <div className="settings-title">
              <div>
                <h2>Profile</h2>
                <p>Update the information your teammates see.</p>
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
              <span>Full name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={100}
                required
              />
            </label>
            <label className="form-field">
              <span>Email address</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <div className="settings-save">
              <span>{saved ? "Changes saved" : "Profile preferences"}</span>
              <button className="button button-primary" type="submit">
                Save changes
              </button>
            </div>
          </form>
          <section className="panel settings-panel" id="workspace">
            <div className="settings-title">
              <div>
                <h2>Workspace</h2>
                <p>Basic information about the selected workspace.</p>
              </div>
            </div>
            <div className="workspace-setting">
              <span className={`workspace-mark workspace-mark-${workspace.id}`}>
                {workspace.initials.slice(0, 1)}
              </span>
              <span>
                <strong>{workspace.name}</strong>
                <small>{workspace.kind}</small>
              </span>
              <span className="role-chip owner">Owner</span>
            </div>
          </section>
          <section className="panel settings-panel" id="notifications">
            <div className="settings-title">
              <div>
                <h2>Notifications</h2>
                <p>Choose the updates you want to receive.</p>
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
                  <strong>{label}</strong>
                  <small>{description}</small>
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
