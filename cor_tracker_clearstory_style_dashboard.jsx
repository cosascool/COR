import React, { useEffect, useMemo, useReducer, useState } from "react";
import { Download, Upload, Plus, Filter, Search, FileText, Calendar, Tag, Building2, DollarSign, ArrowUpDown, X, CheckCircle2, Clock, Ban, ChevronDown, ChevronUp, RefreshCw, ListChecks, KanbanSquare } from "lucide-react";

// =============================================
// Clearstory-inspired COR Tracker (client-side)
// - TailwindCSS UI, no backend required
// - LocalStorage persistence
// - CSV import/export
// - Table + Kanban views
// - Filters, sort, quick stats, and modal forms
// =============================================

// Types
export type Status =
  | "Draft"
  | "Submitted"
  | "Pending Review"
  | "Pending RFI"
  | "Approved"
  | "Rejected"
  | "Void";

export type Priority = "Low" | "Medium" | "High";

export interface CORRow {
  id: string; // internal id
  corNumber: string; // external id visible to subs/owner
  title: string;
  subcontractor: string;
  trade: string;
  submittedAt?: string; // ISO
  dueAt?: string; // ISO (optional)
  status: Status;
  priority: Priority;
  amount: number; // in base currency
  ownerRef?: string; // Owner/AE reference number
  rfi?: string; // RFI # reference
  tags: string[];
  notes?: string;
  attachments?: number; // count for demo
  createdAt: string; // ISO
}

// Demo seed
const seedRows: CORRow[] = [
  {
    id: cryptoRandomId(),
    corNumber: "COR-001",
    title: "Add blocking at restroom accessories",
    subcontractor: "Certified Carpentry",
    trade: "Carpentry",
    submittedAt: isoDaysAgo(18),
    dueAt: isoDaysAhead(12),
    status: "Pending Review",
    priority: "Medium",
    amount: 5625,
    ownerRef: "PCO-40",
    rfi: "RFI-54",
    tags: ["Phase 1", "Restrooms"],
    notes: "Scope clarified on RFI-54; outside IFC E-sheets.",
    attachments: 3,
    createdAt: isoDaysAgo(21),
  },
  {
    id: cryptoRandomId(),
    corNumber: "COR-002",
    title: "Lighting control at corridor and restrooms",
    subcontractor: "Access Electric",
    trade: "Electrical",
    submittedAt: isoDaysAgo(7),
    dueAt: isoDaysAhead(5),
    status: "Submitted",
    priority: "High",
    amount: 18640,
    ownerRef: "COR-15",
    rfi: "RFI-54",
    tags: ["Lighting", "Controls"],
    notes: "Split from COR-7R (IFC scope).",
    attachments: 5,
    createdAt: isoDaysAgo(10),
  },
  {
    id: cryptoRandomId(),
    corNumber: "COR-003",
    title: "Seal coat church parking (15% pothole repair)",
    subcontractor: "CM Paving",
    trade: "Paving",
    submittedAt: isoDaysAgo(3),
    dueAt: isoDaysAhead(14),
    status: "Draft",
    priority: "Low",
    amount: 134000,
    ownerRef: "Alt-Paving-B",
    rfi: undefined,
    tags: ["Alt", "Pricing"],
    notes: "Assumes 10-11 $/SF rate.",
    attachments: 1,
    createdAt: isoDaysAgo(4),
  },
  {
    id: cryptoRandomId(),
    corNumber: "COR-004",
    title: "Grind & overlay church lot",
    subcontractor: "CM Paving",
    trade: "Paving",
    submittedAt: isoDaysAgo(20),
    dueAt: isoDaysAhead(2),
    status: "Pending RFI",
    priority: "Medium",
    amount: 175000,
    ownerRef: "Alt-Paving-A",
    rfi: "RFI-77",
    tags: ["Alt"],
    notes: "Awaiting owner decision.",
    attachments: 2,
    createdAt: isoDaysAgo(22),
  },
  {
    id: cryptoRandomId(),
    corNumber: "COR-005",
    title: "Additional FRP at classrooms",
    subcontractor: "Letner Coatings",
    trade: "Finishes",
    submittedAt: isoDaysAgo(30),
    dueAt: isoDaysAhead(1),
    status: "Approved",
    priority: "High",
    amount: 24890,
    ownerRef: "PCO-33",
    rfi: undefined,
    tags: ["Phase 1"],
    notes: "Approved per OAC 9/10.",
    attachments: 4,
    createdAt: isoDaysAgo(35),
  },
];

