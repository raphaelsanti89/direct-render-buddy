import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Search, Plus, Trash2, UserPlus, Loader2 } from "lucide-react";
import { brl } from "@/lib/slug";
import { PEDIDO_STATUS, STATUS_ADMIN_LABEL, type PedidoStatus } from "@/lib/pedidos";

export const Route = createFileRoute("/admin/pedidos/novo")({
  head: () => ({ meta: [{ title: "Novo pedido manual — Admin" }] }),
  component: NovoPedidoManualPage,
});

type Cliente = {
  id: string;
  nome: string | null;
  email: string | null;
  whatsapp: string | null;
  tipo_cliente: string | null;
  nivel_b2b: number | null;
  status_aprovacao: string | null;
};

type Produto = {
  id: string;
  nome: string;
  imagens: string[] | null;
  preco_varejo: number;
  preco_assinatura: number | null;
  preco_b2b_1: number | null;
  preco_b2b_2: number | null;
  preco_b2b_3: number | null;
};

type ItemLinha = {
  produto: Produto;
  quantidade: number;
  preco_unitario: number;
};

const PERFIS = [
  { value: "varejo", label: "Varejo" },
  { value: "assinante", label: "Assinante" },
  { value: "b2b_1", label: "B2B Nível 1" },
  { value: "b2b_2", label: "B2B Nível 2" },
  { value: "b2b_3", label: "B2B Nível 3" },
] as const;

function precoDoPerfil(p: Produto, perfil: string): number {
  switch (perfil) {
    case "assinante": return Number(p.preco_assinatura ?? p.preco_varejo);
    case "b2b_1": return Number(p.preco_b2b_1 ?? p.preco_varejo);
    case "b2b_2": return Number(p.preco_b2b_2 ?? p.preco_varejo);
    case "b2b_3": return Number(p.preco_b2b_3 ?? p.preco_varejo);
    default: return Number(p.preco_varejo);
  }
}

