import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Package, Boxes, Tag, Mail, Users, Settings, ClipboardList, AlertCircle, Calculator, Truck, Warehouse, TrendingUp } from "lucide-react";
import { brl } from "@/lib/slug";
import { STATUS_ADMIN_LABEL, statusBadgeClasses, type PedidoStatus } from "@/lib/pedidos";

export const Route = createFileRoute("/admin/")({
  component: DashboardPage,
});

type LucroPeriodo = "mes_atual" | "mes_passado" | "30d";

function calcularIntervalo(p: LucroPeriodo): { inicio: Date; fim: Date; label: string } {
  const agora = new Date();
  if (p === "mes_atual") {
    const inicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const fim = new Date(agora.getFullYear(), agora.getMonth() + 1, 1);
    return { inicio, fim, label: "Mês atual" };
  }
  if (p === "mes_passado") {
    const inicio = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
    const fim = new Date(agora.getFullYear(), agora.getMonth(), 1);
    return { inicio, fim, label: "Mês passado" };
  }
  const inicio = new Date(agora); inicio.setDate(inicio.getDate() - 30);
  return { inicio, fim: agora, label: "Últimos 30 dias" };
}


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
  const [custoFixo, setCustoFixo] = useState(0);
  const [pontoEquilibrio, setPontoEquilibrio] = useState(0);
  const [reservaGiro, setReservaGiro] = useState(0);
  const [metaDia, setMetaDia] = useState(0);
  const [receitaMes, setReceitaMes] = useState(0);
  const [perfis, setPerfis] = useState<Array<{ perfil: string; receita: number; num_pedidos: number }>>([]);
  const [fornecedores, setFornecedores] = useState<Array<{ id: string; nome: string; pedido_minimo: number; margem: number; abaixoPiso: boolean }>>([]);
  const [fornTotalMin, setFornTotalMin] = useState(0);
  const [margemPiso, setMargemPiso] = useState(50);
  const [lucroPeriodo, setLucroPeriodo] = useState<LucroPeriodo>("30d");
  const [lucro, setLucro] = useState<{ lucro: number; receita: number; num_pedidos: number } | null>(null);

  const intervalo = useMemo(() => calcularIntervalo(lucroPeriodo), [lucroPeriodo]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("admin_metricas_vendas_periodo", {
        p_inicio: intervalo.inicio.toISOString(),
        p_fim: intervalo.fim.toISOString(),
      });
      const m: any = data ?? {};
      setLucro({
        lucro: Number(m.lucro ?? 0),
        receita: Number(m.receita_total ?? 0),
        num_pedidos: Number(m.num_pedidos ?? 0),
      });
    })();
  }, [intervalo]);


  useEffect(() => {
    (async () => {
      const inicioHoje = new Date();
      inicioHoje.setHours(0, 0, 0, 0);
      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);

      const [prodCountRes, kitCountRes, estoqueBaixoRes, { count: c }, { count: l }, { count: aguardando }, hoje, mes, recentesRes, custosFixosRes, cfgRes, metricasRes, perfisRes, fornRes] = await Promise.all([
        supabase.rpc("admin_count_produtos"),
        supabase.rpc("admin_count_kits"),
        supabase.rpc("admin_count_estoque_baixo"),
        supabase.from("categorias").select("*", { count: "exact", head: true }),
        supabase.from("leads").select("*", { count: "exact", head: true }),
        supabase.from("pedidos").select("*", { count: "exact", head: true }).eq("status", "novo"),
        supabase.from("pedidos").select("total", { count: "exact" }).gte("created_at", inicioHoje.toISOString()),
        supabase.from("pedidos").select("total", { count: "exact" }).gte("created_at", inicioMes.toISOString()).neq("status", "cancelado"),
        supabase.from("pedidos").select("id,numero_pedido,nome_cliente,total,status,created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("custos_fixos").select("valor_mensal"),
        supabase.from("configuracoes_gerais").select("chave,valor").in("chave", ["meses_reserva", "dias_uteis_mes", "margem_piso", "margem_meta"]),
        supabase.rpc("admin_metricas_vendas_30d"),
        supabase.rpc("admin_vendas_mes_por_perfil"),
        supabase.from("fornecedores").select("id,nome,pedido_minimo,custo_medio,preco_medio"),
      ]);

      const totalMes = (mes.data ?? []).reduce((s, r: any) => s + Number(r.total ?? 0), 0);
      const ticket = mes.count && mes.count > 0 ? totalMes / mes.count : 0;
      const p = (prodCountRes.data as number | null) ?? 0;
      const k = (kitCountRes.data as number | null) ?? 0;
      const eb = (estoqueBaixoRes.data as number | null) ?? 0;

      const totalFixo = (custosFixosRes.data ?? []).reduce((s, r: any) => s + Number(r.valor_mensal ?? 0), 0);
      const cfgMap = new Map((cfgRes.data ?? []).map((r: any) => [r.chave, r.valor]));
      const meses = Number(cfgMap.get("meses_reserva") ?? 3);
      const diasU = Number(cfgMap.get("dias_uteis_mes") ?? 26);
      const piso = Number(cfgMap.get("margem_piso") ?? 50);
      const metricas: any = metricasRes.data ?? {};
      const margemReal = Number(metricas.margem_real ?? 0);
      const pe = margemReal > 0 ? totalFixo / margemReal : 0;
      setCustoFixo(totalFixo);
      setPontoEquilibrio(pe);
      setReservaGiro(totalFixo * meses);
      setMetaDia(diasU > 0 ? pe / diasU : 0);
      setMargemPiso(piso);

      const perfisData = (perfisRes.data as Array<{ perfil: string; receita: number; num_pedidos: number }>) ?? [];
      setPerfis(perfisData);
      setReceitaMes(perfisData.reduce((s, r) => s + Number(r.receita ?? 0), 0));

      const fornData = (fornRes.data as Array<{ id: string; nome: string; pedido_minimo: number; custo_medio: number; preco_medio: number }>) ?? [];
      const fornMap = fornData.map((f) => {
        const margem = Number(f.preco_medio) > 0 ? ((Number(f.preco_medio) - Number(f.custo_medio)) / Number(f.preco_medio)) * 100 : 0;
        return { id: f.id, nome: f.nome, pedido_minimo: Number(f.pedido_minimo), margem, abaixoPiso: margem < piso };
      });
      setFornecedores(fornMap);
      setFornTotalMin(fornMap.reduce((s, f) => s + f.pedido_minimo, 0));

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

  const progressoMeta = pontoEquilibrio > 0 ? Math.min(100, (receitaMes / pontoEquilibrio) * 100) : 0;
  const PERFIL_LABEL: Record<string, string> = { varejo: "Varejo", assinante: "Assinante", b2b_1: "B2B 1", b2b_2: "B2B 2", b2b_3: "B2B 3" };

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
        <Link to="/admin/estoque" className="block mb-8">
          <div className="border border-destructive/40 bg-destructive/5 p-6 flex items-center justify-between hover:bg-destructive/10 transition-colors">
            <div className="flex items-center gap-4">
              <Warehouse size={24} className="text-destructive" />
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-destructive mb-1">— estoque</p>
                <p className="font-display text-2xl text-foreground">
                  {stats.estoqueBaixo} {stats.estoqueBaixo === 1 ? "produto precisando de atenção" : "produtos precisando de atenção"}
                </p>
              </div>
            </div>
            <span className="text-xs uppercase tracking-[0.18em] text-foreground/70">Ver estoque →</span>
          </div>
        </Link>
      )}

      {/* Custo Fixo & Metas */}
      <div className="mb-4 flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-foreground/60">— finanças</p>
        <Link to="/admin/custo-fixo" className="text-xs uppercase tracking-[0.18em] text-gold hover:underline">Custo fixo →</Link>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border mb-10">
        <Stat label="Custo fixo mensal" value={brl(custoFixo)} icon={Calculator} />
        <Stat label="Ponto de equilíbrio" value={brl(pontoEquilibrio)} icon={Calculator} />
        <Stat label="Reserva de giro" value={brl(reservaGiro)} icon={Calculator} />
        <Stat label="Meta / dia útil" value={brl(metaDia)} icon={Calculator} />
      </div>

      {/* Vendas do mês vs meta */}
      {pontoEquilibrio > 0 && (
        <div className="bg-background border border-border p-6 mb-10">
          <div className="flex items-center justify-between mb-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-foreground/60">— vendas do mês vs meta</p>
            <span className="font-mono text-xs text-gold">{progressoMeta.toFixed(1)}%</span>
          </div>
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-foreground">{brl(receitaMes)} de {brl(pontoEquilibrio)}</span>
          </div>
          <div className="h-2 bg-surface overflow-hidden mb-4">
            <div className="h-full bg-gold transition-all" style={{ width: `${progressoMeta}%` }} />
          </div>
          {perfis.length > 0 && (
            <div className="space-y-1.5 text-xs">
              {perfis.map((p) => {
                const pct = receitaMes > 0 ? (Number(p.receita) / receitaMes) * 100 : 0;
                return (
                  <div key={p.perfil} className="flex items-center justify-between py-1 border-b border-border last:border-0">
                    <span className="text-foreground">{PERFIL_LABEL[p.perfil] ?? p.perfil}</span>
                    <span className="font-mono text-muted-foreground">{brl(p.receita)} <span className="text-foreground/50">({pct.toFixed(0)}%)</span></span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Fornecedores */}
      {fornecedores.length > 0 && (
        <div className="bg-background border border-border p-6 mb-10">
          <div className="flex items-center justify-between mb-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-foreground/60">— fornecedores</p>
            <Link to="/admin/fornecedores" className="text-xs uppercase tracking-[0.18em] text-gold hover:underline">Ver todos →</Link>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Total investido em pedidos mínimos: <span className="text-foreground font-mono">{brl(fornTotalMin)}</span></p>
          <ul className="space-y-1.5 text-xs">
            {fornecedores.map((f) => (
              <li key={f.id} className="flex items-center justify-between py-1 border-b border-border last:border-0">
                <span className="text-foreground">{f.nome}</span>
                <span className={`font-mono ${f.abaixoPiso ? "text-destructive" : "text-muted-foreground"}`}>
                  {f.margem.toFixed(1)}% {f.abaixoPiso && `· abaixo do piso (${margemPiso}%)`}
                </span>
              </li>
            ))}
          </ul>
        </div>
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
        <ModuleCard to="/admin/produtos" icon={Package} title="Produtos" text="Cadastro, preços, imagens" />
        <ModuleCard to="/admin/kits" icon={Boxes} title="Kits" text="Combine produtos em kits sensoriais" />
        <ModuleCard to="/admin/estoque" icon={Warehouse} title="Estoque" text="Posição e alertas de reposição" />
        <ModuleCard to="/admin/fornecedores" icon={Truck} title="Fornecedores" text="Cadastro, margens e reposição" />
        <ModuleCard to="/admin/custo-fixo" icon={Calculator} title="Custo fixo & metas" text="Ponto de equilíbrio e reserva" />
        <ModuleCard to="/admin/categorias" icon={Tag} title="Categorias" text="Organize o catálogo" />
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
