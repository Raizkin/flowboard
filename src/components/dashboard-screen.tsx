"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Avatar, useWorkspace } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { useBoard } from "@/lib/board-store";
import { useLanguage } from "@/lib/language";
import type { Priority, Project } from "@/lib/types";

export function DashboardScreen() {
  const { workspace, profile } = useWorkspace();
  const { language, t } = useLanguage();
  const { tasks, columns, projects } = useBoard();
  const workspaceTasks = useMemo(
    () => tasks.filter((task) => task.workspaceId === workspace.id),
    [tasks, workspace.id],
  );
  const workspaceProjects = projects.filter(
    (project) => project.workspaceId === workspace.id,
  );
  const doneIds = columns
    .filter((column) => column.workspaceId === workspace.id && column.title.toLowerCase() === "done")
    .map((column) => column.id);
  const today = new Date().toISOString().slice(0, 10);
  const open = workspaceTasks.filter((task) => !doneIds.includes(task.columnId)).length;
  const progress = workspaceTasks.filter((task) =>
    columns.find((column) => column.id === task.columnId)?.title.toLowerCase() === "in progress",
  ).length;
  const completed = workspaceTasks.length - open;
  const overdue = workspaceTasks.filter((task) => task.dueDate < today && !doneIds.includes(task.columnId)).length;
  const upcoming = [...workspaceTasks]
    .filter((task) => task.dueDate >= today && !doneIds.includes(task.columnId))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 4);
  const activeTasks = workspaceTasks.filter((task) => !doneIds.includes(task.columnId)).slice(0, 5);
  const dateLocale = language === "uk" ? "uk-UA" : "en-US";

  return (
    <div className="dashboard-screen">
      <div className="page-heading dashboard-heading">
        <div>
          <p className="eyebrow">
            {new Date().toLocaleDateString(dateLocale, { weekday: "long", month: "long", day: "numeric", year: "numeric" }).toUpperCase()}
            <span className="eyebrow-dot" /> {t(workspace.name)}
          </p>
          <h1>{t("Welcome back")}, {profile.name.split(/\s+/)[0]}</h1>
          <p className="page-subtitle">{t("Here is what is happening in your workspace today.")}</p>
        </div>
        <div className="heading-actions">
          <Link className="button button-quiet" href="/projects">{t("View projects")} <Icon name="arrow" size={15} /></Link>
          <Link className="button button-primary" href={workspaceProjects.length ? "/board" : "/projects"}>
            <Icon name="plus" size={16} /> {t(workspaceProjects.length ? "New task" : "Create project")}
          </Link>
        </div>
      </div>

      <section className="stat-grid" aria-label={t("Workspace statistics")}>
        <StatCard label={t("Open tasks")} value={open} note={t("in this workspace")} icon="check" color="teal" />
        <StatCard label={t("In progress")} value={progress} note={t("currently active")} icon="spark" color="violet" />
        <StatCard label={t("Completed")} value={completed} note={t("tasks finished")} icon="arrow" color="green" />
        <StatCard label={t("Overdue")} value={overdue} note={overdue ? t("Needs attention") : t("No overdue tasks")} icon="clock" color="amber" />
      </section>

      <section className="dashboard-grid dashboard-grid-top">
        <div className="panel progress-panel">
          <PanelTitle title={t("Project progress")} action={t("View all")} href="/projects" />
          <div className="project-progress-list">
            {workspaceProjects.map((project) => {
              const projectTasks = workspaceTasks.filter((task) => task.projectId === project.id);
              const done = projectTasks.filter((task) => doneIds.includes(task.columnId)).length;
              return <ProjectProgress key={project.id} project={project} progress={projectTasks.length ? Math.round(done / projectTasks.length * 100) : 0} />;
            })}
            {!workspaceProjects.length && <div className="task-empty">{t("No projects yet. Create one to get started.")}</div>}
          </div>
        </div>
        <div className="panel activity-panel">
          <PanelTitle title={t("Weekly activity")} action={t("This week")} />
          <div className="chart-empty">{t("Activity will appear here as you complete tasks.")}</div>
        </div>
      </section>

      <section className="dashboard-grid dashboard-grid-bottom">
        <div className="panel active-panel">
          <PanelTitle title={t("Active tasks")} action={t("Open board")} href={workspaceProjects.length ? "/board" : "/projects"} />
          <div className="task-table task-table-dashboard">
            <div className="task-table-head"><span>{t("TASK")}</span><span>{t("PRIORITY")}</span><span>{t("DUE DATE")}</span><span>{t("ASSIGNEE")}</span></div>
            {activeTasks.map((task) => (
              <div className="task-row" key={task.id}>
                <div className="task-title-cell"><span className="task-check" /><span><strong>{task.title}</strong><small>{workspaceProjects.find((project) => project.id === task.projectId)?.name}</small></span></div>
                <span><PriorityBadge priority={task.priority} /></span>
                <span className="task-due">{formatShortDate(task.dueDate, dateLocale)}</span>
                <span className="task-avatar-cell">{task.assignee ? <Avatar initials={task.assignee.initials} color={task.assignee.color} size="sm" /> : <span className="unassigned">—</span>}</span>
              </div>
            ))}
            {!activeTasks.length && <div className="task-empty">{t("No active tasks yet.")}</div>}
          </div>
        </div>
        <div className="panel deadlines-panel">
          <PanelTitle title={t("Upcoming deadlines")} action={t("Calendar")} href="/calendar" />
          <div className="deadline-list">
            {upcoming.map((task) => (
              <div key={task.id} className="deadline-item">
                <div className="deadline-date"><strong>{new Date(`${task.dueDate}T12:00:00`).getDate()}</strong><small>{new Date(`${task.dueDate}T12:00:00`).toLocaleDateString(dateLocale, { month: "short" }).toUpperCase()}</small></div>
                <div className="deadline-copy"><strong>{task.title}</strong><small>{t(workspace.name)}</small></div>
                {task.assignee && <Avatar initials={task.assignee.initials} color={task.assignee.color} size="sm" />}
              </div>
            ))}
            {!upcoming.length && <div className="task-empty">{t("No upcoming deadlines.")}</div>}
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, note, color, icon }: { label: string; value: number; note: string; color: string; icon: "check" | "spark" | "arrow" | "clock" }) {
  return <article className={`stat-card stat-${color}`}><div className="stat-card-top"><span>{label}</span><span className="stat-icon"><Icon name={icon} size={16} /></span></div><div className="stat-value">{String(value).padStart(2, "0")}</div><div className="stat-foot"><span className="stat-change">{value}</span><span>{note}</span></div></article>;
}

function PanelTitle({ title, action, href }: { title: string; action: string; href?: string }) {
  return <div className="panel-title"><h2>{title}</h2>{href ? <Link href={href}>{action}<Icon name="arrow" size={14} /></Link> : <span className="panel-period">{action}</span>}</div>;
}

function ProjectProgress({ project, progress }: { project: Project; progress: number }) {
  return <div className="project-progress-item"><div className="project-progress-heading"><span className="project-mark" style={{ backgroundColor: project.color }}><Icon name="spark" size={14} /></span><span className="project-progress-copy"><strong>{project.name}</strong><small>{project.description}</small></span><span className="project-percent">{progress}%</span></div><div className="progress-track"><span style={{ width: `${progress}%`, backgroundColor: project.color }} /></div></div>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const { t } = useLanguage();
  const icon = priority === "Urgent" ? "↑" : priority === "High" ? "↗" : priority === "Medium" ? "−" : "↓";
  return <span className={`priority-badge priority-${priority.toLowerCase()}`}><span>{icon}</span>{t(priority)}</span>;
}

function formatShortDate(value: string, locale: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(locale, { month: "short", day: "numeric" });
}
