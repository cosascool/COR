/*
Deployable Next.js (Vercel) project — Clearstory‑style COR Tracker
Copy the files below into a new GitHub repo with the same paths.
Then connect the repo to Vercel (Framework: Next.js). No env vars needed.

✅ What I fixed (debug pass)
1) **SyntaxError: Missing semicolon (index.tsx 9:8)** — Caused by non-code JSON content not being commented and a truncated `<select … className="mt-1 w-f…` line. Fixed and closed.
2) **SyntaxError: Unexpected token (69:14)** — Missing closing quote in `<Modal onClose={onClose} title="Create New COR">`. Fixed by closing the string and completing the component tree.
3) **SyntaxError: Unexpected token (71:14)** — Incomplete `function submit()` in `NewCorModal`. Implemented fully.
4) **SyntaxError: Unexpected token (73:14)** — Accidental `corNum` reference; should be `corNumber`. Replaced and added a test to guard against regressions.
5) Kept the app as a **client-only** React component (no server/middleware) for Vercel friendliness.
6) Included a lightweight **Kanban** view.

To actually deploy on Vercel, use the multi-file structure shown below (comment blocks). For this canvas preview, the
executable part is the single React component and its helpers defined after the comments.
*/

/* =============================================
FILE: package.json (for real repo — do not paste this block into index.tsx)
============================================= */
/*
{
  "name": "cor-tracker-clearstory-style",
  "private": true,
  "version": "1.0.6",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run"
  },
  "dependencies": {
    "lucide-react": "^0.453.0",
    "next": "^14.2.10",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/node": "^20.14.12",
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.19",
    "jsdom": "^24.1.0",
    "postcss": "^8.4.41",
    "tailwindcss": "^3.4.12",
    "typescript": "^5.6.2",
    "vitest": "^1.6.0"
  }
}
*/

/* =============================================
FILE: next.config.mjs (for real repo)
============================================= */
/*
/** @type {import('next').NextConfig} * / // (space prevents JS parser)
const nextConfig = { reactStrictMode: true };
export default nextConfig;
*/

/* =============================================
FILE: tailwind.config.ts (for real repo)
============================================= */
/*
import type { Config } from "tailwindcss";
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
    "./tests/**/*.{js,ts,jsx,tsx}"
  ],
  theme: { extend: {} },
  plugins: [],
} satisfies Config;
*/

/* =============================================
FILE: app/globals.css (for real repo)
============================================= */
/*
@tailwind base;
@tailwind components;
@tailwind utilities;
html, body { height: 100%; }
*/

