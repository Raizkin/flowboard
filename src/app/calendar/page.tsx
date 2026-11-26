"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, useWorkspace } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { useBoard } from "@/lib/board-store";
import { PriorityBadge } from "@/components/dashboard-screen";
import { useLanguage } from "@/lib/language";

export default function CalendarPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { workspace, setWorkspaceId, setProjectId } = useWorkspace();
  const { tasks } = useBoard();
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12));
  const monthTasks = useMemo(
    () =>
      tasks
        .filter(
          (task) =>
            task.workspaceId === workspace.id &&
            task.dueDate.startsWith(
              `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`,
            ),
        )
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [tasks, workspace.id, month],
  );
  const locale = language === "uk" ? "uk-UA" : "en-US";
  const monthLabel = month.toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });
  function shiftMonth(direction: number) {
    setMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + direction, 1, 12),
    );
  }
  function openTask(task: (typeof monthTasks)[number]) {
    setWorkspaceId(task.workspaceId);
    setProjectId(task.projectId);
    router.push("/board");
  }
  return (
    <section className="calendar-screen">
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {t(workspace.name).toUpperCase()} <span className="eyebrow-dot" /> {t("SCHEDULE")}
          </p>
          <h1>{t("Calendar")}</h1>
          <p className="page-subtitle">
            {t("Stay ahead of task deadlines and delivery dates.")}
          </p>
        </div>
        <button
          type="button"
          className="button button-primary"
          onClick={() => router.push("/board")}
        >
          <Icon name="plus" size={15} /> {t("New task")}
        </button>
      </div>
      <div className="calendar-layout">
        <div className="panel calendar-panel">
          <div className="calendar-toolbar">
            <div>
              <h2>{monthLabel}</h2>
              <span>{monthTasks.length} {t("task deadlines")}</span>
            </div>
            <div>
              <button
                className="icon-button"
                aria-label={t("Previous month")}
                onClick={() => shiftMonth(-1)}
              >
                ‹
              </button>
              <button
                className="icon-button"
                aria-label={t("Next month")}
                onClick={() => shiftMonth(1)}
              >
                ›
              </button>
            </div>
          </div>
          <div className="calendar-weekdays">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <span key={day}>{t(day)}</span>
            ))}
          </div>
          <div className="calendar-days">
            {Array.from({ length: 35 }, (_, index) => {
              const firstWeekday =
                (new Date(
                  month.getFullYear(),
                  month.getMonth(),
                  1,
                  12,
                ).getDay() +
                  6) %
                7;
              const date = new Date(
                month.getFullYear(),
                month.getMonth(),
                1 - firstWeekday + index,
                12,
              );
              const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
              const items = tasks.filter(
                (task) =>
                  task.workspaceId === workspace.id && task.dueDate === iso,
              );
              const inMonth = date.getMonth() === month.getMonth();
              return (
                <button
                  type="button"
                  className={`calendar-day ${inMonth ? "" : "outside"} ${iso === new Date().toLocaleDateString("en-CA") ? "today" : ""}`}
                  key={iso + index}
                  onClick={() => {
                    const first = items[0];
                    if (first) openTask(first);
                  }}
                  aria-label={`${date.toLocaleDateString(locale, { month: "long", day: "numeric" })}${items.length ? `, ${items.length} ${t("task deadlines")}` : ""}`}
                >
                  <span>{date.getDate()}</span>
                  {items.slice(0, 2).map((task) => (
                    <i key={task.id} title={task.title} />
                  ))}
                  {items.length > 2 && <small>+{items.length - 2}</small>}
                </button>
              );
            })}
          </div>
        </div>
        <aside className="panel calendar-agenda">
          <div className="panel-title">
            <h2>{t("Deadlines this month")}</h2>
            <span>{monthTasks.length}</span>
          </div>
          {monthTasks.length ? (
            monthTasks.map((task) => (
              <button
                type="button"
                onClick={() => openTask(task)}
                className="agenda-item"
                key={task.id}
              >
                <span className="agenda-date">
                  <strong>
                    {new Date(`${task.dueDate}T12:00:00`).getDate()}
                  </strong>
                  <small>
                    {new Date(`${task.dueDate}T12:00:00`)
                      .toLocaleDateString("en-US", { month: "short" })
                      .toUpperCase()}
                  </small>
                </span>
                <span className="agenda-copy">
                  <strong>{task.title}</strong>
                  <small>{task.assignee?.name ?? "Unassigned"}</small>
                  <PriorityBadge priority={task.priority} />
                </span>
                {task.assignee && (
                  <Avatar
                    initials={task.assignee.initials}
                    color={task.assignee.color}
                    size="sm"
                  />
                )}
              </button>
            ))
          ) : (
            <p className="agenda-empty">No deadlines scheduled this month.</p>
          )}
        </aside>
      </div>
    </section>
  );
}
