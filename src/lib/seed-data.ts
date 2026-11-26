import type { Assignee, BoardColumn, Workspace } from "@/lib/types";

// These are empty starting workspaces only. User data is loaded per signed-in account.
export const workspaces: Workspace[] = [
  {
    id: "personal",
    name: "Personal",
    kind: "Personal workspace",
    initials: "P",
  },
];

// Used only as an initial loading placeholder; AppShell stays hidden until auth resolves.
export const currentUser: Assignee = {
  id: "member",
  name: "Flowboard member",
  initials: "FM",
  color: "#a89afb",
};

export const initialColumns: BoardColumn[] = [
  {
    id: "todo",
    title: "To do",
    color: "#a3adbd",
    order: 0,
    workspaceId: "personal",
  },
  {
    id: "in-progress",
    title: "In progress",
    color: "#9f8cf4",
    order: 1,
    workspaceId: "personal",
  },
  {
    id: "done",
    title: "Done",
    color: "#59c99b",
    order: 2,
    workspaceId: "personal",
  },
];