// Reducer for rows
interface State {
  rows: CORRow[];
  view: "table" | "kanban";
  sortBy: keyof CORRow | "agingDays" | "amount";
  sortDir: "asc" | "desc";
  filters: {
    q: string;
    status: Status[];
    trades: string[];
    subs: string[];
    tags: string[];
    minAmt?: number;
    maxAmt?: number;
    aging: "any" | ">30" | ">60" | ">90";
  };
}

type Action =
  | { type: "init"; payload: CORRow[] }
  | { type: "add"; payload: CORRow }
  | { type: "update"; id: string; payload: Partial<CORRow> }
  | { type: "delete"; id: string }
  | { type: "sort"; by: State["sortBy"] }
  | { type: "toggle_view" }
  | { type: "set_filters"; payload: Partial<State["filters"]> }
  | { type: "reset_filters" }
  | { type: "overwrite"; payload: CORRow[] };

const initialState: State = {
  rows: [],
  view: "table",
  sortBy: "createdAt",
  sortDir: "desc",
  filters: { q: "", status: [], trades: [], subs: [], tags: [], aging: "any" },
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "init": {
      return { ...state, rows: action.payload };
    }
    case "overwrite": {
      return { ...state, rows: action.payload };
    }
    case "add": {
      return { ...state, rows: [action.payload, ...state.rows] };
    }
    case "update": {
      return {
        ...state,
        rows: state.rows.map((r) => (r.id === action.id ? { ...r, ...action.payload } : r)),
      };
    }
    case "delete": {
      return { ...state, rows: state.rows.filter((r) => r.id !== action.id) };
    }
    case "sort": {
      const sortDir = state.sortBy === action.by ? (state.sortDir === "asc" ? "desc" : "asc") : "asc";
      return { ...state, sortBy: action.by, sortDir };
    }
    case "toggle_view": {
      return { ...state, view: state.view === "table" ? "kanban" : "table" };
    }
    case "set_filters": {
      return { ...state, filters: { ...state.filters, ...action.payload } };
    }
    case "reset_filters": {
      return { ...state, filters: initialState.filters };
    }
    default:
      return state;
  }
}

// Helpers
function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}
function isoDaysAhead(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}
function cryptoRandomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return (crypto as any).randomUUID();
  return Math.random().toString(36).slice(2);
}
function fmtCurrency(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}
function daysBetween(a?: string, b?: string) {
  if (!a) return 0;
  const d1 = new Date(a).getTime();
  const d2 = b ? new Date(b).getTime() : Date.now();
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
}

// CSV helpers (simple, no quotes/escapes for brevity)
function rowsToCSV(rows: CORRow[]): string {
  const header = [
    "corNumber",
    "title",
    "subcontractor",
    "trade",
    "submittedAt",
    "dueAt",
    "status",
    "priority",
    "amount",
    "ownerRef",
    "rfi",
    "tags",
    "notes",
  ].join(",");
  const lines = rows.map((r) =>
    [
      r.corNumber,
      r.title,
      r.subcontractor,
      r.trade,
      r.submittedAt ?? "",
      r.dueAt ?? "",
      r.status,
      r.priority,
      r.amount,
      r.ownerRef ?? "",
      r.rfi ?? "",
      r.tags.join("|"),
      (r.notes ?? "").replace(/\n/g, " "),
    ]
      .map((v) => `"${String(v).replace(/"/g, '"')}"`)
      .join(",")
  );
  return [header, ...lines].join("\n");
}