/* =============================================
FILE: tests/utils.test.ts (for real repo)
(kept here for reference but commented out so the canvas can compile)
============================================= */
/*
import { describe, it, expect } from "vitest";
import type { CORRow, Status, Priority } from "../lib/types";
import { parseCSVLine, rowsToCSV, csvToRows, daysBetween, nextStatus, cyclePriority } from "../lib/utils";

describe("parseCSVLine", () => {
  it("splits simple CSV", () => {
    expect(parseCSVLine("a,b,c")).toEqual(["a", "b", "c"]);
  });
  it("handles quoted commas", () => {
    expect(parseCSVLine('a,"b, c",d')).toEqual(["a", "b, c", "d"]);
  });
  it("handles escaped quotes inside quoted field", () => {
    const line = '"He said ""ok""",x,y';
    expect(parseCSVLine(line)).toEqual(['"He said "ok""', "x", "y"]);
  });
  it("handles empty quoted field", () => {
    expect(parseCSVLine('"",a')).toEqual(["", "a"]);
  });
});

describe("rowsToCSV <-> csvToRows", () => {
  it("round-trips a row array with commas", () => {
    const sample: CORRow[] = [
      {
        id: "1",
        corNumber: "COR-1",
        title: "Thing, with comma",
        subcontractor: "Sub A",
        trade: "Electrical",
        submittedAt: "2024-01-10T00:00:00.000Z",
        dueAt: "2024-01-20T00:00:00.000Z",
        status: "Submitted" as Status,
        priority: "High" as Priority,
        amount: 1000,
        ownerRef: "PCO-1",
        rfi: "RFI-2",
        tags: ["A", "B"],
        notes: "Line1\nLine2",
        createdAt: "2024-01-01T00:00:00.000Z",
        attachments: 0,
      },
    ];
    const csv = rowsToCSV(sample);
    const parsed = csvToRows(csv);
    expect(parsed[0].corNumber).toBe("COR-1");
    expect(parsed[0].title).toBe("Thing, with comma");
    expect(parsed[0].tags).toEqual(["A", "B"]);
  });

  it("round-trips values containing quotes", () => {
    const sample: CORRow[] = [
      {
        id: "2",
        corNumber: "COR-2",
        title: "He said \"ok\"",
        subcontractor: "Sub B",
        trade: "Paving",
        submittedAt: "2024-02-10T00:00:00.000Z",
        dueAt: "2024-02-20T00:00:00.000Z",
        status: "Draft" as Status,
        priority: "Low" as Priority,
        amount: 500,
        ownerRef: "PCO-2",
        rfi: "RFI-9",
        tags: [],
        notes: "",
        createdAt: "2024-02-01T00:00:00.000Z",
        attachments: 0,
      },
    ];
    const csv = rowsToCSV(sample);
    const parsed = csvToRows(csv);
    expect(parsed[0].title).toBe('He said "ok"');
  });

  it("ignores blank trailing line(s)", () => {
    const csv = 'corNumber,title,subcontractor,trade,submittedAt,dueAt,status,priority,amount,ownerRef,rfi,tags,notes\n"COR-7","x","y","z",,,,,"Draft","Low",0,,,\n\n';
    const rows = csvToRows(csv);
    expect(rows.length).toBe(1);
  });

  it("CSV header uses corNumber (regression guard)", () => {
    const csv = rowsToCSV([]);
    expect(csv.startsWith("corNumber,")).toBe(true);
  });
});

describe("date helpers", () => {
  it("daysBetween computes integer day diffs", () => {
    expect(daysBetween("2020-01-01T00:00:00.000Z", "2020-01-11T00:00:00.000Z")).toBe(10);
  });
});

describe("status helpers", () => {
  it("nextStatus advances until end and stays at Void", () => {
    expect(nextStatus("Draft")).toBe("Submitted");
    expect(nextStatus("Void")).toBe("Void");
  });
  it("cyclePriority cycles L->M->H->L", () => {
    expect(cyclePriority("Low")).toBe("Medium");
    expect(cyclePriority("Medium")).toBe("High");
    expect(cyclePriority("High")).toBe("Low");
  });
});
*/

// ==============================================================
// Executable single‑file React app for the canvas preview starts here
// ==============================================================

import React, { useEffect, useMemo, useReducer, useState } from "react";
// If your local preview lacks lucide-react, swap to simple <span> placeholders
let Icons: any = {};
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Icons = require("lucide-react");
} catch {
  Icons = new Proxy({}, { get: () => (props: any) => <span style={{display:'inline-block',width:14}}/> });
}
const { Download, Upload, Plus, Filter, Search, FileText, Calendar, Tag, Building2, DollarSign, ArrowUpDown, X, CheckCircle2, Clock, Ban, ChevronDown, ChevronUp, RefreshCw, ListChecks, KanbanSquare } = Icons;

// ---------------- Types ----------------
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
  id: string;
  corNumber: string;
  title: string;
  subcontractor: string;
  trade: string;
  submittedAt?: string; // ISO
  dueAt?: string; // ISO
  status: Status;
  priority: Priority;
  amount: number;
  ownerRef?: string;
  rfi?: string;
  tags: string[];
  notes?: string;
  attachments?: number;
  createdAt: string; // ISO
}

