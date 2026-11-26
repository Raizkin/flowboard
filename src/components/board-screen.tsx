"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Avatar, useWorkspace } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { PriorityBadge } from "@/components/dashboard-screen";
import { useBoard, type TaskDraft } from "@/lib/board-store";
import type {
  Assignee,
  BoardColumn,
  Priority,
  Task,
  WorkspaceId,
} from "@/lib/types";
import { useLanguage } from "@/lib/language";

const priorities: Priority[] = ["Urgent", "High", "Medium", "Low"];

export function BoardScreen() {
  const { t } = useLanguage();
  const { workspace, projectId, profile } = useWorkspace();
  const {
    columns: allColumns,
    tasks,
    projects,
    createTask,
    updateTask,
    moveTask,
    addColumn,
    renameColumn,
    moveColumn,
    addComment,
    deleteTask,
  } = useBoard();
  const columns = useMemo(
    () =>
      allColumns
        .filter((column) => column.workspaceId === workspace.id)
        .sort((a, b) => a.order - b.order),
    [allColumns, workspace.id],
  );
  const project =
    projects.find(
      (item) => item.id === projectId && item.workspaceId === workspace.id,
    ) ??
    projects.find((item) => item.workspaceId === workspace.id);
  const workspaceTasks = useMemo(
    () =>
      tasks.filter(
        (task) =>
          task.workspaceId === workspace.id && task.projectId === project?.id,
      ),
    [tasks, workspace.id, project?.id],
  );
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [activeColumn, setActiveColumn] = useState(columns[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"Manual" | "Due date" | "Priority">(
    "Manual",
  );
  const [view, setView] = useState<"Board" | "List">("Board");
  const [filterPriority, setFilterPriority] = useState<Priority | "All">("All");
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [addingColumn, setAddingColumn] = useState(false);
  useEffect(() => {
    if (columns.length && !columns.some((column) => column.id === activeColumn))
      setActiveColumn(columns[0].id);
  }, [columns, activeColumn]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 120, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const filteredTasks = workspaceTasks
    .filter(
      (task) =>
        task.title.toLowerCase().includes(query.toLowerCase()) &&
        (filterPriority === "All" || task.priority === filterPriority),
    )
    .sort((a, b) => {
      if (sortBy === "Due date") return a.dueDate.localeCompare(b.dueDate);
      if (sortBy === "Priority")
        return priorities.indexOf(a.priority) - priorities.indexOf(b.priority);
      return 0;
    });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const task = workspaceTasks.find((item) => item.id === String(active.id));
    if (!task) return;
    const overColumn = columns.find((column) => column.id === String(over.id));
    if (overColumn) {
      moveTask(task.id, overColumn.id);
      return;
    }
    const overTask = workspaceTasks.find((item) => item.id === String(over.id));
    if (overTask) moveTask(task.id, overTask.columnId);
  }

  function handleCreate(draft: TaskDraft) {
    if (!project) return;
    createTask({ ...draft, projectId: project.id });
    setCreateOpen(false);
  }

  function handleAddColumn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newColumnTitle.trim();
    if (!title) return;
    addColumn(workspace.id, title);
    setNewColumnTitle("");
    setAddingColumn(false);
  }

  if (!project) {
    return (
      <section className="placeholder-panel board-empty-state">
        <span className="project-mark project-mark-large"><Icon name="projects" size={20} /></span>
        <h1>{t("No project yet")}</h1>
        <p>{t("Create a project to start adding tasks to your board.")}</p>
        <Link className="button button-primary" href="/projects">
          <Icon name="plus" size={15} /> {t("Create project")}
        </Link>
      </section>
    );
  }

  return (
    <div className="board-screen">
      <div className="breadcrumbs">
        <Link href="/projects">{t("Projects")}</Link>
        <span>/</span>
        <span>{project.name}</span>
      </div>
      <div className="page-heading board-heading">
        <div>
          <div className="board-title-row">
            <span className="project-mark project-mark-large">
              <Icon name="spark" size={17} />
            </span>
            <h1>{project.name}</h1>
          </div>
          <p className="page-subtitle">{project.description}</p>
        </div>
        <div className="heading-actions">
          <div className="avatar-stack board-member-stack">
            <Avatar initials={profile.initials} color={profile.color} />
          </div>
          <Link className="button button-quiet invite-button" href="/team">
            <Icon name="team" size={15} /> {t("Invite")}
          </Link>
          <button
            className="button button-primary"
            onClick={() => setCreateOpen(true)}
          >
            <Icon name="plus" size={16} /> {t("Add task")}
          </button>
        </div>
      </div>

      <div className="board-toolbar">
        <div className="view-switch" role="tablist" aria-label="Project view">
          <button
            type="button"
            className={`view-tab ${view === "Board" ? "selected" : ""}`}
            role="tab"
            aria-selected={view === "Board"}
            onClick={() => setView("Board")}
          >
            <Icon name="projects" size={15} /> {t("Board")}
          </button>
          <button
            type="button"
            className={`view-tab ${view === "List" ? "selected" : ""}`}
            role="tab"
            aria-selected={view === "List"}
            onClick={() => setView("List")}
          >
            <Icon name="check" size={15} /> {t("List")}
          </button>
        </div>
        <div className="board-toolbar-actions">
          <label className="board-search">
            <Icon name="search" size={15} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("Search tasks")}
              aria-label={t("Search tasks")}
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label="Clear search">
                <Icon name="close" size={13} />
              </button>
            )}
          </label>
          <label className="filter-select">
            <Icon name="filter" size={15} />
            <select
              value={filterPriority}
              onChange={(event) =>
                setFilterPriority(event.target.value as Priority | "All")
              }
              aria-label="Filter by priority"
            >
              <option>All</option>
              {priorities.map((priority) => (
                <option key={priority}>{priority}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="button button-quiet board-sort"
            onClick={() =>
              setSortBy((current) =>
                current === "Manual"
                  ? "Due date"
                  : current === "Due date"
                    ? "Priority"
                    : "Manual",
              )
            }
          >
            <Icon name="filter" size={15} /> {t(sortBy)}
          </button>
        </div>
      </div>

      {view === "Board" && (
        <div
          className="mobile-column-tabs"
          role="tablist"
          aria-label="Board status"
        >
          {columns.map((column) => (
            <button
              key={column.id}
              className={activeColumn === column.id ? "active" : ""}
              onClick={() => setActiveColumn(column.id)}
              role="tab"
              aria-selected={activeColumn === column.id}
            >
              <i style={{ background: column.color }} />
              {t(column.title)}
              <span>
                {
                  filteredTasks.filter((task) => task.columnId === column.id)
                    .length
                }
              </span>
            </button>
          ))}
        </div>
      )}

      {view === "Board" ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragEnd={handleDragEnd}
        >
          <div className="board-columns">
            {columns.map((column, index) => (
              <BoardColumnView
                key={column.id}
                column={column}
                index={index}
                total={columns.length}
                active={activeColumn === column.id}
                projectName={project.name}
                tasks={filteredTasks.filter(
                  (task) => task.columnId === column.id,
                )}
                onOpenTask={setSelectedTask}
                onDeleteTask={(taskId) => {
                  if (window.confirm(`${t("Delete task")}? ${t("This cannot be undone.")}`))
                    deleteTask(taskId);
                }}
                onAddTask={() => {
                  setCreateOpen(true);
                }}
                onRename={renameColumn}
                onMove={moveColumn}
              />
            ))}
            {addingColumn ? (
              <form className="add-column-form" onSubmit={handleAddColumn}>
                <label htmlFor="new-column-title">New column name</label>
                <input
                  id="new-column-title"
                  autoFocus
                  value={newColumnTitle}
                  onChange={(event) => setNewColumnTitle(event.target.value)}
                  placeholder="e.g. QA"
                />
                <div>
                  <button
                    type="button"
                    className="button button-quiet"
                    onClick={() => {
                      setAddingColumn(false);
                      setNewColumnTitle("");
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="button button-primary">
                    Add column
                  </button>
                </div>
              </form>
            ) : (
              <button
                className="add-column-button"
                onClick={() => setAddingColumn(true)}
              >
                <Icon name="plus" size={16} /> Add column
              </button>
            )}
          </div>
        </DndContext>
      ) : (
        <div className="panel board-list-view">
          <div className="board-list-heading">
                <span>{t("Task")}</span>
                <span>{t("Status")}</span>
                <span>{t("Priority")}</span>
                <span>{t("Due date")}</span>
                <span>{t("Assignee")}</span>
          </div>
          {filteredTasks.map((task) => (
            <button
              type="button"
              className="board-list-row"
              key={task.id}
              onClick={() => setSelectedTask(task)}
            >
              <span>
                <strong>{task.title}</strong>
                <small>{task.description || "No description"}</small>
              </span>
              <span>
                {columns.find((column) => column.id === task.columnId)?.title}
              </span>
              <PriorityBadge priority={task.priority} />
              <span>
                {new Date(`${task.dueDate}T12:00:00`).toLocaleDateString(
                  "en-US",
                  { month: "short", day: "numeric" },
                )}
              </span>
              <span>
                {task.assignee ? (
                  <Avatar
                    initials={task.assignee.initials}
                    color={task.assignee.color}
                    size="sm"
                  />
                ) : (
                  "Unassigned"
                )}
              </span>
            </button>
          ))}
          {filteredTasks.length === 0 && (
            <div className="task-empty">{t("No tasks match these filters.")}</div>
          )}
        </div>
      )}

      <div className="board-footer">
        <span>
          <i className="live-dot" /> {t("Changes saved on this device")}
        </span>
        <span>
          {workspaceTasks.length} tasks{" "}
          <span className="footer-divider">·</span> {columns.length} columns
        </span>
      </div>

      {createOpen && (
        <TaskDialog
          workspaceId={workspace.id}
          projectName={project.name}
          columns={columns}
          profile={profile}
          onClose={() => setCreateOpen(false)}
          onSave={handleCreate}
        />
      )}
      {selectedTask && (
        <TaskDialog
          workspaceId={workspace.id}
          projectName={project.name}
          columns={columns}
          profile={profile}
          task={
            tasks.find((item) => item.id === selectedTask.id) ?? selectedTask
          }
          onClose={() => setSelectedTask(null)}
          onSave={(draft) => {
            updateTask(selectedTask.id, draft);
            setSelectedTask(null);
          }}
          onDelete={() => {
            deleteTask(selectedTask.id);
            setSelectedTask(null);
          }}
          onComment={(body) =>
            addComment(selectedTask.id, {
              id: crypto.randomUUID(),
              author: profile,
              body,
              createdAt: new Date().toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              }),
            })
          }
        />
      )}
    </div>
  );
}

