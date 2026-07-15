/**
 * Normaliza um número de telefone brasileiro para uso em links wa.me.
 * - Remove todos os caracteres não numéricos
 * - Se tiver 10 ou 11 dígitos (DDD + número), prefixa com 55
 * - Se já tiver 12 ou 13 dígitos (55 + DDD + número), usa como está
 * - Retorna string vazia se o número não for válido
 */
export function normalizeWhatsAppNumber(input: string | null | undefined): string {
  const digits = (input || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) return digits;
  // fallback: retorna dígitos como estão (números internacionais já com DDI)
  return digits;
}

export function buildWhatsAppLink(phone: string | null | undefined, message?: string): string {
  const number = normalizeWhatsAppNumber(phone);
  if (!number) return "";
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${number}${text}`;
}
