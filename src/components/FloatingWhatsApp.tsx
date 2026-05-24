import { MessageCircle } from "lucide-react";

export function FloatingWhatsApp() {
  // Number is configured in admin panel; fallback empty -> hidden
  const number = ""; // TODO: read from configuracoes_gerais
  const message = encodeURIComponent(
    "Olá! Vim pelo site e gostaria de mais informações sobre os produtos da Gama Sensações 🌿",
  );
  const href = number ? `https://wa.me/${number}?text=${message}` : "#";

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
