import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Minus, Plus, Trash2, MessageCircle, ShoppingBag, CheckCircle2 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
import { useConfig } from "@/hooks/useConfig";
import { getPrecoForProfile } from "@/lib/preco";
import { brl } from "@/lib/slug";
import { toast } from "sonner";
import { criarPedido, perfilLabel } from "@/lib/pedidos";
import { buildWhatsAppLink, normalizeWhatsAppNumber } from "@/lib/whatsapp";
import { useServerFn } from "@tanstack/react-start";
import { calcularFrete, type OpcaoFrete } from "@/lib/frete.functions";
import { Loader2 } from "lucide-react";
import { SugestoesCombina } from "@/components/SugestoesCombina";
import { supabase } from "@/integrations/supabase/client";
import type { SugestaoProduto } from "@/lib/sugestoes";

export const Route = createFileRoute("/carrinho")({
  head: () => ({
    meta: [
      { title: "Carrinho — Gama Sensações" },
      { name: "description", content: "Revise seu pedido e finalize pelo WhatsApp." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CarrinhoPage,
});

const PAGAMENTOS = ["PIX", "Cartão", "Dinheiro", "Transferência"] as const;
const ENTREGAS = ["Retirada", "Motoboy", "Correios", "Transportadora", "Entrega local", "A combinar"] as const;
type Pagamento = (typeof PAGAMENTOS)[number];
type Entrega = (typeof ENTREGAS)[number];

function CarrinhoPage() {
  const { items, setQty, remove, clear, add } = useCart();
  const { profile, loading: loadingProfile } = useCurrentProfile();
  const { config, loading: loadingConfig } = useConfig();

  const [nome, setNome] = useState("");
  const [whats, setWhats] = useState("");
  const [pagamento, setPagamento] = useState<Pagamento>("PIX");
  const [entrega, setEntrega] = useState<Entrega>("Retirada");
  const [endereco, setEndereco] = useState("");
  const [obs, setObs] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sucesso, setSucesso] = useState<{ numero: string; link: string } | null>(null);
  const [cep, setCep] = useState("");
  const [freteOpcoes, setFreteOpcoes] = useState<OpcaoFrete[] | null>(null);
  const [freteSelId, setFreteSelId] = useState<number | null>(null);
  const [freteErro, setFreteErro] = useState<string | null>(null);
  const [freteLoading, setFreteLoading] = useState(false);
  const calcFrete = useServerFn(calcularFrete);

  // pré-preenche dados do perfil
  useEffect(() => {
    if (profile) {
      if (profile.nome) setNome((n) => n || profile.nome!);
      if (profile.whatsapp) setWhats((w) => w || profile.whatsapp!);
    }
  }, [profile]);

  const linhas = useMemo(
    () =>
      items.map((it) => {
        const preco = getPrecoForProfile(it.precos, profile);
        return {
          item: it,
          unit: preco.valor,
          label: preco.label,
          badge: preco.badge,
          subtotal: preco.valor * it.qty,
        };
      }),
    [items, profile],
  );

  // Enriquece itens do tipo "produto" com fragrancia/categoria_id para gerar sugestões
  const [meta, setMeta] = useState<Map<string, { fragrancia: string | null; categoria_id: string | null }>>(new Map());
  const produtoIds = useMemo(
    () => items.filter((i) => i.kind === "produto").map((i) => i.id).sort().join(","),
    [items],
  );
  useEffect(() => {
    if (!produtoIds) { setMeta(new Map()); return; }
    (async () => {
      const ids = produtoIds.split(",");
      const { data } = await supabase
        .from("produtos")
        .select("id,fragrancia,categoria_id")
        .in("id", ids);
      const m = new Map<string, { fragrancia: string | null; categoria_id: string | null }>();
      for (const r of (data ?? []) as { id: string; fragrancia: string | null; categoria_id: string | null }[]) {
        m.set(r.id, { fragrancia: r.fragrancia, categoria_id: r.categoria_id });
      }
      setMeta(m);
    })();
  }, [produtoIds]);

  const cartLike = useMemo(
    () => items
      .filter((i) => i.kind === "produto")
      .map((i) => ({
        id: i.id,
        fragrancia: meta.get(i.id)?.fragrancia ?? null,
        categoria_id: meta.get(i.id)?.categoria_id ?? null,
      })),
    [items, meta],
  );

  function adicionarSugestao(s: SugestaoProduto) {
    add({
      kind: "produto",
      id: s.id,
      slug: s.slug,
      nome: s.nome,
      imagem: s.imagens?.[0] ?? null,
      precos: {
        preco_varejo: s.preco_varejo,
        preco_assinatura: s.preco_assinatura,
        preco_b2b_1: s.preco_b2b_1,
        preco_b2b_2: s.preco_b2b_2,
        preco_b2b_3: s.preco_b2b_3,
      },
    });
    toast.success(`${s.nome} adicionado ao carrinho.`);
  }

  const subtotal = linhas.reduce((s, l) => s + l.subtotal, 0);
  const empresaWa = normalizeWhatsAppNumber(config.whatsapp_pedidos);
  const exigeEndereco = entrega !== "Retirada" && entrega !== "A combinar";
  const freteGratis = subtotal >= 150;
  const freteSel = freteOpcoes?.find((o) => o.id === freteSelId) ?? null;
  const freteCusto = exigeEndereco && freteSel && !freteGratis ? freteSel.preco : 0;
  const total = subtotal + freteCusto;

  // Reset frete quando muda tipo de entrega ou CEP
  useEffect(() => {
    setFreteOpcoes(null);
    setFreteSelId(null);
    setFreteErro(null);
  }, [entrega, cep]);

  async function calcularFreteHandler() {
    const cepDigits = cep.replace(/\D/g, "");
    if (cepDigits.length !== 8) {
      setFreteErro("Informe um CEP válido (8 dígitos).");
      return;
    }
    setFreteLoading(true);
    setFreteErro(null);
    setFreteOpcoes(null);
    setFreteSelId(null);
    try {
      const res = await calcFrete({ data: { cep_destino: cepDigits, subtotal, itens: items.map((i) => ({ kind: i.kind, id: i.id, qty: i.qty })) } });
      if (res.ok) {
        setFreteOpcoes(res.opcoes);
        setFreteSelId(res.opcoes[0]?.id ?? null);
      } else {
        setFreteErro(res.erro);
      }
    } catch {
      setFreteErro("Não foi possível calcular. O frete será combinado no WhatsApp.");
    } finally {
      setFreteLoading(false);
    }
  }

  async function finalizarWhatsApp() {
    if (items.length === 0) { toast.error("Seu carrinho está vazio."); return; }
    if (!nome.trim() || nome.trim().length < 2) { toast.error("Informe seu nome."); return; }
    if (!whats.trim() || whats.replace(/\D/g, "").length < 8) { toast.error("Informe um WhatsApp válido."); return; }
    if (exigeEndereco && endereco.trim().length < 5) { toast.error("Informe o endereço de entrega."); return; }
    if (!empresaWa) { toast.error("Número da empresa ainda não configurado."); return; }
    setSubmitting(true);

    try {
      const freteDescricao = exigeEndereco
        ? freteGratis
          ? freteSel
            ? `Frete grátis (${freteSel.nome}, ~${freteSel.prazo_dias} dias úteis)`
            : "Frete grátis"
          : freteSel
            ? `${freteSel.nome} — ${brl(freteSel.preco)} (~${freteSel.prazo_dias} dias úteis)`
            : "A confirmar via WhatsApp"
        : null;

      const observacoesFinais = [obs.trim() || null, freteDescricao ? `Frete: ${freteDescricao}` : null]
        .filter(Boolean)
        .join(" | ") || null;

      // 1) Registrar pedido no banco
      const pedido = await criarPedido({
        cliente_id: profile?.id ?? null,
        nome_cliente: nome.trim(),
        telefone: whats.trim(),
        email: profile?.email ?? null,
        perfil_cliente: perfilLabel(profile),
        forma_pagamento: pagamento,
        forma_entrega: entrega,
        endereco: exigeEndereco ? endereco.trim() : null,
        observacoes: observacoesFinais,
        canal_contato: "whatsapp",
        subtotal,
        desconto: 0,
        total,
        itens: linhas.map((l) => ({ item: l.item, preco_unitario: l.unit, subtotal: l.subtotal })),
      });

      const telDigits = whats.replace(/\D/g, "");
      const trackingLink = `${window.location.origin}/pedido/${pedido.codigo_rastreio}?t=${encodeURIComponent(telDigits.slice(-4))}`;


      // 2) Montar mensagem WhatsApp
      const linhasMsg = linhas
        .map((l, i) => `${i + 1}. ${l.item.nome}${l.item.kind === "kit" ? " (kit)" : ""} — ${l.item.qty}x ${brl(l.unit)} = ${brl(l.subtotal)}${l.badge ? ` [${l.badge}]` : ""}`)
        .join("\n");

      const tipoCliente =
        profile?.tipo_cliente === "b2b" && profile.status_aprovacao === "aprovado"
          ? `B2B Nível ${profile.nivel_b2b ?? "?"}`
          : profile?.tipo_cliente === "assinante" ? "Assinante" : "Varejo";

      const msg = [
        `*Novo pedido — ${pedido.numero_pedido}*`,
        "",
        `*Cliente:* ${nome.trim()}`,
        `*WhatsApp:* ${whats.trim()}`,
        `*Tipo:* ${tipoCliente}`,
        profile?.empresa_nome ? `*Empresa:* ${profile.empresa_nome}` : null,
        "",
        "*Itens:*",
        linhasMsg,
        "",
        `*Subtotal:* ${brl(subtotal)}`,
        exigeEndereco ? `*Frete:* ${freteDescricao ?? "A confirmar"}` : null,
        `*Total: ${brl(total)}*`,
        "",
        `*Pagamento:* ${pagamento}`,
        `*Entrega:* ${entrega}`,
        exigeEndereco ? `*CEP:* ${cep}` : null,
        exigeEndereco ? `*Endereço:* ${endereco.trim()}` : null,
        obs.trim() ? `*Observações:* ${obs.trim()}` : null,
        "",
        `*Acompanhar:* ${trackingLink}`,
      ].filter(Boolean).join("\n");

      window.open(buildWhatsAppLink(config.whatsapp_pedidos, msg), "_blank", "noopener");
      clear();
      setSucesso({ numero: pedido.numero_pedido, link: trackingLink });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao registrar pedido.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sucesso) {
    return (
      <div className="min-h-screen bg-background pt-28 pb-24">
        <div className="container-editorial max-w-xl text-center">
          <CheckCircle2 size={48} className="mx-auto text-gold mb-6" strokeWidth={1.5} />
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold mb-2">— pedido {sucesso.numero}</p>
          <h1 className="font-display text-4xl text-foreground mb-3">Pedido registrado com sucesso.</h1>
          <p className="text-sm text-muted-foreground mb-8">
            Abrimos o WhatsApp com o resumo. Acompanhe o status pelo link abaixo.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href={sucesso.link} target="_blank" rel="noreferrer" className="bg-foreground text-background px-6 py-3 text-xs uppercase tracking-[0.2em] hover:opacity-90">
              Acompanhar pedido
            </a>
            <Link to="/produtos" className="border border-border px-6 py-3 text-xs uppercase tracking-[0.2em] hover:bg-surface">
              Continuar comprando
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-28 pb-24">
      <div className="container-editorial max-w-5xl">
        <Link
          to="/produtos"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-foreground/60 hover:text-gold mb-8"
        >
          <ArrowLeft size={12} /> Continuar comprando
        </Link>

        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold">— carrinho</p>
        <h1 className="font-display text-5xl text-foreground">Seu pedido</h1>


        {items.length === 0 ? (
          <div className="mt-16 text-center border border-border py-20 px-6">
            <ShoppingBag className="mx-auto text-foreground/30" size={32} />
            <p className="mt-4 text-muted-foreground">Seu carrinho está vazio.</p>
            <Link
              to="/produtos"
              className="mt-6 inline-block text-xs uppercase tracking-[0.2em] text-gold hover:underline"
            >
              Ver catálogo →
            </Link>
          </div>
        ) : (
          <div className="mt-12 grid lg:grid-cols-[1fr_360px] gap-12">
            {/* Itens */}
            <div className="space-y-4">
              {linhas.map(({ item, unit, label, badge, subtotal }) => (
                <div
                  key={`${item.kind}-${item.id}`}
                  className="flex gap-4 p-4 border border-border bg-surface/30"
                >
                  <div className="w-24 h-24 shrink-0 bg-surface overflow-hidden">
                    {item.imagem ? (
                      <img src={item.imagem} alt={item.nome} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">
                        sem foto
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      to={item.kind === "produto" ? "/produto/$slug" : "/kit/$slug"}
                      params={{ slug: item.slug }}
                      className="font-display text-xl text-foreground hover:text-gold"
                    >
                      {item.nome}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {brl(unit)} <span className="text-foreground/40">/un</span>
                      {badge && (
                        <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
                          {label}
                        </span>
                      )}
                    </p>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex items-center border border-border">
                        <button
                          type="button"
                          aria-label="Diminuir"
                          onClick={() => setQty(item.kind, item.id, item.qty - 1)}
                          className="p-2 hover:bg-surface"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-8 text-center font-mono text-xs">{item.qty}</span>
                        <button
                          type="button"
                          aria-label="Aumentar"
                          onClick={() => setQty(item.kind, item.id, item.qty + 1)}
                          className="p-2 hover:bg-surface"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <button
                        type="button"
                        aria-label="Remover"
                        onClick={() => remove(item.kind, item.id)}
                        className="text-foreground/50 hover:text-destructive p-2"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="text-right font-display text-lg text-foreground">{brl(subtotal)}</div>
                </div>
              ))}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    clear();
                    toast.success("Carrinho esvaziado.");
                  }}
                  className="text-xs uppercase tracking-[0.18em] text-foreground/50 hover:text-destructive"
                >
                  Esvaziar carrinho
                </button>
              </div>

              <SugestoesCombina
                itens={cartLike}
                onAdd={adicionarSugestao}
                precoDe={(s) => getPrecoForProfile(s, profile).valor}
              />
            </div>

            {/* Checkout */}
            <aside className="space-y-6 lg:sticky lg:top-28 self-start border border-border p-6 bg-surface/30">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-foreground/60">Subtotal</p>
                <p className="font-display text-2xl text-foreground">{brl(subtotal)}</p>
                {exigeEndereco && (
                  <div className="mt-2 text-xs text-foreground/70">
                    Frete: <span className="font-medium">{
                      freteGratis
                        ? "Grátis"
                        : freteSel
                          ? brl(freteSel.preco)
                          : "—"
                    }</span>
                  </div>
                )}
                <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.25em] text-foreground/60">Total</p>
                <p className="font-display text-4xl text-foreground">{brl(total)}</p>
                {!loadingProfile && !profile && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    <Link to="/cadastro-b2b" className="text-gold hover:underline">Empresa? Solicite B2B</Link>
                    {" "}para preços melhores.
                  </p>
                )}
              </div>

              <Field label="Seu nome">
                <input
                  className="form-input"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  maxLength={120}
                />
              </Field>
              <Field label="Seu WhatsApp">
                <input
                  className="form-input"
                  value={whats}
                  onChange={(e) => setWhats(e.target.value)}
                  placeholder="(11) 90000-0000"
                  maxLength={20}
                />
              </Field>

              <Field label="Forma de pagamento">
                <select
                  className="form-input"
                  value={pagamento}
                  onChange={(e) => setPagamento(e.target.value as Pagamento)}
                >
                  {PAGAMENTOS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </Field>

              <Field label="Forma de entrega">
                <select
                  className="form-input"
                  value={entrega}
                  onChange={(e) => setEntrega(e.target.value as Entrega)}
                >
                  {ENTREGAS.map((e) => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
                {entrega === "A combinar" && (
                  <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
                    A forma de entrega será definida diretamente no WhatsApp após o envio do pedido.
                  </p>
                )}
              </Field>

              {exigeEndereco && (
                <>
                  <Field label="CEP de entrega">
                    <div className="flex gap-2">
                      <input
                        className="form-input flex-1"
                        value={cep}
                        onChange={(e) => setCep(e.target.value.replace(/\D/g, "").slice(0, 8))}
                        placeholder="00000000"
                        inputMode="numeric"
                        maxLength={9}
                      />
                      <button
                        type="button"
                        onClick={calcularFreteHandler}
                        disabled={freteLoading || cep.replace(/\D/g, "").length !== 8}
                        className="border border-border px-3 text-[11px] uppercase tracking-[0.18em] hover:bg-surface disabled:opacity-50 inline-flex items-center gap-2"
                      >
                        {freteLoading ? <Loader2 size={12} className="animate-spin" /> : null}
                        {freteLoading ? "Calculando" : "Calcular"}
                      </button>
                    </div>
                    {freteOpcoes && freteOpcoes.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {freteOpcoes.map((o) => (
                          <label
                            key={o.id}
                            className={`flex items-center justify-between gap-3 border p-3 cursor-pointer transition-colors ${
                              freteSelId === o.id ? "border-gold bg-gold/5" : "border-border hover:bg-surface"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="radio"
                                name="frete"
                                checked={freteSelId === o.id}
                                onChange={() => setFreteSelId(o.id)}
                                className="accent-gold"
                              />
                              <div>
                                <p className="text-sm font-medium text-foreground">{o.nome}</p>
                                <p className="text-[11px] text-muted-foreground">~{o.prazo_dias} dias úteis</p>
                              </div>
                            </div>
                            <p className="font-mono text-sm text-foreground">
                              {freteGratis ? <span className="text-green-600">Grátis</span> : brl(o.preco)}
                            </p>
                          </label>
                        ))}
                        {freteGratis && (
                          <p className="text-[11px] text-green-700 dark:text-green-400">
                            ✓ Frete grátis a partir de {brl(150)} — escolha a modalidade para saber o prazo.
                          </p>
                        )}
                      </div>
                    )}
                    {freteErro && (
                      <p className="mt-2 text-[11px] px-3 py-2 bg-gold/10 text-foreground/80 border border-gold/30 leading-relaxed">
                        {freteErro} O frete será confirmado via WhatsApp antes da finalização.
                      </p>
                    )}
                    {!freteOpcoes && !freteErro && !freteLoading && (
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        Informe o CEP e clique em Calcular para ver as opções de envio.
                      </p>
                    )}
                  </Field>

                  <Field label="Endereço completo">
                    <textarea
                      className="form-input min-h-[80px]"
                      value={endereco}
                      onChange={(e) => setEndereco(e.target.value)}
                      placeholder="Rua, número, complemento, bairro, cidade"
                      maxLength={500}
                    />
                  </Field>
                </>
              )}

              <Field label="Observações (opcional)">
                <textarea
                  className="form-input min-h-[60px]"
                  value={obs}
                  onChange={(e) => setObs(e.target.value)}
                  maxLength={500}
                />
              </Field>

              <button
                type="button"
                onClick={finalizarWhatsApp}
                disabled={submitting || loadingConfig}
                className="w-full bg-whatsapp text-white py-4 text-xs uppercase tracking-[0.2em] hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center justify-center gap-3"
              >
                <MessageCircle size={16} /> Finalizar pelo WhatsApp
              </button>
              <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                Vamos abrir o WhatsApp da empresa com seu pedido pronto. A confirmação e o pagamento são feitos na conversa.
              </p>
              <p className="text-center">
                <Link
                  to="/politica-de-trocas"
                  className="text-[11px] uppercase tracking-[0.2em] text-foreground/60 hover:text-gold underline underline-offset-4"
                >
                  Prazos e política de troca
                </Link>
              </p>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-foreground/60 mb-2 block">
        {label}
      </span>
      {children}
    </label>
  );
}
