import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Package, Boxes, Tag, Mail, Users, Settings } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: DashboardPage,
});

type Stats = { produtos: number; kits: number; categorias: number; leads: number };

function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ produtos: 0, kits: 0, categorias: 0, leads: 0 });

  useEffect(() => {
    (async () => {
      const [{ count: p }, { count: k }, { count: c }, { count: l }] = await Promise.all([
        supabase.from("produtos").select("*", { count: "exact", head: true }),
        supabase.from("kits").select("*", { count: "exact", head: true }),
        supabase.from("categorias").select("*", { count: "exact", head: true }),
        supabase.from("leads").select("*", { count: "exact", head: true }),
      ]);
      setStats({ produtos: p ?? 0, kits: k ?? 0, categorias: c ?? 0, leads: l ?? 0 });
    })();
  }, []);

  return (
    <>
      <div className="mb-12">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold mb-3">— visão geral</p>
        <h1 className="font-display text-5xl text-foreground">Painel administrativo</h1>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border mb-16">
        <Stat label="Produtos" value={stats.produtos} icon={Package} />
        <Stat label="Kits" value={stats.kits} icon={Boxes} />
        <Stat label="Categorias" value={stats.categorias} icon={Tag} />
        <Stat label="Leads" value={stats.leads} icon={Mail} />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
        <ModuleCard to="/admin/categorias" icon={Tag} title="Categorias" text="Organize o catálogo" />
        <ModuleCard to="/admin/produtos" icon={Package} title="Produtos" text="Cadastro, preços, imagens" />
        <ModuleCard to="/admin/kits" icon={Boxes} title="Kits" text="Combine produtos em kits sensoriais" />
        <ModuleCard icon={Users} title="Revendedores" text="Aprovação e níveis de desconto" disabled />
        <ModuleCard icon={Mail} title="Leads & Newsletter" text="Capturas e contatos" disabled />
        <ModuleCard icon={Settings} title="Configurações Gerais" text="WhatsApp, redes sociais, logo" disabled />
      </div>
    </>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: number; icon: React.ComponentType<{ size?: number; strokeWidth?: number }> }) {
  return (
    <div className="bg-background p-8">
      <div className="flex items-center justify-between mb-6">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{label}</span>
        <Icon size={16} strokeWidth={1.5} />
      </div>
      <div className="font-display text-5xl text-foreground">{value}</div>
    </div>
  );
}

function ModuleCard({
  to, icon: Icon, title, text, disabled,
}: {
  to?: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  title: string;
  text: string;
  disabled?: boolean;
}) {
  const inner = (
    <div className={`bg-background p-8 h-full ${disabled ? "opacity-60" : "hover:bg-surface transition-colors cursor-pointer"}`}>
      <Icon size={20} strokeWidth={1.25} />
      <h3 className="mt-6 font-display text-2xl text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
      {disabled && (
        <span className="mt-6 inline-block font-mono text-[10px] uppercase tracking-[0.25em] text-gold">em breve</span>
      )}
    </div>
  );
  if (!to || disabled) return inner;
  return <Link to={to}>{inner}</Link>;
}
