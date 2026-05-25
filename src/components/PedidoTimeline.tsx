import { Check } from "lucide-react";
import { PUBLIC_STEPS, STATUS_LABEL, type PedidoStatus } from "@/lib/pedidos";

export function PedidoTimeline({ status }: { status: PedidoStatus }) {
  if (status === "cancelado") {
    return (
      <div className="border border-red-500/30 bg-red-500/5 p-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-red-700 dark:text-red-400 mb-2">
          — pedido cancelado
        </p>
        <p className="text-foreground/80 text-sm leading-relaxed">
          Este pedido foi cancelado. Entre em contato pelo WhatsApp se precisar de mais informações.
        </p>
      </div>
    );
  }

  // "confirmado" é tratado como "em_atendimento" para o cliente
  const effective: PedidoStatus = status === "confirmado" ? "em_atendimento" : status;
  const currentIdx = PUBLIC_STEPS.indexOf(effective);

  return (
    <ol className="space-y-0">
      {PUBLIC_STEPS.map((step, i) => {
        const reached = i <= currentIdx;
        const isCurrent = i === currentIdx;
        const isLast = i === PUBLIC_STEPS.length - 1;
        return (
          <li key={step} className="relative flex gap-4 pb-6 last:pb-0">
            {!isLast && (
              <span
                aria-hidden
                className={`absolute left-3 top-7 bottom-0 w-px ${
                  i < currentIdx ? "bg-gold" : "bg-border"
                }`}
              />
            )}
            <span
              className={`relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                reached
                  ? "bg-gold border-gold text-foreground"
                  : "bg-background border-border text-muted-foreground"
              }`}
            >
              {reached ? <Check size={12} strokeWidth={3} /> : <span className="h-1.5 w-1.5 rounded-full bg-border" />}
            </span>
            <div className="pt-0.5">
              <p
                className={`text-sm ${
                  isCurrent
                    ? "font-medium text-foreground"
                    : reached
                      ? "text-foreground/80"
                      : "text-muted-foreground"
                }`}
              >
                {STATUS_LABEL[step]}
              </p>
              {isCurrent && (
                <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.25em] text-gold">
                  status atual
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
