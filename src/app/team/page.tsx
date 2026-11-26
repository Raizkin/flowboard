"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Avatar, useWorkspace } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { currentUser, teamMembers } from "@/lib/seed-data";

export default function TeamPage() {
  const { workspace, profile } = useWorkspace();
  const [email, setEmail] = useState("");
  const [invited, setInvited] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const storageKey = `flowboard.invitations.v1:${profile.id}:${workspace.id}`;
  const members = useMemo(
    () =>
      workspace.kind === "Personal workspace"
        ? [profile]
        : teamMembers.map((member) =>
            member.id === currentUser.id ? profile : member,
          ),
    [profile, workspace.kind],
  );

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) {
      setInvited([]);
      return;
    }
    try {
      setInvited(JSON.parse(stored) as string[]);
    } catch {
      window.localStorage.removeItem(storageKey);
      setInvited([]);
    }
  }, [storageKey]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const address = email.trim().toLowerCase();
    if (!address.includes("@")) {
      setMessage("Enter a valid email address.");
      return;
    }
    if (invited.includes(address)) {
      setMessage("This person has already been invited.");
      return;
    }
    const next = [...invited, address];
    setInvited(next);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
    setEmail("");
    setMessage("Invitation saved as pending in this workspace.");
  }

  return (
    <section className="team-screen">
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {workspace.name.toUpperCase()} <span className="eyebrow-dot" />{" "}
            WORKSPACE
          </p>
          <h1>Team</h1>
          <p className="page-subtitle">
            Keep the people and ownership behind your work visible.
          </p>
        </div>
      </div>
      <div className="team-overview">
        <div className="panel team-count-panel">
          <span className="team-icon">
            <Icon name="team" size={19} />
          </span>
          <span>
            <strong>{members.length + invited.length}</strong>
            <small>Workspace members</small>
          </span>
          <div className="avatar-stack">
            {members.slice(0, 4).map((member) => (
              <Avatar
                key={member.id}
                initials={member.initials}
                color={member.color}
                size="sm"
              />
            ))}
          </div>
        </div>
        <div className="panel invite-panel">
          <div>
            <h2>Invite someone</h2>
            <p>Save a teammate invitation for this workspace.</p>
          </div>
          <form onSubmit={submit}>
            <label className="invite-input">
              <Icon name="team" size={15} />
              <input
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setMessage("");
                }}
                placeholder="name@company.com"
                aria-label="Email address"
                required
              />
            </label>
            <button className="button button-primary" type="submit">
              <Icon name="plus" size={14} /> Invite
            </button>
          </form>
          {message && (
            <span className="invite-message" role="status">
              {message}
            </span>
          )}
        </div>
      </div>
      <div className="panel team-table">
        <div className="team-table-heading">
          <strong>People</strong>
          <span>Role</span>
          <span>Tasks</span>
          <span>Status</span>
        </div>
        {members.map((member, index) => (
          <div className="team-row" key={member.id}>
            <div className="team-person">
              <Avatar initials={member.initials} color={member.color} />
              <span>
                <strong>{member.name}</strong>
                <small>
                  {member.id === profile.id ? "You · " : ""}
                  {member.name.toLowerCase().replaceAll(" ", ".")}
                  @flowboard.demo
                </small>
              </span>
            </div>
            <span
              className={`role-chip ${member.id === profile.id ? "owner" : ""}`}
            >
              {member.id === profile.id ? "Owner" : "Member"}
            </span>
            <span>
              {workspace.kind === "Personal workspace"
                ? "2"
                : [0, 2, 3, 1, 0][index % 5]}{" "}
              tasks
            </span>
            <span className="member-status">
              <i /> Active
            </span>
          </div>
        ))}
        {invited.map((address) => (
          <div className="team-row" key={address}>
            <div className="team-person">
              <Avatar
                initials={address.slice(0, 1).toUpperCase()}
                color="#8394a5"
              />
              <span>
                <strong>{address.split("@")[0]}</strong>
                <small>{address}</small>
              </span>
            </div>
            <span className="role-chip">Member</span>
            <span>0 tasks</span>
            <span className="member-status pending">
              <i /> Pending
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
