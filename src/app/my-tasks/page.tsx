"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/components/app-shell";
import { PriorityBadge } from "@/components/dashboard-screen";
import { Icon } from "@/components/icons";
import { useBoard } from "@/lib/board-store";
import { useLanguage } from "@/lib/language";

export default function MyTasksPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { workspaces, profile, setWorkspaceId, setProjectId } = useWorkspace();
  const { tasks, columns } = useBoard();
  const [scope, setScope] = useState("all");
  const [filter, setFilter] = useState("Upcoming");
  const personalTasks = useMemo(
    () =>
      tasks.filter((task) => {
        const assignedToUser = task.assignee?.id === profile.id;
        return (
          assignedToUser &&
          (scope === "all" || task.workspaceId === scope)
        );
      }),
    [tasks, scope, profile.id],
  );
  const isDone = (taskId: string) =>
    columns.find((column) => column.id === taskId)?.title.toLowerCase() ===
    "done";
  const visibleTasks = personalTasks
    .filter((task) => {
      if (filter === "Completed") return isDone(task.columnId);
      if (filter === "Upcoming") return !isDone(task.columnId);
      return true;
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  function openTask(task: (typeof visibleTasks)[number]) {
    setWorkspaceId(task.workspaceId);
    setProjectId(task.projectId);
    router.push("/board");
  }

  return (
    <section className="my-tasks-screen">
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {t("PERSONAL OVERVIEW")} <span className="eyebrow-dot" /> {t("ALL WORKSPACES")}
          </p>
          <h1>{t("My Tasks")}</h1>
          <p className="page-subtitle">
            {t("Your workload across every workspace, in one place.")}
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
      <div className="my-task-summary">
        <div>
          <span>{t("Assigned to you")}</span>
          <strong>{personalTasks.length}</strong>
        </div>
        <div>
          <span>{t("Upcoming")}</span>
          <strong>
            {personalTasks.filter((task) => !isDone(task.columnId)).length}
          </strong>
        </div>
        <div>
          <span>{t("Completed")}</span>
          <strong>
            {personalTasks.filter((task) => isDone(task.columnId)).length}
          </strong>
        </div>
      </div>
      <div className="my-task-controls">
        <div className="view-switch" role="tablist">
          {["Upcoming", "All tasks", "Completed"].map((name) => (
            <button
              key={name}
              className={`view-tab ${filter === name ? "selected" : ""}`}
              role="tab"
              aria-selected={filter === name}
              onClick={() => setFilter(name)}
            >
              {t(name)}
            </button>
          ))}
        </div>
        <select
          className="filter-select workspace-filter"
          value={scope}
          onChange={(event) => setScope(event.target.value)}
          aria-label={t("Filter workspace")}
        >
          <option value="all">{t("All workspaces")}</option>
          {workspaces.map((space) => (
            <option key={space.id} value={space.id}>{t(space.name)}</option>
          ))}
        </select>
      </div>
      <div className="panel my-task-list">
        <div className="my-task-list-heading">
          <strong>{t("Task")}</strong>
          <span>{t("Workspace")}</span>
          <span>{t("Status")}</span>
          <span>{t("Priority")}</span>
          <span>{t("Due date")}</span>
        </div>
        {visibleTasks.length ? (
          visibleTasks.map((task) => {
            const status =
              columns.find((item) => item.id === task.columnId)?.title ??
              "To do";
            const taskWorkspace = workspaces.find(
              (space) => space.id === task.workspaceId,
            );
            return (
              <button
                type="button"
                key={task.id}
                className="my-task-row"
                onClick={() => openTask(task)}
              >
                <span className="my-task-name">
                  <i
                    className={`status-check ${isDone(task.columnId) ? "checked" : ""}`}
                  >
                    {isDone(task.columnId) ? "✓" : ""}
                  </i>
                  <span>
                    <strong>{task.title}</strong>
                    <small>{task.description}</small>
                  </span>
                </span>
                <span className="workspace-cell">
                  <i
                    className={`workspace-mini workspace-mini-${taskWorkspace?.id}`}
                  />
                  {taskWorkspace?.name}
                </span>
                <span>
                  <i className="status-label" />
                  {status}
                </span>
                <span>
                  <PriorityBadge priority={task.priority} />
                </span>
                <span className="task-due">
                  {new Date(`${task.dueDate}T12:00:00`).toLocaleDateString(
                    "en-US",
                    { month: "short", day: "numeric" },
                  )}
                </span>
              </button>
            );
          })
        ) : (
          <div className="task-empty">Nothing in this view yet.</div>
        )}
      </div>
    </section>
  );
}