function csvToRows(csv: string): CORRow[] {
  const [headerLine, ...rest] = csv.split(/\r?\n/).filter(Boolean);
  const headers = headerLine.split(",").map((h) => h.replace(/^"|"$/g, ""));
  const get = (obj: Record<string, string>, key: string) => obj[key] ?? "";
  const rows: CORRow[] = [];
  for (const line of rest) {
    // naive CSV split respecting simple quoted commas
    const cols = parseCSVLine(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => (obj[h] = (cols[i] ?? "").replace(/^"|"$/g, "")));
    rows.push({
      id: cryptoRandomId(),
      corNumber: get(obj, "corNumber"),
      title: get(obj, "title"),
      subcontractor: get(obj, "subcontractor"),
      trade: get(obj, "trade"),
      submittedAt: get(obj, "submittedAt") || undefined,
      dueAt: get(obj, "dueAt") || undefined,
      status: (get(obj, "status") as Status) || "Draft",
      priority: (get(obj, "priority") as Priority) || "Medium",
      amount: Number(get(obj, "amount") || 0),
      ownerRef: get(obj, "ownerRef") || undefined,
      rfi: get(obj, "rfi") || undefined,
      tags: (get(obj, "tags") || "").split("|").filter(Boolean),
      notes: get(obj, "notes") || undefined,
      attachments: 0,
      createdAt: new Date().toISOString(),
    });
  }
  return rows;
}

function parseCSVLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQ = !inQ;
      }
    } else if (ch === "," && !inQ) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

// Persistence
const STORAGE_KEY = "cor-tracker-rows-v1";

function usePersistentRows(initial: CORRow[]) {
  const [state, dispatch] = useReducer(reducer, initialState);
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const saved: CORRow[] = JSON.parse(raw);
        dispatch({ type: "init", payload: saved });
        return;
      } catch {}
    }
    dispatch({ type: "init", payload: initial });
  }, [initial]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.rows));
  }, [state.rows]);
  return [state, dispatch] as const;
}

// Status UI helpers
const statusStyles: Record<Status, string> = {
  Draft: "bg-gray-100 text-gray-700 border-gray-200",
  Submitted: "bg-blue-50 text-blue-700 border-blue-200",
  "Pending Review": "bg-amber-50 text-amber-700 border-amber-200",
  "Pending RFI": "bg-purple-50 text-purple-700 border-purple-200",
  Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Rejected: "bg-rose-50 text-rose-700 border-rose-200",
  Void: "bg-slate-100 text-slate-600 border-slate-200",
};

const statusIcon: Record<Status, React.ReactNode> = {
  Draft: <FileText className="h-3.5 w-3.5" />,
  Submitted: <Upload className="h-3.5 w-3.5" />,
  "Pending Review": <Clock className="h-3.5 w-3.5" />,
  "Pending RFI": <ListChecks className="h-3.5 w-3.5" />,
  Approved: <CheckCircle2 className="h-3.5 w-3.5" />,
  Rejected: <Ban className="h-3.5 w-3.5" />,
  Void: <Ban className="h-3.5 w-3.5" />,
};

