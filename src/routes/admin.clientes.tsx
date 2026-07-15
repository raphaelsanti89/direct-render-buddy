import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AdminShell } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import {
  adminApproveB2B,
  adminRejectB2B,
  adminResetCliente,
} from "@/lib/clientes.functions";
import { toast } from "sonner";
import { Check, X, RotateCcw, Search } from "lucide-react";

export const Route = createFileRoute("/admin/clientes")({
  component: AdminClientesPage,
});

type Profile = {
  id: string | null;
  nome: string | null;
  email: string | null;
  tipo_cliente: "varejo" | "assinante" | "b2b";
  nivel_b2b: number | null;
  status_aprovacao: "pendente" | "aprovado" | "rejeitado" | null;
  empresa_nome: string | null;
  cnpj: string | null;
  whatsapp: string | null;
  observacoes_admin: string | null;
  created_at: string;
  is_guest: boolean;
  total_pedidos: number;
  total_gasto: number;
};

type Filter = "todos" | "pendentes" | "b2b" | "assinantes" | "varejo" | "guest";

function AdminClientesPage() {
  return (
    <AdminShell>
      <ClientesContent />
    </AdminShell>
  );
}

function ClientesContent() {
  const [items, setItems] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("todos");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Profile | null>(null);

  async function reload() {
    setLoading(true);
    const { data, error } = await (supabase.rpc as any)("admin_list_clientes");
    if (error) toast.error(error.message);
    setItems(((data as Profile[]) ?? []).map((r) => ({
      ...r,
      total_pedidos: Number(r.total_pedidos ?? 0),
      total_gasto: Number(r.total_gasto ?? 0),
    })));
    setLoading(false);
  }

  useEffect(() => { reload(); }, []);

  const filtrados = items.filter((p) => {
    if (filter === "pendentes" && !(p.tipo_cliente === "b2b" && p.status_aprovacao === "pendente")) return false;
    if (filter === "b2b" && p.tipo_cliente !== "b2b") return false;
    if (filter === "assinantes" && p.tipo_cliente !== "assinante") return false;
    if (filter === "varejo" && (p.tipo_cliente !== "varejo" || p.is_guest)) return false;
    if (filter === "guest" && !p.is_guest) return false;
    if (search) {
      const q = search.toLowerCase();
      const blob = [p.nome, p.email, p.empresa_nome, p.cnpj, p.whatsapp].filter(Boolean).join(" ").toLowerCase();
      if (!blob.includes(q)) return false;
    }
    return true;
  });

  const pendentesCount = items.filter(p => p.tipo_cliente === "b2b" && p.status_aprovacao === "pendente").length;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-6 mb-8">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold mb-2">— gestão</p>
          <h1 className="font-display text-4xl text-foreground">Clientes</h1>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, e-mail, empresa, CNPJ…"
            className="form-input pl-9 min-w-[320px]"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-8 pb-4 border-b border-border">
        <FilterBtn active={filter === "pendentes"} onClick={() => setFilter("pendentes")}>
          Pendentes {pendentesCount > 0 && <span className="ml-2 bg-gold text-foreground px-1.5 rounded-full text-[10px]">{pendentesCount}</span>}
        </FilterBtn>
        <FilterBtn active={filter === "b2b"} onClick={() => setFilter("b2b")}>B2B</FilterBtn>
        <FilterBtn active={filter === "assinantes"} onClick={() => setFilter("assinantes")}>Assinantes</FilterBtn>
        <FilterBtn active={filter === "varejo"} onClick={() => setFilter("varejo")}>Varejo</FilterBtn>
        <FilterBtn active={filter === "todos"} onClick={() => setFilter("todos")}>Todos</FilterBtn>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : filtrados.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum cliente neste filtro.</p>
      ) : (
        <div className="bg-background border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <tr>
                <th className="p-4">Cliente</th>
                <th className="p-4">Tipo</th>
                <th className="p-4">Status</th>
                <th className="p-4">Empresa / CNPJ</th>
                <th className="p-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-surface/50">
                  <td className="p-4">
                    <div className="font-medium text-foreground">{p.nome ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{p.email}</div>
                  </td>
                  <td className="p-4"><TipoBadge tipo={p.tipo_cliente} nivel={p.nivel_b2b} /></td>
                  <td className="p-4"><StatusBadge status={p.status_aprovacao} /></td>
                  <td className="p-4 text-xs">
                    {p.empresa_nome ? (
                      <>
                        <div className="text-foreground">{p.empresa_nome}</div>
                        <div className="text-muted-foreground">{p.cnpj}</div>
                      </>
                    ) : "—"}
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => setSelected(p)} className="text-xs uppercase tracking-[0.18em] text-foreground/70 hover:text-gold">
                      Gerenciar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <ManageDrawer
          profile={selected}
          onClose={() => setSelected(null)}
          onChanged={() => { setSelected(null); reload(); }}
        />
      )}
    </div>
  );
}

function FilterBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-xs uppercase tracking-[0.18em] transition-colors ${
        active ? "bg-foreground text-background" : "text-foreground/60 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function TipoBadge({ tipo, nivel }: { tipo: Profile["tipo_cliente"]; nivel: number | null }) {
  if (tipo === "b2b") return <span className="text-xs px-2 py-1 bg-gold/15 text-gold uppercase tracking-[0.18em]">B2B {nivel ?? "—"}</span>;
  if (tipo === "assinante") return <span className="text-xs px-2 py-1 bg-foreground/10 text-foreground uppercase tracking-[0.18em]">Assinante</span>;
  return <span className="text-xs px-2 py-1 bg-surface text-muted-foreground uppercase tracking-[0.18em]">Varejo</span>;
}

function StatusBadge({ status }: { status: Profile["status_aprovacao"] }) {
  if (!status) return <span className="text-xs text-muted-foreground">—</span>;
  if (status === "pendente") return <span className="text-xs px-2 py-1 bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 uppercase tracking-[0.18em]">Pendente</span>;
  if (status === "aprovado") return <span className="text-xs px-2 py-1 bg-green-500/15 text-green-700 dark:text-green-400 uppercase tracking-[0.18em]">Aprovado</span>;
  return <span className="text-xs px-2 py-1 bg-red-500/15 text-red-700 dark:text-red-400 uppercase tracking-[0.18em]">Rejeitado</span>;
}

function ManageDrawer({ profile, onClose, onChanged }: { profile: Profile; onClose: () => void; onChanged: () => void }) {
  const approve = useServerFn(adminApproveB2B);
  const reject = useServerFn(adminRejectB2B);
  const reset = useServerFn(adminResetCliente);
  const [nivel, setNivel] = useState<number>(profile.nivel_b2b ?? 1);
  const [obs, setObs] = useState(profile.observacoes_admin ?? "");
  const [busy, setBusy] = useState(false);

  async function doApprove() {
    setBusy(true);
    try {
      await approve({ data: { profile_id: profile.id, nivel_b2b: nivel, observacoes_admin: obs || undefined } });
      toast.success(`Aprovado como B2B Nível ${nivel}.`);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally { setBusy(false); }
  }

  async function doReject() {
    setBusy(true);
    try {
      await reject({ data: { profile_id: profile.id, observacoes_admin: obs || undefined } });
      toast.success("Solicitação rejeitada.");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally { setBusy(false); }
  }

  async function doReset() {
    if (!confirm("Voltar este cliente para Varejo? Ele perderá nível B2B / Assinante.")) return;
    setBusy(true);
    try {
      await reset({ data: { profile_id: profile.id } });
      toast.success("Cliente voltou para Varejo.");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-stretch justify-end" onClick={onClose}>
      <div className="w-full max-w-md bg-background overflow-y-auto animate-slide-in-right" onClick={(e) => e.stopPropagation()}>
        <div className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold">— cliente</p>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
          </div>

          <div>
            <h2 className="font-display text-3xl text-foreground">{profile.nome ?? "—"}</h2>
            <p className="text-sm text-muted-foreground mt-1">{profile.email}</p>
          </div>

          <div className="grid gap-3 text-sm bg-surface p-4">
            <Info label="Tipo atual" value={
              profile.tipo_cliente === "b2b" ? `B2B Nível ${profile.nivel_b2b ?? "—"}`
              : profile.tipo_cliente === "assinante" ? "Assinante"
              : "Varejo"
            } />
            <Info label="Status" value={profile.status_aprovacao ?? "—"} />
            {profile.empresa_nome && <Info label="Empresa" value={profile.empresa_nome} />}
            {profile.cnpj && <Info label="CNPJ" value={profile.cnpj} />}
            {profile.whatsapp && <Info label="WhatsApp" value={profile.whatsapp} />}
          </div>

          {profile.tipo_cliente === "b2b" && (
            <div className="space-y-4 pt-4 border-t border-border">
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-foreground/60">— aprovar como</p>
              <div className="flex gap-2">
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    onClick={() => setNivel(n)}
                    className={`flex-1 py-3 text-xs uppercase tracking-[0.18em] transition-colors ${
                      nivel === n ? "bg-foreground text-background" : "border border-border text-foreground/70 hover:border-foreground"
                    }`}
                  >
                    B2B {n}
                  </button>
                ))}
              </div>

              <label className="block">
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-foreground/60 mb-2 block">Observações internas</span>
                <textarea className="form-input min-h-[80px]" value={obs} onChange={(e) => setObs(e.target.value)} maxLength={2000} />
              </label>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button onClick={doApprove} disabled={busy} className="bg-gold text-foreground py-3 text-xs uppercase tracking-[0.2em] hover:bg-gold-light transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2">
                  <Check size={14} /> Aprovar
                </button>
                <button onClick={doReject} disabled={busy} className="border border-border py-3 text-xs uppercase tracking-[0.2em] hover:bg-surface transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2">
                  <X size={14} /> Rejeitar
                </button>
              </div>
            </div>
          )}

          {profile.tipo_cliente !== "varejo" && (
            <button onClick={doReset} disabled={busy} className="w-full mt-4 pt-4 border-t border-border text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-2">
              <RotateCcw size={12} /> Resetar para Varejo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground text-xs uppercase tracking-[0.18em]">{label}</span>
      <span className="text-foreground text-right">{value}</span>
    </div>
  );
}
