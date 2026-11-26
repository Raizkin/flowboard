"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, useWorkspace } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { useBoard } from "@/lib/board-store";
import { PriorityBadge } from "@/components/dashboard-screen";

export default function CalendarPage() {
  const router = useRouter();
  const { workspace, setWorkspaceId, setProjectId } = useWorkspace();
  const { tasks } = useBoard();
  const [month, setMonth] = useState(new Date("2026-11-01T12:00:00"));
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
  const monthLabel = month.toLocaleDateString("en-US", {
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
            {workspace.name.toUpperCase()} <span className="eyebrow-dot" />{" "}
            SCHEDULE
          </p>
          <h1>Calendar</h1>
          <p className="page-subtitle">
            Stay ahead of task deadlines and delivery dates.
          </p>
        </div>
        <button
          type="button"
          className="button button-primary"
          onClick={() => router.push("/board")}
        >
          <Icon name="plus" size={15} /> New task
        </button>
      </div>
      <div className="calendar-layout">
        <div className="panel calendar-panel">
          <div className="calendar-toolbar">
            <div>
              <h2>{monthLabel}</h2>
              <span>{monthTasks.length} task deadlines</span>
            </div>
            <div>
              <button
                className="icon-button"
                aria-label="Previous month"
                onClick={() => shiftMonth(-1)}
              >
                ‹
              </button>
              <button
                className="icon-button"
                aria-label="Next month"
                onClick={() => shiftMonth(1)}
              >
                ›
              </button>
            </div>
          </div>
          <div className="calendar-weekdays">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <span key={day}>{day}</span>
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
                  aria-label={`${date.toLocaleDateString("en-US", { month: "long", day: "numeric" })}${items.length ? `, ${items.length} task deadlines` : ""}`}
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
            <h2>Deadlines this month</h2>
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