function BoardColumnView({
  column,
  index,
  total,
  active,
  projectName,
  tasks,
  onOpenTask,
  onDeleteTask,
  onAddTask,
  onRename,
  onMove,
}: {
  column: BoardColumn;
  index: number;
  total: number;
  active: boolean;
  projectName: string;
  tasks: Task[];
  onOpenTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTask: () => void;
  onRename: (id: string, title: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
}) {
  const { t } = useLanguage();
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(column.title);

  function saveTitle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (title.trim()) onRename(column.id, title.trim());
    setEditing(false);
  }

  return (
    <section
      ref={setNodeRef}
      className={`board-column ${isOver ? "column-over" : ""} ${index === 0 ? "first-column" : ""} ${active ? "mobile-active" : ""}`}
      aria-label={`${column.title}, ${tasks.length} tasks`}
    >
      <header className="column-header">
        <span
          className="column-status-dot"
          style={{ backgroundColor: column.color }}
        />
        {editing ? (
          <form className="column-rename-form" onSubmit={saveTitle}>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              aria-label={t("Column name")}
              onBlur={() => {
                if (title.trim()) onRename(column.id, title.trim());
                setEditing(false);
              }}
            />
          </form>
        ) : (
          <h2>{t(column.title)}</h2>
        )}
        <span className="column-count">{tasks.length}</span>
        <div className="column-menu-wrap">
          <button
            className="icon-button column-menu-button"
            aria-label={`Options for ${column.title}`}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Icon name="more" size={16} />
          </button>
          {menuOpen && (
            <div className="column-menu">
              <button
                onClick={() => {
                  setEditing(true);
                  setMenuOpen(false);
                }}
              >
                {t("Rename column")}
              </button>
              <button
                disabled={index === 0}
                onClick={() => {
                  onMove(column.id, -1);
                  setMenuOpen(false);
                }}
              >
                {t("Move left")}
              </button>
              <button
                disabled={index === total - 1}
                onClick={() => {
                  onMove(column.id, 1);
                  setMenuOpen(false);
                }}
              >
                {t("Move right")}
              </button>
            </div>
          )}
        </div>
      </header>
      <SortableContext
        items={tasks.map((task) => task.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="column-task-list">
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              projectName={projectName}
              onClick={() => onOpenTask(task)}
              onDelete={() => onDeleteTask(task.id)}
            />
          ))}
          {tasks.length === 0 && (
            <div className="column-empty">{t("Drop a task here")}</div>
          )}
        </div>
      </SortableContext>
      <button className="column-add-task" onClick={onAddTask}>
        <Icon name="plus" size={15} /> {t("Add task")}
      </button>
    </section>
  );
}