// ---------------- Utils ----------------
function isoDaysAgo(n: number): string { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString(); }
function isoDaysAhead(n: number): string { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString(); }
function cryptoRandomId(): string { const g: any = globalThis as any; return g?.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2); }
function fmtCurrency(n: number): string { return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n); }
function daysBetween(a?: string, b?: string): number { if (!a) return 0; const d1 = new Date(a).getTime(); const d2 = b ? new Date(b).getTime() : Date.now(); return Math.floor((d2 - d1) / (1000*60*60*24)); }
function rowsToCSV(rows: CORRow[]): string {
  const header = ["corNumber","title","subcontractor","trade","submittedAt","dueAt","status","priority","amount","ownerRef","rfi","tags","notes"].join(",");
  const lines = rows.map(r=>[
    r.corNumber, r.title, r.subcontractor, r.trade, r.submittedAt??"", r.dueAt??"", r.status, r.priority, r.amount, r.ownerRef??"", r.rfi??"", r.tags.join("|"), (r.notes??"").replace(/\n/g," ")
  ].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(","));
  return [header, ...lines].join("\n");
}
function parseCSVLine(line: string): string[] {
  const out: string[] = []; let cur = ""; let inQ = false;
  for (let i=0;i<line.length;i++){ const ch=line[i];
    if (ch==='"'){ if(inQ && line[i+1]==='"'){ cur+='"'; i++; } else { inQ=!inQ; } }
    else if(ch==="," && !inQ){ out.push(cur); cur=""; }
    else { cur+=ch; }
  } out.push(cur); return out;
}
function csvToRows(csv: string): CORRow[] {
  const [headerLine, ...rest] = csv.split(/\r?\n/).filter(Boolean);
  const headers = headerLine.split(",").map((h)=>h.replace(/^"|"$/g,""));
  const get = (o:Record<string,string>, k:string)=>o[k]??"";
  const rows: CORRow[] = [];
  for(const line of rest){
    const cols = parseCSVLine(line);
    const obj: Record<string,string> = {};
    headers.forEach((h,i)=> obj[h] = (cols[i]??"").replace(/^"|"$/g,""));
    rows.push({
      id: cryptoRandomId(),
      corNumber: get(obj,"corNumber"),
      title: get(obj,"title"),
      subcontractor: get(obj,"subcontractor"),
      trade: get(obj,"trade"),
      submittedAt: get(obj,"submittedAt") || undefined,
      dueAt: get(obj,"dueAt") || undefined,
      status: (get(obj,"status") as Status) || "Draft",
      priority: (get(obj,"priority") as Priority) || "Medium",
      amount: Number(get(obj,"amount") || 0),
      ownerRef: get(obj,"ownerRef") || undefined,
      rfi: get(obj,"rfi") || undefined,
      tags: (get(obj,"tags")||"").split("|").filter(Boolean),
      notes: get(obj,"notes") || undefined,
      attachments: 0,
      createdAt: new Date().toISOString(),
    });
  }
  return rows;
}
function nextStatus(s: Status): Status { const order: Status[] = ["Draft","Submitted","Pending Review","Pending RFI","Approved","Rejected","Void"]; const i=order.indexOf(s); return order[Math.min(order.length-1,i+1)]??s; }
function cyclePriority(p: Priority): Priority { const o:[Priority,Priority,Priority] = ["Low","Medium","High"]; const i=o.indexOf(p); return o[(i+1)%o.length]; }

