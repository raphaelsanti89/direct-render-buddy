import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Validação de CNPJ — só formato/tamanho, não dígito verificador
const cnpjRegex = /^\d{14}$|^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;

const b2bSchema = z.object({
  empresa_nome: z.string().trim().min(2).max(255),
  cnpj: z.string().trim().regex(cnpjRegex, { message: "CNPJ inválido" }),
  whatsapp: z.string().trim().min(8).max(20),
});

const assinaturaSchema = z.object({
  whatsapp: z.string().trim().min(8).max(20),
});

/**
 * Solicita conta B2B: marca o perfil do usuário logado como tipo_cliente=b2b,
 * status_aprovacao=pendente. Aprovação manual feita pelo admin.
 * Usa supabaseAdmin porque o trigger bloqueia o próprio usuário de alterar
 * campos sensíveis (intencional).
 */
export const requestB2BAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => b2bSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // Bloqueia se já é B2B (qualquer status)
    const { data: atual } = await supabaseAdmin
      .from("profiles")
      .select("tipo_cliente,status_aprovacao")
      .eq("id", userId)
      .maybeSingle();

    if (atual?.tipo_cliente === "b2b") {
      throw new Error(
        atual.status_aprovacao === "aprovado"
          ? "Sua conta já é B2B aprovada."
          : "Já existe uma solicitação B2B para este usuário.",
      );
    }

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        tipo_cliente: "b2b",
        status_aprovacao: "pendente",
        empresa_nome: data.empresa_nome,
        cnpj: data.cnpj,
        whatsapp: data.whatsapp,
      })
      .eq("id", userId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Solicita conta de Assinante: marca o perfil como tipo_cliente=assinante.
 * Sem aprovação por enquanto (cobrança será na próxima fase).
 */
export const requestAssinatura = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => assinaturaSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: atual } = await supabaseAdmin
      .from("profiles")
      .select("tipo_cliente")
      .eq("id", userId)
      .maybeSingle();

    if (atual?.tipo_cliente === "b2b") {
      throw new Error(
        "Sua conta é B2B e não pode virar assinatura ao mesmo tempo.",
      );
    }
    if (atual?.tipo_cliente === "assinante") {
      throw new Error("Sua conta já é assinante.");
    }

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        tipo_cliente: "assinante",
        whatsapp: data.whatsapp,
      })
      .eq("id", userId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- ADMIN ----------

const adminApproveSchema = z.object({
  profile_id: z.string().uuid(),
  nivel_b2b: z.number().int().min(1).max(3),
  observacoes_admin: z.string().max(2000).optional(),
});

const adminRejectSchema = z.object({
  profile_id: z.string().uuid(),
  observacoes_admin: z.string().max(2000).optional(),
});

const adminResetSchema = z.object({
  profile_id: z.string().uuid(),
});

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Acesso negado.");
}

export const adminApproveB2B = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => adminApproveSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        tipo_cliente: "b2b",
        status_aprovacao: "aprovado",
        nivel_b2b: data.nivel_b2b,
        observacoes_admin: data.observacoes_admin ?? null,
      })
      .eq("id", data.profile_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminRejectB2B = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => adminRejectSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        status_aprovacao: "rejeitado",
        nivel_b2b: null,
        observacoes_admin: data.observacoes_admin ?? null,
      })
      .eq("id", data.profile_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminResetCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => adminResetSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        tipo_cliente: "varejo",
        status_aprovacao: null,
        nivel_b2b: null,
      })
      .eq("id", data.profile_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
