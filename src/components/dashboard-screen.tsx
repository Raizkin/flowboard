"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { Avatar } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { useBoard } from "@/lib/board-store";
import { workspaces } from "@/lib/seed-data";
import { useWorkspace } from "@/components/app-shell";
import type { Priority, Project } from "@/lib/types";

const activity = [
  { day: "Mon", tasks: 5 },
  { day: "Tue", tasks: 8 },
  { day: "Wed", tasks: 6 },
  { day: "Thu", tasks: 11 },
  { day: "Fri", tasks: 9 },
  { day: "Sat", tasks: 3 },
  { day: "Sun", tasks: 5 },
];

export function DashboardScreen() {
  const { workspace, profile } = useWorkspace();
  const { tasks, columns, projects } = useBoard();
  const workspaceTasks = useMemo(
    () => tasks.filter((task) => task.workspaceId === workspace.id),
    [tasks, workspace.id],
  );
  const workspaceProjects = projects.filter(
    (project) => project.workspaceId === workspace.id,
  );
  const doneColumnIds = columns
    .filter(
      (column) =>
        column.workspaceId === workspace.id &&
        column.title.toLowerCase() === "done",
    )
    .map((column) => column.id);
  const today = new Date().toISOString().slice(0, 10);
  const open = workspaceTasks.filter(
    (task) => !doneColumnIds.includes(task.columnId),
  ).length;
  const progress = workspaceTasks.filter(
    (task) =>
      columns
        .find((column) => column.id === task.columnId)
        ?.title.toLowerCase() === "in progress",
  ).length;
  const completed = workspaceTasks.filter((task) =>
    doneColumnIds.includes(task.columnId),
  ).length;
  const upcoming = [...workspaceTasks]
    .filter(
      (task) => task.dueDate >= today && !doneColumnIds.includes(task.columnId),
    )
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 4);
  const overdue = workspaceTasks.filter(
    (task) => task.dueDate < today && !doneColumnIds.includes(task.columnId),
  ).length;
  const activeTasks = workspaceTasks
    .filter((task) => !doneColumnIds.includes(task.columnId))
    .slice(0, 4);
  const workspaceName =
    workspaces.find((item) => item.id === workspace.id)?.name ?? workspace.name;

  return (
    <div className="dashboard-screen">
      <div className="page-heading dashboard-heading">
        <div>
          <p className="eyebrow">
            {new Date()
              .toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })
              .toUpperCase()}{" "}
            <span className="eyebrow-dot" /> {workspaceName}
          </p>
          <h1>
            Good morning, {profile.name.split(/\s+/)[0]}{" "}
            <span className="wave">✦</span>
          </h1>
          <p className="page-subtitle">
            Here’s what’s happening in your workspace today.
          </p>
        </div>
        <div className="heading-actions">
          <Link className="button button-quiet" href="/projects">
            View projects <Icon name="arrow" size={15} />
          </Link>
          <Link className="button button-primary" href="/board">
            <Icon name="plus" size={16} /> New task
          </Link>
        </div>
      </div>

      <section className="stat-grid" aria-label="Workspace statistics">
        <StatCard
          label="Open tasks"
          value={String(open).padStart(2, "0")}
          change="+12%"
          note="vs last week"
          color="teal"
          icon="check"
        />
        <StatCard
          label="In progress"
          value={String(progress).padStart(2, "0")}
          change={`${Math.min(progress, 3)} due soon`}
          note="keep momentum"
          color="violet"
          icon="spark"
        />
        <StatCard
          label="Completed"
          value={String(completed).padStart(2, "0")}
          change="+8"
          note="this week"
          color="green"
          icon="arrow"
        />
        <StatCard
          label="Overdue"
          value={String(overdue).padStart(2, "0")}
          change={overdue ? "Needs attention" : "All on track"}
          note="review today"
          color="amber"
          icon="clock"
        />
      </section>

      <section className="dashboard-grid dashboard-grid-top">
        <div className="panel progress-panel">
          <PanelTitle
            title="Project progress"
            action="View all"
            href="/projects"
          />
          <div className="project-progress-list">
            {workspaceProjects.slice(0, 4).map((project) => {
              const projectTasks = workspaceTasks.filter(
                (task) => task.projectId === project.id,
              );
              const done = projectTasks.filter((task) =>
                doneColumnIds.includes(task.columnId),
              ).length;
              return (
                <ProjectProgress
                  key={project.id}
                  project={project}
                  progress={
                    projectTasks.length
                      ? Math.round((done / projectTasks.length) * 100)
                      : project.progress
                  }
                />
              );
            })}
          </div>
        </div>
        <div className="panel activity-panel">
          <PanelTitle title="Weekly activity" action="This week" />
          <div className="chart-summary">
            <strong>47</strong>
            <span>tasks completed</span>
            <span className="trend-positive">↗ 18%</span>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={activity}
                margin={{ top: 4, right: 2, bottom: 0, left: -18 }}
              >
                <defs>
                  <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#58d6c8" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#58d6c8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  stroke="#27313f"
                  strokeDasharray="3 5"
                />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#78879a", fontSize: 10 }}
                  dy={8}
                />
                <Tooltip
                  contentStyle={{
                    background: "#151d28",
                    border: "1px solid #2a3544",
                    borderRadius: 10,
                    color: "#f5f7fb",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="tasks"
                  stroke="#58d6c8"
                  strokeWidth={2}
                  fill="url(#activityFill)"
                  activeDot={{
                    r: 4,
                    fill: "#58d6c8",
                    stroke: "#10161f",
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="dashboard-grid dashboard-grid-bottom">
        <div className="panel active-panel">
          <PanelTitle title="Active tasks" action="Open board" href="/board" />
          <div className="task-table task-table-dashboard">
            <div className="task-table-head">
              <span>TASK</span>
              <span>PRIORITY</span>
              <span>DUE DATE</span>
              <span>ASSIGNEE</span>
            </div>
            {activeTasks.map((task) => (
              <div className="task-row" key={task.id}>
                <div className="task-title-cell">
                  <span className="task-check" />
                  <span>
                    <strong>{task.title}</strong>
                    <small>{workspaceProjects[0]?.name ?? workspaceName}</small>
                  </span>
                </div>
                <span>
                  <PriorityBadge priority={task.priority} />
                </span>
                <span className="task-due">
                  {formatShortDate(task.dueDate)}
                </span>
                <span className="task-avatar-cell">
                  {task.assignee ? (
                    <Avatar
                      initials={task.assignee.initials}
                      color={task.assignee.color}
                      size="sm"
                    />
                  ) : (
                    <span className="unassigned">—</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="panel deadlines-panel">
          <PanelTitle
            title="Upcoming deadlines"
            action="Calendar"
            href="/calendar"
          />
          <div className="deadline-list">
            {upcoming.map((task, index) => (
              <div key={task.id} className="deadline-item">
                <div className={`deadline-date deadline-date-${index}`}>
                  <strong>
                    {new Date(`${task.dueDate}T12:00:00`).getDate()}
                  </strong>
                  <small>
                    {new Date(`${task.dueDate}T12:00:00`)
                      .toLocaleDateString("en-US", { month: "short" })
                      .toUpperCase()}
                  </small>
                </div>
                <div className="deadline-copy">
                  <strong>{task.title}</strong>
                  <small>{workspaceName}</small>
                </div>
                {task.assignee && (
                  <Avatar
                    initials={task.assignee.initials}
                    color={task.assignee.color}
                    size="sm"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  change,
  note,
  color,
  icon,
}: {
  label: string;
  value: string;
  change: string;
  note: string;
  color: string;
  icon: "check" | "spark" | "arrow" | "clock";
}) {
  return (
    <article className={`stat-card stat-${color}`}>
      <div className="stat-card-top">
        <span>{label}</span>
        <span className="stat-icon">
          <Icon name={icon} size={16} />
        </span>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-foot">
        <span className="stat-change">{change}</span>
        <span>{note}</span>
      </div>
      <span className="stat-sparkline" aria-hidden="true">
        ⌁⌁⌁
      </span>
    </article>
  );
}

function PanelTitle({
  title,
  action,
  href,
}: {
  title: string;
  action: string;
  href?: string;
}) {
  return (
    <div className="panel-title">
      <h2>{title}</h2>
      {href ? (
        <Link href={href}>
          {action}
          <Icon name="arrow" size={14} />
        </Link>
      ) : (
        <button>
          {action}
          <Icon name="chevron" size={13} />
        </button>
      )}
    </div>
  );
}

function ProjectProgress({
  project,
  progress,
}: {
  project: Project;
  progress: number;
}) {
  return (
    <div className="project-progress-item">
      <div className="project-progress-heading">
        <span
          className="project-mark"
          style={{ backgroundColor: project.color }}
        >
          <Icon name="spark" size={14} />
        </span>
        <span className="project-progress-copy">
          <strong>{project.name}</strong>
          <small>{project.description}</small>
        </span>
        <span className="project-percent">{progress}%</span>
      </div>
      <div className="progress-track">
        <span
          style={{ width: `${progress}%`, backgroundColor: project.color }}
        />
      </div>
      <div className="project-progress-meta">
        <span>{project.dueLabel}</span>
        <div className="avatar-stack">
          {project.members.slice(0, 3).map((member) => (
            <Avatar
              key={member.id}
              initials={member.initials}
              color={member.color}
              size="sm"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const icon =
    priority === "Urgent"
      ? "↑"
      : priority === "High"
        ? "↗"
        : priority === "Medium"
          ? "–"
          : "↓";
  return (
    <span className={`priority-badge priority-${priority.toLowerCase()}`}>
      <span>{icon}</span>
      {priority}
    </span>
  );
}

function formatShortDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
