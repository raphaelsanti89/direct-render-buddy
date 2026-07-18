import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { brl } from "@/lib/slug";
import { Warehouse, AlertTriangle, PackageCheck, Wallet, Trophy, Check, Pencil, X } from "lucide-react";

export const Route = createFileRoute("/admin/estoque")({
  head: () => ({ meta: [{ title: "Estoque — Admin" }] }),
  component: EstoquePage,
});

type Row = {
  id: string;
  nome: string;
  estoque_atual: number;
  estoque_minimo: number;
  estoque_ideal: number;
  preco_custo: number;
  valor_investido: number;
  status: "comprar_agora" | "comprar_em_breve" | "ok";
  fornecedor_id: string | null;
  fornecedor_nome: string | null;
};

type Vel = { produto_id: string; qtd_30d: number; media_diaria: number; sugestao_minimo: number; campeao: boolean };
type Resumo = { valor_total: number; comprar_agora: number; comprar_em_breve: number };
type Campeao = {
  produto_id: string;
  nome: string;
  qtd_vendida: number;
  media_diaria: number;
  estoque_atual: number;
  estoque_minimo_atual: number;
  estoque_ideal_atual: number;
};

function EstoquePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [velMap, setVelMap] = useState<Map<string, Vel>>(new Map());
  const [resumo, setResumo] = useState<Resumo>({ valor_total: 0, comprar_agora: 0, comprar_em_breve: 0 });
  const [campeoes, setCampeoes] = useState<Campeao[]>([]);
  const [coberturaMin, setCoberturaMin] = useState<number>(15);
  const [coberturaIdeal, setCoberturaIdeal] = useState<number>(30);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ estoque_atual: string; estoque_minimo: string; estoque_ideal: string }>({ estoque_atual: "", estoque_minimo: "", estoque_ideal: "" });
  const [saving, setSaving] = useState(false);

  function startEdit(r: Row) {
    setEditingId(r.id);
    setDraft({
      estoque_atual: String(r.estoque_atual ?? 0),
      estoque_minimo: String(r.estoque_minimo ?? 0),
      estoque_ideal: String(r.estoque_ideal ?? 0),
    });
  }
  function cancelEdit() {
    setEditingId(null);
  }
  async function saveEdit(r: Row) {
    const atual = Math.trunc(Number(draft.estoque_atual));
    const minimo = Math.max(0, Math.trunc(Number(draft.estoque_minimo)));
    const ideal = Math.max(0, Math.trunc(Number(draft.estoque_ideal)));
    if (!Number.isFinite(atual) || !Number.isFinite(minimo) || !Number.isFinite(ideal)) {
      toast.error("Valores inválidos.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("produtos")
      .update({ estoque_atual: atual, estoque_minimo: minimo, estoque_ideal: ideal })
      .eq("id", r.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    const valor_investido = Math.max(atual, 0) * Number(r.preco_custo ?? 0);
    const status: Row["status"] =
      atual <= minimo ? "comprar_agora" : atual < ideal ? "comprar_em_breve" : "ok";
    setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, estoque_atual: atual, estoque_minimo: minimo, estoque_ideal: ideal, valor_investido, status } : x)));
    setResumo((prev) => {
      const next = { valor_total: 0, comprar_agora: 0, comprar_em_breve: 0 };
      const updated = rows.map((x) => (x.id === r.id ? { ...x, estoque_atual: atual, estoque_minimo: minimo, estoque_ideal: ideal, valor_investido, status } : x));
      for (const x of updated) {
        next.valor_total += Math.max(x.estoque_atual, 0) * Number(x.preco_custo ?? 0);
        if (x.status === "comprar_agora") next.comprar_agora += 1;
        else if (x.status === "comprar_em_breve") next.comprar_em_breve += 1;
      }
      return next;
    });
    setEditingId(null);
    toast.success("Estoque atualizado.");
  }

  async function load() {
    setLoading(true);
    const [{ data: posicao }, { data: res }, { data: vel }, { data: camp }, { data: cfg }] = await Promise.all([
      supabase.rpc("admin_estoque_posicao"),
      supabase.rpc("admin_estoque_resumo"),
      supabase.rpc("admin_produtos_velocidade"),
      supabase.rpc("admin_produtos_mais_vendidos", { dias_periodo: 30 }),
      supabase.from("configuracoes_gerais").select("chave,valor").in("chave", ["cobertura_minimo_dias", "cobertura_ideal_dias"]),
    ]);
    setRows((posicao as Row[]) ?? []);
    if (res) setResumo(res as unknown as Resumo);
    const m = new Map<string, Vel>();
    ((vel as Vel[]) ?? []).forEach((v) => m.set(v.produto_id, v));
    setVelMap(m);
    setCampeoes((camp as Campeao[]) ?? []);
    const cfgMap = new Map((cfg ?? []).map((r) => [r.chave, r.valor]));
    setCoberturaMin(Number(cfgMap.get("cobertura_minimo_dias") ?? 15));
    setCoberturaIdeal(Number(cfgMap.get("cobertura_ideal_dias") ?? 30));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function aplicarSugestaoCampeao(c: Campeao) {
    const sugMin = Math.ceil(Number(c.media_diaria) * coberturaMin);
    const sugIdeal = Math.ceil(Number(c.media_diaria) * coberturaIdeal);
    if (!confirm(`Aplicar em "${c.nome}"?\nMínimo: ${c.estoque_minimo_atual} → ${sugMin}\nIdeal: ${c.estoque_ideal_atual} → ${sugIdeal}`)) return;
    const { error } = await supabase.from("produtos").update({ estoque_minimo: sugMin, estoque_ideal: sugIdeal }).eq("id", c.produto_id);
    if (error) return toast.error(error.message);
    toast.success("Sugestão aplicada.");
    load();
  }

  const sugestoesPendentes = useMemo(
    () => rows.filter((r) => {
      const s = velMap.get(r.id)?.sugestao_minimo ?? 0;
      return s > (r.estoque_minimo ?? 0);
    }),
    [rows, velMap]
  );

  async function aplicar(id: string, novoMinimo: number) {
    const { error } = await supabase.from("produtos").update({ estoque_minimo: novoMinimo }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Estoque mínimo atualizado.");
    load();
  }

  async function aplicarTodas() {
    if (sugestoesPendentes.length === 0) return;
    if (!confirm(`Aplicar sugestão de estoque mínimo em ${sugestoesPendentes.length} produto(s)?`)) return;
    setApplying(true);
    try {
      for (const r of sugestoesPendentes) {
        const s = velMap.get(r.id)!.sugestao_minimo;
        const { error } = await supabase.from("produtos").update({ estoque_minimo: s }).eq("id", r.id);
        if (error) throw error;
      }
      toast.success(`Sugestões aplicadas em ${sugestoesPendentes.length} produto(s).`);
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao aplicar.");
    } finally {
      setApplying(false);
    }
  }

  return (
    <>
      <div className="mb-10 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Warehouse className="text-gold" size={18} />
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold">— estoque</p>
          </div>
          <h1 className="font-display text-4xl text-foreground">Posição de estoque</h1>
        </div>
        {sugestoesPendentes.length > 0 && (
          <button
            onClick={aplicarTodas}
            disabled={applying}
            className="bg-foreground text-background px-5 py-2 text-xs uppercase tracking-[0.18em] hover:bg-gold transition-colors disabled:opacity-50"
          >
            {applying ? "Aplicando…" : `Aplicar todas as sugestões (${sugestoesPendentes.length})`}
          </button>
        )}
      </div>

      <div className="grid sm:grid-cols-3 gap-px bg-border mb-10">
        <StatCard label="Valor investido em estoque" value={brl(resumo.valor_total)} icon={Wallet} />
        <StatCard label="Comprar agora" value={String(resumo.comprar_agora)} icon={AlertTriangle} tone="destructive" />
        <StatCard label="Comprar em breve" value={String(resumo.comprar_em_breve)} icon={PackageCheck} tone="amber" />
      </div>


      {/* Campeões de venda */}
      <div className="bg-background border border-border mb-10">
        <div className="p-6 pb-3 flex items-center gap-3">
          <Trophy className="text-gold" size={16} />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-foreground/60">— campeões de venda (últimos 30 dias)</p>
            <p className="text-xs text-muted-foreground mt-1">
              Sugestões calculadas com cobertura de {coberturaMin} dias (mínimo) e {coberturaIdeal} dias (ideal).
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          {campeoes.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Ainda não há vendas suficientes para gerar campeões.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-surface/50 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">Produto</th>
                  <th className="text-right px-4 py-3">Vendas 30d</th>
                  <th className="text-right px-4 py-3">Média/dia</th>
                  <th className="text-right px-4 py-3">Atual</th>
                  <th className="text-right px-4 py-3">Mín. atual</th>
                  <th className="text-right px-4 py-3">Sug. mín.</th>
                  <th className="text-right px-4 py-3">Ideal atual</th>
                  <th className="text-right px-4 py-3">Sug. ideal</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {campeoes.map((c) => {
                  const sugMin = Math.ceil(Number(c.media_diaria) * coberturaMin);
                  const sugIdeal = Math.ceil(Number(c.media_diaria) * coberturaIdeal);
                  const precisaMin = sugMin > c.estoque_minimo_atual;
                  const precisaIdeal = sugIdeal > c.estoque_ideal_atual;
                  const pendente = precisaMin || precisaIdeal;
                  return (
                    <tr key={c.produto_id}>
                      <td className="px-4 py-3 text-foreground">{c.nome}</td>
                      <td className="px-4 py-3 text-right font-mono">{c.qtd_vendida}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground text-xs">{Number(c.media_diaria).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">{c.estoque_atual}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{c.estoque_minimo_atual}</td>
                      <td className={`px-4 py-3 text-right ${precisaMin ? "text-amber-700 dark:text-amber-400 font-medium" : "text-muted-foreground"}`}>{sugMin}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{c.estoque_ideal_atual}</td>
                      <td className={`px-4 py-3 text-right ${precisaIdeal ? "text-amber-700 dark:text-amber-400 font-medium" : "text-muted-foreground"}`}>{sugIdeal}</td>
                      <td className="px-4 py-3 text-right">
                        {pendente ? (
                          <button
                            onClick={() => aplicarSugestaoCampeao(c)}
                            className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] px-3 py-1.5 border border-gold text-gold hover:bg-gold hover:text-background transition-colors"
                          >
                            <Check size={10} /> Aplicar
                          </button>
                        ) : (
                          <span className="text-[10px] uppercase tracking-[0.18em] text-green-700 dark:text-green-400">OK</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="bg-background border border-border overflow-x-auto">
        {loading ? (
          <p className="p-6 font-mono text-xs text-muted-foreground animate-pulse">Carregando…</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">Nenhum produto ativo cadastrado.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface/50 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Produto</th>
                <th className="text-right px-4 py-3">Atual</th>
                <th className="text-right px-4 py-3">Mínimo</th>
                <th className="text-left px-4 py-3">Sugestão</th>
                <th className="text-right px-4 py-3">Ideal</th>
                <th className="text-right px-4 py-3">Vendas/dia (30d)</th>
                <th className="text-right px-4 py-3">Valor investido</th>
                <th className="text-left px-4 py-3">Fornecedor</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => {
                const v = velMap.get(r.id);
                const sug = v?.sugestao_minimo ?? 0;
                const pendente = sug > (r.estoque_minimo ?? 0);
                const isEditing = editingId === r.id;
                const inputCls = "w-20 bg-background border border-border px-2 py-1 text-right text-sm focus:outline-none focus:border-gold";
                return (
                  <tr key={r.id} className={isEditing ? "bg-surface/30" : ""}>
                    <td className="px-4 py-3 text-foreground">
                      <div className="flex items-center gap-2">
                        {v?.campeao && (
                          <span title="Campeão de vendas (top 20%)" className="inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.18em] bg-gold text-background px-1.5 py-0.5">
                            <Trophy size={9} />
                          </span>
                        )}
                        {r.nome}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <input type="number" className={inputCls} value={draft.estoque_atual} onChange={(e) => setDraft((d) => ({ ...d, estoque_atual: e.target.value }))} />
                      ) : (
                        r.estoque_atual
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {isEditing ? (
                        <input type="number" min={0} className={inputCls} value={draft.estoque_minimo} onChange={(e) => setDraft((d) => ({ ...d, estoque_minimo: e.target.value }))} />
                      ) : (
                        r.estoque_minimo
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {pendente ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-amber-700 dark:text-amber-400">Sugestão: {sug} — atual: {r.estoque_minimo}</span>
                          <button
                            onClick={() => aplicar(r.id, sug)}
                            className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] px-2 py-1 border border-gold text-gold hover:bg-gold hover:text-background transition-colors"
                          >
                            <Check size={10} /> Aplicar
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {isEditing ? (
                        <input type="number" min={0} className={inputCls} value={draft.estoque_ideal} onChange={(e) => setDraft((d) => ({ ...d, estoque_ideal: e.target.value }))} />
                      ) : (
                        r.estoque_ideal
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground text-xs">{v ? v.media_diaria.toFixed(2) : "—"}</td>
                    <td className="px-4 py-3 text-right">{brl(r.valor_investido)}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{r.fornecedor_nome ?? "—"}</td>
                    <td className="px-4 py-3"><StatusPill status={r.status} /></td>
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => saveEdit(r)}
                            disabled={saving}
                            className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] px-2 py-1 bg-foreground text-background hover:bg-gold transition-colors disabled:opacity-50"
                          >
                            <Check size={10} /> Salvar
                          </button>
                          <button
                            onClick={cancelEdit}
                            disabled={saving}
                            className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] px-2 py-1 border border-border text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(r)}
                          className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] px-2 py-1 border border-border text-muted-foreground hover:text-gold hover:border-gold transition-colors"
                        >
                          <Pencil size={10} /> Editar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Editar níveis e custo em <Link to="/admin/produtos" className="text-gold hover:underline">Produtos</Link>. Sugestão = média diária de vendas dos últimos 30 dias × prazo de reposição.
      </p>
    </>
  );
}

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number }>; tone?: "destructive" | "amber" }) {
  const toneCls = tone === "destructive" ? "text-destructive" : tone === "amber" ? "text-amber-700 dark:text-amber-400" : "text-foreground";
  return (
    <div className="bg-background p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{label}</span>
        <Icon size={14} strokeWidth={1.5} />
      </div>
      <div className={`font-display text-3xl ${toneCls}`}>{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: Row["status"] }) {
  if (status === "comprar_agora") {
    return <span className="inline-block text-[10px] uppercase tracking-[0.18em] px-2 py-1 bg-destructive/15 text-destructive border border-destructive/30">Comprar agora</span>;
  }
  if (status === "comprar_em_breve") {
    return <span className="inline-block text-[10px] uppercase tracking-[0.18em] px-2 py-1 bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">Comprar em breve</span>;
  }
  return <span className="inline-block text-[10px] uppercase tracking-[0.18em] px-2 py-1 bg-green-500/15 text-green-700 dark:text-green-400 border border-green-500/30">OK</span>;
}
