import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BookOpen, Plus, Trash2, CheckSquare, Square } from "lucide-react";
import { brl } from "@/lib/slug";

export const Route = createFileRoute("/admin/referencia")({
  head: () => ({ meta: [{ title: "Referência — Admin" }] }),
  component: ReferenciaPage,
});

type Decisao = { id: string; texto: string };
type CustoRef = { id?: string; item: string; valor: number; observacao: string | null; tag: "bom" | "neutro" | "atencao"; ordem: number };
type Timeline = { id?: string; periodo: string; descricao: string | null; valor: number; ordem: number };
type Check = { id: string; item: string; status: "pendente" | "concluido"; ordem: number };

function ReferenciaPage() {
  const [decisao, setDecisao] = useState<Decisao | null>(null);
  const [decisaoTexto, setDecisaoTexto] = useState("");
  const [abertura, setAbertura] = useState<CustoRef[]>([]);
  const [manutencao, setManutencao] = useState<CustoRef[]>([]);
  const [timeline, setTimeline] = useState<Timeline[]>([]);
  const [checklist, setChecklist] = useState<Check[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [d, a, m, t, c] = await Promise.all([
      supabase.from("referencia_decisao").select("*").limit(1).maybeSingle(),
      supabase.from("referencia_custos_abertura").select("*").order("ordem").order("created_at"),
      supabase.from("referencia_custos_manutencao").select("*").order("ordem").order("created_at"),
      supabase.from("referencia_capital_timeline").select("*").order("ordem").order("created_at"),
      supabase.from("referencia_checklist").select("*").order("ordem").order("created_at"),
    ]);
    setDecisao((d.data as Decisao) ?? null);
    setDecisaoTexto((d.data?.texto as string) ?? "");
    setAbertura((a.data as CustoRef[]) ?? []);
    setManutencao((m.data as CustoRef[]) ?? []);
    setTimeline((t.data as Timeline[]) ?? []);
    setChecklist((c.data as Check[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function salvarDecisao() {
    if (!decisao) {
      const { error } = await supabase.from("referencia_decisao").insert({ texto: decisaoTexto });
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("referencia_decisao").update({ texto: decisaoTexto }).eq("id", decisao.id);
      if (error) return toast.error(error.message);
    }
    toast.success("Decisão salva.");
    load();
  }

  async function toggleCheck(c: Check) {
    const novo = c.status === "pendente" ? "concluido" : "pendente";
    const { error } = await supabase.from("referencia_checklist").update({ status: novo }).eq("id", c.id);
    if (error) return toast.error(error.message);
    setChecklist(checklist.map((x) => x.id === c.id ? { ...x, status: novo } : x));
  }
  async function addCheck() {
    const item = prompt("Novo item de checklist:");
    if (!item) return;
    const { data, error } = await supabase.from("referencia_checklist").insert({ item, ordem: checklist.length }).select().single();
    if (error) return toast.error(error.message);
    setChecklist([...checklist, data as Check]);
  }
  async function delCheck(c: Check) {
    if (!confirm(`Remover "${c.item}"?`)) return;
    const { error } = await supabase.from("referencia_checklist").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    setChecklist(checklist.filter((x) => x.id !== c.id));
  }

  if (loading) return <p className="font-mono text-xs text-muted-foreground animate-pulse">Carregando…</p>;

  return (
    <>
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="text-gold" size={18} />
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold">— referência</p>
        </div>
        <h1 className="font-display text-4xl text-foreground">Base de referência estratégica</h1>
      </div>

      {/* Decisão */}
      <div className="bg-background border border-border p-6 mb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-foreground/60 mb-3">— decisão SLU</p>
        <textarea className="form-input min-h-[140px] mb-3" value={decisaoTexto} onChange={(e) => setDecisaoTexto(e.target.value)} />
        <button onClick={salvarDecisao} className="bg-foreground text-background px-5 py-2 text-xs uppercase tracking-[0.18em] hover:bg-gold transition-colors">Salvar decisão</button>
      </div>

      <CustosTable title="Custos de abertura (SLU)" table="referencia_custos_abertura" rows={abertura} setRows={setAbertura} />
      <CustosTable title="Manutenção mensal (SLU)" table="referencia_custos_manutencao" rows={manutencao} setRows={setManutencao} />
      <TimelineTable rows={timeline} setRows={setTimeline} />

      {/* Checklist */}
      <div className="bg-background border border-border mb-8">
        <div className="flex items-center justify-between p-6 pb-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-foreground/60">— checklist operacional / jurídico</p>
          <button onClick={addCheck} className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-gold hover:underline">
            <Plus size={12} /> Adicionar
          </button>
        </div>
        <ul className="divide-y divide-border">
          {checklist.map((c) => (
            <li key={c.id} className="flex items-center justify-between px-6 py-3 gap-4">
              <button onClick={() => toggleCheck(c)} className="flex items-center gap-3 flex-1 text-left">
                {c.status === "concluido" ? <CheckSquare size={16} className="text-green-700 dark:text-green-400" /> : <Square size={16} className="text-muted-foreground" />}
                <span className={c.status === "concluido" ? "line-through text-muted-foreground text-sm" : "text-sm text-foreground"}>{c.item}</span>
              </button>
              <button onClick={() => delCheck(c)} className="p-1.5 text-foreground/50 hover:text-destructive" aria-label="Remover"><Trash2 size={13} /></button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function CustosTable({ title, table, rows, setRows }: { title: string; table: "referencia_custos_abertura" | "referencia_custos_manutencao"; rows: CustoRef[]; setRows: (r: CustoRef[]) => void }) {
  function upd(i: number, patch: Partial<CustoRef>) {
    setRows(rows.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  }
  async function save(i: number) {
    const r = rows[i];
    if (!r.item.trim()) return;
    if (r.id) {
      const { error } = await supabase.from(table).update({ item: r.item, valor: r.valor, observacao: r.observacao, tag: r.tag, ordem: r.ordem }).eq("id", r.id);
      if (error) return toast.error(error.message);
    } else {
      const { data, error } = await supabase.from(table).insert({ item: r.item, valor: r.valor, observacao: r.observacao, tag: r.tag, ordem: r.ordem }).select().single();
      if (error) return toast.error(error.message);
      upd(i, { id: (data as CustoRef).id });
    }
  }
  async function del(i: number) {
    const r = rows[i];
    if (!confirm("Remover?")) return;
    if (r.id) {
      const { error } = await supabase.from(table).delete().eq("id", r.id);
      if (error) return toast.error(error.message);
    }
    setRows(rows.filter((_, idx) => idx !== i));
  }
  function add() {
    setRows([...rows, { item: "", valor: 0, observacao: "", tag: "neutro", ordem: rows.length }]);
  }
  const total = rows.reduce((s, r) => s + Number(r.valor || 0), 0);
  return (
    <div className="bg-background border border-border mb-8">
      <div className="flex items-center justify-between p-6 pb-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-foreground/60">— {title}</p>
        <button onClick={add} className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-gold hover:underline">
          <Plus size={12} /> Adicionar
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface/50 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2">Item</th>
              <th className="text-right px-3 py-2 w-32">Valor</th>
              <th className="text-left px-3 py-2">Observação</th>
              <th className="text-left px-3 py-2 w-32">Tag</th>
              <th className="w-10 px-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r, i) => (
              <tr key={r.id ?? `new-${i}`}>
                <td className="px-3 py-2"><input className="form-input" value={r.item} onChange={(e) => upd(i, { item: e.target.value })} onBlur={() => save(i)} /></td>
                <td className="px-3 py-2"><input type="number" step="0.01" min={0} className="form-input text-right" value={r.valor} onChange={(e) => upd(i, { valor: Number(e.target.value) })} onBlur={() => save(i)} /></td>
                <td className="px-3 py-2"><input className="form-input" value={r.observacao ?? ""} onChange={(e) => upd(i, { observacao: e.target.value })} onBlur={() => save(i)} /></td>
                <td className="px-3 py-2">
                  <select className="form-input" value={r.tag} onChange={(e) => { upd(i, { tag: e.target.value as CustoRef["tag"] }); setTimeout(() => save(i), 0); }}>
                    <option value="bom">bom</option>
                    <option value="neutro">neutro</option>
                    <option value="atencao">atenção</option>
                  </select>
                </td>
                <td className="px-2 py-2 text-right"><button onClick={() => del(i)} className="p-1.5 text-foreground/60 hover:text-destructive" aria-label="Remover"><Trash2 size={13} /></button></td>
              </tr>
            ))}
            <tr className="bg-surface/30 font-medium">
              <td className="px-3 py-2 text-right uppercase tracking-[0.18em] text-[11px]">Total</td>
              <td className="px-3 py-2 text-right font-display">{brl(total)}</td>
              <td colSpan={3} />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TimelineTable({ rows, setRows }: { rows: Timeline[]; setRows: (r: Timeline[]) => void }) {
  function upd(i: number, patch: Partial<Timeline>) {
    setRows(rows.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  }
  async function save(i: number) {
    const r = rows[i];
    if (!r.periodo.trim()) return;
    if (r.id) {
      const { error } = await supabase.from("referencia_capital_timeline").update({ periodo: r.periodo, descricao: r.descricao, valor: r.valor, ordem: r.ordem }).eq("id", r.id);
      if (error) return toast.error(error.message);
    } else {
      const { data, error } = await supabase.from("referencia_capital_timeline").insert({ periodo: r.periodo, descricao: r.descricao, valor: r.valor, ordem: r.ordem }).select().single();
      if (error) return toast.error(error.message);
      upd(i, { id: (data as Timeline).id });
    }
  }
  async function del(i: number) {
    const r = rows[i];
    if (!confirm("Remover?")) return;
    if (r.id) {
      const { error } = await supabase.from("referencia_capital_timeline").delete().eq("id", r.id);
      if (error) return toast.error(error.message);
    }
    setRows(rows.filter((_, idx) => idx !== i));
  }
  function add() {
    setRows([...rows, { periodo: "", descricao: "", valor: 0, ordem: rows.length }]);
  }
  return (
    <div className="bg-background border border-border mb-8">
      <div className="flex items-center justify-between p-6 pb-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-foreground/60">— linha do tempo de capital necessário</p>
        <button onClick={add} className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-gold hover:underline">
          <Plus size={12} /> Adicionar
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface/50 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2 w-40">Período</th>
              <th className="text-left px-3 py-2">Descrição</th>
              <th className="text-right px-3 py-2 w-32">Valor</th>
              <th className="w-10 px-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r, i) => (
              <tr key={r.id ?? `new-${i}`}>
                <td className="px-3 py-2"><input className="form-input" value={r.periodo} onChange={(e) => upd(i, { periodo: e.target.value })} onBlur={() => save(i)} placeholder="ex.: Mês 1" /></td>
                <td className="px-3 py-2"><input className="form-input" value={r.descricao ?? ""} onChange={(e) => upd(i, { descricao: e.target.value })} onBlur={() => save(i)} /></td>
                <td className="px-3 py-2"><input type="number" step="0.01" min={0} className="form-input text-right" value={r.valor} onChange={(e) => upd(i, { valor: Number(e.target.value) })} onBlur={() => save(i)} /></td>
                <td className="px-2 py-2 text-right"><button onClick={() => del(i)} className="p-1.5 text-foreground/60 hover:text-destructive" aria-label="Remover"><Trash2 size={13} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
