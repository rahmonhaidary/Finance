import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, Legend,
} from "recharts";
import {
  Plus, Trash2, Wallet, Briefcase, LayoutDashboard, ArrowLeftRight,
  Target, FileText, ChevronDown, TrendingUp, TrendingDown, X, Check,
  Pencil, Download,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Design tokens — "banker's ledger" direction                         */
/* ------------------------------------------------------------------ */
const T = {
  paper: "#F6F7F4",
  card: "#FFFFFF",
  ink: "#152019",
  inkSoft: "#4A574F",
  line: "#E2E6E0",
  green: "#1E5C46",
  greenSoft: "#E7F0EB",
  brass: "#B98F2F",
  brassSoft: "#F6EFDD",
  red: "#A93F2C",
  redSoft: "#F7E9E5",
};
const serif = "Georgia, 'Times New Roman', serif";
const mono = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

const EXPENSE_CATS = ["Housing", "Groceries", "Dining", "Transport", "Utilities", "Insurance", "Health", "Subscriptions", "Entertainment", "Travel", "Education", "Payroll", "Rent & Premises", "Software", "Marketing", "Supplies", "Taxes", "Fees", "Other"];
const INCOME_CATS = ["Salary", "Sales", "Services", "Interest", "Dividends", "Refund", "Grant", "Other"];
const PIE_COLORS = ["#1E5C46", "#B98F2F", "#4A7A63", "#D2B45F", "#7A9A87", "#A93F2C", "#33473C", "#C9A25A", "#5E6E64", "#8FA697"];

const STORE_KEY = "fintrack:data-v1";
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const today = () => new Date().toISOString().slice(0, 10);
const monthKey = (d) => d.slice(0, 7);

const fmt = (n, cur = "$") =>
  `${n < 0 ? "−" : ""}${cur}${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const monthLabel = (mk) => {
  const [y, m] = mk.split("-");
  return new Date(+y, +m - 1, 1).toLocaleString(undefined, { month: "short" });
};

const defaultData = () => ({
  entities: [
    { id: uid(), name: "Personal", type: "personal", currency: "$", transactions: [], budgets: {}, invoices: [] },
  ],
});

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */
const Card = ({ children, className = "", style = {} }) => (
  <div className={`rounded-lg ${className}`} style={{ background: T.card, border: `1px solid ${T.line}`, ...style }}>
    {children}
  </div>
);

const Label = ({ children }) => (
  <label className="block text-xs uppercase tracking-widest mb-1" style={{ color: T.inkSoft, letterSpacing: "0.12em" }}>
    {children}
  </label>
);

const inputStyle = {
  border: `1px solid ${T.line}`, background: "#FCFCFA", color: T.ink,
  borderRadius: 6, padding: "8px 10px", width: "100%", fontSize: 14, outline: "none",
};

const Btn = ({ children, onClick, kind = "primary", small, type = "button", disabled }) => {
  const base = {
    primary: { background: T.green, color: "#fff", border: `1px solid ${T.green}` },
    ghost: { background: "transparent", color: T.ink, border: `1px solid ${T.line}` },
    danger: { background: "transparent", color: T.red, border: `1px solid ${T.line}` },
    brass: { background: T.brass, color: "#fff", border: `1px solid ${T.brass}` },
  }[kind];
  return (
    <button
      type={type} onClick={onClick} disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-md font-medium transition-opacity hover:opacity-85 focus:outline-none focus:ring-2"
      style={{ ...base, padding: small ? "5px 10px" : "9px 16px", fontSize: small ? 12.5 : 14, opacity: disabled ? 0.5 : 1 }}
    >
      {children}
    </button>
  );
};

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(21,32,25,0.45)" }} onClick={onClose}>
    <div className="w-full max-w-md rounded-lg shadow-xl" style={{ background: T.card }} onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${T.line}` }}>
        <h3 style={{ fontFamily: serif, fontSize: 18, color: T.ink }}>{title}</h3>
        <button onClick={onClose} className="p-1 rounded hover:opacity-70" aria-label="Close"><X size={18} color={T.inkSoft} /></button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/* Main app                                                            */
