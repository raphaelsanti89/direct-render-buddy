import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Truck, RefreshCw, ShieldCheck, MessageCircle, PackageCheck, Clock } from "lucide-react";

export const Route = createFileRoute("/politica-de-trocas")({
  head: () => ({
    meta: [
      { title: "Política de Entrega e Trocas — Gama Sensações" },
      {
        name: "description",
        content:
          "Prazo de entrega, frete grátis acima de R$ 150, direito de arrependimento em 7 dias e trocas por defeito em 30 dias.",
      },
      { property: "og:title", content: "Política de Entrega e Trocas — Gama Sensações" },
      { property: "og:description", content: "Envios para todo o Brasil, frete grátis acima de R$ 150 e trocas conforme o CDC." },
    ],
    links: [{ rel: "canonical", href: "https://gamasensacoes.com.br/politica-de-trocas" }],
  }),
  component: PoliticaPage,
});

function PoliticaPage() {
  const secoes = [
    {
      icon: Truck,
      title: "Prazo de entrega",
      text: "Envios para todo o Brasil de 7 a 10 dias úteis, a contar da confirmação do pagamento. Você receberá o código de rastreio assim que o pedido for postado.",
    },
    {
      icon: Clock,
      title: "Prazo de processamento",
      text: "Pedidos confirmados até às 12h são processados no mesmo dia útil; após esse horário, ou em fins de semana e feriados, no próximo dia útil. O prazo de entrega começa a contar a partir da postagem.",
    },
    {
      icon: PackageCheck,
      title: "Frete grátis",
      text: "Frete grátis para compras acima de R$ 150,00.",
    },
    {
      icon: RefreshCw,
      title: "Trocas e devoluções — direito de arrependimento",
      text: "Conforme o Código de Defesa do Consumidor (art. 49), você tem até 7 dias corridos a partir do recebimento do produto para desistir da compra, sem necessidade de justificativa. O produto deve estar sem uso, com embalagem original e lacre intacto (quando aplicável). O valor pago, incluindo o frete, será integralmente reembolsado, e o custo de devolução do produto é por conta da loja.",
    },
    {
      icon: ShieldCheck,
      title: "Trocas e devoluções — defeito de fabricação",
      text: "Até 30 dias corridos do recebimento para solicitar troca ou reembolso, mediante análise.",
    },
    {
      icon: MessageCircle,
      title: "Como solicitar",
      text: "Entre em contato pelo WhatsApp informando o número do pedido e o motivo da devolução. Você receberá as instruções de envio.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F5F2EC] text-[#2C4A35]">
      <Navbar />
      <main className="pt-32 pb-24">
        <div className="container-editorial max-w-4xl">
          <header className="mb-14">
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#C8A96E] mb-4">— institucional</p>
            <h1 className="font-display text-4xl md:text-6xl leading-[1.05]">
              Política de Entrega<br />
              <em className="text-[#C8A96E] not-italic">e Trocas.</em>
            </h1>
            <p className="mt-6 max-w-2xl text-[#2C4A35]/70 leading-relaxed">
              Transparência em cada etapa: veja abaixo os prazos, condições de frete e como funcionam trocas e devoluções na Gama Sensações.
            </p>
          </header>

          <div className="grid gap-6 md:grid-cols-2">
            {secoes.map((s) => (
              <section key={s.title} className="bg-white border border-[#C8A96E]/30 p-8">
                <div className="w-11 h-11 rounded-full border border-[#C8A96E]/50 flex items-center justify-center text-[#C8A96E] mb-5">
                  <s.icon size={18} strokeWidth={1.5} />
                </div>
                <h2 className="font-display text-2xl leading-tight">{s.title}</h2>
                <p className="mt-4 text-sm leading-relaxed text-[#2C4A35]/80" style={{ fontFamily: "Inter, sans-serif" }}>
                  {s.text}
                </p>
              </section>
            ))}
          </div>

          <div className="mt-14 bg-white border border-[#C8A96E]/30 p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h3 className="font-display text-2xl">Acompanhamento</h3>
              <p className="mt-2 text-sm text-[#2C4A35]/75" style={{ fontFamily: "Inter, sans-serif" }}>
                Acompanhe o status do seu pedido a qualquer momento em Minha Conta.
              </p>
            </div>
            <Link
              to="/minha-conta"
              className="inline-flex items-center gap-2 bg-[#2C4A35] text-[#F5F2EC] px-6 py-3 text-xs uppercase tracking-[0.2em] hover:bg-[#C8A96E] hover:text-[#2C4A35] transition-colors"
            >
              Ir para Minha Conta
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
