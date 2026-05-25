import { supabase } from "@/integrations/supabase/client";
import type { CartItem } from "@/contexts/CartContext";

export const PEDIDO_STATUS = [
  "novo",
  "em_atendimento",
  "confirmado",
  "em_separacao",
  "enviado",
  "entregue",
  "cancelado",
] as const;
export type PedidoStatus = (typeof PEDIDO_STATUS)[number];

export const PEDIDO_CANAL = [
  "whatsapp",
  "instagram",
  "site",
  "direto",
  "revendedor",
] as const;
export type PedidoCanal = (typeof PEDIDO_CANAL)[number];

// Steps visíveis ao cliente (sem "confirmado", sem "cancelado")
export const PUBLIC_STEPS: PedidoStatus[] = [
  "novo",
  "em_atendimento",
  "em_separacao",
  "enviado",
  "entregue",
];

export const STATUS_LABEL: Record<PedidoStatus, string> = {
  novo: "Pedido recebido",
  em_atendimento: "Em atendimento",
  confirmado: "Confirmado",
  em_separacao: "Em separação",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

export const STATUS_ADMIN_LABEL: Record<PedidoStatus, string> = {
  novo: "Novo",
  em_atendimento: "Em atendimento",
  confirmado: "Confirmado",
  em_separacao: "Em separação",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

export function statusBadgeClasses(s: PedidoStatus): string {
  switch (s) {
    case "novo":
      return "bg-gold/15 text-gold";
    case "em_atendimento":
      return "bg-blue-500/15 text-blue-700 dark:text-blue-400";
    case "confirmado":
      return "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400";
    case "em_separacao":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
    case "enviado":
      return "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400";
    case "entregue":
      return "bg-green-500/15 text-green-700 dark:text-green-400";
    case "cancelado":
      return "bg-red-500/15 text-red-700 dark:text-red-400";
  }
}

type CreatePedidoInput = {
  cliente_id: string | null;
  nome_cliente: string;
  telefone: string;
  email: string | null;
  perfil_cliente: string;
  forma_pagamento: string;
  forma_entrega: string;
  endereco: string | null;
  observacoes: string | null;
  canal_contato: PedidoCanal;
  subtotal: number;
  desconto: number;
  total: number;
  itens: Array<{
    item: CartItem;
    preco_unitario: number;
    subtotal: number;
  }>;
};

export type CreatedPedido = {
  id: string;
  numero_pedido: string;
};

/**
 * Cria o pedido + itens. Faz snapshot de marca/categoria/imagem.
 */
export async function criarPedido(input: CreatePedidoInput): Promise<CreatedPedido> {
  // 1) Buscar snapshots de produtos
  const produtoIds = input.itens
    .filter((i) => i.item.kind === "produto")
    .map((i) => i.item.id);

  const snapshots = new Map<
    string,
    { categoria_snapshot: string | null; imagem_snapshot: string | null }
  >();

  if (produtoIds.length > 0) {
    const { data: produtos } = await supabase
      .from("produtos")
      .select("id, imagens, categoria_id, categorias:categoria_id(nome)")
      .in("id", produtoIds);
    (produtos ?? []).forEach((p: any) => {
      snapshots.set(p.id, {
        categoria_snapshot: p.categorias?.nome ?? null,
        imagem_snapshot: p.imagens?.[0] ?? null,
      });
    });
  }

  // 2) Inserir pedido
  const { data: pedido, error } = await supabase
    .from("pedidos")
    .insert({
      numero_pedido: "", // trigger gera
      cliente_id: input.cliente_id,
      nome_cliente: input.nome_cliente,
      telefone: input.telefone,
      email: input.email,
      perfil_cliente: input.perfil_cliente,
      origem_pedido: "site",
      canal_contato: input.canal_contato,
      forma_pagamento: input.forma_pagamento,
      forma_entrega: input.forma_entrega,
      endereco: input.endereco,
      observacoes: input.observacoes,
      subtotal: input.subtotal,
      desconto: input.desconto,
      total: input.total,
      status: "novo",
    } as any)
    .select("id, numero_pedido")
    .single();

  if (error || !pedido) {
    throw new Error(error?.message ?? "Falha ao registrar pedido.");
  }

  // 3) Inserir itens
  const itens = input.itens.map((row) => {
    const snap = snapshots.get(row.item.id);
    return {
      pedido_id: pedido.id,
      kind: row.item.kind,
      produto_id: row.item.id,
      nome_produto: row.item.nome,
      marca_snapshot: null as string | null,
      categoria_snapshot: snap?.categoria_snapshot ?? null,
      imagem_snapshot: snap?.imagem_snapshot ?? row.item.imagem ?? null,
      quantidade: row.item.qty,
      preco_unitario: row.preco_unitario,
      subtotal: row.subtotal,
    };
  });

  const { error: itensErr } = await supabase.from("pedido_itens").insert(itens as any);
  if (itensErr) {
    throw new Error(itensErr.message);
  }

  return { id: pedido.id, numero_pedido: pedido.numero_pedido };
}

export function perfilLabel(p: {
  tipo_cliente?: string | null;
  nivel_b2b?: number | null;
  status_aprovacao?: string | null;
} | null): string {
  if (!p) return "varejo";
  if (p.tipo_cliente === "b2b" && p.status_aprovacao === "aprovado")
    return `b2b_${p.nivel_b2b ?? 1}`;
  if (p.tipo_cliente === "assinante") return "assinante";
  return "varejo";
}