// Main App
export default function App() {
  const [state, dispatch] = usePersistentRows(seedRows);
  const [showNew, setShowNew] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const filtered = useMemo(() => {
    const q = state.filters.q.trim().toLowerCase();
    return state.rows
      .filter((r) => {
        if (q) {
          const blob = `${r.corNumber} ${r.title} ${r.subcontractor} ${r.trade} ${r.ownerRef ?? ""} ${r.rfi ?? ""} ${r.tags.join(" ")}`.toLowerCase();
          if (!blob.includes(q)) return false;
        }
        if (state.filters.status.length && !state.filters.status.includes(r.status)) return false;
        if (state.filters.trades.length && !state.filters.trades.includes(r.trade)) return false;
        if (state.filters.subs.length && !state.filters.subs.includes(r.subcontractor)) return false;
        if (state.filters.tags.length && !r.tags.some((t) => state.filters.tags.includes(t))) return false;
        if (state.filters.minAmt != null && r.amount < state.filters.minAmt!) return false;
        if (state.filters.maxAmt != null && r.amount > state.filters.maxAmt!) return false;
        const age = daysBetween(r.submittedAt);
        if (state.filters.aging === ">30" && age <= 30) return false;
        if (state.filters.aging === ">60" && age <= 60) return false;
        if (state.filters.aging === ">90" && age <= 90) return false;
        return true;
      })
      .sort((a, b) => {
        const dir = state.sortDir === "asc" ? 1 : -1;
        const key = state.sortBy;
        let va: any;
        let vb: any;
        if (key === "agingDays") {
          va = daysBetween(a.submittedAt);
          vb = daysBetween(b.submittedAt);
        } else if (key === "amount") {
          va = a.amount;
          vb = b.amount;
        } else {
          // @ts-ignore
          va = a[key];
          // @ts-ignore
          vb = b[key];
        }
        if (va == null && vb == null) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        return va > vb ? dir : va < vb ? -dir : 0;
      });
  }, [state]);

  const trades = useMemo(() => Array.from(new Set(state.rows.map((r) => r.trade))).sort(), [state.rows]);
  const subs = useMemo(() => Array.from(new Set(state.rows.map((r) => r.subcontractor))).sort(), [state.rows]);
  const tags = useMemo(() => Array.from(new Set(state.rows.flatMap((r) => r.tags))).sort(), [state.rows]);

  const kpis = useMemo(() => {
    const open = state.rows.filter((r) => !["Approved", "Rejected", "Void"].includes(r.status));
    const pendingValue = open.reduce((s, r) => s + r.amount, 0);
    const over30 = open.filter((r) => daysBetween(r.submittedAt) > 30).length;
    const over60 = open.filter((r) => daysBetween(r.submittedAt) > 60).length;
    const over90 = open.filter((r) => daysBetween(r.submittedAt) > 90).length;
    return { openCount: open.length, pendingValue, over30, over60, over90 };
  }, [state.rows]);

  function handleExport() {
    const csv = rowsToCSV(state.rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CORs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      try {
        const rows = csvToRows(text);
        dispatch({ type: "overwrite", payload: [...rows, ...state.rows] });
        setShowImport(false);
      } catch (e) {
        alert("Import failed. Please check your CSV headers.");
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 text-slate-800">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 backdrop-blur bg-white/70 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2 font-semibold text-xl">
            <Building2 className="h-6 w-6" />
            <span>COR Tracker</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => dispatch({ type: "toggle_view" })} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm">
              {state.view === "table" ? <><KanbanSquare className="h-4 w-4"/> Kanban</> : <><ListChecks className="h-4 w-4"/> Table</>}
            </button>
            <button onClick={() => setShowImport(true)} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm">
              <Upload className="h-4 w-4" /> Import CSV
            </button>
            <button onClick={handleExport} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm">
              <Download className="h-4 w-4" /> Export CSV
            </button>
            <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-sm text-sm rounded-2xl">
              <Plus className="h-4 w-4" /> New COR
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-12 gap-6">
        {/* Filters */}
        <aside className="col-span-12 lg:col-span-3 space-y-4">
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 text-slate-600 mb-3 font-medium"><Filter className="h-4 w-4"/> Filters</div>
            <div className="relative mb-3">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400"/>
              <input value={state.filters.q} onChange={(e)=>dispatch({type:"set_filters", payload:{q:e.target.value}})} className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300" placeholder="Search COR #, sub, tags..."/>
            </div>
            <div className="space-y-2">
              <Label>Statuses</Label>
              <MultiPills
                options={["Draft","Submitted","Pending Review","Pending RFI","Approved","Rejected","Void"]}
                values={state.filters.status}
                onChange={(v)=>dispatch({type:"set_filters", payload:{status:v as Status[]}})}
              />
            </div>
            <div className="mt-3 space-y-2">
              <Label>Trades</Label>
              <MultiPills options={trades} values={state.filters.trades} onChange={(v)=>dispatch({type:"set_filters", payload:{trades:v}})} />
            </div>
            <div className="mt-3 space-y-2">
              <Label>Subcontractors</Label>
              <MultiPills options={subs} values={state.filters.subs} onChange={(v)=>dispatch({type:"set_filters", payload:{subs:v}})} />
            </div>
            <div className="mt-3 space-y-2">
              <Label>Tags</Label>
              <MultiPills options={tags} values={state.filters.tags} onChange={(v)=>dispatch({type:"set_filters", payload:{tags:v}})} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div>
                <Label>Min $</Label>
                <input type="number" className="w-full px-3 py-2 rounded-xl border border-slate-200" value={state.filters.minAmt ?? ''} onChange={(e)=>dispatch({type:"set_filters", payload:{minAmt: e.target.value===''? undefined: Number(e.target.value)}})} />
              </div>
              <div>
                <Label>Max $</Label>
                <input type="number" className="w-full px-3 py-2 rounded-xl border border-slate-200" value={state.filters.maxAmt ?? ''} onChange={(e)=>dispatch({type:"set_filters", payload:{maxAmt: e.target.value===''? undefined: Number(e.target.value)}})} />
              </div>
            </div>
            <div className="mt-3">
              <Label>Aging</Label>
              <select className="w-full px-3 py-2 rounded-xl border border-slate-200" value={state.filters.aging} onChange={(e)=>dispatch({type:"set_filters", payload:{aging: e.target.value as any}})}>
                <option value="any">Any</option>
                <option value=">30">&gt; 30 days</option>
                <option value=">60">&gt; 60 days</option>
                <option value=">90">&gt; 90 days</option>
              </select>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={()=>dispatch({type:"reset_filters"})} className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm">Reset</button>
              <button onClick={()=>{}} className="px-3 py-2 rounded-xl bg-slate-900 text-white text-sm">Apply</button>
            </div>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 text-slate-600 mb-3 font-medium"><RefreshCw className="h-4 w-4"/> Quick Actions</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <QuickAction icon={<Upload className="h-4 w-4"/>} label="Import CSV" onClick={()=>setShowImport(true)} />
              <QuickAction icon={<Plus className="h-4 w-4"/>} label="New COR" onClick={()=>setShowNew(true)} />
              <QuickAction icon={<Download className="h-4 w-4"/>} label="Export CSV" onClick={handleExport} />
              <QuickAction icon={<DollarSign className="h-4 w-4"/>} label="Open Value" onClick={()=>{}} value={fmtCurrency(kpis.pendingValue)} />
            </div>
          </div>
        </aside>

        {/* Main */}
        <section className="col-span-12 lg:col-span-9 space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <KPI title="Open CORs" value={String(kpis.openCount)} icon={<ListChecks className="h-5 w-5"/>} />
            <KPI title="Pending Value" value={fmtCurrency(kpis.pendingValue)} icon={<DollarSign className="h-5 w-5"/>} />
            <KPI title=">30 days" value={String(kpis.over30)} icon={<Calendar className="h-5 w-5"/>} />
            <KPI title=">60/90" value={`${kpis.over60}/${kpis.over90}`} icon={<Calendar className="h-5 w-5"/>} />
          </div>

          {state.view === "table" ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <TableHeader
                sortBy={state.sortBy}
                sortDir={state.sortDir}
                onSort={(by)=>dispatch({type:"sort", by})}
              />
              <div className="divide-y divide-slate-100">
                {filtered.map((r) => (
                  <Row key={r.id} r={r} onEdit={(patch)=>dispatch({type:"update", id:r.id, payload:patch})} onDelete={()=>dispatch({type:"delete", id:r.id})} />
                ))}
                {filtered.length === 0 && (
                  <div className="p-10 text-center text-slate-500">No CORs match your filters.</div>
                )}
              </div>
            </div>
          ) : (
            <KanbanBoard rows={filtered} onEdit={(id,patch)=>dispatch({type:"update", id, payload:patch})} />
          )}
        </section>
      </main>

      {showNew && (
        <NewCorModal
          onClose={()=>setShowNew(false)}
          onCreate={(payload)=>{ dispatch({ type:"add", payload}); setShowNew(false);} }
        />
      )}

      {showImport && (
        <ImportModal onClose={()=>setShowImport(false)} onFile={handleImport} />
      )}
    </div>
  );
}

