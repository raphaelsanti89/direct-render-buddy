import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, LayoutDashboard, Package, Boxes, Tag, ArrowLeft, Users } from "lucide-react";

const NAV = [
  { to: "/admin", label: "Visão geral", icon: LayoutDashboard, exact: true },
  { to: "/admin/categorias", label: "Categorias", icon: Tag, exact: false },
  { to: "/admin/produtos", label: "Produtos", icon: Package, exact: false },
  { to: "/admin/kits", label: "Kits", icon: Boxes, exact: false },
  { to: "/admin/clientes", label: "Clientes", icon: Users, exact: false },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

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
      const { data: isAdminRpc, error } = await supabase.rpc("has_role", {
        _user_id: data.session.user.id,
        _role: "admin",
      });
      if (error) console.error("[admin] has_role error:", error);
      setIsAdmin(!!isAdminRpc);
    })();
    return () => { mounted = false; };
  }, [navigate]);

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  if (isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground animate-pulse">
          Carregando…
        </p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold mb-3">— acesso negado</p>
          <h1 className="font-display text-3xl text-foreground mb-3">
            Sua conta não tem permissão de administrador.
          </h1>
          <button onClick={logout} className="mt-6 text-xs uppercase tracking-[0.2em] text-foreground/70 hover:text-gold">
            Sair
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-background border-b border-border sticky top-0 z-30">
        <div className="container-editorial flex items-center justify-between h-20">
          <div className="flex items-center gap-10">
            <Link to="/" className="font-display text-2xl tracking-wide">
              Gama <span className="text-gold italic">Sensações</span>
              <span className="ml-3 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                admin
              </span>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              {NAV.map((item) => {
                const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`text-xs uppercase tracking-[0.18em] transition-colors ${
                      active ? "text-gold" : "text-foreground/70 hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/" className="hidden sm:inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-foreground/60 hover:text-gold">
              <ArrowLeft size={12} /> Site
            </Link>
            <span className="hidden lg:block text-xs text-muted-foreground">{email}</span>
            <button onClick={logout} className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-foreground/70 hover:text-gold">
              <LogOut size={14} /> Sair
            </button>
          </div>
        </div>
      </header>
      <div className="container-editorial py-12">{children}</div>
    </div>
  );
}
