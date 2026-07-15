import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, MessageCircle, Copy, Loader2 } from "lucide-react";
import { brl } from "@/lib/slug";
import {
  PEDIDO_STATUS,
  STATUS_ADMIN_LABEL,
  statusBadgeClasses,
  type PedidoStatus,
} from "@/lib/pedidos";

export const Route = createFileRoute("/admin/pedidos/$id")({
  head: () => ({ meta: [{ title: "Pedido — Admin" }] }),
  component: AdminPedidoDetalhePage,
});

type Pedido = {
  id: string;
  numero_pedido: string;
  cliente_id: string | null;
  nome_cliente: string;
  telefone: string;
  email: string | null;
  perfil_cliente: string;
  origem_pedido: string;
  canal_contato: string;
  forma_pagamento: string | null;
  forma_entrega: string | null;
  endereco: string | null;
  observacoes: string | null;
  subtotal: number;
  desconto: number;
  total: number;
  status: PedidoStatus;
  codigo_rastreamento: string | null;
  codigo_rastreio: string;

  tags: string[];
  created_at: string;
};

type Item = {
  id: string;
  nome_produto: string;
  categoria_snapshot: string | null;
  imagem_snapshot: string | null;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
};

type Historico = { id: string; status: PedidoStatus; created_at: string };
type Nota = { id: string; texto: string; created_at: string; created_by: string | null };

