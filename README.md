# Flowboard

Responsive project workspace prototype built with Next.js App Router, TypeScript, Tailwind CSS, dnd-kit, and Recharts.

## Start locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Demo tasks and custom board columns are saved in browser local storage.

## Supabase foundation

The workspace, membership, project, column, task, and comment schema with row-level security policies is in `supabase/schema.sql`. Apply it to a Supabase project before wiring authentication, server-side invitations, and cloud persistence. Inviting members in the current UI is a local demo interaction; it does not send email.

## MVP screens

- Dashboard scoped to the selected workspace.
- Kanban board with drag and drop, editable tasks, custom columns, assignees, priorities, due dates, and task comments.
- My Tasks aggregation across all workspaces.
- Projects, calendar, team, notifications, and settings screens.
- Responsive sidebar and bottom navigation for tablet and phone layouts.
