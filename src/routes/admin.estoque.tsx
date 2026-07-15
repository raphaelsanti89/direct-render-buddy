import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/slug";
import { Warehouse, AlertTriangle, PackageCheck, Wallet } from "lucide-react";

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

type Resumo = { valor_total: number; comprar_agora: number; comprar_em_breve: number };

function EstoquePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [resumo, setResumo] = useState<Resumo>({ valor_total: 0, comprar_agora: 0, comprar_em_breve: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: posicao }, { data: res }] = await Promise.all([
        supabase.rpc("admin_estoque_posicao"),
        supabase.rpc("admin_estoque_resumo"),
      ]);
      setRows((posicao as Row[]) ?? []);
      if (res) setResumo(res as unknown as Resumo);
      setLoading(false);
    })();
  }, []);

  return (
    <>
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <Warehouse className="text-gold" size={18} />
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold">— estoque</p>
        </div>
        <h1 className="font-display text-4xl text-foreground">Posição de estoque</h1>
      </div>

      <div className="grid sm:grid-cols-3 gap-px bg-border mb-10">
        <StatCard label="Valor investido em estoque" value={brl(resumo.valor_total)} icon={Wallet} />
        <StatCard label="Comprar agora" value={String(resumo.comprar_agora)} icon={AlertTriangle} tone="destructive" />
        <StatCard label="Comprar em breve" value={String(resumo.comprar_em_breve)} icon={PackageCheck} tone="amber" />
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
                <th className="text-right px-4 py-3">Ideal</th>
                <th className="text-right px-4 py-3">Valor investido</th>
                <th className="text-left px-4 py-3">Fornecedor</th>
                <th className="text-left px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 text-foreground">{r.nome}</td>
                  <td className="px-4 py-3 text-right">{r.estoque_atual}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{r.estoque_minimo}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{r.estoque_ideal}</td>
                  <td className="px-4 py-3 text-right">{brl(r.valor_investido)}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{r.fornecedor_nome ?? "—"}</td>
                  <td className="px-4 py-3"><StatusPill status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Editar níveis e custo em <Link to="/admin/produtos" className="text-gold hover:underline">Produtos</Link>.
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