// Components
function KPI({ title, value, icon }: { title: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
      <div className="p-2 rounded-xl bg-slate-100">{icon}</div>
      <div>
        <div className="text-xs uppercase tracking-wide text-slate-500">{title}</div>
        <div className="text-xl font-semibold">{value}</div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-medium text-slate-600">{children}</div>;
}

function QuickAction({ icon, label, onClick, value }: { icon: React.ReactNode; label: string; onClick?: () => void; value?: string }) {
  return (
    <button onClick={onClick} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50">
      <span className="inline-flex items-center gap-2 text-slate-700 text-sm">{icon}{label}</span>
      {value && <span className="text-slate-900 font-semibold text-sm">{value}</span>}
    </button>
  );
}

function StatusPill({ status }: { status: Status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${statusStyles[status]}`}>
      {statusIcon[status]}
      {status}
    </span>
  );
}

function SortButton({ label, active, dir, onClick }: { label: string; active: boolean; dir: "asc" | "desc"; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1 text-xs font-medium ${active ? "text-slate-900" : "text-slate-500"}`}>
      {label}
      <ArrowUpDown className={`h-3.5 w-3.5 ${active ? "opacity-100" : "opacity-50"}`} />
      {active && (dir === "asc" ? <ChevronUp className="h-3 w-3"/> : <ChevronDown className="h-3 w-3"/>)}
    </button>
  );
}