function AdminPedidoDetalhePage() {
  const { id } = Route.useParams();
  const [pedido, setPedido] = useState<Pedido | null | undefined>(undefined);
  const [itens, setItens] = useState<Item[]>([]);
  const [historico, setHistorico] = useState<Historico[]>([]);
  const [notas, setNotas] = useState<Nota[]>([]);
  const [rastreio, setRastreio] = useState("");
  const [novaNota, setNovaNota] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data: p } = await supabase.from("pedidos").select("*").eq("id", id).maybeSingle();
    if (!p) {
      setPedido(null);
      return;
    }
    setPedido(p as Pedido);
    setRastreio((p as Pedido).codigo_rastreamento ?? "");

    const [{ data: it }, { data: h }, { data: n }] = await Promise.all([
      supabase.from("pedido_itens").select("*").eq("pedido_id", id).order("created_at"),
      supabase.from("pedido_status_historico").select("*").eq("pedido_id", id).order("created_at"),
      supabase.from("pedido_notas").select("*").eq("pedido_id", id).order("created_at", { ascending: false }),
    ]);
    setItens((it as Item[]) ?? []);
    setHistorico((h as Historico[]) ?? []);
    setNotas((n as Nota[]) ?? []);

    // Auto: novo -> em_atendimento ao abrir a primeira vez
    if ((p as Pedido).status === "novo") {
      await supabase.from("pedidos").update({ status: "em_atendimento" }).eq("id", id);
      const { data: p2 } = await supabase.from("pedidos").select("*").eq("id", id).maybeSingle();
      if (p2) setPedido(p2 as Pedido);
      const { data: h2 } = await supabase
        .from("pedido_status_historico")
        .select("*")
        .eq("pedido_id", id)
        .order("created_at");
      setHistorico((h2 as Historico[]) ?? []);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function alterarStatus(novo: PedidoStatus) {
    if (!pedido || novo === pedido.status) return;
    setBusy(true);
    const { error } = await supabase.from("pedidos").update({ status: novo }).eq("id", pedido.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Status atualizado.");
      await load();
    }
    setBusy(false);
  }

  async function salvarRastreio() {
    if (!pedido) return;
    setBusy(true);
    const { error } = await supabase
      .from("pedidos")
      .update({ codigo_rastreamento: rastreio || null })
      .eq("id", pedido.id);
    if (error) toast.error(error.message);
    else toast.success("Código de rastreio salvo.");
    setBusy(false);
  }

  async function adicionarNota() {
    if (!pedido || !novaNota.trim()) return;
    setBusy(true);
    const { data: sess } = await supabase.auth.getUser();
    const { error } = await supabase.from("pedido_notas").insert({
      pedido_id: pedido.id,
      texto: novaNota.trim(),
      created_by: sess.user?.id ?? null,
    } as any);
    if (error) toast.error(error.message);
    else {
      setNovaNota("");
      const { data: n } = await supabase
        .from("pedido_notas")
        .select("*")
        .eq("pedido_id", pedido.id)
        .order("created_at", { ascending: false });
      setNotas((n as Nota[]) ?? []);
      toast.success("Nota adicionada.");
    }
    setBusy(false);
  }

  function copiarResumo() {
    if (!pedido) return;
    const linhas = [
      `Pedido ${pedido.numero_pedido}`,
      `Cliente: ${pedido.nome_cliente}`,
      `WhatsApp: ${pedido.telefone}`,
      `Perfil: ${pedido.perfil_cliente}`,
      "",
      "Itens:",
      ...itens.map((i) => `- ${i.quantidade}x ${i.nome_produto} = ${brl(i.subtotal)}`),
      "",
      `Total: ${brl(pedido.total)}`,
      `Pagamento: ${pedido.forma_pagamento ?? "—"}`,
      `Entrega: ${pedido.forma_entrega ?? "—"}`,
      pedido.endereco ? `Endereço: ${pedido.endereco}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    navigator.clipboard.writeText(linhas);
    toast.success("Resumo copiado.");
  }

  if (pedido === undefined) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (pedido === null) {
    return (
      <div>
        <Link to="/admin/pedidos" className="text-xs uppercase tracking-[0.18em] text-foreground/70 hover:text-gold inline-flex items-center gap-2">
          <ArrowLeft size={12} /> Voltar
        </Link>
        <p className="mt-8">Pedido não encontrado.</p>
      </div>
    );
  }

  const waNumber = pedido.telefone.replace(/\D/g, "");
  const waMessage = buildWhatsMessage(pedido);
  const waLink = waNumber
    ? `https://wa.me/${waNumber}${waMessage ? `?text=${encodeURIComponent(waMessage)}` : ""}`
    : null;

  return (
    <div>
      <Link to="/admin/pedidos" className="text-xs uppercase tracking-[0.18em] text-foreground/70 hover:text-gold inline-flex items-center gap-2 mb-6">
        <ArrowLeft size={12} /> Todos os pedidos
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold mb-1">— pedido</p>
          <h1 className="font-display text-4xl text-foreground">{pedido.numero_pedido}</h1>
          <p className="mt-2 text-xs text-muted-foreground">
            {new Date(pedido.created_at).toLocaleString("pt-BR")}
          </p>
        </div>
        <span className={`text-[10px] px-3 py-1.5 uppercase tracking-[0.18em] ${statusBadgeClasses(pedido.status)}`}>
          {STATUS_ADMIN_LABEL[pedido.status]}
        </span>
      </div>

      {pedido.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {pedido.tags.map((t) => (
            <span key={t} className="text-[10px] px-2 py-1 bg-surface uppercase tracking-[0.18em] text-foreground/70">
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_320px] gap-8">
        <div className="space-y-8">
          {/* Cliente */}
          <section className="border border-border p-6 bg-background">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-foreground/60 mb-4">— cliente</p>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <Info label="Nome" value={pedido.nome_cliente} />
              <Info label="WhatsApp" value={pedido.telefone} />
              {pedido.email && <Info label="E-mail" value={pedido.email} />}
              <Info label="Perfil" value={pedido.perfil_cliente} />
              <Info label="Origem" value={pedido.origem_pedido} />
              <Info label="Canal" value={pedido.canal_contato} />
            </div>
            <div className="flex flex-wrap gap-2 mt-5">
              {waLink && (
                <a href={waLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-whatsapp text-white px-4 py-2 text-xs uppercase tracking-[0.18em] hover:opacity-90">
                  <MessageCircle size={14} /> Abrir WhatsApp
                </a>
              )}
              <button onClick={copiarResumo} className="inline-flex items-center gap-2 border border-border px-4 py-2 text-xs uppercase tracking-[0.18em] hover:bg-surface">
                <Copy size={14} /> Copiar resumo
              </button>
              <Link to="/pedido/$numero" params={{ numero: pedido.codigo_rastreio }} target="_blank" className="inline-flex items-center gap-2 border border-border px-4 py-2 text-xs uppercase tracking-[0.18em] hover:bg-surface">
                Ver tracking público
              </Link>

            </div>
          </section>

          {/* Itens */}
          <section className="border border-border bg-background">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-foreground/60 p-6 pb-3">— itens</p>
            <ul className="divide-y divide-border">
              {itens.map((i) => (
                <li key={i.id} className="flex gap-4 p-6 py-4">
                  <div className="h-14 w-14 shrink-0 bg-surface overflow-hidden">
                    {i.imagem_snapshot && <img src={i.imagem_snapshot} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{i.nome_produto}</p>
                    {i.categoria_snapshot && (
                      <p className="text-[11px] text-muted-foreground">{i.categoria_snapshot}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">{i.quantidade}x {brl(i.preco_unitario)}</p>
                  </div>
                  <p className="text-sm text-foreground">{brl(i.subtotal)}</p>
                </li>
              ))}
            </ul>
            <div className="p-6 pt-4 border-t border-border space-y-1.5 text-sm">
              <Row label="Subtotal" value={brl(pedido.subtotal)} />
              {pedido.desconto > 0 && <Row label="Desconto" value={`- ${brl(pedido.desconto)}`} />}
              <Row label="Total" value={brl(pedido.total)} strong />
            </div>
          </section>

          {/* Entrega */}
          <section className="border border-border p-6 bg-background">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-foreground/60 mb-4">— entrega</p>
            <div className="grid sm:grid-cols-2 gap-4 text-sm mb-4">
              <Info label="Pagamento" value={pedido.forma_pagamento ?? "—"} />
              <Info label="Entrega" value={pedido.forma_entrega ?? "—"} />
            </div>
            {pedido.endereco && (
              <div className="mb-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-foreground/60 mb-1">Endereço</p>
                <p className="text-sm text-foreground whitespace-pre-line">{pedido.endereco}</p>
              </div>
            )}
            {pedido.observacoes && (
              <div className="mb-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-foreground/60 mb-1">Observações do cliente</p>
                <p className="text-sm text-foreground whitespace-pre-line">{pedido.observacoes}</p>
              </div>
            )}
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-foreground/60 mb-2 block">Código de rastreio</span>
              <div className="flex gap-2">
                <input value={rastreio} onChange={(e) => setRastreio(e.target.value)} className="form-input flex-1" placeholder="Ex.: BR123456789" />
                <button onClick={salvarRastreio} disabled={busy} className="bg-foreground text-background px-4 text-xs uppercase tracking-[0.18em] disabled:opacity-50">
                  Salvar
                </button>
              </div>
            </label>
          </section>

          {/* Notas internas */}
          <section className="border border-border p-6 bg-background">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-foreground/60 mb-4">— notas internas</p>
            <div className="flex gap-2 mb-4">
              <textarea value={novaNota} onChange={(e) => setNovaNota(e.target.value)} className="form-input flex-1 min-h-[60px]" placeholder="Anotação privada visível apenas no admin…" maxLength={2000} />
              <button onClick={adicionarNota} disabled={busy || !novaNota.trim()} className="bg-foreground text-background px-4 text-xs uppercase tracking-[0.18em] self-start py-2 disabled:opacity-50">
                Adicionar
              </button>
            </div>
            {notas.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sem notas.</p>
            ) : (
              <ul className="space-y-3">
                {notas.map((n) => (
                  <li key={n.id} className="border-l-2 border-gold pl-3">
                    <p className="text-sm text-foreground whitespace-pre-line">{n.texto}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      {new Date(n.created_at).toLocaleString("pt-BR")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Sidebar: status + histórico */}
        <aside className="space-y-6 lg:sticky lg:top-28 self-start">
          <section className="border border-border p-6 bg-background">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-foreground/60 mb-4">— alterar status</p>
            <div className="space-y-2">
              {PEDIDO_STATUS.map((s) => (
                <button
                  key={s}
                  onClick={() => alterarStatus(s)}
                  disabled={busy || s === pedido.status}
                  className={`w-full text-left px-3 py-2 text-xs uppercase tracking-[0.15em] transition-colors ${
                    s === pedido.status
                      ? `${statusBadgeClasses(s)} cursor-default`
                      : "border border-border hover:bg-surface text-foreground/80"
                  }`}
                >
                  {STATUS_ADMIN_LABEL[s]}
                </button>
              ))}
            </div>
            {busy && (
              <div className="mt-3 flex justify-center text-muted-foreground">
                <Loader2 size={14} className="animate-spin" />
              </div>
            )}
          </section>

          <section className="border border-border p-6 bg-background">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-foreground/60 mb-4">— histórico</p>
            <ol className="space-y-3 text-xs">
              {historico.map((h) => (
                <li key={h.id} className="flex justify-between gap-3">
                  <span className="text-foreground">{STATUS_ADMIN_LABEL[h.status]}</span>
                  <span className="text-muted-foreground whitespace-nowrap">
                    {new Date(h.created_at).toLocaleString("pt-BR")}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-foreground/60 mb-0.5">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "pt-2 border-t border-border" : ""}`}>
      <span className="text-muted-foreground text-xs uppercase tracking-[0.18em]">{label}</span>
      <span className={strong ? "font-display text-xl text-foreground" : "text-foreground"}>{value}</span>
    </div>
  );
}
