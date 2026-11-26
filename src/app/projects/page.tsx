"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { useWorkspace } from "@/components/app-shell";
import { useBoard } from "@/lib/board-store";
import { useLanguage } from "@/lib/language";

export default function ProjectsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { workspace, projectId, setProjectId } = useWorkspace();
  const { tasks, columns, projects, createProject, deleteProject, initializeWorkspaceColumns } = useBoard();
  const [dialogOpen, setDialogOpen] = useState(false);
  const visible = useMemo(
    () => projects.filter((project) => project.workspaceId === workspace.id),
    [projects, workspace.id],
  );

  function openProject(id: string) {
    setProjectId(id);
    router.push("/board");
  }

  return (
    <section className="projects-screen">
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {t(workspace.name).toUpperCase()} <span className="eyebrow-dot" /> {t("PROJECTS")}
          </p>
          <h1>{t("Projects")}</h1>
          <p className="page-subtitle">
            {t("A clear view of what your team is moving forward.")}
          </p>
        </div>
        <button
          className="button button-primary"
          onClick={() => setDialogOpen(true)}
        >
          <Icon name="plus" size={15} /> {t("New project")}
        </button>
      </div>
      <div className="project-cards">
        {visible.map((project) => {
          const projectTasks = tasks.filter(
            (task) => task.projectId === project.id,
          );
          const done = projectTasks.filter(
            (task) =>
              columns
                .find((column) => column.id === task.columnId)
                ?.title.toLowerCase() === "done",
          ).length;
          const progress = projectTasks.length
            ? Math.round((done / projectTasks.length) * 100)
            : project.progress;
          return (
            <article className="project-card" key={project.id}>
              <div className="project-card-top">
                <span
                  className="project-mark project-mark-large"
                  style={{
                    backgroundColor: `${project.color}22`,
                    color: project.color,
                  }}
                >
                  <Icon name="spark" size={17} />
                </span>
                <button
                  className="icon-button subtle"
                  aria-label={`Delete ${project.name}`}
                  title={t("Delete project")}
                  onClick={() => {
                    if (window.confirm(`${t("Delete")} ${project.name} ${t("and all its tasks?")}`))
                      deleteProject(project.id);
                  }}
                >
                  <Icon name="close" size={15} />
                </button>
              </div>
              <button
                className="project-card-open"
                onClick={() => openProject(project.id)}
              >
                <h2>{project.name}</h2>
              </button>
              <p>{project.description}</p>
              <div className="project-card-progress">
                <div>
                  <span>{t("Progress")}</span>
                  <strong>{progress}%</strong>
                </div>
                <div className="progress-track">
                  <span
                    style={{
                      width: `${progress}%`,
                      backgroundColor: project.color,
                    }}
                  />
                </div>
              </div>
              <div className="project-card-footer">
                <div className="avatar-stack">
                  {project.members.slice(0, 4).map((member) => (
                    <Avatar
                      key={member.id}
                      initials={member.initials}
                      color={member.color}
                      size="sm"
                    />
                  ))}
                </div>
                <span>
                  {done} {t("of")} {projectTasks.length} {t("tasks complete")}
                </span>
                <button
                  onClick={() => openProject(project.id)}
                  aria-label={`Open ${project.name}`}
                >
                  <Icon name="arrow" size={16} />
                </button>
              </div>
            </article>
          );
        })}
        <button
          className="new-project-card"
          onClick={() => setDialogOpen(true)}
        >
          <span>
            <Icon name="plus" size={20} />
          </span>
          <strong>{t("Create a project")}</strong>
          <small>{t("Start with a clear goal and a board.")}</small>
        </button>
      </div>
      {dialogOpen && (
        <ProjectDialog
          onClose={() => setDialogOpen(false)}
          onCreate={(name, description) => {
            initializeWorkspaceColumns(workspace.id);
            const project = createProject(workspace.id, name, description);
            setDialogOpen(false);
            setProjectId(project.id);
            router.push("/board");
          }}
        />
      )}
      <span className="sr-only" aria-live="polite">
        {visible.some((project) => project.id === projectId)
          ? "Current project selected"
          : "Choose a project"}
      </span>
    </section>
  );
}

function ProjectDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string, description: string) => void;
}) {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onCreate(name.trim(), description.trim());
  }
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="task-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-dialog-title"
      >
        <header className="dialog-header">
          <div>
            <p className="eyebrow">{t("PROJECT SETUP")}</p>
            <h2 id="project-dialog-title">{t("Create a project")}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label={t("Close")}>
            <Icon name="close" size={18} />
          </button>
        </header>
        <form className="task-form" onSubmit={submit}>
          <label className="form-field">
            <span>{t("Project name")}</span>
            <input
              autoFocus
              maxLength={120}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("What are you working on?")}
              required
            />
          </label>
          <label className="form-field">
            <span>{t("Description")}</span>
            <textarea
              rows={3}
              maxLength={500}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t("Add a short goal for the project.")}
            />
          </label>
          <footer className="dialog-actions">
            <span className="dialog-hint">
              {t("A new project board will be created.")}
            </span>
            <div>
              <button
                type="button"
                className="button button-quiet"
                onClick={onClose}
              >
                {t("Cancel")}
              </button>
              <button type="submit" className="button button-primary">
                {t("Create project")}
              </button>
            </div>
          </footer>
        </form>
      </section>
    </div>
  );
}