// ---------------- State ----------------
interface State {
  rows: CORRow[];
  view: "table" | "kanban";
  sortBy: keyof CORRow | "agingDays" | "amount";
  sortDir: "asc" | "desc";
  filters: { q: string; status: Status[]; trades: string[]; subs: string[]; tags: string[]; minAmt?: number; maxAmt?: number; aging: "any"|">30"|">60"|">90" };
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

const initialState: State = { rows: [], view: "table", sortBy: "createdAt", sortDir: "desc", filters: { q: "", status: [], trades: [], subs: [], tags: [], aging: "any" } };
function reducer(state: State, action: Action): State {
  switch(action.type){
    case "init": return { ...state, rows: action.payload };
    case "overwrite": return { ...state, rows: action.payload };
    case "add": return { ...state, rows: [action.payload, ...state.rows] };
    case "update": return { ...state, rows: state.rows.map(r=> r.id===action.id? { ...r, ...action.payload }: r) };
    case "delete": return { ...state, rows: state.rows.filter(r=> r.id!==action.id) };
    case "sort": { const sortDir = state.sortBy===action.by ? (state.sortDir==='asc'?'desc':'asc') : 'asc'; return { ...state, sortBy: action.by, sortDir }; }
    case "toggle_view": return { ...state, view: state.view==='table'? 'kanban' : 'table' };
    case "set_filters": return { ...state, filters: { ...state.filters, ...action.payload } };
    case "reset_filters": return { ...state, filters: initialState.filters };
    default: return state;
  }
}

// ---------------- Seed ----------------
const seedRows: CORRow[] = [
  { id: cryptoRandomId(), corNumber: "COR-001", title: "Add blocking at restroom accessories", subcontractor: "Certified Carpentry", trade: "Carpentry", submittedAt: isoDaysAgo(18), dueAt: isoDaysAhead(12), status: "Pending Review", priority: "Medium", amount: 5625, ownerRef: "PCO-40", rfi: "RFI-54", tags: ["Phase 1","Restrooms"], notes: "Scope clarified on RFI-54; outside IFC E-sheets.", attachments: 3, createdAt: isoDaysAgo(21) },
  { id: cryptoRandomId(), corNumber: "COR-002", title: "Lighting control at corridor and restrooms", subcontractor: "Access Electric", trade: "Electrical", submittedAt: isoDaysAgo(7), dueAt: isoDaysAhead(5), status: "Submitted", priority: "High", amount: 18640, ownerRef: "COR-15", rfi: "RFI-54", tags: ["Lighting","Controls"], notes: "Split from COR-7R (IFC scope).", attachments: 5, createdAt: isoDaysAgo(10) },
  { id: cryptoRandomId(), corNumber: "COR-003", title: "Seal coat church parking (15% pothole repair)", subcontractor: "CM Paving", trade: "Paving", submittedAt: isoDaysAgo(3), dueAt: isoDaysAhead(14), status: "Draft", priority: "Low", amount: 134000, ownerRef: "Alt-Paving-B", rfi: undefined, tags: ["Alt","Pricing"], notes: "Assumes 10-11 $/SF rate.", attachments: 1, createdAt: isoDaysAgo(4) },
  { id: cryptoRandomId(), corNumber: "COR-004", title: "Grind & overlay church lot", subcontractor: "CM Paving", trade: "Paving", submittedAt: isoDaysAgo(20), dueAt: isoDaysAhead(2), status: "Pending RFI", priority: "Medium", amount: 175000, ownerRef: "Alt-Paving-A", rfi: "RFI-77", tags: ["Alt"], notes: "Awaiting owner decision.", attachments: 2, createdAt: isoDaysAgo(22) },
  { id: cryptoRandomId(), corNumber: "COR-005", title: "Additional FRP at classrooms", subcontractor: "Letner Coatings", trade: "Finishes", submittedAt: isoDaysAgo(30), dueAt: isoDaysAhead(1), status: "Approved", priority: "High", amount: 24890, ownerRef: "PCO-33", rfi: undefined, tags: ["Phase 1"], notes: "Approved per OAC 9/10.", attachments: 4, createdAt: isoDaysAgo(35) },
];

// ---------------- UI Bits ----------------
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

const STORAGE_KEY = "cor-tracker-rows-v1";
function usePersistentRows(initial: CORRow[]) {
  const [state, dispatch] = useReducer(reducer, initialState);
  useEffect(()=>{ const raw = localStorage.getItem(STORAGE_KEY); if(raw){ try{ dispatch({type:"init", payload: JSON.parse(raw) as CORRow[]}); return; } catch {} } dispatch({type:"init", payload: initial}); }, [initial]);
  useEffect(()=>{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state.rows)); }, [state.rows]);
  return [state, dispatch] as const;
}

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
function Label({ children }: { children: React.ReactNode }) { return <div className="text-xs font-medium text-slate-600">{children}</div>; }
function StatusPill({ status }: { status: Status }) { return (<span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${statusStyles[status]}`}>{statusIcon[status]}{status}</span>); }
function SortButton({ label, active, dir, onClick }: { label: string; active: boolean; dir: "asc" | "desc"; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1 text-xs font-medium ${active? 'text-slate-900':'text-slate-500'}`}>
      {label}
      <ArrowUpDown className={`h-3.5 w-3.5 ${active? 'opacity-100':'opacity-50'}`} />
      {active && (dir==='asc'? <ChevronUp className="h-3 w-3"/> : <ChevronDown className="h-3 w-3"/>)}
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
function Field({ label, value }: { label: string; value: React.ReactNode }) { return (<div><div className="text-xs text-slate-500">{label}</div><div className="font-medium text-slate-800">{value}</div></div>); }
function Menu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={()=>setOpen(v=>!v)} className="px-2 py-1 text-xs rounded-lg border border-slate-200 hover:bg-slate-50">More</button>
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
  const toggle = (opt: string) => { values.includes(opt) ? onChange(values.filter(v=>v!==opt)) : onChange([...values, opt]); };
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt=> (
        <button key={opt} onClick={()=>toggle(opt)} className={`px-2.5 py-1 rounded-full text-xs border ${values.includes(opt)? 'bg-slate-900 text-white border-slate-900':'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>{opt}</button>
      ))}
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
      {/* 🔧 fixed: className now uses w-full and the tag is closed properly */}
      <select value={value} onChange={(e)=>onChange(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200">
        {options.map(o=> (<option key={o} value={o}>{o}</option>))}
      </select>
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

function KanbanBoard({ rows, onEdit }: { rows: CORRow[]; onEdit: (id: string, patch: Partial<CORRow>) => void }) {
  const groups: Record<Status, CORRow[]> = {
    Draft: [], Submitted: [], "Pending Review": [], "Pending RFI": [], Approved: [], Rejected: [], Void: []
  };
  rows.forEach(r=> groups[r.status]?.push(r));
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-3">
      {Object.entries(groups).map(([status, list])=> (
        <div key={status} className="bg-white border border-slate-200 rounded-2xl p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold">{status}</div>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${statusStyles[status as Status]}`}>{list.length}</span>
          </div>
          <div className="space-y-2">
            {list.map(r=> (
              <div key={r.id} className="border border-slate-200 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">{r.corNumber}</div>
                  <div className="text-xs font-medium">{fmtCurrency(r.amount)}</div>
                </div>
                <div className="text-sm mt-1">{r.title}</div>
                <div className="text-xs text-slate-500 mt-1">{r.subcontractor} • {r.trade}</div>
                <div className="mt-2 flex gap-2">
                  <button onClick={()=>onEdit(r.id, { status: nextStatus(r.status) })} className="px-2 py-1 text-xs rounded-lg bg-slate-900 text-white">Advance</button>
                </div>
              </div>
            ))}
            {list.length===0 && <div className="text-xs text-slate-400">No items</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------- Main Component ----------------
export default function CORTrackerApp() {
  const [state, dispatch] = usePersistentRows(seedRows);
  const [showNew, setShowNew] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const filtered = useMemo(()=>{
    const q = state.filters.q.trim().toLowerCase();
    return state.rows
      .filter(r=>{
        if(q){ const blob = `${r.corNumber} ${r.title} ${r.subcontractor} ${r.trade} ${r.ownerRef??""} ${r.rfi??""} ${r.tags.join(" ")}`.toLowerCase(); if(!blob.includes(q)) return false; }
        if(state.filters.status.length && !state.filters.status.includes(r.status)) return false;
        if(state.filters.trades.length && !state.filters.trades.includes(r.trade)) return false;
        if(state.filters.subs.length && !state.filters.subs.includes(r.subcontractor)) return false;
        if(state.filters.tags.length && !r.tags.some(t=> state.filters.tags.includes(t))) return false;
        if(state.filters.minAmt!=null && r.amount < state.filters.minAmt!) return false;
        if(state.filters.maxAmt!=null && r.amount > state.filters.maxAmt!) return false;
        const age = daysBetween(r.submittedAt);
        if(state.filters.aging==='>30' && age<=30) return false;
        if(state.filters.aging==='>60' && age<=60) return false;
        if(state.filters.aging==='>90' && age<=90) return false;
        return true;
      })
      .sort((a,b)=>{
        const dir = state.sortDir==='asc'? 1 : -1; const key = state.sortBy; let va:any; let vb:any;
        if(key==='agingDays'){ va = daysBetween(a.submittedAt); vb = daysBetween(b.submittedAt); }
        else if(key==='amount'){ va=a.amount; vb=b.amount; }
        else { // @ts-ignore
          va=(a as any)[key]; vb=(b as any)[key];
        }
        if(va==null && vb==null) return 0; if(va==null) return 1; if(vb==null) return -1; return va>vb? dir : va<vb? -dir : 0;
      });
  }, [state]);

  const trades = useMemo(()=> Array.from(new Set(state.rows.map(r=>r.trade))).sort(), [state.rows]);
  const subs   = useMemo(()=> Array.from(new Set(state.rows.map(r=>r.subcontractor))).sort(), [state.rows]);
  const tags   = useMemo(()=> Array.from(new Set(state.rows.flatMap(r=>r.tags))).sort(), [state.rows]);

  const kpis = useMemo(()=>{
    const open = state.rows.filter(r=> !["Approved","Rejected","Void"].includes(r.status));
    const pendingValue = open.reduce((s,r)=> s+r.amount, 0);
    const over30 = open.filter(r=> daysBetween(r.submittedAt) > 30).length;
    const over60 = open.filter(r=> daysBetween(r.submittedAt) > 60).length;
    const over90 = open.filter(r=> daysBetween(r.submittedAt) > 90).length;
    return { openCount: open.length, pendingValue, over30, over60, over90 };
  }, [state.rows]);

  function handleExport(){ const csv = rowsToCSV(state.rows); const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`CORs-${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url); }
  function handleImport(file: File){ const reader=new FileReader(); reader.onload=()=>{ const text=String(reader.result??''); try{ const rows = csvToRows(text); dispatch({type:'overwrite', payload:[...rows, ...state.rows]}); setShowImport(false);}catch{ alert('Import failed. Please check your CSV headers.'); } }; reader.readAsText(file); }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 text-slate-800">
      <header className="sticky top-0 z-30 backdrop-blur bg-white/70 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2 font-semibold text-xl"><Building2 className="h-6 w-6"/><span>COR Tracker</span></div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={()=>dispatch({type:'toggle_view'})} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm">
              {state.view==='table'? <><KanbanSquare className="h-4 w-4"/> Kanban</> : <><ListChecks className="h-4 w-4"/> Table</>}
            </button>
            <button onClick={()=>setShowImport(true)} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm"><Upload className="h-4 w-4"/> Import CSV</button>
            <button onClick={handleExport} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm"><Download className="h-4 w-4"/> Export CSV</button>
            <button onClick={()=>setShowNew(true)} className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 shadow-sm text-sm"><Plus className="h-4 w-4"/> New COR</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-12 gap-6">
        <aside className="col-span-12 lg:col-span-3 space-y-4">
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 text-slate-600 mb-3 font-medium"><Filter className="h-4 w-4"/> Filters</div>
            <div className="relative mb-3">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400"/>
              <input value={state.filters.q} onChange={(e)=>dispatch({type:'set_filters', payload:{q:e.target.value}})} className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300" placeholder="Search COR #, sub, tags..."/>
            </div>
            <div className="space-y-2">
              <Label>Statuses</Label>
              <MultiPills options={["Draft","Submitted","Pending Review","Pending RFI","Approved","Rejected","Void"]} values={state.filters.status} onChange={(v)=>dispatch({type:'set_filters', payload:{status:v as Status[]}})} />
            </div>
            <div className="mt-3 space-y-2">
              <Label>Trades</Label>
              <MultiPills options={trades} values={state.filters.trades} onChange={(v)=>dispatch({type:'set_filters', payload:{trades:v}})} />
            </div>
            <div className="mt-3 space-y-2">
              <Label>Subcontractors</Label>
              <MultiPills options={subs} values={state.filters.subs} onChange={(v)=>dispatch({type:'set_filters', payload:{subs:v}})} />
            </div>
            <div className="mt-3 space-y-2">
              <Label>Tags</Label>
              <MultiPills options={tags} values={state.filters.tags} onChange={(v)=>dispatch({type:'set_filters', payload:{tags:v}})} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div>
                <Label>Min $</Label>
                <input type="number" className="w-full px-3 py-2 rounded-xl border border-slate-200" value={state.filters.minAmt ?? ''} onChange={(e)=>dispatch({type:'set_filters', payload:{minAmt: e.target.value===''? undefined: Number(e.target.value)}})} />
              </div>
              <div>
                <Label>Max $</Label>
                <input type="number" className="w-full px-3 py-2 rounded-xl border border-slate-200" value={state.filters.maxAmt ?? ''} onChange={(e)=>dispatch({type:'set_filters', payload:{maxAmt: e.target.value===''? undefined: Number(e.target.value)}})} />
              </div>
            </div>
            <div className="mt-3">
              <Label>Aging</Label>
              {/* 🔧 fixed: className uses w-full and the <select> is properly closed */}
              <select className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200" value={state.filters.aging} onChange={(e)=>dispatch({type:'set_filters', payload:{aging: e.target.value as any}})}>
                <option value="any">Any</option>
                <option value=">30">&gt; 30 days</option>
                <option value=">60">&gt; 60 days</option>
                <option value=">90">&gt; 90 days</option>
              </select>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={()=>dispatch({type:'reset_filters'})} className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm">Reset</button>
              {/* Q: Do you want staged filtering (apply on click) or live filtering? Currently filters are live; this button is cosmetic. */}
              <button onClick={()=>{}} className="px-3 py-2 rounded-xl bg-slate-900 text-white text-sm">Apply</button>
            </div>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 text-slate-600 mb-3 font-medium"><RefreshCw className="h-4 w-4"/> Quick Actions</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <button onClick={()=>setShowImport(true)} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50"><Upload className="h-4 w-4"/>Import CSV</button>
              <button onClick={()=>setShowNew(true)} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50"><Plus className="h-4 w-4"/>New COR</button>
              <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50"><Download className="h-4 w-4"/>Export CSV</button>
              <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-slate-200"><span className="inline-flex items-center gap-2 text-slate-700 text-sm"><DollarSign className="h-4 w-4"/>Open Value</span><span className="text-slate-900 font-semibold text-sm">{fmtCurrency(kpis.pendingValue)}</span></div>
            </div>
          </div>
        </aside>

        <section className="col-span-12 lg:col-span-9 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <KPI title="Open CORs" value={String(kpis.openCount)} icon={<ListChecks className="h-5 w-5"/>} />
            <KPI title="Pending Value" value={fmtCurrency(kpis.pendingValue)} icon={<DollarSign className="h-5 w-5"/>} />
            <KPI title=">30 days" value={String(kpis.over30)} icon={<Calendar className="h-5 w-5"/>} />
            <KPI title=">60/90" value={`${kpis.over60}/${kpis.over90}`} icon={<Calendar className="h-5 w-5"/>} />
          </div>

          {state.view==='table' ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <TableHeader sortBy={state.sortBy} sortDir={state.sortDir} onSort={(by)=>dispatch({type:'sort', by})} />
              <div className="divide-y divide-slate-100">
                {filtered.map(r=> (
                  <Row key={r.id} r={r} onEdit={(patch)=>dispatch({type:'update', id:r.id, payload:patch})} onDelete={()=>dispatch({type:'delete', id:r.id})} />
                ))}
                {filtered.length===0 && (<div className="p-10 text-center text-slate-500">No CORs match your filters.</div>)}
              </div>
            </div>
          ) : (
            <KanbanBoard rows={filtered} onEdit={(id,patch)=>dispatch({type:'update', id, payload:patch})} />
          )}
        </section>
      </main>

      {showNew && (
        <NewCorModal onClose={()=>setShowNew(false)} onCreate={(payload)=>{ dispatch({type:'add', payload}); setShowNew(false); }} />
      )}

      {showImport && (
        <ImportModal onClose={()=>setShowImport(false)} onFile={handleImport} />
      )}
    </div>
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
function NewCorModal({ onClose, onCreate }: { onClose: () => void; onCreate: (r: CORRow) => void }) {
  const [form, setForm] = useState<Partial<CORRow>>({ status: "Draft", priority: "Medium", amount: 0, tags: [] });
  function submit(){
    const payload: CORRow = {
      id: cryptoRandomId(),
      corNumber: form.corNumber?.trim() || `COR-${Math.floor(Math.random()*900+100)}`,
  
