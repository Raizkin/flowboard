"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import {
  initialColumns,
  initialTasks,
  projects as initialProjects,
  currentUser,
} from "@/lib/seed-data";
import type {
  BoardColumn,
  Project,
  Task,
  TaskComment,
  WorkspaceId,
} from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

type TaskDraft = Pick<
  Task,
  | "title"
  | "description"
  | "columnId"
  | "workspaceId"
  | "priority"
  | "dueDate"
  | "assignee"
> & { projectId?: string };
type BoardStore = {
  columns: BoardColumn[];
  tasks: Task[];
  projects: Project[];
  createTask: (draft: TaskDraft) => Task;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  moveTask: (taskId: string, columnId: string) => void;
  addColumn: (workspaceId: WorkspaceId, title: string) => void;
  initializeWorkspaceColumns: (workspaceId: WorkspaceId) => void;
  createProject: (
    workspaceId: WorkspaceId,
    name: string,
    description: string,
  ) => Project;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  deleteProject: (projectId: string) => void;
  renameColumn: (columnId: string, title: string) => void;
  moveColumn: (columnId: string, direction: -1 | 1) => void;
  addComment: (taskId: string, comment: TaskComment) => void;
  deleteTask: (taskId: string) => void;
};

const STORAGE_KEY = "flowboard.workspace.v4";
const BoardContext = createContext<BoardStore | null>(null);

export function BoardProvider({ children }: { children: React.ReactNode }) {
  const [columns, setColumns] = useState(initialColumns);
  const [tasks, setTasks] = useState(initialTasks);
  const [projects, setProjects] = useState(initialProjects);
  const [accountId, setAccountId] = useState("demo");
  const [loadedAccountId, setLoadedAccountId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      setAccountId(data.session?.user.id ?? "demo");
    })();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setAccountId(session?.user.id ?? "demo");
      },
    );
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const storageKey = `${STORAGE_KEY}:${accountId}`;
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as {
          columns?: BoardColumn[];
          tasks?: Task[];
          projects?: Project[];
        };
        if (parsed.columns?.length) setColumns(parsed.columns);
        if (parsed.tasks?.length) setTasks(parsed.tasks);
        if (parsed.projects?.length) setProjects(parsed.projects);
      } else {
        setColumns(initialColumns);
        setTasks(initialTasks);
        setProjects(initialProjects);
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, [accountId]);

  useEffect(() => {
    setLoadedAccountId(accountId);
  }, [accountId, columns, tasks, projects]);

  useEffect(() => {
    if (loadedAccountId === accountId)
      window.localStorage.setItem(
        `${STORAGE_KEY}:${accountId}`,
        JSON.stringify({ columns, tasks, projects }),
      );
  }, [columns, tasks, projects, loadedAccountId, accountId]);

  const createTask = useCallback((draft: TaskDraft) => {
    const task: Task = {
      ...draft,
      projectId: draft.projectId ?? "website",
      id: crypto.randomUUID(),
      comments: [],
    };
    setTasks((current) => [task, ...current]);
    return task;
  }, []);

  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId ? { ...task, ...updates } : task,
      ),
    );
  }, []);

  const moveTask = useCallback(
    (taskId: string, columnId: string) => updateTask(taskId, { columnId }),
    [updateTask],
  );

  const addColumn = useCallback((workspaceId: WorkspaceId, title: string) => {
    const id = crypto.randomUUID();
    setColumns((current) => {
      const nextOrder =
        Math.max(
          -1,
          ...current
            .filter((column) => column.workspaceId === workspaceId)
            .map((column) => column.order),
        ) + 1;
      return [
        ...current,
        { id, title, color: "#8b98aa", order: nextOrder, workspaceId },
      ];
    });
  }, []);

  const initializeWorkspaceColumns = useCallback((workspaceId: WorkspaceId) => {
    setColumns((current) => {
      if (current.some((column) => column.workspaceId === workspaceId))
        return current;
      return [
        ...current,
        {
          id: crypto.randomUUID(),
          title: "To do",
          color: "#a3adbd",
          order: 0,
          workspaceId,
        },
        {
          id: crypto.randomUUID(),
          title: "In progress",
          color: "#9f8cf4",
          order: 1,
          workspaceId,
        },
        {
          id: crypto.randomUUID(),
          title: "Done",
          color: "#59c99b",
          order: 2,
          workspaceId,
        },
      ];
    });
  }, []);

  const createProject = useCallback(
    (workspaceId: WorkspaceId, name: string, description: string) => {
      const project: Project = {
        id: crypto.randomUUID(),
        name: name.trim(),
        description: description.trim(),
        workspaceId,
        progress: 0,
        color: ["#58d6c8", "#a89afb", "#f0bd61", "#72d8a7"][
          projects.length % 4
        ],
        dueLabel: "No deadline",
        members: [currentUser],
      };
      setProjects((current) => [...current, project]);
      return project;
    },
    [projects.length],
  );

  const updateProject = useCallback(
    (projectId: string, updates: Partial<Project>) => {
      setProjects((current) =>
        current.map((project) =>
          project.id === projectId ? { ...project, ...updates } : project,
        ),
      );
    },
    [],
  );

  const deleteProject = useCallback((projectId: string) => {
    setProjects((current) =>
      current.filter((project) => project.id !== projectId),
    );
    setTasks((current) =>
      current.filter((task) => task.projectId !== projectId),
    );
  }, []);

  const renameColumn = useCallback((columnId: string, title: string) => {
    setColumns((current) =>
      current.map((column) =>
        column.id === columnId ? { ...column, title } : column,
      ),
    );
  }, []);

  const moveColumn = useCallback((columnId: string, direction: -1 | 1) => {
    setColumns((current) => {
      const column = current.find((item) => item.id === columnId);
      if (!column) return current;
      const siblings = current
        .filter((item) => item.workspaceId === column.workspaceId)
        .sort((a, b) => a.order - b.order);
      const index = siblings.findIndex((item) => item.id === columnId);
      const target = siblings[index + direction];
      if (!target) return current;
      return current.map((item) => {
        if (item.id === column.id) return { ...item, order: target.order };
        if (item.id === target.id) return { ...item, order: column.order };
        return item;
      });
    });
  }, []);

  const addComment = useCallback((taskId: string, comment: TaskComment) => {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? { ...task, comments: [...task.comments, comment] }
          : task,
      ),
    );
  }, []);

  const deleteTask = useCallback(
    (taskId: string) =>
      setTasks((current) => current.filter((task) => task.id !== taskId)),
    [],
  );

  const value = useMemo(
    () => ({
      columns,
      tasks,
      projects,
      createProject,
      updateProject,
      deleteProject,
      createTask,
      updateTask,
      moveTask,
      addColumn,
      initializeWorkspaceColumns,
      renameColumn,
      moveColumn,
      addComment,
      deleteTask,
    }),
    [
      columns,
      tasks,
      projects,
      createProject,
      updateProject,
      deleteProject,
      createTask,
      updateTask,
      moveTask,
      addColumn,
      initializeWorkspaceColumns,
      renameColumn,
      moveColumn,
      addComment,
      deleteTask,
    ],
  );
  return (
    <BoardContext.Provider value={value}>{children}</BoardContext.Provider>
  );
}

export function useBoard() {
  const context = useContext(BoardContext);
  if (!context) throw new Error("useBoard must be used within BoardProvider");
  return context;
}

export type { TaskDraft };
