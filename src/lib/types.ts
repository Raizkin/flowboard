export type Priority = "Urgent" | "High" | "Medium" | "Low";

export type WorkspaceId = string;

export type BoardColumn = {
  id: string;
  title: string;
  color: string;
  order: number;
  workspaceId: WorkspaceId;
};

export type Assignee = {
  id: string;
  name: string;
  initials: string;
  color: string;
};

export type TaskComment = {
  id: string;
  author: Assignee;
  body: string;
  createdAt: string;
};

export type Task = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  columnId: string;
  workspaceId: WorkspaceId;
  priority: Priority;
  dueDate: string;
  assignee: Assignee | null;
  comments: TaskComment[];
};

export type Project = {
  id: string;
  name: string;
  description: string;
  workspaceId: WorkspaceId;
  progress: number;
  color: string;
  dueLabel: string;
  members: Assignee[];
};

export type Workspace = {
  id: WorkspaceId;
  name: string;
  kind: "Team workspace" | "Personal workspace";
  initials: string;
};
