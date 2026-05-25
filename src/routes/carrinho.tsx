import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Minus, Plus, Trash2, MessageCircle, ShoppingBag } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
import { useConfig } from "@/hooks/useConfig";
import { getPrecoForProfile } from "@/lib/preco";
import { brl } from "@/lib/slug";
import { toast } from "sonner";

export const Route = createFileRoute("/carrinho")({
  head: () => ({
    meta: [
      { title: "Carrinho — Gama Sensações" },
      { name: "description", content: "Revise seu pedido e finalize pelo WhatsApp." },
    ],
  }),
  component: CarrinhoPage,
});

const PAGAMENTOS = ["PIX", "Cartão", "Dinheiro", "Transferência"] as const;
const ENTREGAS = ["Retirada", "Motoboy", "Correios", "Transportadora", "Entrega local", "A combinar"] as const;
type Pagamento = (typeof PAGAMENTOS)[number];
type Entrega = (typeof ENTREGAS)[number];

function CarrinhoPage() {
  const { items, setQty, remove, clear } = useCart();
  const { profile, loading: loadingProfile } = useCurrentProfile();
  const { config, loading: loadingConfig } = useConfig();

  const [nome, setNome] = useState("");
  const [whats, setWhats] = useState("");
  const [pagamento, setPagamento] = useState<Pagamento>("PIX");
  const [entrega, setEntrega] = useState<Entrega>("Retirada");
  const [endereco, setEndereco] = useState("");
  const [obs, setObs] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  const total = linhas.reduce((s, l) => s + l.subtotal, 0);
  const empresaWa = (config.whatsapp_pedidos || "").replace(/\D/g, "");
  const exigeEndereco = entrega !== "Retirada";

  function finalizarWhatsApp() {
    if (items.length === 0) {
      toast.error("Seu carrinho está vazio.");
      return;
    }
    if (!nome.trim() || nome.trim().length < 2) {
      toast.error("Informe seu nome.");
      return;
    }
    if (!whats.trim() || whats.replace(/\D/g, "").length < 8) {
      toast.error("Informe um WhatsApp válido.");
      return;
    }
    if (exigeEndereco && endereco.trim().length < 5) {
      toast.error("Informe o endereço de entrega.");
      return;
    }
    if (!empresaWa) {
      toast.error("Número da empresa ainda não configurado. Avise o administrador.");
      return;
    }
    setSubmitting(true);

    const linhasMsg = linhas
      .map(
        (l, i) =>
          `${i + 1}. ${l.item.nome}${l.item.kind === "kit" ? " (kit)" : ""} — ${l.item.qty}x ${brl(l.unit)} = ${brl(l.subtotal)}${l.badge ? ` [${l.badge}]` : ""}`,
      )
      .join("\n");

    const tipoCliente =
      profile?.tipo_cliente === "b2b" && profile.status_aprovacao === "aprovado"
        ? `B2B Nível ${profile.nivel_b2b ?? "?"}`
        : profile?.tipo_cliente === "assinante"
          ? "Assinante"
          : "Varejo";

    const linhasFinais = [
      "*Novo pedido — Gama Sensações*",
      "",
      `*Cliente:* ${nome.trim()}`,
      `*WhatsApp:* ${whats.trim()}`,
      `*Tipo:* ${tipoCliente}`,
      profile?.empresa_nome ? `*Empresa:* ${profile.empresa_nome}` : null,
      "",
      "*Itens:*",
      linhasMsg,
      "",
      `*Total: ${brl(total)}*`,
      "",
      `*Pagamento:* ${pagamento}`,
      `*Entrega:* ${entrega}`,
      exigeEndereco ? `*Endereço:* ${endereco.trim()}` : null,
      obs.trim() ? `*Observações:* ${obs.trim()}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const url = `https://wa.me/${empresaWa}?text=${encodeURIComponent(linhasFinais)}`;
    window.open(url, "_blank", "noopener");
    toast.success("Pedido enviado! Finalize a conversa no WhatsApp.");
    setSubmitting(false);
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
            </div>

            {/* Checkout */}
            <aside className="space-y-6 lg:sticky lg:top-28 self-start border border-border p-6 bg-surface/30">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-foreground/60">Total</p>
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
              </Field>

              {exigeEndereco && (
                <Field label="Endereço completo">
                  <textarea
                    className="form-input min-h-[80px]"
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    placeholder="Rua, número, complemento, bairro, cidade — CEP"
                    maxLength={500}
                  />
                </Field>
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
