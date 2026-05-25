import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { requestB2BAccess } from "@/lib/clientes.functions";
import { toast } from "sonner";
import { ArrowLeft, Building2 } from "lucide-react";

export const Route = createFileRoute("/cadastro-b2b")({
  head: () => ({
    meta: [
      { title: "Cadastro B2B — Gama Sensações" },
      { name: "description", content: "Solicite condições especiais para sua empresa, escritório ou hotel." },
    ],
  }),
  component: CadastroB2B,
});

type Mode = "signup" | "logged";

function CadastroB2B() {
  const navigate = useNavigate();
  const enviar = useServerFn(requestB2BAccess);
  const [mode, setMode] = useState<Mode>("signup");
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // dados conta
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  // dados empresa
  const [empresaNome, setEmpresaNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  async function tryFinalizePending() {
    const raw = localStorage.getItem("gama:pending_b2b");
    if (!raw) return;
    try {
      const pending = JSON.parse(raw) as {
        empresa_nome: string;
        cnpj: string;
        whatsapp: string;
      };
      await enviar({ data: pending });
      localStorage.removeItem("gama:pending_b2b");
      toast.success("Solicitação B2B concluída! Vamos analisar e te avisamos.");
      navigate({ to: "/produtos" });
    } catch (err) {
      console.error("[b2b] finalize pending error:", err);
      // mantém pending — usuário pode reenviar via formulário pré-preenchido
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        setMode("logged");
        setEmail(data.session.user.email ?? "");
        const raw = localStorage.getItem("gama:pending_b2b");
        if (raw) {
          try {
            const p = JSON.parse(raw);
            setEmpresaNome(p.empresa_nome ?? "");
            setCnpj(p.cnpj ?? "");
            setWhatsapp(p.whatsapp ?? "");
          } catch {}
          await tryFinalizePending();
        }
      }
      setLoadingAuth(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    try {
      if (mode === "signup") {
        if (senha.length < 6) throw new Error("Senha deve ter ao menos 6 caracteres.");

        // Salva ANTES do signUp para não perder os dados caso precise confirmar e-mail
        localStorage.setItem(
          "gama:pending_b2b",
          JSON.stringify({
            empresa_nome: empresaNome.trim(),
            cnpj: cnpj.trim(),
            whatsapp: whatsapp.trim(),
          }),
        );

        const { error: signErr } = await supabase.auth.signUp({
          email: email.trim(),
          password: senha,
          options: {
            emailRedirectTo: `${window.location.origin}/cadastro-b2b`,
            data: { nome: nome.trim() },
          },
        });
        if (signErr) throw signErr;

        const { data: s } = await supabase.auth.getSession();
        if (!s.session) {
          toast.success(
            "Conta criada! Confirme seu e-mail e volte aqui — sua solicitação B2B será enviada automaticamente.",
          );
          setSubmitting(false);
          return;
        }
      }

      await enviar({
        data: {
          empresa_nome: empresaNome.trim(),
          cnpj: cnpj.trim(),
          whatsapp: whatsapp.trim(),
        },
      });

      localStorage.removeItem("gama:pending_b2b");
      toast.success("Solicitação enviada! Vamos analisar e te avisamos pelo WhatsApp.");
      navigate({ to: "/produtos" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao enviar solicitação.";
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
      <div className="container-editorial max-w-3xl">
        <Link to="/" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-foreground/60 hover:text-gold mb-8">
          <ArrowLeft size={12} /> Início
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <Building2 className="text-gold" size={20} />
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold">— programa B2B</p>
        </div>
        <h1 className="font-display text-5xl text-foreground">Cadastro de empresa</h1>
        <p className="mt-6 text-muted-foreground max-w-xl">
          Hotéis, escritórios, clínicas, spas e empresas. Após análise da sua
          solicitação, atribuiremos um nível de desconto e você passa a ver
          preços B2B ao logar.
        </p>

        <form onSubmit={onSubmit} className="mt-12 space-y-10">
          {mode === "signup" && (
            <fieldset className="space-y-5">
              <legend className="font-mono text-[11px] uppercase tracking-[0.3em] text-foreground/60 mb-4">
                — sua conta
              </legend>
              <Field label="Seu nome">
                <input className="form-input" required maxLength={120} value={nome} onChange={(e) => setNome(e.target.value)} />
              </Field>
              <Field label="E-mail">
                <input className="form-input" type="email" required maxLength={255} value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
              <Field label="Senha">
                <input className="form-input" type="password" required minLength={6} maxLength={72} value={senha} onChange={(e) => setSenha(e.target.value)} />
              </Field>
              <p className="text-xs text-muted-foreground">
                Já tem conta?{" "}
                <Link to="/login" className="text-gold hover:underline">Entrar</Link>
              </p>
            </fieldset>
          )}

          {mode === "logged" && (
            <p className="px-4 py-3 border border-border bg-surface text-sm text-foreground/75">
              Conectado como <strong>{email}</strong>. Preencha os dados da empresa para solicitar acesso B2B.
            </p>
          )}

          <fieldset className="space-y-5">
            <legend className="font-mono text-[11px] uppercase tracking-[0.3em] text-foreground/60 mb-4">
              — dados da empresa
            </legend>
            <Field label="Razão social ou nome fantasia">
              <input className="form-input" required maxLength={255} value={empresaNome} onChange={(e) => setEmpresaNome(e.target.value)} />
            </Field>
            <Field label="CNPJ">
              <input className="form-input" required maxLength={20} placeholder="00.000.000/0000-00 ou só números" value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
            </Field>
            <Field label="WhatsApp comercial">
              <input className="form-input" required maxLength={20} placeholder="(11) 90000-0000" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
            </Field>
          </fieldset>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-foreground text-background py-4 text-xs uppercase tracking-[0.2em] hover:bg-gold transition-colors disabled:opacity-50"
          >
            {submitting ? "Enviando…" : "Enviar solicitação"}
          </button>
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
