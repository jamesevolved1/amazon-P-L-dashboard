import {
  BarChart3,
  Check,
  ChevronLeft,
  FolderTree,
  LayoutDashboard,
  LineChart,
  Menu,
  Pencil,
  Plus,
  Settings,
  Sparkles,
  Trash2,
  UploadCloud,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
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
  { id: "reporting", label: "Reporting Dashboard", icon: LineChart },
  { id: "dashboard", label: "P&L Dashboard", icon: LayoutDashboard },
  { id: "parent-asin", label: "Parent ASIN P&L", icon: FolderTree },
  { id: "ad-potential", label: "Ad Potential", icon: Sparkles },
  { id: "performance", label: "Performance Review", icon: BarChart3 },
  { id: "upload", label: "Upload Reports", icon: UploadCloud },
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
  const activeClient = clients.find((client) => client.id === activeClientId) ?? clients[0];
  const [clientPanelOpen, setClientPanelOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [renameClientId, setRenameClientId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");
  const [deleteClientId, setDeleteClientId] = useState<string | null>(null);
  const [deleteText, setDeleteText] = useState("");

  const addClient = () => {
    const trimmed = newClientName.trim();
    if (!trimmed) return;
    onAddClient(trimmed);
    setNewClientName("");
    setClientPanelOpen(true);
  };

  const startRename = (client: ClientAccount) => {
    setRenameClientId(client.id);
    setRenameName(client.name);
    setDeleteClientId(null);
    setDeleteText("");
  };

  const saveRename = () => {
    const trimmed = renameName.trim();
    if (renameClientId && trimmed) onRenameClient(renameClientId, trimmed);
    setRenameClientId(null);
    setRenameName("");
  };

  const startDelete = (clientId: string) => {
    setDeleteClientId(clientId);
    setDeleteText("");
    setRenameClientId(null);
  };

  const confirmDelete = () => {
    if (!deleteClientId || deleteText !== "DELETE") return;
    onRemoveClient(deleteClientId);
    setDeleteClientId(null);
    setDeleteText("");
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

      <div className="relative mt-auto border-t border-white/10 p-3">
        {clientPanelOpen ? (
          <div
            className={`absolute z-50 w-[340px] overflow-hidden rounded-2xl border border-white/12 bg-[#0E1A20] text-white shadow-2xl ring-1 ring-black/10 ${
              collapsed ? "bottom-4 left-[86px]" : "bottom-[92px] left-3"
            }`}
          >
            <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-accent">Client Workspace</div>
                <div className="mt-1 text-base font-extrabold">{activeClient?.name ?? "No client selected"}</div>
              </div>
              <button
                type="button"
                onClick={() => setClientPanelOpen(false)}
                className="rounded-full border border-white/10 p-2 text-white/65 transition hover:bg-white/10 hover:text-white"
                aria-label="Close client switcher"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 p-3">
              <div className="max-h-56 overflow-y-auto pr-1">
                {clients.map((client) => {
                  const isActive = client.id === activeClientId;
                  const isRenaming = renameClientId === client.id;
                  const isDeleting = deleteClientId === client.id;
                  return (
                    <div key={client.id} className={`rounded-xl border p-2.5 ${isActive ? "border-brand bg-brand/15" : "border-white/8 bg-white/[0.03]"}`}>
                      <div className="flex items-center gap-2">
                        {isRenaming ? (
                          <input
                            value={renameName}
                            onChange={(event) => setRenameName(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") saveRename();
                              if (event.key === "Escape") setRenameClientId(null);
                            }}
                            className="min-w-0 flex-1 rounded-lg border border-white/15 bg-[#071116] px-3 py-2 text-sm font-bold text-white outline-none focus:border-accent"
                            autoFocus
                            aria-label="Rename client"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectClient(client.id);
                              setClientPanelOpen(false);
                            }}
                            className="min-w-0 flex-1 text-left"
                          >
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm font-extrabold">{client.name}</span>
                              {isActive ? <span className="h-2 w-2 rounded-full bg-accent" /> : null}
                            </div>
                            <div className="mt-0.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/40">
                              {client.marketplace ?? "Amazon US"}
                            </div>
                          </button>
                        )}

                        {isRenaming ? (
                          <button
                            type="button"
                            onClick={saveRename}
                            className="rounded-lg bg-emerald-500 p-2 text-white transition hover:bg-emerald-400"
                            aria-label="Save renamed client"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startRename(client)}
                            className="rounded-lg border border-white/10 p-2 text-white/65 transition hover:bg-white/10 hover:text-white"
                            aria-label={`Rename ${client.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}

                        {clients.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => startDelete(client.id)}
                            className="rounded-lg border border-red-300/20 p-2 text-red-100 transition hover:bg-red-500/15"
                            aria-label={`Delete ${client.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>

                      {isDeleting ? (
                        <div className="mt-3 rounded-lg border border-red-300/25 bg-red-500/10 p-3">
                          <div className="text-xs font-bold text-red-50">Type DELETE to remove this client.</div>
                          <div className="mt-2 flex gap-2">
                            <input
                              value={deleteText}
                              onChange={(event) => setDeleteText(event.target.value)}
                              className="min-w-0 flex-1 rounded-lg border border-red-200/25 bg-[#071116] px-3 py-2 text-sm font-bold text-white outline-none focus:border-red-200"
                              placeholder="DELETE"
                              aria-label="Delete confirmation"
                            />
                            <button
                              type="button"
                              onClick={confirmDelete}
                              disabled={deleteText !== "DELETE"}
                              className="rounded-lg bg-red-600 px-3 py-2 text-xs font-extrabold uppercase text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <div className="rounded-xl border border-white/10 bg-[#071116] p-3">
                <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/45">Add Client</div>
                <div className="mt-2 flex gap-2">
                  <input
                    value={newClientName}
                    onChange={(event) => setNewClientName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") addClient();
                    }}
                    className="min-w-0 flex-1 rounded-lg border border-white/12 bg-[#0E1A20] px-3 py-2 text-sm font-bold text-white outline-none placeholder:text-white/35 focus:border-accent"
                    placeholder="Client name"
                    aria-label="New client name"
                  />
                  <button
                    type="button"
                    onClick={addClient}
                    disabled={!newClientName.trim()}
                    className="rounded-lg bg-brand px-4 py-2 text-sm font-extrabold text-white transition hover:bg-deep disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className={collapsed ? "grid gap-2" : "rounded-2xl border border-white/10 bg-[#101C23] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"}>
          <div className={collapsed ? "grid gap-2" : "flex items-center gap-2"}>
          <button
            type="button"
            onClick={() => setClientPanelOpen((value) => !value)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/8 text-white ring-1 ring-white/10 transition hover:bg-brand"
            title="Switch clients"
          >
            <Users className="h-5 w-5" />
          </button>
          {!collapsed ? (
            <button type="button" onClick={() => setClientPanelOpen((value) => !value)} className="min-w-0 flex-1 text-left">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/45">Client</div>
              <div className="truncate text-sm font-extrabold text-white">{activeClient?.name ?? "No client"}</div>
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setClientPanelOpen(true);
              setNewClientName("");
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-sm ring-1 ring-white/15 transition hover:-translate-y-0.5 hover:bg-deep"
            title="Add client"
          >
            <Plus className="h-4 w-4" />
          </button>
          </div>
          {!collapsed ? (
            <button
              type="button"
              onClick={() => onSectionChange("clients")}
              className="mt-2 w-full rounded-lg border border-white/8 bg-[#0B151B] px-2.5 py-1.5 text-left text-[11px] font-bold text-white/55 transition hover:border-white/15 hover:text-white/80"
            >
              Open goals and targets
            </button>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
