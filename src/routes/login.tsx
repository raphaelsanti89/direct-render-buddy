import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Acesso administrativo — Gama Sensações" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin" });
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/admin`,
            data: { nome },
          },
        });
        if (error) throw error;
      }
      navigate({ to: "/admin" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-background">
      <div className="hidden md:flex bg-surface-dark text-background relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-dark opacity-90" />
        <div className="relative z-10 p-16 flex flex-col justify-between w-full">
          <div className="font-display text-2xl tracking-wide">
            Gama <span className="text-gold italic">Sensações</span>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold mb-4">
              — área restrita
            </p>
            <h1 className="font-display text-5xl leading-tight text-balance">
              Bem-vindo de volta ao painel.
            </h1>
            <p className="mt-6 text-background/65 max-w-sm">
              Gestão completa de produtos, kits, configurações e revendedores.
            </p>
          </div>
          <p className="text-xs text-background/40">© Gama Sensações</p>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold mb-3">
            {mode === "login" ? "— acesso" : "— cadastro"}
          </p>
          <h2 className="font-display text-4xl text-foreground mb-2">
            {mode === "login" ? "Entrar" : "Criar conta"}
          </h2>
          <p className="text-sm text-muted-foreground mb-10">
            {mode === "login"
              ? "Use seu e-mail e senha de administrador."
              : "Cadastre-se para acessar o painel."}
          </p>

          <form onSubmit={onSubmit} className="space-y-5">
            {mode === "signup" && (
              <Field label="Nome">
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className={inputClass}
                />
              </Field>
            )}
            <Field label="E-mail">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Senha">
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </Field>

            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group w-full inline-flex items-center justify-center gap-3 bg-foreground text-background px-6 py-4 text-xs uppercase tracking-[0.2em] hover:bg-gold hover:text-foreground transition-all disabled:opacity-50"
            >
              {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <button
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="mt-8 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-gold transition-colors"
          >
            {mode === "login" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
          </button>

          <a
            href="/"
            className="block mt-12 text-xs uppercase tracking-[0.2em] text-muted-foreground/60 hover:text-foreground transition-colors"
          >
            ← Voltar ao site
          </a>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "w-full bg-transparent border-b border-border focus:border-gold py-3 text-sm text-foreground outline-none transition-colors";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">
        {label}
      </span>
      {children}
    </label>
  );
}
