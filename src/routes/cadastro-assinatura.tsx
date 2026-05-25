import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { requestAssinatura } from "@/lib/clientes.functions";
import { toast } from "sonner";
import { ArrowLeft, Heart } from "lucide-react";

export const Route = createFileRoute("/cadastro-assinatura")({
  head: () => ({
    meta: [
      { title: "Vire Assinante — Gama Sensações" },
      { name: "description", content: "Receba aromas em primeira mão e com preços exclusivos de assinante." },
    ],
  }),
  component: CadastroAssinatura,
});

type Mode = "signup" | "logged";

function CadastroAssinatura() {
  const navigate = useNavigate();
  const enviar = useServerFn(requestAssinatura);
  const [mode, setMode] = useState<Mode>("signup");
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setMode("logged");
        setEmail(data.session.user.email ?? "");
      }
      setLoadingAuth(false);
    });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    try {
      if (mode === "signup") {
        if (senha.length < 6) throw new Error("Senha deve ter ao menos 6 caracteres.");
        const { error: signErr } = await supabase.auth.signUp({
          email: email.trim(),
          password: senha,
          options: {
            emailRedirectTo: `${window.location.origin}/cadastro-assinatura`,
            data: { nome: nome.trim() },
          },
        });
        if (signErr) throw signErr;

        const { data: s } = await supabase.auth.getSession();
        if (!s.session) {
          toast.success("Conta criada! Confirme seu e-mail e volte aqui para ativar a assinatura.");
          setSubmitting(false);
          return;
        }
      }

      await enviar({ data: { whatsapp: whatsapp.trim() } });

      toast.success("Pronto! Seu cadastro de assinante foi ativado.");
      navigate({ to: "/produtos" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao concluir cadastro.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingAuth) {
    return <div className="pt-40 pb-24 text-center text-sm text-muted-foreground">Carregando…</div>;
  }

  return (
    <div className="min-h-screen bg-background pt-28 pb-24">
      <div className="container-editorial max-w-2xl">
        <Link to="/" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-foreground/60 hover:text-gold mb-8">
          <ArrowLeft size={12} /> Início
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <Heart className="text-gold" size={20} />
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold">— clube de assinatura</p>
        </div>
        <h1 className="font-display text-5xl text-foreground">Vire Assinante</h1>
        <p className="mt-6 text-muted-foreground">
          Cadastro grátis. Após ativar, você já vê os preços de assinante no
          catálogo e fica na lista de prioridade para lançamentos. A cobrança
          recorrente será habilitada em breve.
        </p>

        <form onSubmit={onSubmit} className="mt-12 space-y-6">
          {mode === "signup" && (
            <>
              <Field label="Seu nome">
                <input className="form-input" required maxLength={120} value={nome} onChange={(e) => setNome(e.target.value)} />
              </Field>
              <Field label="E-mail">
                <input className="form-input" type="email" required maxLength={255} value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
              <Field label="Senha">
                <input className="form-input" type="password" required minLength={6} maxLength={72} value={senha} onChange={(e) => setSenha(e.target.value)} />
              </Field>
            </>
          )}

          {mode === "logged" && (
            <p className="px-4 py-3 border border-border bg-surface text-sm text-foreground/75">
              Conectado como <strong>{email}</strong>.
            </p>
          )}

          <Field label="WhatsApp para contato">
            <input className="form-input" required maxLength={20} placeholder="(11) 90000-0000" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
          </Field>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-foreground text-background py-4 text-xs uppercase tracking-[0.2em] hover:bg-gold transition-colors disabled:opacity-50"
          >
            {submitting ? "Enviando…" : "Ativar assinatura"}
          </button>

          {mode === "signup" && (
            <p className="text-xs text-muted-foreground text-center">
              Já tem conta?{" "}
              <Link to="/login" className="text-gold hover:underline">Entrar</Link>
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-foreground/60 mb-2 block">{label}</span>
      {children}
    </label>
  );
}
