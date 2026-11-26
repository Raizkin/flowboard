"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { currentUser, workspaces as defaultWorkspaces } from "@/lib/seed-data";
import type { Assignee, Workspace, WorkspaceId } from "@/lib/types";
import { Icon, type IconName } from "@/components/icons";
import { useBoard } from "@/lib/board-store";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/language";

type WorkspaceContextValue = {
  workspace: Workspace;
  workspaces: Workspace[];
  profile: Assignee;
  projectId: string;
  setWorkspaceId: (id: WorkspaceId) => void;
  setProjectId: (id: string) => void;
  createWorkspace: (name: string, kind: Workspace["kind"]) => void;
};
const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);
const navItems: {
  href: string;
  label: string;
  icon: IconName;
  group: "workspace" | "personal";
}[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: "dashboard",
    group: "workspace",
  },
  { href: "/my-tasks", label: "My Tasks", icon: "check", group: "workspace" },
  {
    href: "/projects",
    label: "Projects",
    icon: "projects",
    group: "workspace",
  },
  {
    href: "/calendar",
    label: "Calendar",
    icon: "calendar",
    group: "workspace",
  },
  { href: "/team", label: "Team", icon: "team", group: "workspace" },
  {
    href: "/notifications",
    label: "Notifications",
    icon: "bell",
    group: "personal",
  },
  { href: "/settings", label: "Settings", icon: "settings", group: "personal" },
];

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace must be used inside AppShell");
  return context;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const { projects } = useBoard();
  const [workspaceId, setWorkspaceId] = useState<WorkspaceId>("personal");
  const [projectId, setProjectId] = useState("website");
  const [workspaceList, setWorkspaceList] = useState(defaultWorkspaces);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [workspaceDialogOpen, setWorkspaceDialogOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [profile, setProfile] = useState<Assignee>(currentUser);
  const isDemo = profile.id === currentUser.id;
  const accountKey = profile.id;
  const workspace =
    workspaceList.find((item) => item.id === workspaceId) ?? workspaceList[0];

  useEffect(() => {
    if (isDemo) return;
    const storageKey = `flowboard.workspaces.v1:${accountKey}`;
    try {
      const stored = window.localStorage.getItem(storageKey);
      const parsed = stored
        ? (JSON.parse(stored) as Workspace[])
        : defaultWorkspaces;
      const cleanWorkspaces = parsed.filter((item) => item.id !== "northstar");
      setWorkspaceList(cleanWorkspaces.length ? cleanWorkspaces : defaultWorkspaces);
      const selected = window.localStorage.getItem(
        `flowboard.selected-workspace.v1:${accountKey}`,
      );
      if (selected && cleanWorkspaces.some((item) => item.id === selected))
        setWorkspaceId(selected);
      else setWorkspaceId(cleanWorkspaces[0]?.id ?? defaultWorkspaces[0].id);
      if (cleanWorkspaces.length !== parsed.length) {
        window.localStorage.setItem(storageKey, JSON.stringify(cleanWorkspaces));
      }
      const selectedProject = window.localStorage.getItem(
        `flowboard.selected-project.v1:${accountKey}`,
      );
      if (selectedProject) setProjectId(selectedProject);
    } catch {
      window.localStorage.removeItem(storageKey);
      setWorkspaceList(defaultWorkspaces);
      setWorkspaceId(defaultWorkspaces[0].id);
    }
  }, [accountKey, isDemo]);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      router.replace("/signup");
      return;
    }
    let active = true;
    const applyProfile = (
      user: {
        id: string;
        email?: string;
        user_metadata?: Record<string, unknown>;
      } | null,
    ) => {
      if (!user) {
        setAuthReady(false);
        router.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      const name =
        typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : (user.email?.split("@")[0] ?? "Flowboard member");
      const initials = name
        .split(/\s+/)
        .map((part) => part[0] ?? "")
        .join("")
        .slice(0, 2)
        .toUpperCase();
      setProfile({ id: user.id, name, initials, color: currentUser.color });
      setAuthReady(true);
    };
    void (async () => {
      const { data } = await supabase.auth.getUser();
      applyProfile(data.user);
    })();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
        (_event: AuthChangeEvent, session: Session | null) => {
          if (active) applyProfile(session?.user ?? null);
        },
    );
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router]);

  const selectProject = useCallback(
    (id: string) => {
      setProjectId(id);
      window.localStorage.setItem(
        `flowboard.selected-project.v1:${accountKey}`,
        id,
      );
    },
    [accountKey],
  );

  const selectWorkspace = useCallback(
    (id: WorkspaceId) => {
      setWorkspaceId(id);
      window.localStorage.setItem(
        `flowboard.selected-workspace.v1:${accountKey}`,
        id,
      );
      const firstProject = projects.find((item) => item.workspaceId === id);
      if (firstProject) selectProject(firstProject.id);
      setWorkspaceMenuOpen(false);
    },
    [accountKey, projects, selectProject],
  );

  const createWorkspace = useCallback(
    (name: string, kind: Workspace["kind"]) => {
      const cleanName = name.trim();
      if (!cleanName) return;
      const id = crypto.randomUUID();
      const created: Workspace = {
        id,
        name: cleanName,
        kind,
        initials: cleanName
          .split(/\s+/)
          .map((part) => part[0] ?? "")
          .join("")
          .slice(0, 2)
          .toUpperCase(),
      };
      setWorkspaceList((current) => {
        const next = [...current, created];
        window.localStorage.setItem(
          `flowboard.workspaces.v1:${accountKey}`,
          JSON.stringify(next),
        );
        return next;
      });
      selectWorkspace(id);
      setWorkspaceDialogOpen(false);
    },
    [accountKey, selectWorkspace],
  );

  const context = useMemo(
    () => ({
      workspace,
      workspaces: workspaceList,
      profile,
      projectId,
      setWorkspaceId: selectWorkspace,
      setProjectId: selectProject,
      createWorkspace,
    }),
    [
      workspace,
      workspaceList,
      profile,
      projectId,
      selectWorkspace,
      selectProject,
      createWorkspace,
    ],
  );

  async function signOut() {
    const supabase = createClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  if (!authReady) {
    return (
      <main className="auth-screen" aria-live="polite">
        <p>{t("Checking your account…")}</p>
      </main>
    );
  }

  return (
    <WorkspaceContext.Provider value={context}>
      <div className="app-frame">
        <aside className="sidebar" aria-label={t("Primary navigation")}>
          <Link className="brand" href="/dashboard" aria-label="Flowboard home">
            <span className="brand-mark">
              <span />
            </span>
            <span>
              flow<span className="brand-accent">board</span>
            </span>
          </Link>

          <WorkspaceSwitcher
            workspace={workspace}
            workspaces={workspaceList}
            open={workspaceMenuOpen}
            onToggle={() => setWorkspaceMenuOpen((open) => !open)}
            onSelect={selectWorkspace}
            onCreate={() => {
              setWorkspaceDialogOpen(true);
              setWorkspaceMenuOpen(false);
            }}
          />

          <nav className="side-nav">
            <p className="nav-caption">{t("WORKSPACE")}</p>
            {navItems
              .filter((item) => item.group === "workspace")
              .map((item) => (
                <NavLink key={item.href} {...item} label={t(item.label)} pathname={pathname} />
              ))}
            <div className="nav-divider" />
            <p className="nav-caption">{t("PERSONAL")}</p>
            {navItems
              .filter((item) => item.group === "personal")
              .map((item) => (
                <NavLink key={item.href} {...item} label={t(item.label)} pathname={pathname} />
              ))}
          </nav>

          <div className="sidebar-projects">
            <div className="sidebar-section-title">
              <span>{t("PROJECTS")}</span>
              <Link href="/projects" aria-label={t("Browse projects")}>
                <Icon name="plus" size={14} />
              </Link>
            </div>
            {projects
              .filter((item) => item.workspaceId === workspace.id)
              .slice(0, 4)
              .map((project) => (
                <Link
                  key={project.id}
                  href="/board"
                  className="favorite-link"
                  onClick={() => selectProject(project.id)}
                >
                  <span
                    className="favorite-dot"
                    style={{ backgroundColor: project.color }}
                  />
                  {project.name}
                </Link>
              ))}
          </div>

          <div className="sidebar-bottom">
            <Link href="/more" className="sidebar-help">
              <span className="help-icon">
                <Icon name="spark" size={16} />
              </span>
              <span>
                <strong>{t("Need a hand?")}</strong>
                <small>{t("Open workspace tools")}</small>
              </span>
              <Icon name="arrow" size={15} />
            </Link>
            <button className="user-profile" onClick={signOut} aria-label={t("Sign out")}>
              <Avatar initials={profile.initials} color={profile.color} />
              <span><strong>{profile.name}</strong><small>{t("Account · Sign out")}</small></span>
              <Icon name="logout" size={16} />
            </button>
          </div>
        </aside>

        <div className="app-main">
          <header className="topbar">
            <div className="mobile-brand">
              <Link className="brand" href="/dashboard">
                <span className="brand-mark">
                  <span />
                </span>
                <span>
                  flow<span className="brand-accent">board</span>
                </span>
              </Link>
            </div>
            <WorkspaceSwitcher
              compact
              workspace={workspace}
              workspaces={workspaceList}
              open={workspaceMenuOpen}
              onToggle={() => setWorkspaceMenuOpen((open) => !open)}
              onSelect={selectWorkspace}
              onCreate={() => {
                setWorkspaceDialogOpen(true);
                setWorkspaceMenuOpen(false);
              }}
            />
            <button
              className="global-search"
              onClick={() => setSearchOpen(true)}
              aria-label={t("Search")}
            >
              <Icon name="search" size={17} />
              <span>{t("Search anything...")}</span>
              <kbd>⌘ K</kbd>
            </button>
            <div className="topbar-actions">
              <div className="language-switch" role="group" aria-label={t("Language")}>
                <button type="button" aria-pressed={language === "en"} onClick={() => setLanguage("en")}>EN</button>
                <button type="button" aria-pressed={language === "uk"} onClick={() => setLanguage("uk")}>УКР</button>
              </div>
              <span className="system-status">
                <i />
                {t("All systems normal")}
              </span>
              <Link
                className="icon-button notification-button"
                href="/notifications"
                aria-label={t("Notifications")}
              >
                <Icon name="bell" size={18} />
                <span className="notification-dot" />
              </Link>
              <Avatar initials={profile.initials} color={profile.color} />
            </div>
          </header>
          <main className="page-content">{children}</main>
          <nav className="mobile-nav" aria-label={t("Mobile navigation")}>
            {[
              { href: "/dashboard", label: "Home", icon: "dashboard" as const },
              { href: "/board", label: "Board", icon: "projects" as const },
              { href: "/my-tasks", label: "Tasks", icon: "check" as const },
              { href: "/more", label: "More", icon: "dots" as const },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`mobile-nav-item ${pathname === item.href ? "active" : ""}`}
              >
                <Icon name={item.icon} size={20} />
                <span>{t(item.label)}</span>
              </Link>
            ))}
          </nav>
        </div>
        {workspaceDialogOpen && (
          <WorkspaceDialog
            onClose={() => setWorkspaceDialogOpen(false)}
            onCreate={createWorkspace}
          />
        )}
        {searchOpen && <SearchDialog onClose={() => setSearchOpen(false)} />}
      </div>
    </WorkspaceContext.Provider>
  );
}

