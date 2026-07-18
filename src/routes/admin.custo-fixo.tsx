import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calculator, Plus, Trash2, TrendingUp } from "lucide-react";
import { brl } from "@/lib/slug";

export const Route = createFileRoute("/admin/custo-fixo")({
  head: () => ({ meta: [{ title: "Custo Fixo & Metas — Admin" }] }),
  component: CustoFixoPage,
});

type CustoRow = { id?: string; item: string; categoria: string | null; valor_mensal: number; ordem: number };
type VarRow = { id?: string; item: string; percentual: number; ordem: number };
type Metricas = { receita_total: number; custo_total: number; num_pedidos: number; ticket_medio: number; margem_real: number; variaveis_pct: number; margem_liquida: number };
type PerfilRow = { perfil: string; num_pedidos: number; receita: number };

const PERFIL_LABEL: Record<string, string> = {
  varejo: "Varejo",
  assinante: "Assinante",
  b2b_1: "B2B Nível 1",
  b2b_2: "B2B Nível 2",
  b2b_3: "B2B Nível 3",
};

function CustoFixoPage() {
  const [rows, setRows] = useState<CustoRow[]>([]);
  const [varRows, setVarRows] = useState<VarRow[]>([]);
  const [mesesReserva, setMesesReserva] = useState<number>(3);
  const [diasUteis, setDiasUteis] = useState<number>(26);
  const [metricas, setMetricas] = useState<Metricas>({ receita_total: 0, custo_total: 0, num_pedidos: 0, ticket_medio: 0, margem_real: 0, variaveis_pct: 0, margem_liquida: 0 });
  const [perfis, setPerfis] = useState<PerfilRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    const [{ data: c }, { data: v }, { data: cfg }, { data: m }, { data: pf }] = await Promise.all([
      supabase.from("custos_fixos").select("*").order("ordem").order("created_at"),
      supabase.from("custos_variaveis").select("*").order("ordem").order("created_at"),
      supabase.from("configuracoes_gerais").select("chave,valor").in("chave", ["meses_reserva", "dias_uteis_mes"]),
      supabase.rpc("admin_metricas_vendas_30d"),
      supabase.rpc("admin_vendas_mes_por_perfil"),
    ]);
    setRows((c as CustoRow[]) ?? []);
    setVarRows((v as VarRow[]) ?? []);
    const cfgMap = new Map((cfg ?? []).map((r) => [r.chave, r.valor]));
    setMesesReserva(Number(cfgMap.get("meses_reserva") ?? 3));
    setDiasUteis(Number(cfgMap.get("dias_uteis_mes") ?? 26));
    if (m) setMetricas(m as unknown as Metricas);
    setPerfis((pf as PerfilRow[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { loadAll(); }, []);

  const totalFixo = useMemo(() => rows.reduce((s, r) => s + Number(r.valor_mensal || 0), 0), [rows]);
  const totalVarPct = useMemo(() => varRows.reduce((s, r) => s + Number(r.percentual || 0), 0), [varRows]);
  const reservaGiro = totalFixo * mesesReserva;
  const margemLiquida = Math.max(0, metricas.margem_real - totalVarPct / 100);
  const pontoEquilibrio = margemLiquida > 0 ? totalFixo / margemLiquida : 0;
  const metaDiaUtil = diasUteis > 0 ? pontoEquilibrio / diasUteis : 0;
  const vendasPorDia = metricas.ticket_medio > 0 ? metaDiaUtil / metricas.ticket_medio : 0;

  const receitaMes = useMemo(() => perfis.reduce((s, p) => s + Number(p.receita || 0), 0), [perfis]);
  const progressoMeta = pontoEquilibrio > 0 ? Math.min(100, (receitaMes / pontoEquilibrio) * 100) : 0;

  function addRow() {
    setRows([...rows, { item: "", categoria: "", valor_mensal: 0, ordem: rows.length }]);
  }
  function updateRow(idx: number, patch: Partial<CustoRow>) {
    setRows(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }
  async function saveRow(idx: number) {
    const r = rows[idx];
    if (!r.item.trim()) return toast.error("Informe o item.");
    if (r.id) {
      const { error } = await supabase.from("custos_fixos").update({
        item: r.item, categoria: r.categoria, valor_mensal: r.valor_mensal, ordem: r.ordem,
      }).eq("id", r.id);
      if (error) return toast.error(error.message);
      toast.success("Custo salvo.");
    } else {
      const { data, error } = await supabase.from("custos_fixos").insert({
        item: r.item, categoria: r.categoria, valor_mensal: r.valor_mensal, ordem: r.ordem,
      }).select().single();
      if (error) return toast.error(error.message);
      updateRow(idx, { id: (data as CustoRow).id });
      toast.success("Custo criado.");
    }
  }
  async function delRow(idx: number) {
    const r = rows[idx];
    if (!confirm(`Remover "${r.item || "linha"}"?`)) return;
    if (r.id) {
      const { error } = await supabase.from("custos_fixos").delete().eq("id", r.id);
      if (error) return toast.error(error.message);
    }
    setRows(rows.filter((_, i) => i !== idx));
  }

  function addVar() {
    setVarRows([...varRows, { item: "", percentual: 0, ordem: varRows.length }]);
  }
  function updateVar(idx: number, patch: Partial<VarRow>) {
    setVarRows(varRows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }
  async function saveVar(idx: number) {
    const r = varRows[idx];
    if (!r.item.trim()) return toast.error("Informe o item.");
    if (r.id) {
      const { error } = await supabase.from("custos_variaveis").update({
        item: r.item, percentual: r.percentual, ordem: r.ordem,
      }).eq("id", r.id);
      if (error) return toast.error(error.message);
      toast.success("Custo variável salvo.");
    } else {
      const { data, error } = await supabase.from("custos_variaveis").insert({
        item: r.item, percentual: r.percentual, ordem: r.ordem,
      }).select().single();
      if (error) return toast.error(error.message);
      updateVar(idx, { id: (data as VarRow).id });
      toast.success("Custo variável criado.");
    }
    loadAll();
  }
  async function delVar(idx: number) {
    const r = varRows[idx];
    if (!confirm(`Remover "${r.item || "linha"}"?`)) return;
    if (r.id) {
      const { error } = await supabase.from("custos_variaveis").delete().eq("id", r.id);
      if (error) return toast.error(error.message);
    }
    setVarRows(varRows.filter((_, i) => i !== idx));
  }

  async function salvarPremissas() {
    const { error: e1 } = await supabase.from("configuracoes_gerais").update({ valor: String(mesesReserva) }).eq("chave", "meses_reserva");
    const { error: e2 } = await supabase.from("configuracoes_gerais").update({ valor: String(diasUteis) }).eq("chave", "dias_uteis_mes");
    if (e1 || e2) return toast.error(e1?.message || e2?.message || "Erro ao salvar.");
    toast.success("Premissas atualizadas.");
  }

  if (loading) return <p className="font-mono text-xs text-muted-foreground animate-pulse">Carregando…</p>;

  return (
    <>
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <Calculator className="text-gold" size={18} />
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold">— finanças</p>
        </div>
        <h1 className="font-display text-4xl text-foreground">Custo fixo & metas</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Ticket médio e margem de contribuição são calculados em tempo real a partir dos pedidos reais dos últimos 30 dias.
        </p>
      </div>

      {/* Custos fixos */}
      <div className="bg-background border border-border mb-10">
        <div className="flex items-center justify-between p-6 pb-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-foreground/60">— custos fixos mensais</p>
          <button onClick={addRow} className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-gold hover:underline">
            <Plus size={12} /> Adicionar linha
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface/50 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 w-1/2">Item</th>
                <th className="text-left px-4 py-3">Categoria</th>
                <th className="text-right px-4 py-3">Valor mensal</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 && (
                <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Nenhum custo fixo cadastrado.</td></tr>
              )}
              {rows.map((r, i) => (
                <tr key={r.id ?? `new-${i}`}>
                  <td className="px-3 py-2">
                    <input className="form-input" value={r.item} onChange={(e) => updateRow(i, { item: e.target.value })} onBlur={() => saveRow(i)} placeholder="ex.: Aluguel" />
                  </td>
                  <td className="px-3 py-2">
                    <input className="form-input" value={r.categoria ?? ""} onChange={(e) => updateRow(i, { categoria: e.target.value })} onBlur={() => saveRow(i)} placeholder="ex.: Infraestrutura" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" step="0.01" min={0} className="form-input text-right" value={r.valor_mensal} onChange={(e) => updateRow(i, { valor_mensal: Number(e.target.value) })} onBlur={() => saveRow(i)} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => delRow(i)} className="p-2 text-foreground/60 hover:text-destructive" aria-label="Remover"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
              <tr className="bg-surface/30 font-medium">
                <td colSpan={2} className="px-4 py-3 text-right uppercase tracking-[0.18em] text-[11px]">Total</td>
                <td className="px-4 py-3 text-right font-display text-lg">{brl(totalFixo)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Custos variáveis */}
      <div className="bg-background border border-border mb-10">
        <div className="flex items-center justify-between p-6 pb-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-foreground/60">— custos variáveis (%)</p>
            <p className="text-xs text-muted-foreground mt-1">Impostos e taxas incidentes sobre a receita (DAS, cartão, etc.). Reduzem a margem líquida real.</p>
          </div>
          <button onClick={addVar} className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-gold hover:underline">
            <Plus size={12} /> Adicionar linha
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface/50 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 w-2/3">Item</th>
                <th className="text-right px-4 py-3">Percentual (%)</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {varRows.length === 0 && (
                <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">Nenhum custo variável cadastrado.</td></tr>
              )}
              {varRows.map((r, i) => (
                <tr key={r.id ?? `newv-${i}`}>
                  <td className="px-3 py-2">
                    <input className="form-input" value={r.item} onChange={(e) => updateVar(i, { item: e.target.value })} onBlur={() => saveVar(i)} placeholder="ex.: DAS Simples Nacional" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" step="0.01" min={0} className="form-input text-right" value={r.percentual} onChange={(e) => updateVar(i, { percentual: Number(e.target.value) })} onBlur={() => saveVar(i)} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => delVar(i)} className="p-2 text-foreground/60 hover:text-destructive" aria-label="Remover"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
              <tr className="bg-surface/30 font-medium">
                <td className="px-4 py-3 text-right uppercase tracking-[0.18em] text-[11px]">Total variáveis</td>
                <td className="px-4 py-3 text-right font-display text-lg">{totalVarPct.toFixed(2)}%</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Premissas */}
      <div className="bg-background border border-border p-6 mb-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-foreground/60 mb-4">— premissas</p>
        <div className="grid sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-1">Meses de reserva</label>
            <input type="number" min={1} className="form-input" value={mesesReserva} onChange={(e) => setMesesReserva(Number(e.target.value))} />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-1">Dias úteis por mês</label>
            <input type="number" min={1} className="form-input" value={diasUteis} onChange={(e) => setDiasUteis(Number(e.target.value))} />
          </div>
          <button onClick={salvarPremissas} className="bg-foreground text-background px-5 py-2 text-xs uppercase tracking-[0.18em] hover:bg-gold transition-colors">
            Salvar premissas
          </button>
        </div>
      </div>

      {/* Métricas reais */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border mb-4">
        <MetricCard label="Ticket médio (30d)" value={brl(metricas.ticket_medio)} />
        <MetricCard label="Receita (30d)" value={brl(metricas.receita_total)} />
        <MetricCard label="Nº pedidos (30d)" value={String(metricas.num_pedidos)} />
      </div>
      <div className="grid sm:grid-cols-2 gap-px bg-border mb-10">
        <MetricCard label="Margem bruta (produto)" value={metricas.margem_real > 0 ? `${(metricas.margem_real * 100).toFixed(1)}%` : "—"} />
        <MetricCard label={`Margem líquida real (após ${totalVarPct.toFixed(1)}% variáveis)`} value={margemLiquida > 0 ? `${(margemLiquida * 100).toFixed(1)}%` : "—"} highlight />
      </div>

      {/* Resultados calculados */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border mb-10">
        <MetricCard label="Reserva de capital de giro" value={brl(reservaGiro)} highlight />
        <MetricCard label="Ponto de equilíbrio mensal" value={brl(pontoEquilibrio)} highlight />
        <MetricCard label="Meta por dia útil" value={brl(metaDiaUtil)} highlight />
        <MetricCard label="Vendas/dia necessárias" value={vendasPorDia > 0 ? vendasPorDia.toFixed(1) : "—"} highlight />
      </div>

      {/* Vendas do mês vs meta */}
      <div className="bg-background border border-border p-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-foreground/60 mb-4">— vendas do mês vs meta</p>
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-foreground">{brl(receitaMes)} de {brl(pontoEquilibrio)}</span>
            <span className="font-mono text-xs text-gold">{progressoMeta.toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-surface overflow-hidden">
            <div className="h-full bg-gold transition-all" style={{ width: `${progressoMeta}%` }} />
          </div>
        </div>
        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">Quebra por perfil</p>
          {perfis.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum pedido no mês corrente.</p>
          ) : perfis.map((p) => {
            const pct = receitaMes > 0 ? (Number(p.receita) / receitaMes) * 100 : 0;
            return (
              <div key={p.perfil} className="grid grid-cols-[1fr_auto_auto] gap-4 items-center text-sm py-1.5 border-b border-border last:border-0">
                <span className="text-foreground">{PERFIL_LABEL[p.perfil] ?? p.perfil}</span>
                <span className="text-muted-foreground text-xs">{p.num_pedidos} pedido(s)</span>
                <span className="text-right font-mono text-xs w-32"><span className="text-foreground">{brl(p.receita)}</span> <span className="text-muted-foreground">({pct.toFixed(0)}%)</span></span>
              </div>
            );
          })}
        </div>
      </div>

      <LucratividadeProdutos />
    </>
  );
}

type LucroRow = {
  produto_id: string;
  nome: string;
  qtd_vendida: number;
  receita: number;
  custo: number;
  lucro: number;
  margem_pct: number;
};

function LucratividadeProdutos() {
  const [periodo, setPeriodo] = useState<number>(30);
  const [rows, setRows] = useState<LucroRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    (async () => {
      const { data, error } = await (supabase.rpc as any)("admin_lucratividade_produtos", { dias_periodo: periodo });
      if (error) toast.error(error.message);
      setRows(
        ((data as LucroRow[]) ?? []).map((r) => ({
          ...r,
          qtd_vendida: Number(r.qtd_vendida ?? 0),
          receita: Number(r.receita ?? 0),
          custo: Number(r.custo ?? 0),
          lucro: Number(r.lucro ?? 0),
          margem_pct: Number(r.margem_pct ?? 0),
        })),
      );
      setLoading(false);
    })();
  }, [periodo]);

  const totalReceita = rows.reduce((s, r) => s + r.receita, 0);
  const totalCusto = rows.reduce((s, r) => s + r.custo, 0);
  const totalLucro = totalReceita - totalCusto;
  const margemTotal = totalReceita > 0 ? (totalLucro / totalReceita) * 100 : 0;

  return (
    <div className="mt-12 bg-background border border-border">
      <div className="flex items-center justify-between p-6 pb-3 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <TrendingUp className="text-gold" size={16} />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-foreground/60">— lucratividade por produto</p>
            <p className="text-xs text-muted-foreground mt-1">Ordenado pelo lucro absoluto — qual produto realmente traz mais dinheiro.</p>
          </div>
        </div>
        <div className="flex gap-1">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setPeriodo(d)}
              className={`px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] ${
                periodo === d ? "bg-foreground text-background" : "text-foreground/60 hover:text-foreground"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface/50 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3">Produto</th>
              <th className="text-right px-4 py-3">Qtd</th>
              <th className="text-right px-4 py-3">Receita</th>
              <th className="text-right px-4 py-3">Custo</th>
              <th className="text-right px-4 py-3">Lucro</th>
              <th className="text-right px-4 py-3">Margem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground animate-pulse">Carregando…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhuma venda no período.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.produto_id} className="hover:bg-surface/40">
                <td className="px-4 py-3 text-foreground">{r.nome}</td>
                <td className="px-4 py-3 text-right font-mono">{r.qtd_vendida}</td>
                <td className="px-4 py-3 text-right font-mono">{brl(r.receita)}</td>
                <td className="px-4 py-3 text-right font-mono text-muted-foreground">{brl(r.custo)}</td>
                <td className={`px-4 py-3 text-right font-mono ${r.lucro > 0 ? "text-foreground" : "text-destructive"}`}>{brl(r.lucro)}</td>
                <td className="px-4 py-3 text-right font-mono text-gold">{r.margem_pct.toFixed(1)}%</td>
              </tr>
            ))}
            {rows.length > 0 && (
              <tr className="bg-surface/40 font-medium">
                <td className="px-4 py-3 uppercase tracking-[0.18em] text-[11px]">Total</td>
                <td />
                <td className="px-4 py-3 text-right font-display">{brl(totalReceita)}</td>
                <td className="px-4 py-3 text-right font-display text-muted-foreground">{brl(totalCusto)}</td>
                <td className="px-4 py-3 text-right font-display text-gold">{brl(totalLucro)}</td>
                <td className="px-4 py-3 text-right font-display text-gold">{margemTotal.toFixed(1)}%</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetricCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`bg-background p-5 ${highlight ? "border-l-2 border-gold" : ""}`}>
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">{label}</p>
      <p className="font-display text-2xl text-foreground">{value}</p>
    </div>
  );
}
