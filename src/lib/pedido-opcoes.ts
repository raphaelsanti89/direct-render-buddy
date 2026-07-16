// Opções fixas para dropdowns de forma de pagamento e entrega.
// Pedidos antigos podem ter valores livres — nesses casos exibimos o valor bruto
// e adicionamos como opção extra no <select> para não sobrescrever o dado salvo.

export const FORMAS_PAGAMENTO = [
  "Pix",
  "Cartão de crédito",
  "Cartão de débito",
  "Dinheiro",
  "Transferência",
] as const;

export const FORMAS_ENTREGA = [
  "Retirada",
  "Correios/PAC",
  "Entrega própria (POA)",
  "Transportadora",
] as const;

export function opcoesComValorAtual(base: readonly string[], atual: string | null | undefined): string[] {
  const v = (atual ?? "").trim();
  if (!v) return [...base];
  if (base.some((o) => o.toLowerCase() === v.toLowerCase())) return [...base];
  return [v, ...base];
}