function WorkspaceSwitcher({
  workspace,
  workspaces,
  open,
  onToggle,
  onSelect,
  onCreate,
  compact = false,
}: {
  workspace: Workspace;
  workspaces: Workspace[];
  open: boolean;
  onToggle: () => void;
  onSelect: (id: WorkspaceId) => void;
  onCreate: () => void;
  compact?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <div
      className={`workspace-switcher-wrap ${compact ? "mobile-workspace-wrap" : ""}`}
    >
      <button
        className={compact ? "mobile-workspace" : "workspace-switcher"}
        onClick={onToggle}
        aria-expanded={open}
        aria-label={`${t("Switch workspace")}. ${t("Current")}: ${t(workspace.name)}`}
      >
        <span className={`workspace-mark workspace-mark-${workspace.id}`}>
          {workspace.initials.slice(0, 1)}
        </span>
        {!compact && (
          <span className="workspace-label">
            <strong>{t(workspace.name)}</strong>
            <small>{t(workspace.kind)}</small>
          </span>
        )}
        <Icon name="chevron" size={compact ? 14 : 15} />
      </button>
      {open && (
        <div
          className={`workspace-menu ${compact ? "mobile-workspace-menu" : ""}`}
          role="menu"
        >
          {workspaces.map((option) => (
            <button
              key={option.id}
              role="menuitem"
              className="workspace-menu-item"
              onClick={() => onSelect(option.id)}
            >
              <span className={`workspace-mark workspace-mark-${option.id}`}>
                {option.initials.slice(0, 1)}
              </span>
              <span>
                <strong>{t(option.name)}</strong>
                <small>{t(option.kind)}</small>
              </span>
              {option.id === workspace.id && <span className="selected-dot" />}
            </button>
          ))}
          {!compact && (
            <button className="workspace-menu-footer" onClick={onCreate}>
              <Icon name="plus" size={15} /> {t("Create workspace")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function WorkspaceDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string, kind: Workspace["kind"]) => void;
}) {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Workspace["kind"]>("Team workspace");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onCreate(name, kind);
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
        className="task-dialog workspace-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-dialog-title"
      >
        <header className="dialog-header">
          <div>
            <p className="eyebrow">{t("YOUR WORKSPACES")}</p>
            <h2 id="workspace-dialog-title">{t("Create a workspace")}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label={t("Close")}>
            <Icon name="close" size={18} />
          </button>
        </header>
        <form className="task-form" onSubmit={submit}>
          <label className="form-field">
            <span>{t("Workspace name")}</span>
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("e.g. Studio North")}
              maxLength={80}
              required
            />
          </label>
          <label className="form-field">
            <span>{t("Workspace type")}</span>
            <select
              value={kind}
              onChange={(event) =>
                setKind(event.target.value as Workspace["kind"])
              }
            >
              <option value="Team workspace">{t("Team workspace")}</option>
              <option value="Personal workspace">{t("Personal workspace")}</option>
            </select>
          </label>
          <footer className="dialog-actions">
            <span className="dialog-hint">
              {t("You can invite teammates after setup.")}
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
                {t("Create workspace")}
              </button>
            </div>
          </footer>
        </form>
      </section>
    </div>
  );
}

function SearchDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { t } = useLanguage();
  const { workspaces, setWorkspaceId, setProjectId } = useWorkspace();
  const { tasks, projects } = useBoard();
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();
  const taskResults = normalized
    ? tasks
        .filter((task) => task.title.toLowerCase().includes(normalized))
        .slice(0, 5)
    : [];
  const projectResults = normalized
    ? projects
        .filter((project) => project.name.toLowerCase().includes(normalized))
        .slice(0, 4)
    : [];

  function openProject(workspaceId: string, projectId: string) {
    setWorkspaceId(workspaceId);
    setProjectId(projectId);
    onClose();
    router.push("/board");
  }

  return (
    <div
      className="modal-backdrop search-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="search-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t("Search Flowboard")}
      >
        <label className="search-dialog-input">
          <Icon name="search" size={18} />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("Search projects and tasks...")}
          />
          <button onClick={onClose} aria-label={t("Close search")}>
            <Icon name="close" size={16} />
          </button>
        </label>
        {normalized && (
          <div className="search-results">
            {projectResults.map((project) => (
              <button
                key={project.id}
                onClick={() => openProject(project.workspaceId, project.id)}
              >
                <span className="search-result-icon">
                  <Icon name="projects" size={16} />
                </span>
                <span>
                  <strong>{project.name}</strong>
                  <small>
                    {workspaces.find(
                      (workspace) => workspace.id === project.workspaceId,
                    )?.name ?? t("Workspace")}{" "}
                    · {t("Project")}
                  </small>
                </span>
                <Icon className="search-result-arrow" name="arrow" size={15} />
              </button>
            ))}
            {taskResults.map((task) => (
              <button
                key={task.id}
                onClick={() => openProject(task.workspaceId, task.projectId)}
              >
                <span className="search-result-icon">
                  <Icon name="check" size={16} />
                </span>
                <span>
                  <strong>{task.title}</strong>
                  <small>
                    {projects.find((project) => project.id === task.projectId)
                      ?.name ?? t("Project")}{" "}
                    · {t("Task")}
                  </small>
                </span>
                <Icon className="search-result-arrow" name="arrow" size={15} />
              </button>
            ))}
            {!projectResults.length && !taskResults.length && (
              <p>{t("No projects or tasks found.")}</p>
            )}
          </div>
        )}
        {!normalized && (
          <p className="search-hint">{t("Search by task or project name.")}</p>
        )}
      </section>
    </div>
  );
}

function NavLink({
  href,
  label,
  icon,
  pathname,
}: {
  href: string;
  label: string;
  icon: IconName;
  pathname: string;
}) {
  const active =
    pathname === href ||
    (href === "/projects" &&
      ["/board", "/project"].some((route) => pathname.startsWith(route)));
  return (
    <Link
      href={href}
      className={`nav-link ${active ? "active" : ""}`}
      aria-current={active ? "page" : undefined}
    >
      <Icon name={icon} size={17} />
      <span>{label}</span>
    </Link>
  );
}

export function Avatar({
  initials,
  color,
  size = "md",
}: {
  initials: string;
  color: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span
      className={`avatar avatar-${size}`}
      style={{ backgroundColor: color }}
      aria-label={initials}
    >
      {initials}
    </span>
  );
}