function TableHeader({ sortBy, sortDir, onSort }: { sortBy: State["sortBy"]; sortDir: State["sortDir"]; onSort: (by: State["sortBy"]) => void }) {
  return (
    <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 text-slate-600 text-xs grid grid-cols-12 items-center">
      <div className="col-span-2"><SortButton label="COR #" active={sortBy==='corNumber'} dir={sortDir} onClick={()=>onSort('corNumber')} /></div>
      <div className="col-span-3"><SortButton label="Title" active={sortBy==='title'} dir={sortDir} onClick={()=>onSort('title')} /></div>
      <div className="col-span-2"><SortButton label="Subcontractor" active={sortBy==='subcontractor'} dir={sortDir} onClick={()=>onSort('subcontractor')} /></div>
      <div className="col-span-1"><SortButton label="Trade" active={sortBy==='trade'} dir={sortDir} onClick={()=>onSort('trade')} /></div>
      <div className="col-span-1"><SortButton label="Submitted" active={sortBy==='submittedAt'} dir={sortDir} onClick={()=>onSort('submittedAt')} /></div>
      <div className="col-span-1"><SortButton label="Aging" active={sortBy==='agingDays'} dir={sortDir} onClick={()=>onSort('agingDays')} /></div>
      <div className="col-span-1"><SortButton label="Amount" active={sortBy==='amount'} dir={sortDir} onClick={()=>onSort('amount')} /></div>
      <div className="col-span-1 text-right">Actions</div>
    </div>
  );
}

