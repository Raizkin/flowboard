"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/components/app-shell";
import { PriorityBadge } from "@/components/dashboard-screen";
import { Icon } from "@/components/icons";
import { useBoard } from "@/lib/board-store";
import { currentUser } from "@/lib/seed-data";

export default function MyTasksPage() {
  const router = useRouter();
  const { workspaces, profile, setWorkspaceId, setProjectId } = useWorkspace();
  const { tasks, columns } = useBoard();
  const [scope, setScope] = useState("All workspaces");
  const [filter, setFilter] = useState("Upcoming");
  const personalTasks = useMemo(
    () =>
      tasks.filter((task) => {
        const assignedToUser =
          task.assignee?.id === profile.id ||
          (profile.id !== currentUser.id &&
            task.assignee?.id === currentUser.id);
        return (
          assignedToUser &&
          (scope === "All workspaces" ||
            workspaces.find((space) => space.id === task.workspaceId)?.name ===
              scope)
        );
      }),
    [tasks, scope, profile.id, workspaces],
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
            PERSONAL OVERVIEW <span className="eyebrow-dot" /> ALL WORKSPACES
          </p>
          <h1>My tasks</h1>
          <p className="page-subtitle">
            Your workload across every workspace, in one place.
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
      <div className="my-task-summary">
        <div>
          <span>Assigned to you</span>
          <strong>{personalTasks.length}</strong>
        </div>
        <div>
          <span>Upcoming</span>
          <strong>
            {personalTasks.filter((task) => !isDone(task.columnId)).length}
          </strong>
        </div>
        <div>
          <span>Completed</span>
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
              {name}
            </button>
          ))}
        </div>
        <select
          className="filter-select workspace-filter"
          value={scope}
          onChange={(event) => setScope(event.target.value)}
          aria-label="Filter workspace"
        >
          <option>All workspaces</option>
          {workspaces.map((space) => (
            <option key={space.id}>{space.name}</option>
          ))}
        </select>
      </div>
      <div className="panel my-task-list">
        <div className="my-task-list-heading">
          <strong>Task</strong>
          <span>Workspace</span>
          <span>Status</span>
          <span>Priority</span>
          <span>Due date</span>
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