function NovoPedidoManualPage() {
  const navigate = useNavigate();

  // Cliente
  const [buscaCliente, setBuscaCliente] = useState("");
  const [resultados, setResultados] = useState<Cliente[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [novoCliente, setNovoCliente] = useState({ nome: "", email: "", whatsapp: "" });
  const [modoNovoCliente, setModoNovoCliente] = useState(false);

  // Perfil de preço
  const [perfil, setPerfil] = useState<string>("varejo");

  // Produtos
  const [buscaProduto, setBuscaProduto] = useState("");
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregandoProdutos, setCarregandoProdutos] = useState(false);
  const [itens, setItens] = useState<ItemLinha[]>([]);

  // Pedido meta
  const [status, setStatus] = useState<PedidoStatus>("confirmado");
  const [formaPagamento, setFormaPagamento] = useState("");
  const [formaEntrega, setFormaEntrega] = useState("");
  const [endereco, setEndereco] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [desconto, setDesconto] = useState(0);
  const [salvando, setSalvando] = useState(false);

  // Sugestão inicial de perfil quando um cliente é selecionado
  useEffect(() => {
    if (!cliente) return;
    if (cliente.tipo_cliente === "b2b" && cliente.status_aprovacao === "aprovado") {
      setPerfil(`b2b_${cliente.nivel_b2b ?? 1}`);
    } else if (cliente.tipo_cliente === "assinante") {
      setPerfil("assinante");
    } else {
      setPerfil("varejo");
    }
  }, [cliente]);

  // Recalcula preços dos itens quando perfil muda
  useEffect(() => {
    setItens((prev) => prev.map((l) => ({ ...l, preco_unitario: precoDoPerfil(l.produto, perfil) })));
  }, [perfil]);

  async function buscarClientes() {
    const q = buscaCliente.trim();
    if (q.length < 2) { setResultados([]); return; }
    setBuscando(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, nome, email, whatsapp, tipo_cliente, nivel_b2b, status_aprovacao")
      .or(`email.ilike.%${q}%,whatsapp.ilike.%${q}%,nome.ilike.%${q}%`)
      .limit(10);
    setResultados((data as Cliente[]) ?? []);
    setBuscando(false);
  }

  async function buscarProdutos() {
    setCarregandoProdutos(true);
    let query = supabase
      .from("produtos")
      .select("id,nome,imagens,preco_varejo,preco_assinatura,preco_b2b_1,preco_b2b_2,preco_b2b_3")
      .eq("ativo", true)
      .order("nome")
      .limit(30);
    const q = buscaProduto.trim();
    if (q) query = query.ilike("nome", `%${q}%`);
    const { data } = await query;
    setProdutos((data as Produto[]) ?? []);
    setCarregandoProdutos(false);
  }

  useEffect(() => { buscarProdutos(); /* eslint-disable-next-line */ }, []);

  function adicionarProduto(p: Produto) {
    setItens((prev) => {
      const existe = prev.find((l) => l.produto.id === p.id);
      if (existe) {
        return prev.map((l) => l.produto.id === p.id ? { ...l, quantidade: l.quantidade + 1 } : l);
      }
      return [...prev, { produto: p, quantidade: 1, preco_unitario: precoDoPerfil(p, perfil) }];
    });
  }

  function removerItem(id: string) {
    setItens((prev) => prev.filter((l) => l.produto.id !== id));
  }

  function atualizarQtd(id: string, qtd: number) {
    if (qtd <= 0) return removerItem(id);
    setItens((prev) => prev.map((l) => l.produto.id === id ? { ...l, quantidade: qtd } : l));
  }

  function atualizarPreco(id: string, preco: number) {
    setItens((prev) => prev.map((l) => l.produto.id === id ? { ...l, preco_unitario: preco } : l));
  }

  const subtotal = useMemo(() => itens.reduce((s, l) => s + l.preco_unitario * l.quantidade, 0), [itens]);
  const total = Math.max(0, subtotal - desconto);

  async function salvar() {
    // Validação
    const nome = (cliente?.nome || novoCliente.nome).trim();
    const email = (cliente?.email || novoCliente.email).trim().toLowerCase();
    const telefone = (cliente?.whatsapp || novoCliente.whatsapp).trim();
    if (nome.length < 2) return toast.error("Informe o nome do cliente.");
    if (telefone.length < 6) return toast.error("Informe o telefone/WhatsApp.");
    if (itens.length === 0) return toast.error("Adicione ao menos um produto.");

    setSalvando(true);
    try {
      let cliente_id: string | null = cliente?.id ?? null;

      // Cria profile "fantasma" (sem auth) quando não há cliente existente e há email.
      // Não é obrigatório: o histórico em /minha-conta funciona por email.
      // Aqui apenas registramos o pedido sem cliente_id quando não há cadastro.

      const { data: pedidoCriado, error: errPedido } = await supabase
        .from("pedidos")
        .insert({
          cliente_id,
          nome_cliente: nome,
          telefone,
          email: email || null,
          perfil_cliente: perfil,
          origem_pedido: "manual",
          canal_contato: "direto",
          forma_pagamento: formaPagamento || null,
          forma_entrega: formaEntrega || null,
          endereco: endereco || null,
          observacoes: observacoes || null,
          subtotal,
          desconto,
          total,
          status,
        })
        .select("id, numero_pedido")
        .single();

      if (errPedido || !pedidoCriado) throw errPedido || new Error("Falha ao criar pedido.");

      const itensPayload = itens.map((l) => ({
        pedido_id: pedidoCriado.id,
        kind: "produto" as const,
        produto_id: l.produto.id,
        nome_produto: l.produto.nome,
        imagem_snapshot: l.produto.imagens?.[0] ?? null,
        quantidade: l.quantidade,
        preco_unitario: l.preco_unitario,
        subtotal: l.preco_unitario * l.quantidade,
      }));

      const { error: errItens } = await supabase.from("pedido_itens").insert(itensPayload);
      if (errItens) throw errItens;

      toast.success(`Pedido ${pedidoCriado.numero_pedido} criado!`);
      navigate({ to: "/admin/pedidos/$id", params: { id: pedidoCriado.id } });
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Erro ao salvar pedido.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div>
      <Link to="/admin/pedidos" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-foreground/60 hover:text-gold mb-6">
        <ArrowLeft size={12} /> Voltar
      </Link>

      <div className="mb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold mb-2">— operação</p>
        <h1 className="font-display text-4xl text-foreground">Novo pedido manual</h1>
        <p className="text-sm text-muted-foreground mt-2">Registre vendas recebidas por WhatsApp, presencial ou outros canais fora do site.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* CLIENTE */}
          <section className="bg-background border border-border p-6">
            <h2 className="font-display text-xl mb-4">1. Cliente</h2>

            {cliente ? (
              <div className="flex items-start justify-between gap-4 bg-surface p-4 border border-border">
                <div>
                  <div className="font-medium text-foreground">{cliente.nome}</div>
                  <div className="text-xs text-muted-foreground">{cliente.email} · {cliente.whatsapp}</div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-gold mt-2">
                    {cliente.tipo_cliente ?? "varejo"}{cliente.nivel_b2b ? ` · nível ${cliente.nivel_b2b}` : ""}
                  </div>
                </div>
                <button onClick={() => setCliente(null)} className="text-xs uppercase tracking-[0.18em] text-foreground/60 hover:text-destructive">
                  Trocar
                </button>
              </div>
            ) : modoNovoCliente ? (
              <div className="space-y-3">
                <input className="form-input w-full" placeholder="Nome completo" value={novoCliente.nome} onChange={(e) => setNovoCliente({ ...novoCliente, nome: e.target.value })} />
                <input className="form-input w-full" type="email" placeholder="E-mail" value={novoCliente.email} onChange={(e) => setNovoCliente({ ...novoCliente, email: e.target.value })} />
                <input className="form-input w-full" placeholder="WhatsApp / telefone" value={novoCliente.whatsapp} onChange={(e) => setNovoCliente({ ...novoCliente, whatsapp: e.target.value })} />
                <p className="text-xs text-muted-foreground">
                  Dica: se o cliente se cadastrar depois com este e-mail, o pedido aparecerá automaticamente no histórico dele em /minha-conta.
                </p>
                <button onClick={() => setModoNovoCliente(false)} className="text-xs uppercase tracking-[0.18em] text-foreground/60 hover:text-gold">
                  ← Buscar cliente existente
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      className="form-input pl-9 w-full"
                      placeholder="Buscar por e-mail, telefone ou nome…"
                      value={buscaCliente}
                      onChange={(e) => setBuscaCliente(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), buscarClientes())}
                    />
                  </div>
                  <button onClick={buscarClientes} className="border border-border bg-background px-4 text-xs uppercase tracking-[0.18em] hover:border-gold hover:text-gold">
                    Buscar
                  </button>
                </div>

                {buscando && <p className="text-xs text-muted-foreground">Buscando…</p>}
                {resultados.length > 0 && (
                  <div className="border border-border divide-y divide-border max-h-64 overflow-auto">
                    {resultados.map((c) => (
                      <button key={c.id} onClick={() => setCliente(c)} className="w-full text-left p-3 hover:bg-surface">
                        <div className="text-sm text-foreground">{c.nome ?? "(sem nome)"}</div>
                        <div className="text-xs text-muted-foreground">{c.email} · {c.whatsapp}</div>
                      </button>
                    ))}
                  </div>
                )}
                {buscaCliente && !buscando && resultados.length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhum cliente encontrado.</p>
                )}

                <button onClick={() => setModoNovoCliente(true)} className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-gold hover:text-foreground">
                  <UserPlus size={14} /> Cadastrar novo cliente
                </button>
              </div>
            )}
          </section>

          {/* PRODUTOS */}
          <section className="bg-background border border-border p-6">
            <h2 className="font-display text-xl mb-4">2. Produtos</h2>

            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  className="form-input pl-9 w-full"
                  placeholder="Buscar produto…"
                  value={buscaProduto}
                  onChange={(e) => setBuscaProduto(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), buscarProdutos())}
                />
              </div>
              <button onClick={buscarProdutos} className="border border-border bg-background px-4 text-xs uppercase tracking-[0.18em] hover:border-gold hover:text-gold">
                Buscar
              </button>
            </div>

            {carregandoProdutos ? (
              <p className="text-xs text-muted-foreground">Carregando…</p>
            ) : (
              <div className="border border-border max-h-72 overflow-auto divide-y divide-border">
                {produtos.map((p) => (
                  <button key={p.id} onClick={() => adicionarProduto(p)} className="w-full flex items-center justify-between p-3 hover:bg-surface text-left">
                    <div className="flex items-center gap-3">
                      {p.imagens?.[0] && <img src={p.imagens[0]} alt="" className="w-10 h-10 object-cover" />}
                      <div>
                        <div className="text-sm text-foreground">{p.nome}</div>
                        <div className="text-xs text-muted-foreground">{brl(precoDoPerfil(p, perfil))} · {perfil}</div>
                      </div>
                    </div>
                    <Plus size={14} className="text-gold" />
                  </button>
                ))}
                {produtos.length === 0 && <p className="p-3 text-xs text-muted-foreground">Nenhum produto.</p>}
              </div>
            )}

            {itens.length > 0 && (
              <div className="mt-6 border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-surface text-left text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    <tr>
                      <th className="p-3">Produto</th>
                      <th className="p-3 w-24">Qtd</th>
                      <th className="p-3 w-32">Preço unit.</th>
                      <th className="p-3 w-28 text-right">Subtotal</th>
                      <th className="p-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((l) => (
                      <tr key={l.produto.id} className="border-t border-border">
                        <td className="p-3">{l.produto.nome}</td>
                        <td className="p-3">
                          <input type="number" min={1} value={l.quantidade}
                            onChange={(e) => atualizarQtd(l.produto.id, Number(e.target.value))}
                            className="form-input w-20" />
                        </td>
                        <td className="p-3">
                          <input type="number" step="0.01" min={0} value={l.preco_unitario}
                            onChange={(e) => atualizarPreco(l.produto.id, Number(e.target.value))}
                            className="form-input w-28" />
                        </td>
                        <td className="p-3 text-right font-medium">{brl(l.preco_unitario * l.quantidade)}</td>
                        <td className="p-3">
                          <button onClick={() => removerItem(l.produto.id)} className="text-foreground/50 hover:text-destructive">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* DETALHES */}
          <section className="bg-background border border-border p-6">
            <h2 className="font-display text-xl mb-4">3. Detalhes do pedido</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Forma de pagamento</span>
                <input className="form-input w-full mt-1" placeholder="Ex.: Pix, cartão…" value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)} />
              </label>
              <label className="block">
                <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Forma de entrega</span>
                <input className="form-input w-full mt-1" placeholder="Ex.: Retirada, Correios…" value={formaEntrega} onChange={(e) => setFormaEntrega(e.target.value)} />
              </label>
              <label className="block md:col-span-2">
                <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Endereço</span>
                <input className="form-input w-full mt-1" value={endereco} onChange={(e) => setEndereco(e.target.value)} />
              </label>
              <label className="block md:col-span-2">
                <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Observações</span>
                <textarea className="form-input w-full mt-1 min-h-24" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
              </label>
            </div>
          </section>
        </div>

        {/* RESUMO */}
        <aside className="space-y-4">
          <div className="bg-background border border-border p-6 space-y-4 lg:sticky lg:top-28">
            <h2 className="font-display text-xl">Resumo</h2>

            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Perfil de preço</span>
              <select className="form-input w-full mt-1" value={perfil} onChange={(e) => setPerfil(e.target.value)}>
                {PERFIS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </label>

            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Status inicial</span>
              <select className="form-input w-full mt-1" value={status} onChange={(e) => setStatus(e.target.value as PedidoStatus)}>
                {PEDIDO_STATUS.map((s) => <option key={s} value={s}>{STATUS_ADMIN_LABEL[s]}</option>)}
              </select>
            </label>

            <div className="border-t border-border pt-4 space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span><span>{brl(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Desconto</span>
                <input type="number" step="0.01" min={0} value={desconto}
                  onChange={(e) => setDesconto(Number(e.target.value))}
                  className="form-input w-24 text-right" />
              </div>
              <div className="flex justify-between text-lg font-medium text-foreground pt-2 border-t border-border">
                <span>Total</span><span>{brl(total)}</span>
              </div>
            </div>

            <button
              onClick={salvar}
              disabled={salvando}
              className="w-full inline-flex items-center justify-center gap-2 bg-foreground text-background px-6 py-3 text-xs uppercase tracking-[0.18em] hover:bg-gold transition-colors disabled:opacity-50"
            >
              {salvando ? <><Loader2 size={14} className="animate-spin" /> Salvando…</> : "Registrar pedido"}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