function Row({ r, onEdit, onDelete }: { r: CORRow; onEdit: (patch: Partial<CORRow>) => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const aging = daysBetween(r.submittedAt);
  return (
    <div className="px-4 py-3 grid grid-cols-12 items-start hover:bg-slate-50">
      <div className="col-span-2 flex items-center gap-2">
        <span className="font-medium text-slate-900">{r.corNumber}</span>
        <StatusPill status={r.status} />
      </div>
      <div className="col-span-3">
        <div className="font-medium">{r.title}</div>
        <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
          {r.ownerRef && (<span className="inline-flex items-center gap-1"><Tag className="h-3 w-3"/>Ref {r.ownerRef}</span>)}
          {r.rfi && (<span className="inline-flex items-center gap-1"><FileText className="h-3 w-3"/>RFI {r.rfi}</span>)}
          {!!r.tags.length && (<span className="inline-flex items-center gap-1"><Tag className="h-3 w-3"/>{r.tags.join(", ")}</span>)}
        </div>
      </div>
      <div className="col-span-2">
        <div className="font-medium">{r.subcontractor}</div>
        <div className="text-xs text-slate-500">{r.trade}</div>
      </div>
      <div className="col-span-1 text-slate-700 text-sm">{r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : "—"}</div>
      <div className={`col-span-1 text-sm ${aging>60? 'text-rose-600 font-semibold': aging>30? 'text-amber-600 font-medium': 'text-slate-700'}`}>{aging}d</div>
      <div className="col-span-1 text-sm font-medium">{fmtCurrency(r.amount)}</div>
      <div className="col-span-1 flex items-center justify-end gap-2">
        <button onClick={()=>setOpen(!open)} className="px-2 py-1 text-xs rounded-lg border border-slate-200 hover:bg-slate-50">{open? 'Hide':'Details'}</button>
        <Menu onEdit={()=>setOpen(true)} onDelete={onDelete} />
      </div>
      {open && (
        <div className="col-span-12 mt-3 bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="Priority" value={r.priority} />
            <Field label="Due" value={r.dueAt ? new Date(r.dueAt).toLocaleDateString(): '—'} />
            <Field label="Attachments" value={`${r.attachments ?? 0}`} />
            <Field label="Created" value={new Date(r.createdAt).toLocaleString()} />
          </div>
          {r.notes && <div className="mt-3 text-slate-700"><span className="text-xs uppercase tracking-wide text-slate-500">Notes: </span>{r.notes}</div>}
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={()=>onEdit({ status: nextStatus(r.status) })} className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs">Advance Status</button>
            <button onClick={()=>onEdit({ priority: cyclePriority(r.priority) })} className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs">Toggle Priority</button>
            <button onClick={()=>onEdit({ amount: Math.max(0, r.amount - 100) })} className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs">-100</button>
            <button onClick={()=>onEdit({ amount: r.amount + 100 })} className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs">+100</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="font-medium text-slate-800">{value}</div>
    </div>
  );
}

function Menu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={()=>setOpen((v)=>!v)} className="px-2 py-1 text-xs rounded-lg border border-slate-200 hover:bg-slate-50">More</button>
      {open && (
        <div className="absolute right-0 mt-1 w-36 bg-white border border-slate-200 rounded-xl shadow-md p-1 text-sm z-20">
          <button onClick={()=>{setOpen(false); onEdit();}} className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50">Edit</button>
          <button onClick={()=>{setOpen(false); if(confirm('Delete this COR?')) onDelete();}} className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-rose-600">Delete</button>
        </div>
      )}
    </div>
  );
}

function MultiPills({ options, values, onChange }: { options: string[]; values: string[]; onChange: (v: string[]) => void }) {
  const toggle = (opt: string) => {
    if (values.includes(opt)) onChange(values.filter((v) => v !== opt));
    else onChange([...values, opt]);
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button key={opt} onClick={() => toggle(opt)} className={`px-2.5 py-1 rounded-full text-xs border ${values.includes(opt) ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}>
          {opt}
        </button>
      ))}
    </div>
  );
}

function NewCorModal({ onClose, onCreate }: { onClose: () => void; onCreate: (r: CORRow) => void }) {
  const [form, setForm] = useState<Partial<CORRow>>({ status: "Draft", priority: "Medium", amount: 0, tags: [] });

  function submit() {
    const payload: CORRow = {
      id: cryptoRandomId(),
      corNumber: form.corNumber?.trim() || `COR-${Math.floor(Math.random()*900+100)}`,
      title: form.title?.trim() || "Untitled",
      subcontractor: form.subcontractor?.trim() || "",
      trade: form.trade?.trim() || "",
      submittedAt: form.submittedAt || new Date().toISOString(),
      dueAt: form.dueAt,
      status: (form.status as Status) || "Draft",
      priority: (form.priority as Priority) || "Medium",
      amount: Number(form.amount || 0),
      ownerRef: form.ownerRef,
      rfi: form.rfi,
      tags: form.tags || [],
      notes: form.notes,
      attachments: 0,
      createdAt: new Date().toISOString(),
    };
    onCreate(payload);
  }

  function pillToggle(tag: string) {
    setForm((f) => ({ ...f, tags: (f.tags ?? []).includes(tag) ? (f.tags ?? []).filter((t) => t !== tag) : [...(f.tags ?? []), tag] }));
  }

  return (
    <Modal onClose={onClose} title="Create New COR">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input label="COR #" placeholder="e.g., COR-006" value={form.corNumber ?? ""} onChange={(v)=>setForm({...form, corNumber:v})} />
        <Input label="Title" placeholder="Short scope description" value={form.title ?? ""} onChange={(v)=>setForm({...form, title:v})} />
        <Input label="Subcontractor" placeholder="e.g., Access Electric" value={form.subcontractor ?? ""} onChange={(v)=>setForm({...form, subcontractor:v})} />
        <Input label="Trade" placeholder="e.g., Electrical" value={form.trade ?? ""} onChange={(v)=>setForm({...form, trade:v})} />
        <Input label="Submitted At" type="date" value={form.submittedAt ? form.submittedAt.slice(0,10): ''} onChange={(v)=>setForm({...form, submittedAt: new Date(v).toISOString()})} />
        <Input label="Due At" type="date" value={form.dueAt ? form.dueAt.slice(0,10): ''} onChange={(v)=>setForm({...form, dueAt: new Date(v).toISOString()})} />
        <Select label="Status" value={form.status as any} onChange={(v)=>setForm({...form, status: v as Status})} options={["Draft","Submitted","Pending Review","Pending RFI","Approved","Rejected","Void"]} />
        <Select label="Priority" value={form.priority as any} onChange={(v)=>setForm({...form, priority: v as Priority})} options={["Low","Medium","High"]} />
        <Input label="Amount ($)" type="number" value={String(form.amount ?? 0)} onChange={(v)=>setForm({...form, amount: Number(v)})} />
        <Input label="Owner Ref" placeholder="PCO / CCD / etc" value={form.ownerRef ?? ""} onChange={(v)=>setForm({...form, ownerRef:v})} />
        <Input label="RFI #" placeholder="e.g., RFI-54" value={form.rfi ?? ""} onChange={(v)=>setForm({...form, rfi:v})} />
        <div>
          <Label>Tags</Label>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {["Phase 1","Phase 2","Alt","Pricing","Controls","Lighting","Restrooms","Site"].map((t)=> (
              <button key={t} onClick={()=>pillToggle(t)} className={`px-2.5 py-1 rounded-full text-xs border ${form.tags?.includes(t)? 'bg-slate-900 text-white border-slate-900':'bg-white text-slate-700 border-slate-200'}`}>{t}</button>
            ))}
          </div>
        </div>
        <div className="md:col-span-2">
          <Label>Notes</Label>
          <textarea className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200" rows={3} placeholder="Extra context..." value={form.notes ?? ""} onChange={(e)=>setForm({...form, notes:e.target.value})} />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="px-3 py-2 rounded-xl border border-slate-200">Cancel</button>
        <button onClick={submit} className="px-3 py-2 rounded-xl bg-slate-900 text-white">Create</button>
      </div>
    </Modal>
  );
}

function ImportModal({ onClose, onFile }: { onClose: () => void; onFile: (file: File) => void }) {
  const [file, setFile] = useState<File | null>(null);
  return (
    <Modal onClose={onClose} title="Import CORs from CSV">
      <p className="text-sm text-slate-600">CSV headers required: <code>corNumber,title,subcontractor,trade,submittedAt,dueAt,status,priority,amount,ownerRef,rfi,tags,notes</code>. Use <code>|</code> to separate multiple tags.</p>
      <div className="mt-3">
        <input type="file" accept=".csv" onChange={(e)=>setFile(e.target.files?.[0] ?? null)} />
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="px-3 py-2 rounded-xl border border-slate-200">Cancel</button>
        <button onClick={()=>file && onFile(file)} className="px-3 py-2 rounded-xl bg-slate-900 text-white" disabled={!file}>Import</button>
      </div>
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-50 w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100"><X className="h-5 w-5"/></button>
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <input type={type ?? "text"} value={value} onChange={(e)=>onChange(e.target.value)} placeholder={placeholder} className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200" />
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <Label>{label}</Label>
      <select value={value} onChange={(e)=>onChange(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200">
        {options.map((o)=> (<option key={o} value={o}>{o}</option>))}
      </select>
    </div>
  );
}

function nextStatus(s: Status): Status {
  const order: Status[] = ["Draft","Submitted","Pending Review","Pending RFI","Approved","Rejected","Void"];
  const i = order.indexOf(s);
  return order[Math.min(order.length - 1, i + 1)] ?? s;
}

function cyclePriority(p: Priority): Priority {
  const order: Priority[] = ["Low","Medium","High"]; const i = order.indexOf(p); return order[(i+1)%order.length];
}

// Kanban
function KanbanBoard({ rows, onEdit }: { rows: CORRow[]; onEdit: (id: string, patch: Partial<CORRow>) => void }) {
  const cols: Status[] = ["Draft","Submitted","Pending Review","Pending RFI","Approved","Rejected","Void"];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {cols.map((c)=> (
        <div key={c} className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold text-slate-800 flex items-center gap-2"><StatusPill status={c}/></div>
            <span className="text-xs text-slate-500">{rows.filter(r=>r.status===c).length}</span>
          </div>
          <div className="space-y-2 min-h-[120px]">
            {rows.filter(r=>r.status===c).map((r)=> (
              <div key={r.id} className="border border-slate-200 rounded-xl p-3 hover:bg-slate-50">
                <div className="text-sm font-medium">{r.corNumber} — {r.title}</div>
                <div className="text-xs text-slate-500">{r.subcontractor} • {r.trade}</div>
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span>{fmtCurrency(r.amount)}</span>
                  <button onClick={()=>onEdit(r.id, { status: nextStatus(r.status) })} className="px-2 py-1 rounded-lg border border-slate-200">Advance</button>
                </div>
              </div>
            ))}
            {rows.filter(r=>r.status===c).length===0 && (
              <div className="text-xs text-slate-400">No cards</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