function SortableTaskCard({
  task,
  projectName,
  onClick,
  onDelete,
}: {
  task: Task;
  projectName: string;
  onClick: () => void;
  onDelete: () => void;
}) {
  const { t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
  };
  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`task-card ${isDragging ? "dragging" : ""}`}
      {...attributes}
      {...listeners}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${task.title}, ${task.priority} priority`}
    >
      <div className="task-card-top">
        <span className="task-project-label">
          <i />
          {projectName.toUpperCase()}
        </span>
        <button
          className="card-more"
          aria-label="Task options"
          onClick={(event) => {
            event.stopPropagation();
            setMenuOpen((open) => !open);
          }}
          aria-expanded={menuOpen}
        >
          <Icon name="more" size={15} />
        </button>
        {menuOpen && (
          <div className="column-menu task-card-menu">
            <button
              onClick={(event) => {
                event.stopPropagation();
                setMenuOpen(false);
                onClick();
              }}
            >
              {t("Edit task")}
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation();
                setMenuOpen(false);
                onDelete();
              }}
            >
              {t("Delete task")}
            </button>
          </div>
        )}
      </div>
      <h3>{task.title}</h3>
      {task.description && <p>{task.description}</p>}
      <div className="task-card-meta">
        <PriorityBadge priority={task.priority} />
        <span className="task-card-due">
          <Icon name="clock" size={13} />
          {formatCardDate(task.dueDate)}
        </span>
      </div>
      <div className="task-card-footer">
        <span className="comment-count">
          <Icon name="comment" size={13} />
          {task.comments.length}
        </span>
        <span className="task-assignee">
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
    </article>
  );
}

function TaskDialog({
  workspaceId,
  projectName,
  columns,
  profile,
  task,
  onClose,
  onSave,
  onDelete,
  onComment,
}: {
  workspaceId: WorkspaceId;
  projectName: string;
  columns: BoardColumn[];
  profile: Assignee;
  task?: Task;
  onClose: () => void;
  onSave: (draft: TaskDraft) => void;
  onDelete?: () => void;
  onComment?: (body: string) => void;
}) {
  const { t } = useLanguage();
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [columnId, setColumnId] = useState(
    task?.columnId ?? columns[0]?.id ?? "",
  );
  const [priority, setPriority] = useState<Priority>(
    task?.priority ?? "Medium",
  );
  const [dueDate, setDueDate] = useState(task?.dueDate ?? "2026-11-30");
  const [assigneeId, setAssigneeId] = useState(task?.assignee?.id ?? "");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const members = [profile];
  const selectedAssignee =
    members.find((member) => member.id === assigneeId) ?? null;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      setError("Add a title to save this task.");
      return;
    }
    onSave({
      title: title.trim(),
      description: description.trim(),
      columnId,
      workspaceId,
      priority,
      dueDate,
      assignee: selectedAssignee,
    });
  }

  function submitComment() {
    const body = comment.trim();
    if (!body || !onComment) return;
    onComment(body);
    setComment("");
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
        aria-labelledby="task-dialog-title"
      >
        <header className="dialog-header">
          <div>
            <p className="eyebrow">
              {task ? t("TASK DETAILS") : t("NEW TASK")}{" "}
              <span className="eyebrow-dot" /> {projectName.toUpperCase()}
            </p>
            <h2 id="task-dialog-title">
              {task ? t("Edit task") : t("Create a task")}
            </h2>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label={t("Close")}
          >
            <Icon name="close" size={18} />
          </button>
        </header>
        <form onSubmit={submit} className="task-form">
          <label className="form-field">
            <span>{t("Task name")}</span>
            <input
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                setError("");
              }}
              placeholder={t("What needs to get done?")}
              autoFocus
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <label className="form-field">
            <span>{t("Description")}</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t("Add a little context for your team...")}
              rows={3}
            />
          </label>
          <div className="form-grid">
            <label className="form-field">
              <span>{t("Status")}</span>
              <select
                value={columnId}
                onChange={(event) => setColumnId(event.target.value)}
              >
                {columns.map((column) => (
                  <option key={column.id} value={column.id}>
                    {t(column.title)}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>{t("Priority")}</span>
              <select
                value={priority}
                onChange={(event) =>
                  setPriority(event.target.value as Priority)
                }
              >
                {priorities.map((item) => (
                  <option key={item}>{t(item)}</option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>{t("Assignee")}</span>
              <select
                value={assigneeId}
                onChange={(event) => setAssigneeId(event.target.value)}
              >
                <option value="">{t("Unassigned")}</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>{t("Due date")}</span>
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </label>
          </div>
          {task && (
            <div className="comments-section">
              <div className="comments-heading">
                <h3>{t("Comments")}</h3>
                <span>{task.comments.length}</span>
              </div>
              <div className="comments-list">
                {task.comments.length ? (
                  task.comments.map((item) => (
                    <div className="comment-item" key={item.id}>
                      <Avatar
                        initials={item.author.initials}
                        color={item.author.color}
                        size="sm"
                      />
                      <div>
                        <div className="comment-meta">
                          <strong>{item.author.name}</strong>
                          <span>{item.createdAt}</span>
                        </div>
                        <p>{item.body}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="no-comments">
                    {t("No comments yet. Start the conversation with your team.")}
                  </p>
                )}
              </div>
              <div className="comment-composer">
                <Avatar
                  initials={profile.initials}
                  color={profile.color}
                  size="sm"
                />
                <input
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder={t("Write a comment...")}
                  aria-label={t("Write a comment...")}
                />
                <button
                  type="button"
                  className="button button-primary"
                  disabled={!comment.trim()}
                  onClick={submitComment}
                >
                  {t("Send")}
                </button>
              </div>
            </div>
          )}
          <footer className="dialog-actions">
            {task && onDelete ? (
              <button
                type="button"
                className="button button-danger-text"
                onClick={onDelete}
              >
                {t("Delete task")}
              </button>
            ) : (
              <span className="dialog-hint">
                You can change these details later.
              </span>
            )}
            <div>
              <button
                type="button"
                className="button button-quiet"
                onClick={onClose}
              >
                {t("Cancel")}
              </button>
              <button type="submit" className="button button-primary">
                {task ? t("Save changes") : t("Create task")}
              </button>
            </div>
          </footer>
        </form>
      </section>
    </div>
  );
}

function formatCardDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
