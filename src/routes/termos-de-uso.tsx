import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import {
  FileCheck,
  Building2,
  UserCircle,
  ShoppingBag,
  Tag,
  Truck,
  Copyright,
  AlertTriangle,
  RefreshCw,
  MessageCircle,
} from "lucide-react";

export const Route = createFileRoute("/termos-de-uso")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — Gama Sensações" },
      {
        name: "description",
        content:
          "Regras de uso do site gamasensacoes.com.br: cadastro, pedidos, pagamento, entrega e responsabilidades.",
      },
      { property: "og:title", content: "Termos de Uso — Gama Sensações" },
      {
        property: "og:description",
        content:
          "Condições de uso, pedidos e responsabilidades ao navegar e comprar na Gama Sensações.",
      },
    ],
    links: [{ rel: "canonical", href: "https://gamasensacoes.com.br/termos-de-uso" }],
  }),
  component: TermosPage,
});

function TermosPage() {
  const secoes = [
    {
      icon: FileCheck,
      title: "1. Aceitação dos termos",
      body: (
        <>
          Ao acessar e utilizar o site gamasensacoes.com.br, você concorda com estes Termos
          de Uso.
        </>
      ),
    },
    {
      icon: Building2,
      title: "2. Sobre a Gama Sensações",
      body: (
        <>
          Somos uma distribuidora de aromas premium (R. Santiago Verdun de Jesus LTDA, nome
          fantasia Gama Sensações), atuando na curadoria e revenda de produtos de marcas
          selecionadas de perfumaria fina — não somos fabricantes dos produtos vendidos.
        </>
      ),
    },
    {
      icon: UserCircle,
      title: "3. Cadastro e uso da conta",
      body: (
        <>
          Para acompanhar pedidos em "Minha Conta", o acesso é feito pelo número de
          WhatsApp cadastrado. Você é responsável por manter seus dados de contato
          atualizados. Cadastros B2B e de assinatura passam por aprovação manual, que pode
          levar até 2 dias úteis.
        </>
      ),
    },
    {
      icon: ShoppingBag,
      title: "4. Pedidos e pagamento",
      body: (
        <>
          Pedidos podem ser finalizados pelo site (com confirmação via WhatsApp) ou
          diretamente pelo WhatsApp. Formas de pagamento aceitas: Pix, cartão (quando
          disponível), conforme indicado no checkout. O pedido é considerado confirmado
          após a confirmação do pagamento.
        </>
      ),
    },
    {
      icon: Tag,
      title: "5. Preços e disponibilidade",
      body: (
        <>
          Preços podem variar por perfil de cliente (varejo, assinante, B2B), conforme
          cadastro aprovado. Nos reservamos o direito de alterar preços e disponibilidade
          sem aviso prévio, exceto para pedidos já confirmados. Kits sensoriais têm
          composição sujeita a disponibilidade de estoque dos produtos que os compõem.
        </>
      ),
    },
    {
      icon: Truck,
      title: "6. Entrega, trocas e devoluções",
      body: (
        <>
          Consulte nossa{" "}
          <Link to="/politica-de-trocas" className="text-[#C8A96E] hover:underline">
            Política de Entrega e Trocas
          </Link>{" "}
          para prazos, condições de devolução e direito de arrependimento, conforme
          previsto no Código de Defesa do Consumidor.
        </>
      ),
    },
    {
      icon: Copyright,
      title: "7. Propriedade intelectual",
      body: (
        <>
          Todo o conteúdo do site (textos, imagens, identidade visual) pertence à Gama
          Sensações ou é usado sob licença de fornecedores parceiros, sendo proibida a
          reprodução sem autorização.
        </>
      ),
    },
    {
      icon: AlertTriangle,
      title: "8. Limitação de responsabilidade",
      body: (
        <>
          Não nos responsabilizamos por atrasos causados por transportadoras, greves, ou
          eventos fora do nosso controle. Reações alérgicas a fragrâncias são de
          responsabilidade do consumidor; recomendamos verificar a lista de ingredientes
          quando disponível.
        </>
      ),
    },
    {
      icon: RefreshCw,
      title: "9. Alterações destes termos",
      body: (
        <>
          Estes termos podem ser atualizados periodicamente. Última atualização: 17 de
          julho de 2026.
        </>
      ),
    },
    {
      icon: MessageCircle,
      title: "10. Contato",
      body: (
        <>
          Dúvidas podem ser enviadas para{" "}
          <a href="mailto:contato@gamasensacoes.com.br" className="text-[#C8A96E] hover:underline">
            contato@gamasensacoes.com.br
          </a>{" "}
          ou pelo WhatsApp.
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
              Termos<br />
              <em className="text-[#C8A96E] not-italic">de Uso.</em>
            </h1>
            <p className="mt-6 max-w-2xl text-[#2C4A35]/70 leading-relaxed">
              Regras que orientam a navegação, o cadastro e as compras no site da Gama
              Sensações.
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
              <h3 className="font-display text-2xl">Sobre seus dados</h3>
              <p
                className="mt-2 text-sm text-[#2C4A35]/75"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Veja como tratamos suas informações pessoais na nossa Política de
                Privacidade.
              </p>
            </div>
            <Link
              to="/politica-de-privacidade"
              className="inline-flex items-center gap-2 bg-[#2C4A35] text-[#F5F2EC] px-6 py-3 text-xs uppercase tracking-[0.2em] hover:bg-[#C8A96E] hover:text-[#2C4A35] transition-colors"
            >
              Política de Privacidade
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
