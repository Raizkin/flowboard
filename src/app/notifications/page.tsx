"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, useWorkspace } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { useBoard } from "@/lib/board-store";
import { useLanguage } from "@/lib/language";

type Notice = {
  id: string;
  initials: string;
  color: string;
  title: string;
  body: string;
  context: string;
  time: string;
  workspaceId: string;
  projectId: string;
};

export default function NotificationsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { profile, workspaces, setWorkspaceId, setProjectId } = useWorkspace();
  const { tasks, columns, projects } = useBoard();
  const [readIds, setReadIds] = useState<string[]>([]);
  const storageKey = `flowboard.read-notifications.v1:${profile.id}`;

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) {
      setReadIds([]);
      return;
    }
    try {
      setReadIds(JSON.parse(stored) as string[]);
    } catch {
      window.localStorage.removeItem(storageKey);
      setReadIds([]);
    }
  }, [storageKey]);

  const notices = useMemo<Notice[]>(() => {
    const comments = tasks.flatMap((task) =>
      task.comments.map((comment) => ({
        id: comment.id,
        initials: comment.author.initials,
        color: comment.author.color,
        title: `${comment.author.name} ${t("commented on a task")}`,
        body: comment.body,
        context: `${task.title} · ${projects.find((project) => project.id === task.projectId)?.name ?? "Project"}`,
        time: comment.createdAt,
        workspaceId: task.workspaceId,
        projectId: task.projectId,
      })),
    );
    const today = new Date();
    const reminders = tasks
      .filter((task) => {
        if (
          columns
            .find((column) => column.id === task.columnId)
            ?.title.toLowerCase() === "done"
        )
          return false;
        const daysUntilDue = Math.ceil(
          (new Date(`${task.dueDate}T12:00:00`).getTime() - today.getTime()) /
            86_400_000,
        );
        return daysUntilDue >= 0 && daysUntilDue <= 2;
      })
      .map((task) => {
        const days = Math.ceil(
          (new Date(`${task.dueDate}T12:00:00`).getTime() - today.getTime()) /
            86_400_000,
        );
        return {
          id: `deadline-${task.id}-${task.dueDate}`,
          initials: "FB",
          color: "#58d6c8",
          title: days === 0 ? t("Task is due today") : t("Task is due soon"),
          body: task.title,
          context: `${workspaces.find((item) => item.id === task.workspaceId)?.name ?? "Workspace"} · ${projects.find((project) => project.id === task.projectId)?.name ?? "Project"}`,
          time: days === 0 ? t("Today") : `${t("In")} ${days} ${days === 1 ? t("day") : t("days")}`,
          workspaceId: task.workspaceId,
          projectId: task.projectId,
        };
      });
    return [...comments, ...reminders];
  }, [tasks, columns, projects, workspaces, t]);

  const unread = notices.filter(
    (notice) => !readIds.includes(notice.id),
  ).length;

  function markAllRead() {
    const next = [
      ...new Set([...readIds, ...notices.map((notice) => notice.id)]),
    ];
    setReadIds(next);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  }

  function openNotice(notice: Notice) {
    setWorkspaceId(notice.workspaceId);
    setProjectId(notice.projectId);
    router.push("/board");
  }

  return (
    <section className="notifications-screen">
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            PERSONAL <span className="eyebrow-dot" /> INBOX
          </p>
            <h1>{t("Notifications")}</h1>
          <p className="page-subtitle">
            {t("Task comments and deadlines across all your workspaces.")}
          </p>
        </div>
        <button
          className="button button-quiet"
          onClick={markAllRead}
          disabled={!unread}
        >
          {t("Mark all as read")}
        </button>
      </div>
      <div className="notification-summary">
        <span className="notification-summary-icon">
          <Icon name="bell" size={18} />
        </span>
        <span>
            <strong>{unread} {t("unread notifications")}</strong>
            <small>{t("Based on task discussions and upcoming deadlines.")}</small>
        </span>
      </div>
      <div className="notification-list">
        {notices.length ? (
          notices.map((notice) => {
            const isUnread = !readIds.includes(notice.id);
            return (
              <article
                className={`notification-item ${isUnread ? "unread" : ""}`}
                key={notice.id}
              >
                <Avatar initials={notice.initials} color={notice.color} />
                <div className="notification-copy">
                  <div>
                    <strong>{notice.title}</strong>
                    <time>{notice.time}</time>
                  </div>
                  <p>{notice.body}</p>
                  <small>{notice.context}</small>
                  <button onClick={() => openNotice(notice)}>
                    {t("Open task")} <Icon name="arrow" size={13} />
                  </button>
                </div>
                {isUnread && <i className="unread-dot" />}
              </article>
            );
          })
        ) : (
          <div className="task-empty">
            You’re all caught up. New comments and deadlines will show up here.
          </div>
        )}
      </div>
    </section>
  );
}
