import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Package, Boxes, Tag, Mail, Users, Settings, ClipboardList, AlertCircle, AlertTriangle } from "lucide-react";
import { brl } from "@/lib/slug";
import { STATUS_ADMIN_LABEL, statusBadgeClasses, type PedidoStatus } from "@/lib/pedidos";

export const Route = createFileRoute("/admin/")({
  component: DashboardPage,
});

type Stats = {
  produtos: number;
  kits: number;
  categorias: number;
  leads: number;
  pedidosHoje: number;
  pedidosMes: number;
  faturamentoMes: number;
  ticketMedio: number;
  aguardando: number;
  estoqueBaixo: number;
};

type Recent = {
  id: string;
  numero_pedido: string;
  nome_cliente: string;
  total: number;
  status: PedidoStatus;
  created_at: string;
};

function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    produtos: 0, kits: 0, categorias: 0, leads: 0,
    pedidosHoje: 0, pedidosMes: 0, faturamentoMes: 0, ticketMedio: 0, aguardando: 0, estoqueBaixo: 0,
  });
  const [recentes, setRecentes] = useState<Recent[]>([]);

  useEffect(() => {
    (async () => {
      const inicioHoje = new Date();
      inicioHoje.setHours(0, 0, 0, 0);
      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);

      const [prodCountRes, kitCountRes, estoqueBaixoRes, { count: c }, { count: l }, { count: aguardando }, hoje, mes, recentesRes] = await Promise.all([
        supabase.rpc("admin_count_produtos"),
        supabase.rpc("admin_count_kits"),
        supabase.rpc("admin_count_estoque_baixo"),
        supabase.from("categorias").select("*", { count: "exact", head: true }),
        supabase.from("leads").select("*", { count: "exact", head: true }),
        supabase.from("pedidos").select("*", { count: "exact", head: true }).eq("status", "novo"),
        supabase.from("pedidos").select("total", { count: "exact" }).gte("created_at", inicioHoje.toISOString()),
        supabase.from("pedidos").select("total", { count: "exact" }).gte("created_at", inicioMes.toISOString()).neq("status", "cancelado"),
        supabase.from("pedidos").select("id,numero_pedido,nome_cliente,total,status,created_at").order("created_at", { ascending: false }).limit(5),
      ]);

      const totalMes = (mes.data ?? []).reduce((s, r: any) => s + Number(r.total ?? 0), 0);
      const ticket = mes.count && mes.count > 0 ? totalMes / mes.count : 0;
      const p = (prodCountRes.data as number | null) ?? 0;
      const k = (kitCountRes.data as number | null) ?? 0;
      const eb = (estoqueBaixoRes.data as number | null) ?? 0;

      setStats({
        produtos: p, kits: k, categorias: c ?? 0, leads: l ?? 0,
        aguardando: aguardando ?? 0,
        estoqueBaixo: eb,
        pedidosHoje: hoje.count ?? 0,
        pedidosMes: mes.count ?? 0,
        faturamentoMes: totalMes,
        ticketMedio: ticket,
      });
      setRecentes((recentesRes.data as Recent[]) ?? []);
    })();
  }, []);

  return (
    <>
      <div className="mb-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold mb-3">— visão geral</p>
        <h1 className="font-display text-5xl text-foreground">Painel administrativo</h1>
      </div>

      {/* Card prioritário */}
      <Link to="/admin/pedidos" className="block mb-8">
        <div className="border border-gold bg-gold/5 p-6 flex items-center justify-between hover:bg-gold/10 transition-colors">
          <div className="flex items-center gap-4">
            <AlertCircle size={24} className="text-gold" />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold mb-1">— atenção</p>
              <p className="font-display text-2xl text-foreground">
                {stats.aguardando} {stats.aguardando === 1 ? "pedido aguardando" : "pedidos aguardando"} atendimento
              </p>
            </div>
          </div>
          <span className="text-xs uppercase tracking-[0.18em] text-foreground/70">Ver →</span>
        </div>
      </Link>

      {stats.estoqueBaixo > 0 && (
        <Link to="/admin/produtos" search={{ filter: "baixo" }} className="block mb-8">
          <div className="border border-destructive/40 bg-destructive/5 p-6 flex items-center justify-between hover:bg-destructive/10 transition-colors">
            <div className="flex items-center gap-4">
              <AlertTriangle size={24} className="text-destructive" />
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-destructive mb-1">— estoque</p>
                <p className="font-display text-2xl text-foreground">
                  {stats.estoqueBaixo} {stats.estoqueBaixo === 1 ? "produto com estoque baixo" : "produtos com estoque baixo"}
                </p>
              </div>
            </div>
            <span className="text-xs uppercase tracking-[0.18em] text-foreground/70">Ver lista →</span>
          </div>
        </Link>
      )}

      {/* Stats pedidos */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border mb-10">
        <Stat label="Pedidos hoje" value={String(stats.pedidosHoje)} icon={ClipboardList} />
        <Stat label="Pedidos no mês" value={String(stats.pedidosMes)} icon={ClipboardList} />
        <Stat label="Faturamento do mês" value={brl(stats.faturamentoMes)} icon={ClipboardList} />
        <Stat label="Ticket médio" value={brl(stats.ticketMedio)} icon={ClipboardList} />
      </div>

      {/* Últimos pedidos */}
      <div className="mb-12 bg-background border border-border">
        <div className="flex items-center justify-between p-6 pb-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-foreground/60">— últimos pedidos</p>
          <Link to="/admin/pedidos" className="text-xs uppercase tracking-[0.18em] text-gold hover:underline">
            Ver todos →
          </Link>
        </div>
        {recentes.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">Nenhum pedido ainda.</p>
        ) : (
          <ul className="divide-y divide-border">
            {recentes.map((p) => (
              <li key={p.id}>
                <Link to="/admin/pedidos/$id" params={{ id: p.id }} className="flex items-center justify-between px-6 py-4 hover:bg-surface/50">
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="font-mono text-xs text-foreground">{p.numero_pedido}</span>
                    <span className="text-sm text-foreground truncate">{p.nome_cliente}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-[10px] px-2 py-1 uppercase tracking-[0.18em] ${statusBadgeClasses(p.status)}`}>
                      {STATUS_ADMIN_LABEL[p.status]}
                    </span>
                    <span className="text-sm text-foreground w-24 text-right">{brl(p.total)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Catálogo */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border mb-10">
        <Stat label="Produtos" value={String(stats.produtos)} icon={Package} />
        <Stat label="Kits" value={String(stats.kits)} icon={Boxes} />
        <Stat label="Categorias" value={String(stats.categorias)} icon={Tag} />
        <Stat label="Leads" value={String(stats.leads)} icon={Mail} />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
        <ModuleCard to="/admin/pedidos" icon={ClipboardList} title="Pedidos" text="Gestão completa de vendas" />
        <ModuleCard to="/admin/categorias" icon={Tag} title="Categorias" text="Organize o catálogo" />
        <ModuleCard to="/admin/produtos" icon={Package} title="Produtos" text="Cadastro, preços, imagens" />
        <ModuleCard to="/admin/kits" icon={Boxes} title="Kits" text="Combine produtos em kits sensoriais" />
        <ModuleCard to="/admin/clientes" icon={Users} title="Clientes" text="Revendedores e aprovações" />
        <ModuleCard to="/admin/configuracoes" icon={Settings} title="Configurações" text="WhatsApp, redes sociais, logo" />
      </div>
    </>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number }> }) {
  return (
    <div className="bg-background p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{label}</span>
        <Icon size={14} strokeWidth={1.5} />
      </div>
      <div className="font-display text-3xl text-foreground">{value}</div>
    </div>
  );
}

function ModuleCard({
  to, icon: Icon, title, text,
}: {
  to: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  title: string;
  text: string;
}) {
  return (
    <Link to={to}>
      <div className="bg-background p-8 h-full hover:bg-surface transition-colors cursor-pointer">
        <Icon size={20} strokeWidth={1.25} />
        <h3 className="mt-6 font-display text-2xl text-foreground">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{text}</p>
      </div>
    </Link>
  );
}
