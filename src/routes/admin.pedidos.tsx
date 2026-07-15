import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Plus } from "lucide-react";
import { brl } from "@/lib/slug";
import {
  PEDIDO_STATUS,
  STATUS_ADMIN_LABEL,
  statusBadgeClasses,
  type PedidoStatus,
} from "@/lib/pedidos";

export const Route = createFileRoute("/admin/pedidos")({
  head: () => ({ meta: [{ title: "Pedidos — Admin" }] }),
  component: AdminPedidosRoute,
});

type PedidoRow = {
  id: string;
  numero_pedido: string;
  nome_cliente: string;
  telefone: string;
  perfil_cliente: string;
  total: number;
  status: PedidoStatus;
  origem_pedido: string;
  canal_contato: string;
  created_at: string;
};

const PERFIS = ["todos", "varejo", "assinante", "b2b_1", "b2b_2", "b2b_3"] as const;
const ORIGENS = ["todas", "site", "instagram", "whatsapp", "admin", "revendedor"] as const;

function AdminPedidosRoute() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (pathname !== "/admin/pedidos") {
    return <Outlet />;
  }

  return <AdminPedidosPage />;
}

function AdminPedidosPage() {
  const [items, setItems] = useState<PedidoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"todos" | PedidoStatus>("todos");
  const [perfil, setPerfil] = useState<(typeof PERFIS)[number]>("todos");
  const [origem, setOrigem] = useState<(typeof ORIGENS)[number]>("todas");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("pedidos")
        .select(
          "id,numero_pedido,nome_cliente,telefone,perfil_cliente,total,status,origem_pedido,canal_contato,created_at",
        )
        .order("created_at", { ascending: false });
      if (error) console.error(error);
      setItems((data as PedidoRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    return items.filter((p) => {
      if (status !== "todos" && p.status !== status) return false;
      if (perfil !== "todos" && p.perfil_cliente !== perfil) return false;
      if (origem !== "todas" && p.origem_pedido !== origem) return false;
      if (from && new Date(p.created_at) < new Date(from)) return false;
      if (to && new Date(p.created_at) > new Date(to + "T23:59:59")) return false;
      if (search) {
        const q = search.toLowerCase();
        const blob = `${p.nome_cliente} ${p.telefone} ${p.numero_pedido}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [items, status, perfil, origem, from, to, search]);

  return (
    <div>
      <div className="mb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold mb-2">— operação</p>
        <h1 className="font-display text-4xl text-foreground">Pedidos</h1>
      </div>

      <div className="grid lg:grid-cols-[1fr_auto] gap-4 mb-6">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, telefone ou número…"
            className="form-input pl-9 w-full"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="form-input" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="form-input" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <select className="form-input" value={status} onChange={(e) => setStatus(e.target.value as any)}>
          <option value="todos">Todos os status</option>
          {PEDIDO_STATUS.map((s) => (
            <option key={s} value={s}>{STATUS_ADMIN_LABEL[s]}</option>
          ))}
        </select>
        <select className="form-input" value={perfil} onChange={(e) => setPerfil(e.target.value as any)}>
          {PERFIS.map((p) => (
            <option key={p} value={p}>{p === "todos" ? "Todos os perfis" : p}</option>
          ))}
        </select>
        <select className="form-input" value={origem} onChange={(e) => setOrigem(e.target.value as any)}>
          {ORIGENS.map((o) => (
            <option key={o} value={o}>{o === "todas" ? "Todas as origens" : o}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum pedido encontrado.</p>
      ) : (
        <div className="bg-background border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <tr>
                <th className="p-4">Pedido</th>
                <th className="p-4">Cliente</th>
                <th className="p-4">Perfil</th>
                <th className="p-4 text-right">Total</th>
                <th className="p-4">Status</th>
                <th className="p-4">Origem</th>
                <th className="p-4">Data</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-surface/50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <Link
                        to="/admin/pedidos/$id"
                        params={{ id: p.id }}
                        className="font-mono text-xs text-foreground underline underline-offset-4 hover:text-gold"
                      >
                        {p.numero_pedido}
                      </Link>
                      <Link
                        to="/admin/pedidos/$id"
                        params={{ id: p.id }}
                        className="text-[10px] uppercase tracking-[0.18em] text-gold hover:text-foreground"
                      >
                        Abrir
                      </Link>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-foreground">{p.nome_cliente}</div>
                    <div className="text-xs text-muted-foreground">{p.telefone}</div>
                  </td>
                  <td className="p-4 text-xs uppercase tracking-[0.15em] text-muted-foreground">
                    {p.perfil_cliente}
                  </td>
                  <td className="p-4 text-right font-medium text-foreground">{brl(p.total)}</td>
                  <td className="p-4">
                    <span className={`text-[10px] px-2 py-1 uppercase tracking-[0.18em] ${statusBadgeClasses(p.status)}`}>
                      {STATUS_ADMIN_LABEL[p.status]}
                    </span>
                  </td>
                  <td className="p-4 text-xs text-muted-foreground">{p.origem_pedido}</td>
                  <td className="p-4 text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
