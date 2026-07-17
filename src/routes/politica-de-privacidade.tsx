import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import {
  ShieldCheck,
  Database,
  Target,
  Share2,
  Clock,
  UserCheck,
  Lock,
  RefreshCw,
} from "lucide-react";

export const Route = createFileRoute("/politica-de-privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — Gama Sensações" },
      {
        name: "description",
        content:
          "Como a Gama Sensações coleta, usa, compartilha e protege seus dados pessoais, conforme a LGPD.",
      },
      { property: "og:title", content: "Política de Privacidade — Gama Sensações" },
      {
        property: "og:description",
        content:
          "Transparência sobre o tratamento de dados pessoais na Gama Sensações, conforme a LGPD.",
      },
    ],
    links: [{ rel: "canonical", href: "https://gamasensacoes.com.br/politica-de-privacidade" }],
  }),
  component: PrivacidadePage,
});

function PrivacidadePage() {
  const secoes = [
    {
      icon: ShieldCheck,
      title: "1. Quem somos",
      body: (
        <>
          A Gama Sensações (R. Santiago Verdun de Jesus LTDA) é responsável pelo tratamento
          dos dados pessoais coletados através do site gamasensacoes.com.br e dos canais de
          atendimento (WhatsApp, Instagram, e-mail).
          <br />
          <br />
          Contato:{" "}
          <a href="mailto:contato@gamasensacoes.com.br" className="text-[#C8A96E] hover:underline">
            contato@gamasensacoes.com.br
          </a>
        </>
      ),
    },
    {
      icon: Database,
      title: "2. Quais dados coletamos",
      body: (
        <>
          Dados de identificação (nome, telefone/WhatsApp, e-mail); dados de entrega (endereço
          completo, CEP); dados de pedido (itens, valores, forma de pagamento e entrega,
          observações); dados de navegação (páginas visitadas, cookies técnicos); dados
          empresariais de clientes B2B (nome da empresa, CNPJ).
        </>
      ),
    },
    {
      icon: Target,
      title: "3. Para que usamos seus dados",
      body: (
        <>
          Processar e entregar pedidos; comunicar sobre status de pedido (WhatsApp, e-mail);
          aprovar cadastro de cliente B2B ou assinante; enviar novidades e ofertas para
          inscritos na newsletter; cumprir obrigações legais e fiscais.
        </>
      ),
    },
    {
      icon: Share2,
      title: "4. Com quem compartilhamos",
      body: (
        <>
          Transportadoras (Correios, Jadlog, Loggi, via SuperFrete), para viabilizar a
          entrega; fornecedores, apenas quando necessário para atendimento B2B com contrato
          de aromatização. Não vendemos nem alugamos dados para terceiros para fins de
          marketing.
        </>
      ),
    },
    {
      icon: Clock,
      title: "5. Por quanto tempo guardamos seus dados",
      body: (
        <>
          Mantemos seus dados pelo tempo necessário para cumprir a finalidade do tratamento
          e obrigações legais (fiscais/contábeis), podendo ser solicitada a exclusão a
          qualquer momento, respeitados os prazos legais de guarda de documentos fiscais.
        </>
      ),
    },
    {
      icon: UserCheck,
      title: "6. Seus direitos (LGPD)",
      body: (
        <>
          Você pode solicitar a qualquer momento: confirmação de tratamento, acesso aos
          dados, correção de dados incompletos, exclusão dos dados (respeitadas obrigações
          legais), e informação sobre compartilhamento. Para exercer esses direitos, use o
          WhatsApp ou{" "}
          <a href="mailto:contato@gamasensacoes.com.br" className="text-[#C8A96E] hover:underline">
            contato@gamasensacoes.com.br
          </a>
          .
        </>
      ),
    },
    {
      icon: Lock,
      title: "7. Segurança",
      body: (
        <>
          Adotamos medidas técnicas para proteger seus dados contra acesso não autorizado,
          incluindo controle de acesso e criptografia nos sistemas que utilizamos.
        </>
      ),
    },
    {
      icon: RefreshCw,
      title: "8. Alterações desta política",
      body: (
        <>
          Esta política pode ser atualizada periodicamente. Última atualização: 17 de julho
          de 2026.
        </>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#F5F2EC] text-[#2C4A35]">
      <Navbar />
      <main className="pt-32 pb-24">
        <div className="container-editorial max-w-4xl">
          <header className="mb-14">
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#C8A96E] mb-4">
              — institucional
            </p>
            <h1 className="font-display text-4xl md:text-6xl leading-[1.05]">
              Política de<br />
              <em className="text-[#C8A96E] not-italic">Privacidade.</em>
            </h1>
            <p className="mt-6 max-w-2xl text-[#2C4A35]/70 leading-relaxed">
              Transparência sobre como coletamos, usamos e protegemos seus dados pessoais,
              em conformidade com a Lei Geral de Proteção de Dados (LGPD).
            </p>
          </header>

          <div className="grid gap-6 md:grid-cols-2">
            {secoes.map((s) => (
              <section key={s.title} className="bg-white border border-[#C8A96E]/30 p-8">
                <div className="w-11 h-11 rounded-full border border-[#C8A96E]/50 flex items-center justify-center text-[#C8A96E] mb-5">
                  <s.icon size={18} strokeWidth={1.5} />
                </div>
                <h2 className="font-display text-2xl leading-tight">{s.title}</h2>
                <p
                  className="mt-4 text-sm leading-relaxed text-[#2C4A35]/80"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  {s.body}
                </p>
              </section>
            ))}
          </div>

          <div className="mt-14 bg-white border border-[#C8A96E]/30 p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h3 className="font-display text-2xl">Dúvidas sobre seus dados?</h3>
              <p
                className="mt-2 text-sm text-[#2C4A35]/75"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Fale com a gente pelo WhatsApp ou envie um e-mail — respondemos com prazer.
              </p>
            </div>
            <Link
              to="/termos-de-uso"
              className="inline-flex items-center gap-2 bg-[#2C4A35] text-[#F5F2EC] px-6 py-3 text-xs uppercase tracking-[0.2em] hover:bg-[#C8A96E] hover:text-[#2C4A35] transition-colors"
            >
              Ver Termos de Uso
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