/* ------------------------------------------------------------------ */
export default function FinancialTracker() {
  const [data, setData] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [entityMenu, setEntityMenu] = useState(false);
  const [modal, setModal] = useState(null); // 'tx' | 'entity' | 'budget' | 'invoice' | {type:'editTx', tx}
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved | error

  /* ---------- load (browser localStorage) ---------- */
  useEffect(() => {
    let loaded = null;
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) loaded = JSON.parse(raw);
    } catch (e) { /* first run or corrupted data — start fresh */ }
    const d = loaded && loaded.entities && loaded.entities.length ? loaded : defaultData();
    setData(d);
    setActiveId(d.entities[0].id);
  }, []);

  /* ---------- save ---------- */
  const persist = useCallback((next) => {
    setData(next);
    setSaveState("saving");
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(next));
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1500);
    } catch (e) {
      setSaveState("error");
    }
  }, []);

  const entity = useMemo(() => data?.entities.find((e) => e.id === activeId) || null, [data, activeId]);

  const updateEntity = (fn) => {
    const next = { ...data, entities: data.entities.map((e) => (e.id === activeId ? fn({ ...e }) : e)) };
    persist(next);
  };

  /* ---------- derived figures ---------- */
  const stats = useMemo(() => {
    if (!entity) return null;
    const txs = entity.transactions;
    const balance = txs.reduce((s, t) => s + (t.type === "income" ? t.amount : -t.amount), 0);
    const mk = monthKey(today());
    const monthTx = txs.filter((t) => monthKey(t.date) === mk);
    const monthIn = monthTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const monthOut = monthTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

    // last 6 months cash flow
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const inSum = txs.filter((t) => t.type === "income" && monthKey(t.date) === key).reduce((s, t) => s + t.amount, 0);
      const outSum = txs.filter((t) => t.type === "expense" && monthKey(t.date) === key).reduce((s, t) => s + t.amount, 0);
      months.push({ month: monthLabel(key), Income: +inSum.toFixed(2), Expenses: +outSum.toFixed(2) });
    }

    // this-month expenses by category
    const byCat = {};
    monthTx.filter((t) => t.type === "expense").forEach((t) => { byCat[t.category] = (byCat[t.category] || 0) + t.amount; });
    const catData = Object.entries(byCat).map(([name, value]) => ({ name, value: +value.toFixed(2) })).sort((a, b) => b.value - a.value);

    const outstanding = (entity.invoices || []).filter((i) => i.status === "unpaid").reduce((s, i) => s + i.amount, 0);
    return { balance, monthIn, monthOut, months, catData, byCat, outstanding };
  }, [entity]);

  if (!data || !entity) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: T.paper }}>
        <p style={{ fontFamily: serif, color: T.inkSoft }}>Opening your ledger…</p>
      </div>
    );
  }

  const cur = entity.currency || "$";

  /* ---------------------------------------------------------------- */
  return (
    <div className="min-h-screen" style={{ background: T.paper, color: T.ink, fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      {/* ---------- header ---------- */}
      <header style={{ background: T.ink }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded flex items-center justify-center" style={{ background: T.green }}>
              <Wallet size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontFamily: serif, fontSize: 19, color: "#fff", lineHeight: 1.1 }}>Ledgerline</div>
              <div className="text-xs" style={{ color: "#9DB0A5" }}>Personal & business finance</div>
            </div>
          </div>

          {/* entity switcher */}
          <div className="relative">
            <button
              onClick={() => setEntityMenu((v) => !v)}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm"
              style={{ background: "rgba(255,255,255,0.08)", color: "#fff", border: "1px solid rgba(255,255,255,0.18)" }}
            >
              {entity.type === "personal" ? <Wallet size={14} /> : <Briefcase size={14} />}
              {entity.name}
              <ChevronDown size={14} />
            </button>
            {entityMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg z-40 overflow-hidden" style={{ background: T.card, border: `1px solid ${T.line}` }}>
                {data.entities.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => { setActiveId(e.id); setEntityMenu(false); setTab("dashboard"); }}
                    className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:opacity-80"
                    style={{ color: T.ink, background: e.id === activeId ? T.greenSoft : "transparent" }}
                  >
                    {e.type === "personal" ? <Wallet size={14} color={T.green} /> : <Briefcase size={14} color={T.brass} />}
                    {e.name}
                    {e.id === activeId && <Check size={14} color={T.green} className="ml-auto" />}
                  </button>
                ))}
                <button
                  onClick={() => { setEntityMenu(false); setModal("entity"); }}
                  className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2"
                  style={{ color: T.green, borderTop: `1px solid ${T.line}` }}
                >
                  <Plus size={14} /> Add a business or account
                </button>
              </div>
            )}
          </div>
        </div>

        {/* tabs */}
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto">
          {[
            ["dashboard", "Dashboard", LayoutDashboard],
            ["transactions", "Transactions", ArrowLeftRight],
            ["budgets", "Budgets", Target],
            ["invoices", "Invoices", FileText],
          ].map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm whitespace-nowrap"
              style={{
                color: tab === key ? "#fff" : "#9DB0A5",
                borderBottom: tab === key ? `2px solid ${T.brass}` : "2px solid transparent",
              }}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
          <span className="ml-auto self-center text-xs pr-1" style={{ color: "#9DB0A5" }}>
            {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Couldn't save — retrying on next change" : ""}
          </span>
        </nav>
      </header>

      {/* ---------- body ---------- */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {tab === "dashboard" && <Dashboard entity={entity} stats={stats} cur={cur} openTx={() => setModal("tx")} />}
        {tab === "transactions" && (
          <Transactions
            entity={entity} cur={cur}
            onAdd={() => setModal("tx")}
            onEdit={(tx) => setModal({ type: "editTx", tx })}
            onDelete={(id) => updateEntity((e) => ({ ...e, transactions: e.transactions.filter((t) => t.id !== id) }))}
          />
        )}
        {tab === "budgets" && (
          <Budgets entity={entity} stats={stats} cur={cur}
            onSet={() => setModal("budget")}
            onRemove={(cat) => updateEntity((e) => { const b = { ...e.budgets }; delete b[cat]; return { ...e, budgets: b }; })}
          />
        )}
        {tab === "invoices" && (
          <Invoices entity={entity} cur={cur}
            onAdd={() => setModal("invoice")}
            onDelete={(id) => updateEntity((e) => ({ ...e, invoices: e.invoices.filter((i) => i.id !== id) }))}
            onMarkPaid={(inv) => updateEntity((e) => ({
              ...e,
              invoices: e.invoices.map((i) => (i.id === inv.id ? { ...i, status: "paid", paidDate: today() } : i)),
              transactions: [
                { id: uid(), type: "income", amount: inv.amount, category: "Services", date: today(), note: `Invoice ${inv.number} — ${inv.client}` },
                ...e.transactions,
              ],
            }))}
          />
        )}
      </main>

      {/* ---------- modals ---------- */}
      {modal === "tx" && (
        <TxModal cur={cur} onClose={() => setModal(null)}
          onSave={(tx) => { updateEntity((e) => ({ ...e, transactions: [tx, ...e.transactions] })); setModal(null); }} />
      )}
      {modal && modal.type === "editTx" && (
        <TxModal cur={cur} initial={modal.tx} onClose={() => setModal(null)}
          onSave={(tx) => { updateEntity((e) => ({ ...e, transactions: e.transactions.map((t) => (t.id === tx.id ? tx : t)) })); setModal(null); }} />
      )}
      {modal === "entity" && (
        <EntityModal onClose={() => setModal(null)}
          onSave={(ent) => { const next = { ...data, entities: [...data.entities, ent] }; persist(next); setActiveId(ent.id); setTab("dashboard"); setModal(null); }} />
      )}
      {modal === "budget" && (
        <BudgetModal cur={cur} existing={entity.budgets} onClose={() => setModal(null)}
          onSave={(cat, amt) => { updateEntity((e) => ({ ...e, budgets: { ...e.budgets, [cat]: amt } })); setModal(null); }} />
      )}
      {modal === "invoice" && (
        <InvoiceModal cur={cur} count={(entity.invoices || []).length} onClose={() => setModal(null)}
          onSave={(inv) => { updateEntity((e) => ({ ...e, invoices: [inv, ...(e.invoices || [])] })); setModal(null); }} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */
function Dashboard({ entity, stats, cur, openTx }) {
  const net = stats.monthIn - stats.monthOut;
  return (
    <div className="space-y-5">
      {/* ledger strip — signature element */}
      <Card className="p-6" style={{ background: T.card }}>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="text-xs uppercase tracking-widest mb-2" style={{ color: T.inkSoft, letterSpacing: "0.14em" }}>
              {entity.name} · current balance
            </div>
            <div style={{ fontFamily: mono, fontSize: 42, fontWeight: 600, color: stats.balance < 0 ? T.red : T.ink, lineHeight: 1 }}>
              {fmt(stats.balance, cur)}
            </div>
            <div className="mt-3 h-px w-48" style={{ background: T.brass }} />
          </div>
          <div className="flex gap-8">
            <MiniStat icon={<TrendingUp size={15} color={T.green} />} label="In this month" value={fmt(stats.monthIn, cur)} color={T.green} />
            <MiniStat icon={<TrendingDown size={15} color={T.red} />} label="Out this month" value={fmt(stats.monthOut, cur)} color={T.red} />
            <MiniStat label="Net" value={fmt(net, cur)} color={net >= 0 ? T.green : T.red} />
            {entity.type !== "personal" && (
              <MiniStat label="Invoices outstanding" value={fmt(stats.outstanding, cur)} color={T.brass} />
            )}
          </div>
          <Btn onClick={openTx}><Plus size={15} /> Add transaction</Btn>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* cash flow */}
        <Card className="p-5 lg:col-span-3">
          <h3 style={{ fontFamily: serif, fontSize: 17 }}>Cash flow — last 6 months</h3>
          <div className="mt-4" style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.months} barGap={3}>
                <CartesianGrid vertical={false} stroke={T.line} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: T.inkSoft }} axisLine={{ stroke: T.line }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: T.inkSoft, fontFamily: mono }} axisLine={false} tickLine={false} width={54} />
                <Tooltip formatter={(v) => fmt(v, cur)} contentStyle={{ border: `1px solid ${T.line}`, borderRadius: 8, fontSize: 13 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Income" fill={T.green} radius={[3, 3, 0, 0]} />
                <Bar dataKey="Expenses" fill={T.brass} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* category breakdown */}
        <Card className="p-5 lg:col-span-2">
          <h3 style={{ fontFamily: serif, fontSize: 17 }}>Spending this month</h3>
          {stats.catData.length === 0 ? (
            <Empty text="No expenses recorded this month yet. Add one to see the breakdown." />
          ) : (
            <div className="mt-2 flex flex-col items-center">
              <div style={{ width: "100%", height: 170 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.catData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={75} paddingAngle={2}>
                      {stats.catData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => fmt(v, cur)} contentStyle={{ border: `1px solid ${T.line}`, borderRadius: 8, fontSize: 13 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="w-full mt-2 space-y-1.5">
                {stats.catData.slice(0, 5).map((c, i) => (
                  <li key={c.name} className="flex items-center gap-2 text-sm">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span style={{ color: T.inkSoft }}>{c.name}</span>
                    <span className="ml-auto" style={{ fontFamily: mono, fontSize: 13 }}>{fmt(c.value, cur)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>

      {/* recent activity */}
      <Card className="p-5">
        <h3 style={{ fontFamily: serif, fontSize: 17 }}>Recent activity</h3>
        {entity.transactions.length === 0 ? (
          <Empty text="Your ledger is empty. Record your first transaction to get started." />
        ) : (
          <TxTable txs={entity.transactions.slice(0, 6)} cur={cur} compact />
        )}
      </Card>
    </div>
  );
}

const MiniStat = ({ icon, label, value, color }) => (
  <div>
    <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider" style={{ color: T.inkSoft }}>{icon}{label}</div>
    <div className="mt-1" style={{ fontFamily: mono, fontSize: 19, fontWeight: 600, color }}>{value}</div>
  </div>
);

const Empty = ({ text }) => (
  <p className="mt-4 text-sm rounded-md px-4 py-6 text-center" style={{ color: T.inkSoft, background: T.paper }}>{text}</p>
);

/* ------------------------------------------------------------------ */
/* Transactions                                                        */
/* ------------------------------------------------------------------ */
function TxTable({ txs, cur, compact, onEdit, onDelete }) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider" style={{ color: T.inkSoft }}>
            <th className="py-2 pr-3 font-medium">Date</th>
            <th className="py-2 pr-3 font-medium">Description</th>
            <th className="py-2 pr-3 font-medium">Category</th>
            <th className="py-2 pr-3 font-medium text-right">Amount</th>
            {!compact && <th className="py-2 w-20"></th>}
          </tr>
        </thead>
        <tbody>
          {txs.map((t) => (
            <tr key={t.id} style={{ borderTop: `1px solid ${T.line}` }}>
              <td className="py-2.5 pr-3 whitespace-nowrap" style={{ fontFamily: mono, fontSize: 12.5, color: T.inkSoft }}>{t.date}</td>
              <td className="py-2.5 pr-3">{t.note || <span style={{ color: T.inkSoft }}>—</span>}</td>
              <td className="py-2.5 pr-3">
                <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: t.type === "income" ? T.greenSoft : T.brassSoft, color: t.type === "income" ? T.green : "#8A6A1F" }}>
                  {t.category}
                </span>
              </td>
              <td className="py-2.5 pr-3 text-right whitespace-nowrap" style={{ fontFamily: mono, fontWeight: 600, color: t.type === "income" ? T.green : T.ink }}>
                {t.type === "income" ? "+" : "−"}{fmt(t.amount, cur).replace("−", "")}
              </td>
              {!compact && (
                <td className="py-2.5 text-right whitespace-nowrap">
                  <button onClick={() => onEdit(t)} className="p-1.5 rounded hover:opacity-70" aria-label="Edit"><Pencil size={14} color={T.inkSoft} /></button>
                  <button onClick={() => onDelete(t.id)} className="p-1.5 rounded hover:opacity-70" aria-label="Delete"><Trash2 size={14} color={T.red} /></button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Transactions({ entity, cur, onAdd, onEdit, onDelete }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("all");

  const cats = useMemo(() => [...new Set(entity.transactions.map((t) => t.category))], [entity.transactions]);
  const txs = entity.transactions.filter((t) =>
    (filter === "all" || t.type === filter) &&
    (cat === "all" || t.category === cat) &&
    (!search || (t.note || "").toLowerCase().includes(search.toLowerCase()))
  );

  const exportCsv = () => {
    const rows = [["date", "type", "category", "amount", "note"], ...entity.transactions.map((t) => [t.date, t.type, t.category, t.amount, (t.note || "").replaceAll('"', '""')])];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${entity.name.toLowerCase().replace(/\s+/g, "-")}-transactions.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h3 style={{ fontFamily: serif, fontSize: 17 }}>Transactions</h3>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: T.paper, color: T.inkSoft }}>{txs.length}</span>
        <div className="ml-auto flex flex-wrap gap-2 items-center">
          <input placeholder="Search notes…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...inputStyle, width: 160, padding: "6px 10px" }} />
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ ...inputStyle, width: "auto", padding: "6px 10px" }}>
            <option value="all">All types</option><option value="income">Income</option><option value="expense">Expenses</option>
          </select>
          <select value={cat} onChange={(e) => setCat(e.target.value)} style={{ ...inputStyle, width: "auto", padding: "6px 10px" }}>
            <option value="all">All categories</option>
            {cats.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <Btn kind="ghost" small onClick={exportCsv}><Download size={13} /> CSV</Btn>
          <Btn small onClick={onAdd}><Plus size={13} /> Add</Btn>
        </div>
      </div>
      {txs.length === 0
        ? <Empty text={entity.transactions.length === 0 ? "Nothing recorded yet. Add your first income or expense." : "No transactions match these filters."} />
        : <TxTable txs={txs} cur={cur} onEdit={onEdit} onDelete={onDelete} />}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Budgets                                                             */
/* ------------------------------------------------------------------ */
function Budgets({ entity, stats, cur, onSet, onRemove }) {
  const entries = Object.entries(entity.budgets || {});
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 style={{ fontFamily: serif, fontSize: 17 }}>Monthly budgets</h3>
          <p className="text-sm mt-0.5" style={{ color: T.inkSoft }}>Spending this calendar month, measured against each limit.</p>
        </div>
        <Btn small onClick={onSet}><Plus size={13} /> Set a budget</Btn>
      </div>
      {entries.length === 0 ? (
        <Empty text="No budgets set. Set a monthly limit for a category to track it here." />
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {entries.map(([catName, limit]) => {
            const spent = stats.byCat[catName] || 0;
            const pct = Math.min(100, (spent / limit) * 100);
            const over = spent > limit;
            return (
              <div key={catName} className="rounded-md p-4" style={{ border: `1px solid ${T.line}`, background: over ? T.redSoft : "#FCFCFA" }}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{catName}</span>
                  <button onClick={() => onRemove(catName)} className="p-1 rounded hover:opacity-70" aria-label={`Remove ${catName} budget`}>
                    <Trash2 size={13} color={T.inkSoft} />
                  </button>
                </div>
                <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ background: T.line }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: over ? T.red : pct > 80 ? T.brass : T.green, transition: "width .3s" }} />
                </div>
                <div className="mt-2 flex justify-between text-xs" style={{ fontFamily: mono }}>
                  <span style={{ color: over ? T.red : T.inkSoft }}>{fmt(spent, cur)} spent</span>
                  <span style={{ color: T.inkSoft }}>of {fmt(limit, cur)}</span>
                </div>
                {over && <div className="mt-1.5 text-xs" style={{ color: T.red }}>Over by {fmt(spent - limit, cur)}</div>}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Invoices                                                            */
/* ------------------------------------------------------------------ */
function Invoices({ entity, cur, onAdd, onDelete, onMarkPaid }) {
  const invoices = entity.invoices || [];
  const overdue = (i) => i.status === "unpaid" && i.due && i.due < today();
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 style={{ fontFamily: serif, fontSize: 17 }}>Invoices</h3>
          <p className="text-sm mt-0.5" style={{ color: T.inkSoft }}>Marking an invoice paid records the income in your ledger automatically.</p>
        </div>
        <Btn small onClick={onAdd}><Plus size={13} /> New invoice</Btn>
      </div>
      {invoices.length === 0 ? (
        <Empty text="No invoices yet. Create one to track money owed to you." />
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider" style={{ color: T.inkSoft }}>
                <th className="py-2 pr-3 font-medium">No.</th>
                <th className="py-2 pr-3 font-medium">Client</th>
                <th className="py-2 pr-3 font-medium">Issued</th>
                <th className="py-2 pr-3 font-medium">Due</th>
                <th className="py-2 pr-3 font-medium text-right">Amount</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 w-32"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id} style={{ borderTop: `1px solid ${T.line}` }}>
                  <td className="py-2.5 pr-3" style={{ fontFamily: mono, fontSize: 12.5 }}>{i.number}</td>
                  <td className="py-2.5 pr-3">{i.client}</td>
                  <td className="py-2.5 pr-3" style={{ fontFamily: mono, fontSize: 12.5, color: T.inkSoft }}>{i.issued}</td>
                  <td className="py-2.5 pr-3" style={{ fontFamily: mono, fontSize: 12.5, color: overdue(i) ? T.red : T.inkSoft }}>{i.due || "—"}</td>
                  <td className="py-2.5 pr-3 text-right" style={{ fontFamily: mono, fontWeight: 600 }}>{fmt(i.amount, cur)}</td>
                  <td className="py-2.5 pr-3">
                    <span className="px-2 py-0.5 rounded-full text-xs" style={{
                      background: i.status === "paid" ? T.greenSoft : overdue(i) ? T.redSoft : T.brassSoft,
                      color: i.status === "paid" ? T.green : overdue(i) ? T.red : "#8A6A1F",
                    }}>
                      {i.status === "paid" ? "Paid" : overdue(i) ? "Overdue" : "Unpaid"}
                    </span>
                  </td>
                  <td className="py-2.5 text-right whitespace-nowrap">
                    {i.status === "unpaid" && <Btn kind="ghost" small onClick={() => onMarkPaid(i)}><Check size={13} /> Mark paid</Btn>}
                    <button onClick={() => onDelete(i.id)} className="p-1.5 ml-1 rounded hover:opacity-70" aria-label="Delete invoice">
                      <Trash2 size={14} color={T.red} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Modals                                                              */
/* ------------------------------------------------------------------ */
function TxModal({ cur, initial, onClose, onSave }) {
  const [type, setType] = useState(initial?.type || "expense");
  const [amount, setAmount] = useState(initial?.amount ?? "");
  const [category, setCategory] = useState(initial?.category || "");
  const [date, setDate] = useState(initial?.date || today());
  const [note, setNote] = useState(initial?.note || "");
  const cats = type === "income" ? INCOME_CATS : EXPENSE_CATS;
  const valid = +amount > 0 && date;

  return (
    <Modal title={initial ? "Edit transaction" : "Add transaction"} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {["expense", "income"].map((t) => (
            <button key={t} onClick={() => { setType(t); setCategory(""); }}
              className="py-2 rounded-md text-sm font-medium"
              style={{
                border: `1px solid ${type === t ? (t === "income" ? T.green : T.brass) : T.line}`,
                background: type === t ? (t === "income" ? T.greenSoft : T.brassSoft) : "transparent",
                color: type === t ? (t === "income" ? T.green : "#8A6A1F") : T.inkSoft,
              }}>
              {t === "income" ? "Income" : "Expense"}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Amount ({cur})</Label>
            <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ ...inputStyle, fontFamily: mono }} placeholder="0.00" />
          </div>
          <div>
            <Label>Date</Label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
          </div>
        </div>
        <div>
          <Label>Category</Label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle}>
            <option value="">Choose a category…</option>
            {cats.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <Label>Note (optional)</Label>
          <input value={note} onChange={(e) => setNote(e.target.value)} style={inputStyle} placeholder="e.g. Office rent — July" />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Btn kind="ghost" onClick={onClose}>Cancel</Btn>
          <Btn disabled={!valid} onClick={() => onSave({ id: initial?.id || uid(), type, amount: +(+amount).toFixed(2), category: category || "Other", date, note: note.trim() })}>
            {initial ? "Save changes" : "Add transaction"}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

function EntityModal({ onClose, onSave }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("business");
  const [currency, setCurrency] = useState("$");
  return (
    <Modal title="Add a business or account" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <Label>Name</Label>
          <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} placeholder="e.g. Harbour Design Studio" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Type</Label>
            <select value={type} onChange={(e) => setType(e.target.value)} style={inputStyle}>
              <option value="business">Business</option>
              <option value="personal">Personal</option>
            </select>
          </div>
          <div>
            <Label>Currency symbol</Label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={inputStyle}>
              {["$", "A$", "US$", "€", "£", "¥", "₹", "NZ$"].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Btn kind="ghost" onClick={onClose}>Cancel</Btn>
          <Btn disabled={!name.trim()} onClick={() => onSave({ id: uid(), name: name.trim(), type, currency, transactions: [], budgets: {}, invoices: [] })}>
            Create
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

function BudgetModal({ cur, existing, onClose, onSave }) {
  const [cat, setCat] = useState("");
  const [amt, setAmt] = useState("");
  return (
    <Modal title="Set a monthly budget" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <Label>Category</Label>
          <select value={cat} onChange={(e) => setCat(e.target.value)} style={inputStyle}>
            <option value="">Choose a category…</option>
            {EXPENSE_CATS.map((c) => <option key={c} value={c}>{c}{existing[c] ? " (already set — will replace)" : ""}</option>)}
          </select>
        </div>
        <div>
          <Label>Monthly limit ({cur})</Label>
          <input type="number" min="0" step="0.01" value={amt} onChange={(e) => setAmt(e.target.value)} style={{ ...inputStyle, fontFamily: mono }} placeholder="0.00" />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Btn kind="ghost" onClick={onClose}>Cancel</Btn>
          <Btn disabled={!cat || !(+amt > 0)} onClick={() => onSave(cat, +(+amt).toFixed(2))}>Save budget</Btn>
        </div>
      </div>
    </Modal>
  );
}

function InvoiceModal({ cur, count, onClose, onSave }) {
  const [client, setClient] = useState("");
  const [amount, setAmount] = useState("");
  const [issued, setIssued] = useState(today());
  const [due, setDue] = useState("");
  const number = `INV-${String(count + 1).padStart(4, "0")}`;
  return (
    <Modal title={`New invoice · ${number}`} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <Label>Client</Label>
          <input value={client} onChange={(e) => setClient(e.target.value)} style={inputStyle} placeholder="Client or company name" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Amount ({cur})</Label>
            <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ ...inputStyle, fontFamily: mono }} placeholder="0.00" />
          </div>
          <div>
            <Label>Issued</Label>
            <input type="date" value={issued} onChange={(e) => setIssued(e.target.value)} style={inputStyle} />
          </div>
        </div>
        <div>
          <Label>Due date (optional)</Label>
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} style={inputStyle} />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Btn kind="ghost" onClick={onClose}>Cancel</Btn>
          <Btn disabled={!client.trim() || !(+amount > 0)} onClick={() => onSave({ id: uid(), number, client: client.trim(), amount: +(+amount).toFixed(2), issued, due, status: "unpaid" })}>
            Create invoice
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
