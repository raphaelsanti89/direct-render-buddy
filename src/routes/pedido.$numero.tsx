import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PedidoTimeline } from "@/components/PedidoTimeline";
import { brl } from "@/lib/slug";
import { STATUS_LABEL, type PedidoStatus } from "@/lib/pedidos";
import { ArrowLeft } from "lucide-react";

type Search = { t?: string };

export const Route = createFileRoute("/pedido/$numero")({
  head: ({ params }) => ({
    meta: [
      { title: `Pedido ${params.numero} — Gama Sensações` },
      { name: "description", content: "Acompanhe o status do seu pedido." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): Search => ({
    t: typeof search.t === "string" ? search.t : undefined,
  }),
  component: PedidoPublicoPage,
});

type Pedido = {
  id: string;
  numero_pedido: string;
  codigo_rastreio: string;
  nome_cliente: string;
  status: PedidoStatus;
  forma_entrega: string | null;
  forma_pagamento: string | null;
  codigo_rastreamento: string | null;
  subtotal: number;
  desconto: number;
  total: number;
  created_at: string;
};

type Item = {
  id: string;
  nome_produto: string;
  imagem_snapshot: string | null;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
};

type LoadState =
  | { kind: "loading" }
  | { kind: "need_identifier" }
  | { kind: "not_found" }
  | { kind: "ok"; pedido: Pedido; itens: Item[] };

function PedidoPublicoPage() {
  const { numero } = Route.useParams();
  const { t } = Route.useSearch();
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [identificador, setIdentificador] = useState(t ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function tentar(ident: string | null) {
    setErro(null);
    const { data, error } = await supabase.rpc("get_pedido_publico", {
      p_codigo: numero,
      p_identificador: ident ?? undefined,
    } as { p_codigo: string; p_identificador?: string });

    if (error) {
      console.error(error);
      setState({ kind: "not_found" });
      return;
    }
    const payload = data as unknown as { pedido: Pedido | null; itens: Item[] } | null;
    if (!payload || !payload.pedido) {
      if (ident) {
        setErro("Não encontramos um pedido com esses dados. Verifique o telefone/email informado.");
      }
      setState({ kind: "need_identifier" });
      return;
    }
    setState({ kind: "ok", pedido: payload.pedido, itens: payload.itens ?? [] });
  }

  useEffect(() => {
    tentar(t ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numero, t]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (identificador.trim().length < 4) {
      setErro("Informe o telefone ou email usado no pedido.");
      return;
    }
    setSubmitting(true);
    await tentar(identificador.trim());
    setSubmitting(false);
  }

  if (state.kind === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground animate-pulse">
          Carregando…
        </p>
      </div>
    );
  }

  if (state.kind === "need_identifier") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <form onSubmit={onSubmit} className="w-full max-w-md text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold mb-3">— pedido</p>
          <h1 className="font-display text-3xl text-foreground mb-2">Confirme sua identidade</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Para exibir os dados do pedido, informe o telefone ou email usado na compra.
          </p>
          <input
            type="text"
            value={identificador}
            onChange={(e) => setIdentificador(e.target.value)}
            placeholder="Telefone ou email"
            className="form-input w-full mb-3 text-center"
            autoFocus
          />
          {erro && <p className="text-xs text-red-600 mb-3">{erro}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-foreground text-background py-3 text-xs uppercase tracking-[0.2em] hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Verificando…" : "Ver pedido"}
          </button>
          <Link to="/" className="block mt-6 text-xs uppercase tracking-[0.18em] text-foreground/60 hover:text-gold">
            ← Voltar ao site
          </Link>
        </form>
      </div>
    );
  }

  if (state.kind === "not_found") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 text-center">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold mb-3">— pedido</p>
          <h1 className="font-display text-3xl text-foreground mb-2">Pedido não encontrado</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Verifique se o link está correto.
          </p>
          <Link to="/" className="text-xs uppercase tracking-[0.18em] text-foreground/70 hover:text-gold">
            ← Voltar ao site
          </Link>
        </div>
      </div>
    );
  }

  const { pedido, itens } = state;
  const data = new Date(pedido.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="container-editorial max-w-2xl pt-10 lg:pt-16">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-foreground/60 hover:text-gold mb-6"
        >
          <ArrowLeft size={12} /> Voltar ao site
        </Link>

        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold mb-2">
          — pedido {pedido.numero_pedido}
        </p>
        <h1 className="font-display text-3xl lg:text-4xl text-foreground">
          Olá, {pedido.nome_cliente.split(" ")[0]}.
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Pedido realizado em {data}.</p>

        <section className="mt-10 border border-border p-6 bg-surface/30">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-foreground/60 mb-5">
            — acompanhamento
          </p>
          <PedidoTimeline status={pedido.status} />
        </section>

        <section className="mt-8 border border-border p-6 bg-background">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-foreground/60 mb-5">— itens</p>
          <ul className="divide-y divide-border">
            {itens.map((it) => (
              <li key={it.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <div className="h-14 w-14 shrink-0 bg-surface overflow-hidden">
                  {it.imagem_snapshot ? (
                    <img src={it.imagem_snapshot} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{it.nome_produto}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {it.quantidade}x {brl(it.preco_unitario)}
                  </p>
                </div>
                <p className="text-sm text-foreground">{brl(it.subtotal)}</p>
              </li>
            ))}
          </ul>
          <div className="mt-5 pt-4 border-t border-border flex justify-between items-baseline">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-foreground/60">Total</span>
            <span className="font-display text-2xl text-foreground">{brl(pedido.total)}</span>
          </div>
        </section>

        <section className="mt-8 grid sm:grid-cols-2 gap-px bg-border">
          <Info label="Pagamento" value={pedido.forma_pagamento ?? "—"} />
          <Info label="Entrega" value={pedido.forma_entrega ?? "—"} />
          {pedido.codigo_rastreamento && (
            <div className="sm:col-span-2 bg-background p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-foreground/60 mb-1">
                Código de rastreio
              </p>
              <p className="text-sm font-mono text-foreground">{pedido.codigo_rastreamento}</p>
            </div>
          )}
        </section>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Status: <strong className="text-foreground">{STATUS_LABEL[pedido.status]}</strong>
        </p>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-foreground/60 mb-1">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}
