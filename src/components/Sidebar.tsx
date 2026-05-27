import {
  BarChart3,
  ChevronLeft,
  FileSpreadsheet,
  FolderTree,
  LayoutDashboard,
  Menu,
  Plus,
  Settings,
  Sparkles,
  Trash2,
  UploadCloud,
  Users,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import type { AppSection, ClientAccount } from "../types/models";

interface SidebarProps {
  clients: ClientAccount[];
  activeClientId: string;
  collapsed: boolean;
  activeSection: AppSection;
  onToggleCollapsed: () => void;
  onSectionChange: (section: AppSection) => void;
  onSelectClient: (clientId: string) => void;
  onAddClient: (name: string) => void;
  onRemoveClient: (clientId: string) => void;
  onRenameClient: (clientId: string, name: string) => void;
}

const navItems: Array<{ id: AppSection; label: string; icon: typeof LayoutDashboard }> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "clients", label: "Clients", icon: Users },
  { id: "upload", label: "Upload Reports", icon: UploadCloud },
  { id: "sku-pnl", label: "SKU P&L", icon: FileSpreadsheet },
  { id: "parent-asin", label: "Parent ASIN P&L", icon: FolderTree },
  { id: "ad-potential", label: "Ad Potential", icon: Sparkles },
  { id: "performance", label: "Performance Review", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  clients,
  activeClientId,
  collapsed,
  activeSection,
  onToggleCollapsed,
  onSectionChange,
  onSelectClient,
  onAddClient,
  onRemoveClient,
  onRenameClient,
}: SidebarProps) {
  const [draft, setDraft] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [launcherOpen, setLauncherOpen] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const activeClient = clients.find((client) => client.id === activeClientId) ?? clients[0];

  const openLauncher = () => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setLauncherOpen(true);
  };

  const queueCloseLauncher = () => {
    if (addOpen || renaming) return;
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      setLauncherOpen(false);
      closeTimer.current = null;
    }, 220);
  };

  const addClient = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onAddClient(trimmed);
    setDraft("");
    setAddOpen(false);
    setLauncherOpen(false);
  };

  const renameClient = () => {
    if (!activeClient) return;
    const trimmed = renameDraft.trim();
    if (!trimmed) return;
    onRenameClient(activeClient.id, trimmed);
    setRenaming(false);
    setRenameDraft("");
    setLauncherOpen(false);
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 flex flex-col bg-ink text-white shadow-xl transition-[width] duration-200 ${
        collapsed ? "w-[76px]" : "w-[284px]"
      }`}
    >
      <div className="border-b border-white/10 px-4 py-5">
        <div className={`flex items-start ${collapsed ? "justify-center" : "justify-between gap-3"}`}>
          {!collapsed ? (
            <div>
              <div className="text-xs font-extrabold uppercase tracking-[0.18em] text-accent">Amazon Profit Ops</div>
              <div className="mt-2 text-2xl font-extrabold leading-tight">SKU P&L Center</div>
            </div>
          ) : null}
          <button
            onClick={onToggleCollapsed}
            className="rounded-full border border-white/15 p-2 text-white/80 hover:bg-white/10 hover:text-white"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <nav className="grid gap-2 px-3 py-5">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => onSectionChange(item.id)}
              className={`flex h-12 items-center gap-3 rounded-md px-3 text-sm font-extrabold transition ${
                activeSection === item.id ? "bg-brand text-white ring-1 ring-white/80" : "text-white/88 hover:bg-white/10"
              } ${collapsed ? "justify-center" : ""}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed ? <span>{item.label}</span> : null}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-white/10 p-3">
        <div
          className="relative"
          onMouseEnter={openLauncher}
          onMouseLeave={queueCloseLauncher}
          onFocus={openLauncher}
        >
          <div className={collapsed ? "grid gap-2" : "flex items-center gap-2 rounded-2xl border border-white/10 bg-[#111F27] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"}>
            <button
              type="button"
              onClick={() => onSectionChange("clients")}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/10 transition hover:bg-brand"
              title="Client workspace"
            >
              <Users className="h-5 w-5" />
            </button>
            {!collapsed ? (
              <button type="button" onClick={() => onSectionChange("clients")} className="min-w-0 flex-1 text-left">
                <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/45">Client</div>
                <div className="truncate text-sm font-extrabold text-white">{activeClient?.name ?? "No client"}</div>
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setLauncherOpen(true);
                setAddOpen(true);
                setRenaming(false);
              }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-black/20 ring-1 ring-white/15 transition hover:scale-105 hover:bg-deep"
              title="Add client"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>

          <div
            className={`absolute ${collapsed ? "bottom-0 left-full ml-3 w-80" : "bottom-full left-0 mb-3 w-full"} rounded-2xl border border-white/10 bg-[#14232B] p-3 text-left shadow-2xl ring-1 ring-white/10 transition ${
              launcherOpen || addOpen || renaming
                ? "pointer-events-auto translate-x-0 translate-y-0 opacity-100"
                : `pointer-events-none opacity-0 ${collapsed ? "-translate-x-2" : "translate-y-2"}`
            }`}
            onMouseEnter={openLauncher}
            onMouseLeave={queueCloseLauncher}
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div className="min-w-0">
                <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-accent">Client Workspace</div>
                <div className="mt-1 truncate text-base font-extrabold text-white">{activeClient?.name ?? "No client"}</div>
              </div>
              <button
                type="button"
                onClick={() => onSectionChange("clients")}
                className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-white/75 hover:bg-white/10 hover:text-white"
              >
                Goals
              </button>
            </div>

            <div className="mt-3 max-h-44 space-y-1 overflow-auto pr-1">
              {clients.map((client) => {
                const isActive = client.id === activeClientId;
                return (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => onSelectClient(client.id)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition ${
                      isActive ? "bg-brand text-white" : "text-white/80 hover:bg-white/8 hover:text-white"
                    }`}
                  >
                    <span className="min-w-0 truncate text-sm font-extrabold">{client.name}</span>
                    <span className={`h-2 w-2 shrink-0 rounded-full ${isActive ? "bg-white" : "bg-white/20"}`} />
                  </button>
                );
              })}
            </div>

            {renaming ? (
              <div className="mt-3 rounded-xl border border-white/10 bg-[#0B151B] p-2">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/45">Rename active client</div>
                  <button
                    type="button"
                    onClick={() => {
                      setRenaming(false);
                      setRenameDraft("");
                    }}
                    className="rounded-full p-1 text-white/45 hover:bg-white/10 hover:text-white"
                    aria-label="Cancel rename"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    autoFocus
                    className="min-w-0 flex-1 rounded-lg border border-white/15 bg-[#071015] px-3 py-2 text-sm font-bold text-white outline-none placeholder:text-white/35 focus:border-brand"
                    value={renameDraft}
                    onChange={(event) => setRenameDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") renameClient();
                      if (event.key === "Escape") setRenaming(false);
                    }}
                  />
                  <button type="button" onClick={renameClient} className="rounded-lg bg-brand px-3 py-2 text-sm font-extrabold text-white hover:bg-deep">
                    Save
                  </button>
                </div>
              </div>
            ) : null}

            {addOpen ? (
              <div className="mt-3 rounded-xl border border-brand/35 bg-[#0B151B] p-2">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-accent">New client</div>
                  <button
                    type="button"
                    onClick={() => {
                      setAddOpen(false);
                      setDraft("");
                    }}
                    className="rounded-full p-1 text-white/45 hover:bg-white/10 hover:text-white"
                    aria-label="Close add client"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    autoFocus
                    className="min-w-0 flex-1 rounded-lg border border-white/15 bg-[#071015] px-3 py-2 text-sm font-bold text-white outline-none placeholder:text-white/35 focus:border-brand"
                    placeholder="Client name"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") addClient();
                      if (event.key === "Escape") {
                        setAddOpen(false);
                        setDraft("");
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={addClient}
                    disabled={!draft.trim()}
                    className="rounded-lg bg-brand px-3 py-2 text-white shadow-sm ring-1 ring-white/10 transition hover:bg-deep disabled:cursor-not-allowed disabled:bg-white/15"
                    aria-label="Add client"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : null}

            <div className="mt-3 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setRenaming(true);
                  setAddOpen(false);
                  setRenameDraft(activeClient?.name ?? "");
                }}
                className="flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-center text-xs font-extrabold uppercase tracking-wide text-white/80 hover:bg-white/10"
              >
                Rename
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddOpen(true);
                  setRenaming(false);
                }}
                className="flex items-center justify-center rounded-lg bg-brand px-2 py-2 text-center text-xs font-extrabold uppercase tracking-wide text-white hover:bg-deep"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => activeClient && clients.length > 1 && onRemoveClient(activeClient.id)}
                disabled={!activeClient || clients.length <= 1}
                className="flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-center text-xs font-extrabold uppercase tracking-wide text-white/70 hover:border-red-300/40 hover:bg-red-500/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="Remove active client"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
