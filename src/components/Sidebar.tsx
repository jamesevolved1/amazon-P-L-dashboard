import {
  BarChart3,
  ChevronLeft,
  FolderTree,
  LayoutDashboard,
  LineChart,
  Menu,
  Plus,
  Settings,
  Sparkles,
  UploadCloud,
  Users,
} from "lucide-react";
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
}: SidebarProps) {
  const activeClient = clients.find((client) => client.id === activeClientId) ?? clients[0];
  const addClient = () => {
    const name = window.prompt("Client name");
    const trimmed = name?.trim();
    if (trimmed) onAddClient(trimmed);
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
        <div className={collapsed ? "grid gap-2" : "flex items-center gap-2 rounded-2xl border border-white/10 bg-[#111F27] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"}>
          <button
            type="button"
            onClick={() => onSectionChange("clients")}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/10 transition hover:bg-brand"
            title="Client goals"
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
            onClick={addClient}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-black/20 ring-1 ring-white/15 transition hover:scale-105 hover:bg-deep"
            title="Add client"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
