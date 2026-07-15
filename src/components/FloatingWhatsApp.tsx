import { MessageCircle } from "lucide-react";
import { useConfig } from "@/hooks/useConfig";
import { buildWhatsAppLink } from "@/lib/whatsapp";

export function FloatingWhatsApp() {
  const { config } = useConfig();
  const message =
    config.mensagem_whatsapp ||
    "Olá! Vim pelo site e gostaria de mais informações sobre os produtos da Gama Sensações 🌿";
  const href = buildWhatsAppLink(config.whatsapp_pedidos, message);
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Falar no WhatsApp"
      className="fixed bottom-6 right-6 z-50 group"
    >
      <span className="absolute inset-0 rounded-full bg-whatsapp/40 animate-ping" />
      <span className="relative flex items-center justify-center w-14 h-14 rounded-full bg-whatsapp text-white shadow-elevated hover:scale-105 transition-transform">
        <MessageCircle size={24} />
      </span>
    </a>
  );
}
