import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { STATUS_LABEL, statusBadgeClasses, type PedidoStatus } from "@/lib/pedidos";

export const Route = createFileRoute("/minha-conta")({
  head: () => ({
    meta: [
      { title: "Minha Conta — Gama Sensações" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: MinhaContaPage,
});

type Profile = {
  id: string;
  nome: string | null;
  email: string | null;
  tipo_cliente: string | null;
  nivel_b2b: number | null;
  empresa_nome: string | null;
};

type Pedido = {
  id: string;
  numero_pedido: string;
  codigo_rastreio: string;

  status: PedidoStatus;
  total: number;
  created_at: string;
};

function MinhaContaPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        navigate({ to: "/login" });
        return;
      }
      const uid = sess.session.user.id;
      const userEmail = sess.session.user.email ?? "";
      const [{ data: prof }, { data: peds }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, nome, email, tipo_cliente, nivel_b2b, empresa_nome")
          .eq("id", uid)
          .maybeSingle(),
        supabase
          .from("pedidos")
          .select("id, numero_pedido, status, total, created_at")
          .or(
            userEmail
              ? `cliente_id.eq.${uid},email.eq.${userEmail.toLowerCase()}`
              : `cliente_id.eq.${uid}`,
          )
          .order("created_at", { ascending: false }),
      ]);
      if (cancelled) return;
      setProfile((prof as Profile) ?? null);
      setPedidos(((peds as Pedido[]) ?? []));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  const isB2B = profile?.tipo_cliente?.toLowerCase().startsWith("b2b");

  return (
    <div className="min-h-screen bg-[#F5F2EC] text-[#2C4A35]">
      <Navbar />
      <main className="pt-32 pb-20">
        <div className="container-editorial max-w-5xl">
          <header className="mb-10 flex items-end justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#C8A96E]">Área do cliente</p>
              <h1 className="font-display text-4xl md:text-5xl mt-2">Minha Conta</h1>
            </div>
            <button
              onClick={signOut}
              className="text-xs uppercase tracking-[0.2em] text-[#2C4A35]/70 hover:text-[#C8A96E] transition-colors"
            >
              Sair
            </button>
          </header>

          {loading ? (
            <p className="text-sm text-[#2C4A35]/60">Carregando…</p>
          ) : (
            <div className="grid gap-8 md:grid-cols-[1fr_1.5fr]">
              {/* Perfil */}
              <section className="bg-white border border-[#C8A96E]/30 rounded-sm p-6">
                <h2 className="font-display text-2xl mb-5">Perfil</h2>
                <dl className="space-y-4 text-sm">
                  <Field label="Nome" value={profile?.nome ?? "—"} />
                  <Field label="E-mail" value={profile?.email ?? "—"} />
                  <Field
                    label="Tipo de cliente"
                    value={isB2B ? "B2B" : "B2C"}
                  />
                  {isB2B && profile?.nivel_b2b != null && (
                    <Field label="Nível B2B" value={String(profile.nivel_b2b)} />
                  )}
                  {isB2B && profile?.empresa_nome && (
                    <Field label="Empresa" value={profile.empresa_nome} />
                  )}
                </dl>
              </section>

              {/* Pedidos */}
              <section className="bg-white border border-[#C8A96E]/30 rounded-sm p-6">
                <h2 className="font-display text-2xl mb-5">Histórico de pedidos</h2>
                {pedidos.length === 0 ? (
                  <p className="text-sm text-[#2C4A35]/60">
                    Você ainda não fez pedidos.
                  </p>
                ) : (
                  <ul className="divide-y divide-[#C8A96E]/20">
                    {pedidos.map((p) => (
                      <li key={p.id} className="py-4 flex items-center justify-between gap-4 flex-wrap">
                        <div className="min-w-0">
                          <p className="font-mono text-sm text-[#2C4A35]">{p.numero_pedido}</p>
                          <p className="text-xs text-[#2C4A35]/60 mt-1">
                            {new Date(p.created_at).toLocaleDateString("pt-BR")} ·{" "}
                            {p.total.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-[11px] px-2 py-1 rounded-sm ${statusBadgeClasses(p.status)}`}>
                            {STATUS_LABEL[p.status]}
                          </span>
                          <Link
                            to="/pedido/$numero"
                            params={{ numero: p.numero_pedido }}
                            className="text-xs uppercase tracking-[0.18em] text-[#C8A96E] hover:text-[#2C4A35] transition-colors"
                          >
                            Rastrear →
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.2em] text-[#2C4A35]/50">{label}</dt>
      <dd className="mt-1 text-[#2C4A35]" style={{ fontFamily: "Inter, sans-serif" }}>
        {value}
      </dd>
    </div>
  );
}
