import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Truck, Plus, Trash2, Pencil, AlertTriangle } from "lucide-react";
import { brl } from "@/lib/slug";

export const Route = createFileRoute("/admin/fornecedores")({
  head: () => ({ meta: [{ title: "Fornecedores — Admin" }] }),
  component: FornecedoresPage,
});

type Fornecedor = {
  id: string;
  nome: string;
  linha: string | null;
  pedido_minimo: number;
  custo_medio: number;
  preco_medio: number;
  observacoes: string | null;
};

function FornecedoresPage() {
  const [rows, setRows] = useState<Fornecedor[]>([]);
  const [reposicao, setReposicao] = useState<Record<string, number>>({});
  const [margemPiso, setMargemPiso] = useState(50);
  const [margemMeta, setMargemMeta] = useState(55);
  const [editing, setEditing] = useState<Partial<Fornecedor> | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [{ data: f }, { data: cfg }] = await Promise.all([
      supabase.from("fornecedores").select("*").order("nome"),
      supabase.from("configuracoes_gerais").select("chave,valor").in("chave", ["margem_piso", "margem_meta"]),
    ]);
    setRows((f as Fornecedor[]) ?? []);
    const cfgMap = new Map((cfg ?? []).map((r) => [r.chave, r.valor]));
    setMargemPiso(Number(cfgMap.get("margem_piso") ?? 50));
    setMargemMeta(Number(cfgMap.get("margem_meta") ?? 55));

    // reposição por fornecedor
    const map: Record<string, number> = {};
    await Promise.all((f as Fornecedor[] ?? []).map(async (row) => {
      const { data } = await supabase.rpc("admin_reposicao_fornecedor", { p_fornecedor_id: row.id });
      map[row.id] = Number(data ?? 0);
    }));
    setReposicao(map);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const payload = {
      nome: editing.nome?.trim() ?? "",
      linha: editing.linha ?? null,
      pedido_minimo: Number(editing.pedido_minimo ?? 0),
      custo_medio: Number(editing.custo_medio ?? 0),
      preco_medio: Number(editing.preco_medio ?? 0),
      observacoes: editing.observacoes ?? null,
    };
    if (!payload.nome) return toast.error("Nome é obrigatório.");
    if (editing.id) {
      const { error } = await supabase.from("fornecedores").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Fornecedor atualizado.");
    } else {
      const { error } = await supabase.from("fornecedores").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Fornecedor criado.");
    }
    setEditing(null);
    load();
  }
  async function del(f: Fornecedor) {
    if (!confirm(`Excluir "${f.nome}"?`)) return;
    const { error } = await supabase.from("fornecedores").delete().eq("id", f.id);
    if (error) return toast.error(error.message);
    toast.success("Fornecedor excluído.");
    load();
  }

  return (
    <>
      <div className="flex items-start justify-between mb-10 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Truck className="text-gold" size={18} />
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold">— compras</p>
          </div>
          <h1 className="font-display text-4xl text-foreground">Fornecedores</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Margem calculada como (preço médio − custo médio) ÷ preço médio. Piso: {margemPiso}% · Meta: {margemMeta}% (ajustável em Configurações).
          </p>
        </div>
        <button onClick={() => setEditing({ pedido_minimo: 0, custo_medio: 0, preco_medio: 0 })} className="inline-flex items-center gap-2 bg-foreground text-background px-4 py-2 text-xs uppercase tracking-[0.18em] hover:bg-gold transition-colors">
          <Plus size={14} /> Novo fornecedor
        </button>
      </div>

      {loading ? (
        <p className="font-mono text-xs text-muted-foreground animate-pulse">Carregando…</p>
      ) : rows.length === 0 ? (
        <div className="bg-background border border-border p-8 text-center text-muted-foreground">
          Nenhum fornecedor cadastrado ainda.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-px bg-border">
          {rows.map((f) => (
            <FornecedorCard key={f.id} f={f} margemPiso={margemPiso} margemMeta={margemMeta} reposicao={reposicao[f.id] ?? 0} onEdit={() => setEditing(f)} onDelete={() => del(f)} />
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-background border border-border max-w-lg w-full p-8" onClick={(e) => e.stopPropagation()}>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold mb-2">— {editing.id ? "editar" : "novo"} fornecedor</p>
            <form onSubmit={save} className="space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-1">Nome *</label>
                <input className="form-input" required value={editing.nome ?? ""} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-1">Linha</label>
                <input className="form-input" value={editing.linha ?? ""} placeholder="ex.: entrada/giro rápido" onChange={(e) => setEditing({ ...editing, linha: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-1">Pedido mín.</label>
                  <input type="number" step="0.01" min={0} className="form-input" value={editing.pedido_minimo ?? 0} onChange={(e) => setEditing({ ...editing, pedido_minimo: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-1">Custo médio</label>
                  <input type="number" step="0.01" min={0} className="form-input" value={editing.custo_medio ?? 0} onChange={(e) => setEditing({ ...editing, custo_medio: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-1">Preço médio</label>
                  <input type="number" step="0.01" min={0} className="form-input" value={editing.preco_medio ?? 0} onChange={(e) => setEditing({ ...editing, preco_medio: Number(e.target.value) })} />
                </div>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-1">Observações</label>
                <textarea className="form-input min-h-[80px]" value={editing.observacoes ?? ""} onChange={(e) => setEditing({ ...editing, observacoes: e.target.value })} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 text-xs uppercase tracking-[0.18em] text-foreground/70 hover:text-foreground">Cancelar</button>
                <button type="submit" className="bg-foreground text-background px-5 py-2 text-xs uppercase tracking-[0.18em] hover:bg-gold transition-colors">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function calcMargem(preco: number, custo: number): number {
  if (preco <= 0) return 0;
  return ((preco - custo) / preco) * 100;
}

export function margemTone(pct: number, piso: number, meta: number): { cls: string; label: string } {
  if (pct < piso) return { cls: "bg-destructive/15 text-destructive border-destructive/30", label: "abaixo do piso" };
  if (pct < meta) return { cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30", label: "entre piso e meta" };
  return { cls: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30", label: "acima da meta" };
}

function FornecedorCard({ f, margemPiso, margemMeta, reposicao, onEdit, onDelete }: { f: Fornecedor; margemPiso: number; margemMeta: number; reposicao: number; onEdit: () => void; onDelete: () => void }) {
  const margem = calcMargem(Number(f.preco_medio), Number(f.custo_medio));
  const tone = margemTone(margem, margemPiso, margemMeta);
  const falta = Math.max(0, Number(f.pedido_minimo) - reposicao);
  return (
    <div className="bg-background p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="font-display text-xl text-foreground">{f.nome}</h3>
          {f.linha && <p className="text-xs text-muted-foreground mt-1">{f.linha}</p>}
        </div>
        <div className="flex gap-1">
          <button onClick={onEdit} className="p-2 text-foreground/60 hover:text-gold" aria-label="Editar"><Pencil size={14} /></button>
          <button onClick={onDelete} className="p-2 text-foreground/60 hover:text-destructive" aria-label="Excluir"><Trash2 size={14} /></button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 text-xs mb-4">
        <div><p className="text-muted-foreground uppercase tracking-[0.15em] text-[10px]">Custo</p><p className="font-mono">{brl(f.custo_medio)}</p></div>
        <div><p className="text-muted-foreground uppercase tracking-[0.15em] text-[10px]">Preço</p><p className="font-mono">{brl(f.preco_medio)}</p></div>
        <div><p className="text-muted-foreground uppercase tracking-[0.15em] text-[10px]">Pedido mín.</p><p className="font-mono">{brl(f.pedido_minimo)}</p></div>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <span className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] px-2 py-1 border ${tone.cls}`}>
          {margem < margemPiso && <AlertTriangle size={11} />}
          Margem {margem.toFixed(1)}% · {tone.label}
        </span>
      </div>
      <div className="border-t border-border pt-3">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">Sugestão de reposição</p>
        <p className="text-sm">
          Necessário repor: <span className="font-mono">{brl(reposicao)}</span>
          {f.pedido_minimo > 0 && (
            falta > 0
              ? <span className="text-amber-700 dark:text-amber-400"> — faltam {brl(falta)} para o pedido mínimo</span>
              : <span className="text-green-700 dark:text-green-400"> — atinge o pedido mínimo</span>
          )}
        </p>
      </div>
    </div>
  );
}
