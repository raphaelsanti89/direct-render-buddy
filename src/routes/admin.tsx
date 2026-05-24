import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Settings, Package, Boxes, Users, Mail, Tag } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Painel — Gama Sensações" }] }),
  component: AdminPage,
});

type Stats = {
  produtos: number;
  kits: number;
  categorias: number;
  leads: number;
};

function AdminPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [stats, setStats] = useState<Stats>({ produtos: 0, kits: 0, categorias: 0, leads: 0 });

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate({ to: "/login" });
        return;
      }
      if (!mounted) return;
      setEmail(data.session.user.email ?? null);

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.session.user.id);
      const admin = !!roles?.some((r) => r.role === "admin");
      setIsAdmin(admin);

      const [{ count: p }, { count: k }, { count: c }, { count: l }] = await Promise.all([
        supabase.from("produtos").select("*", { count: "exact", head: true }),
        supabase.from("kits").select("*", { count: "exact", head: true }),
        supabase.from("categorias").select("*", { count: "exact", head: true }),
        supabase.from("leads").select("*", { count: "exact", head: true }),
      ]);
      setStats({ produtos: p ?? 0, kits: k ?? 0, categorias: c ?? 0, leads: l ?? 0 });
    })();
    return () => { mounted = false; };
  }, [navigate]);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  if (isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground animate-shimmer">
          Carregando…
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-background border-b border-border">
        <div className="container-editorial flex items-center justify-between h-20">
          <Link to="/" className="font-display text-2xl tracking-wide">
            Gama <span className="text-gold italic">Sensações</span>
            <span className="ml-3 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              admin
            </span>
          </Link>
          <div className="flex items-center gap-6">
            <span className="hidden sm:block text-xs text-muted-foreground">{email}</span>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-foreground/70 hover:text-gold transition-colors"
            >
              <LogOut size={14} />
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="container-editorial py-16">
        {!isAdmin && (
          <div className="bg-background border border-border p-8 mb-10">
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold mb-3">
              — acesso limitado
            </p>
            <h2 className="font-display text-3xl text-foreground mb-3">
              Sua conta ainda não tem permissão de administrador.
            </h2>
            <p className="text-sm text-muted-foreground max-w-xl">
              Para liberar o painel completo, é necessário promover este usuário
              ao papel <strong>admin</strong> no banco de dados (tabela{" "}
              <code className="font-mono text-foreground">user_roles</code>).
              Assim que liberado, todas as áreas abaixo aparecerão.
            </p>
          </div>
        )}

        <div className="mb-12">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold mb-3">
            — visão geral
          </p>
          <h1 className="font-display text-5xl text-foreground">
            Painel administrativo
          </h1>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border mb-16">
          <Stat label="Produtos" value={stats.produtos} icon={Package} />
          <Stat label="Kits" value={stats.kits} icon={Boxes} />
          <Stat label="Categorias" value={stats.categorias} icon={Tag} />
          <Stat label="Leads" value={stats.leads} icon={Mail} />
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
          <ModuleCard icon={Package} title="Produtos" text="Cadastro, preços, estoque e mídia" disabled />
          <ModuleCard icon={Boxes} title="Kits" text="Combine produtos em kits sensoriais" disabled />
          <ModuleCard icon={Tag} title="Categorias" text="Organize o catálogo" disabled />
          <ModuleCard icon={Users} title="Revendedores" text="Aprovação e níveis de desconto" disabled />
          <ModuleCard icon={Mail} title="Leads & Newsletter" text="Capturas e contatos" disabled />
          <ModuleCard icon={Settings} title="Configurações Gerais" text="WhatsApp, redes sociais, logo" disabled />
        </div>

        <p className="mt-12 text-xs text-muted-foreground">
          Os módulos serão liberados na próxima fase do projeto.
        </p>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}) {
  return (
    <div className="bg-background p-8">
      <div className="flex items-center justify-between mb-6">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          {label}
        </span>
        <Icon size={16} strokeWidth={1.5} />
      </div>
      <div className="font-display text-5xl text-foreground">{value}</div>
    </div>
  );
}

function ModuleCard({
  icon: Icon,
  title,
  text,
  disabled,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  title: string;
  text: string;
  disabled?: boolean;
}) {
  return (
    <div className={`bg-background p-8 ${disabled ? "opacity-60" : "hover:bg-surface transition-colors cursor-pointer"}`}>
      <Icon size={20} strokeWidth={1.25} />
      <h3 className="mt-6 font-display text-2xl text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
      {disabled && (
        <span className="mt-6 inline-block font-mono text-[10px] uppercase tracking-[0.25em] text-gold">
          em breve
        </span>
      )}
    </div>
  );
}
