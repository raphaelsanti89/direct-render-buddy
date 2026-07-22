import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Wallet, Plus, Check, Trash2, X, TrendingUp } from "lucide-react";
import { brl } from "@/lib/slug";
import { STATUS_ADMIN_LABEL, statusBadgeClasses, type PedidoStatus } from "@/lib/pedidos";

export const Route = createFileRoute("/admin/contas-pagar")({
  head: () => ({ meta: [{ title: "Financeiro — Admin" }] }),
  component: ContasPagarPage,
});

type Conta = {
  id: string;
  descricao: string;
  categoria: string | null;
  valor: number;
  data_vencimento: string;
  status: string;
  data_pagamento: string | null;
  observacoes: string | null;
};

type PedidoReceber = {
  id: string;
  numero_pedido: string;
  nome_cliente: string;
  total: number;
  status: PedidoStatus;
  status_pagamento: "pago" | "em_aberto";
  created_at: string;
};

const HOJE = () => new Date().toISOString().slice(0, 10);

function diffDias(dataStr: string) {
  const hoje = new Date(HOJE() + "T00:00:00");
  const d = new Date(dataStr + "T00:00:00");
  return Math.round((d.getTime() - hoje.getTime()) / 86400000);
}

function ContasPagarPage() {
  const [rows, setRows] = useState<Conta[]>([]);
  const [loading, setLoading] = useState(true);
  const [modo, setModo] = useState<"pagar" | "receber">("pagar");
  const [tab, setTab] = useState<"vencer" | "pagas">("vencer");
  const [edit, setEdit] = useState<Partial<Conta> | null>(null);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [pedidos, setPedidos] = useState<PedidoReceber[]>([]);
  const [receberOrder, setReceberOrder] = useState<"valor" | "data">("data");

  async function load() {
    setLoading(true);
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);
    const [{ data, error }, { data: cf }, { data: peds }] = await Promise.all([
      supabase.from("contas_pagar").select("*").order("data_vencimento", { ascending: true }),
      supabase.from("custos_fixos").select("categoria").not("categoria", "is", null),
      supabase
        .from("pedidos")
        .select("id,numero_pedido,nome_cliente,total,status,status_pagamento,created_at")
        .neq("status", "cancelado")
        .order("created_at", { ascending: false }),
    ]);
    if (error) toast.error(error.message);
    setRows((data as Conta[]) ?? []);
    const cats = Array.from(new Set(((cf ?? []) as { categoria: string | null }[]).map((r) => r.categoria).filter(Boolean) as string[]));
    setCategorias(cats);
    setPedidos((peds as PedidoReceber[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const totalRecebidoMes = useMemo(() => {
    const ini = new Date();
    ini.setDate(1);
    ini.setHours(0, 0, 0, 0);
    return pedidos
      .filter((p) => p.status_pagamento === "pago" && new Date(p.created_at) >= ini)
      .reduce((s, p) => s + Number(p.total || 0), 0);
  }, [pedidos]);
  const emAberto = useMemo(() => pedidos.filter((p) => p.status_pagamento === "em_aberto"), [pedidos]);
  const totalAReceber = useMemo(() => emAberto.reduce((s, p) => s + Number(p.total || 0), 0), [emAberto]);
  const emAbertoOrdenado = useMemo(() => {
    const arr = [...emAberto];
    if (receberOrder === "valor") arr.sort((a, b) => Number(b.total) - Number(a.total));
    else arr.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return arr;
  }, [emAberto, receberOrder]);

  async function marcarPedidoPago(id: string) {
    const { error } = await supabase.from("pedidos").update({ status_pagamento: "pago" } as any).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Pedido marcado como pago.");
    load();
  }

  const vencer = useMemo(
    () => rows.filter((r) => r.status !== "pago").sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento)),
    [rows],
  );
  const pagas = useMemo(
    () => rows.filter((r) => r.status === "pago").sort((a, b) => (b.data_pagamento ?? "").localeCompare(a.data_pagamento ?? "")),
    [rows],
  );

  const totalVencer = vencer.reduce((s, r) => s + Number(r.valor || 0), 0);
  const totalVencidas = vencer.filter((r) => diffDias(r.data_vencimento) < 0).reduce((s, r) => s + Number(r.valor || 0), 0);

  async function marcarPaga(id: string) {
    const { error } = await supabase
      .from("contas_pagar")
      .update({ status: "pago", data_pagamento: HOJE() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Conta marcada como paga.");
    load();
  }

  async function reabrir(id: string) {
    const { error } = await supabase.from("contas_pagar").update({ status: "pendente", data_pagamento: null }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  async function excluir(id: string) {
    if (!confirm("Excluir esta conta?")) return;
    const { error } = await supabase.from("contas_pagar").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setRows(rows.filter((r) => r.id !== id));
  }

  async function salvar() {
    if (!edit) return;
    if (!edit.descricao?.trim()) return toast.error("Informe a descrição.");
    if (!edit.data_vencimento) return toast.error("Informe a data de vencimento.");
    const payload = {
      descricao: edit.descricao.trim(),
      categoria: edit.categoria?.trim() || null,
      valor: Number(edit.valor || 0),
      data_vencimento: edit.data_vencimento,
      observacoes: edit.observacoes?.trim() || null,
    };
    const { error } = edit.id
      ? await supabase.from("contas_pagar").update(payload).eq("id", edit.id)
      : await supabase.from("contas_pagar").insert({ ...payload, status: "pendente" });
    if (error) return toast.error(error.message);
    toast.success(edit.id ? "Conta atualizada." : "Conta criada.");
    setEdit(null);
    load();
  }

  const lista = tab === "vencer" ? vencer : pagas;

  return (
    <>
      <div className="mb-10 flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Wallet className="text-gold" size={18} />
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold">— financeiro</p>
          </div>
          <h1 className="font-display text-4xl text-foreground">Contas a pagar</h1>
        </div>
        <button
          onClick={() => setEdit({ data_vencimento: HOJE(), valor: 0, categoria: "" })}
          className="inline-flex items-center gap-2 bg-foreground text-background px-5 py-2.5 text-xs uppercase tracking-[0.18em] hover:bg-gold transition-colors"
        >
          <Plus size={14} /> Nova conta
        </button>
      </div>

      <div className="grid sm:grid-cols-3 gap-px bg-border mb-8">
        <div className="bg-background p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">Em aberto</p>
          <p className="font-display text-2xl text-foreground">{brl(totalVencer)}</p>
        </div>
        <div className="bg-background p-5 border-l-2 border-destructive">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">Vencidas</p>
          <p className="font-display text-2xl text-destructive">{brl(totalVencidas)}</p>
        </div>
        <div className="bg-background p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">Nº contas em aberto</p>
          <p className="font-display text-2xl text-foreground">{vencer.length}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6 border-b border-border">
        <TabBtn active={tab === "vencer"} onClick={() => setTab("vencer")}>A vencer ({vencer.length})</TabBtn>
        <TabBtn active={tab === "pagas"} onClick={() => setTab("pagas")}>Pagas ({pagas.length})</TabBtn>
      </div>

      {loading ? (
        <p className="font-mono text-xs text-muted-foreground animate-pulse">Carregando…</p>
      ) : lista.length === 0 ? (
        <p className="text-sm text-muted-foreground p-6 bg-background border border-border text-center">
          {tab === "vencer" ? "Nenhuma conta em aberto." : "Nenhuma conta paga ainda."}
        </p>
      ) : (
        <div className="bg-background border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface/50 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Descrição</th>
                <th className="text-left px-4 py-3">Categoria</th>
                <th className="text-left px-4 py-3">{tab === "vencer" ? "Vencimento" : "Pagamento"}</th>
                <th className="text-right px-4 py-3">Valor</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lista.map((r) => {
                const dias = diffDias(r.data_vencimento);
                const alerta = tab === "vencer" && dias < 0 ? "vencida" : tab === "vencer" && dias <= 3 ? "proxima" : null;
                return (
                  <tr key={r.id} className={alerta === "vencida" ? "bg-destructive/5" : alerta === "proxima" ? "bg-yellow-500/5" : ""}>
                    <td className="px-4 py-3">
                      <button onClick={() => setEdit(r)} className="font-medium text-foreground text-left hover:text-gold">
                        {r.descricao}
                      </button>
                      {r.observacoes && <div className="text-xs text-muted-foreground mt-1">{r.observacoes}</div>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.categoria ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="text-foreground">
                        {new Date((tab === "vencer" ? r.data_vencimento : r.data_pagamento!) + "T00:00:00").toLocaleDateString("pt-BR")}
                      </div>
                      {alerta === "vencida" && (
                        <span className="text-[10px] uppercase tracking-[0.2em] text-destructive">Vencida há {-dias}d</span>
                      )}
                      {alerta === "proxima" && (
                        <span className="text-[10px] uppercase tracking-[0.2em] text-yellow-700 dark:text-yellow-500">
                          {dias === 0 ? "Vence hoje" : `Em ${dias}d`}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{brl(Number(r.valor))}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {tab === "vencer" ? (
                        <button
                          onClick={() => marcarPaga(r.id)}
                          className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.18em] text-gold hover:underline"
                        >
                          <Check size={12} /> Pagar
                        </button>
                      ) : (
                        <button
                          onClick={() => reabrir(r.id)}
                          className="text-xs uppercase tracking-[0.18em] text-foreground/60 hover:text-foreground"
                        >
                          Reabrir
                        </button>
                      )}
                      <button
                        onClick={() => excluir(r.id)}
                        className="ml-3 p-1 text-foreground/40 hover:text-destructive"
                        aria-label="Excluir"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {edit && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-stretch justify-end" onClick={() => setEdit(null)}>
          <div className="w-full max-w-md bg-background overflow-y-auto animate-slide-in-right" onClick={(e) => e.stopPropagation()}>
            <div className="p-8 space-y-5">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold">— {edit.id ? "editar" : "nova"} conta</p>
                <button onClick={() => setEdit(null)} className="text-muted-foreground hover:text-foreground">
                  <X size={18} />
                </button>
              </div>
              <h2 className="font-display text-3xl text-foreground">{edit.id ? "Editar conta" : "Nova conta"}</h2>

              <Field label="Descrição*">
                <input
                  className="form-input w-full"
                  value={edit.descricao ?? ""}
                  onChange={(e) => setEdit({ ...edit, descricao: e.target.value })}
                />
              </Field>
              <Field label="Categoria">
                <input
                  list="cat-list"
                  className="form-input w-full"
                  value={edit.categoria ?? ""}
                  onChange={(e) => setEdit({ ...edit, categoria: e.target.value })}
                  placeholder="ex.: Infraestrutura"
                />
                <datalist id="cat-list">
                  {categorias.map((c) => <option key={c} value={c} />)}
                </datalist>
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Valor (R$)*">
                  <input
                    type="number" step="0.01" min={0}
                    className="form-input w-full"
                    value={edit.valor ?? 0}
                    onChange={(e) => setEdit({ ...edit, valor: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Vencimento*">
                  <input
                    type="date"
                    className="form-input w-full"
                    value={edit.data_vencimento ?? ""}
                    onChange={(e) => setEdit({ ...edit, data_vencimento: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Observações">
                <textarea
                  className="form-input w-full min-h-[80px]"
                  value={edit.observacoes ?? ""}
                  onChange={(e) => setEdit({ ...edit, observacoes: e.target.value })}
                />
              </Field>

              <button
                onClick={salvar}
                className="w-full bg-foreground text-background py-3 text-xs uppercase tracking-[0.2em] hover:bg-gold inline-flex items-center justify-center gap-2"
              >
                <Check size={14} /> {edit.id ? "Salvar" : "Cadastrar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-xs uppercase tracking-[0.18em] border-b-2 transition-colors ${
        active ? "border-gold text-gold" : "border-transparent text-foreground/60 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-foreground/60 mb-2 block">{label}</span>
      {children}
    </label>
  );
}
