import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, Leaf, Heart, Truck, Building2 } from "lucide-react";
import { useConfig } from "@/hooks/useConfig";
import heroImg from "@/assets/hero-aroma.jpg";
import sobreImg from "@/assets/sobre-marca.jpg";
import expImg from "@/assets/experiencia-sensorial.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gama Sensações — Transformamos aromas em experiências" },
      {
        name: "description",
        content:
          "Aromatizadores, home spray, velas e difusores premium. Marketing sensorial e ambientação para casa, hotelaria e empresas.",
      },
      { property: "og:title", content: "Gama Sensações — Transformamos aromas em experiências" },
      { property: "og:description", content: "Marketing sensorial premium e catálogo exclusivo de aromas." },
      { property: "og:url", content: "https://gamasensacoes.com.br/" },
    ],
    links: [{ rel: "canonical", href: "https://gamasensacoes.com.br/" }],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <div className="bg-background">
      <Hero />
      <SobreMarca />
      <ExperienciaSensorial />
      <ComoFunciona />
      <Depoimentos />
      <RedesSociais />
      <Newsletter />
    </div>
  );
}

function Hero() {
  const { config } = useConfig();
  const waNumber = (config.whatsapp_pedidos || "").replace(/\D/g, "");
  const waMessage = encodeURIComponent(
    config.mensagem_whatsapp ||
      "Olá! Vim pelo site e gostaria de mais informações sobre os produtos da Gama Sensações 🌿",
  );
  const waHref = waNumber ? `https://wa.me/${waNumber}?text=${waMessage}` : "#";
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      <img
        src={heroImg}
        alt="Difusor aromático e vela em ambiente premium"
        className="absolute inset-0 w-full h-full object-cover"
        width={1920}
        height={1080}
      />
      <div className="absolute inset-0 bg-gradient-overlay" />
      <div className="absolute inset-0 bg-surface-dark/40" />

      <div className="container-editorial relative z-10 py-32">
        <div className="max-w-3xl animate-fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full border border-gold/40 backdrop-blur-sm bg-background/5">
            <Sparkles size={14} className="text-gold" />
            <span className="text-[11px] uppercase tracking-[0.25em] text-gold font-medium">
              Marketing Sensorial Premium
            </span>
          </div>

          <h1 className="font-display text-5xl md:text-7xl lg:text-[88px] leading-[1.02] text-background font-light text-balance">
            Transformamos<br />
            aromas em <em className="text-gold not-italic font-normal">experiências.</em>
          </h1>

          <p className="mt-8 text-base md:text-lg text-background/80 max-w-xl leading-relaxed font-light">
            Curadoria de aromas premium para escritórios, hotéis e empresas
            que entendem o ambiente como parte da experiência. Distribuímos
            marcas selecionadas, com atendimento próximo e entrega para todo
            o Brasil.
          </p>

          <div className="mt-12 flex flex-wrap gap-4">
            <Link
              to="/produtos"
              className="group inline-flex items-center gap-3 bg-gold text-foreground px-8 py-4 text-xs uppercase tracking-[0.2em] font-medium hover:bg-gold-light transition-all duration-500 shadow-gold"
            >
              Conhecer Produtos
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#"
              className="inline-flex items-center gap-3 border border-background/30 text-background px-8 py-4 text-xs uppercase tracking-[0.2em] font-medium hover:bg-background hover:text-foreground transition-all duration-500"
            >
              Falar no WhatsApp
            </a>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-background/60 animate-shimmer">
        <span className="text-[10px] uppercase tracking-[0.3em]">role</span>
        <div className="w-px h-12 bg-background/40" />
      </div>
    </section>
  );
}

function SobreMarca() {
  const diferenciais = [
    { icon: Building2, title: "Foco B2B", text: "Escritórios, hotéis, clínicas e ambientes corporativos" },
    { icon: Leaf, title: "Marcas Selecionadas", text: "Curadoria de fornecedores premium de perfumaria fina" },
    { icon: Heart, title: "Atendimento Consultivo", text: "Indicação personalizada para cada ambiente" },
    { icon: Truck, title: "Entrega Brasil", text: "Logística e embalagem premium para todo o país" },
  ];
  return (
    <section className="py-32 md:py-40 bg-background">
      <div className="container-editorial grid md:grid-cols-2 gap-16 lg:gap-24 items-center">
        <div className="order-2 md:order-1">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold mb-6">
            — sobre a marca
          </p>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl leading-[1.05] text-foreground text-balance">
            Aroma é memória.<br />
            <em className="text-gold not-italic">Sensação é presença.</em>
          </h2>
          <p className="mt-8 text-foreground/70 leading-relaxed max-w-md">
            A Gama Sensações é uma distribuidora de aromas premium. Selecionamos
            marcas e fornecedores de perfumaria fina para levar marketing
            sensorial a hotéis, escritórios, clínicas e empresas que entendem
            o aroma como assinatura.
          </p>

          <div className="mt-12 grid sm:grid-cols-2 gap-x-8 gap-y-10">
            {diferenciais.map((d) => (
              <div key={d.title} className="flex gap-4">
                <div className="shrink-0 w-11 h-11 rounded-full border border-gold/40 flex items-center justify-center text-gold">
                  <d.icon size={18} strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-display text-lg text-foreground">{d.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{d.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="order-1 md:order-2 relative">
          <div className="aspect-[4/5] overflow-hidden">
            <img
              src={sobreImg}
              alt="Composição de aromas premium para ambientes corporativos"
              loading="lazy"
              width={1024}
              height={1280}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute -bottom-6 -left-6 hidden md:block bg-gold text-foreground px-8 py-6 max-w-[240px]">
            <p className="font-display text-2xl leading-tight">
              Curadoria premium para o seu ambiente.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ExperienciaSensorial() {
  const cards = [
    {
      tag: "01",
      title: "Memória Olfativa",
      text: "O olfato é o sentido mais ligado à memória. Crie a sua assinatura.",
    },
    {
      tag: "02",
      title: "Transformação de Ambientes",
      text: "Do living ao quarto, cada aroma redefine como o espaço é vivido.",
    },
    {
      tag: "03",
      title: "Marketing Sensorial",
      text: "Para hotéis, lojas e clínicas — uma identidade que se respira.",
    },
  ];
  return (
    <section className="relative py-32 md:py-40 bg-surface-dark text-background overflow-hidden">
      <div className="absolute inset-0 opacity-30">
        <img
          src={expImg}
          alt=""
          loading="lazy"
          className="w-full h-full object-cover"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-surface-dark via-surface-dark/80 to-surface-dark" />
      </div>

      <div className="container-editorial relative">
        <div className="max-w-2xl mb-20">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold mb-6">
            — experiência sensorial
          </p>
          <h2 className="font-display text-4xl md:text-6xl leading-[1.05] font-light text-balance">
            Mais que um aroma.<br />
            Uma <em className="text-gold not-italic">presença.</em>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-px bg-background/10">
          {cards.map((c) => (
            <div key={c.tag} className="bg-surface-dark p-10 md:p-12 hover:bg-foreground/40 transition-colors duration-700 group">
              <span className="font-mono text-xs text-gold tracking-widest">{c.tag}</span>
              <h3 className="mt-8 font-display text-3xl text-background">{c.title}</h3>
              <div className="w-12 h-px bg-gold my-6 group-hover:w-20 transition-all duration-500" />
              <p className="text-sm text-background/65 leading-relaxed">{c.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <a
            href="#"
            className="inline-flex items-center gap-3 text-background border-b border-gold pb-2 text-xs uppercase tracking-[0.2em] hover:text-gold transition-colors"
          >
            Conversar pelo WhatsApp
            <ArrowRight size={14} />
          </a>
        </div>
      </div>
    </section>
  );
}

function ComoFunciona() {
  const steps = [
    { n: "01", title: "Explore", text: "Navegue pelo catálogo e descubra aromas" },
    { n: "02", title: "Monte o carrinho", text: "Escolha produtos e quantidades" },
    { n: "03", title: "Escolha pagamento", text: "Pix, cartão ou boleto à sua escolha" },
    { n: "04", title: "Finalize no WhatsApp", text: "Conversa direta e atenciosa" },
  ];
  return (
    <section className="py-32 md:py-40 bg-background">
      <div className="container-editorial">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold mb-6">— como funciona</p>
          <h2 className="font-display text-4xl md:text-5xl leading-[1.05] text-foreground">
            Quatro passos para transformar o seu ambiente.
          </h2>
        </div>

        <div className="grid md:grid-cols-4 gap-12 md:gap-8">
          {steps.map((s, i) => (
            <div key={s.n} className="relative">
              <div className="font-display text-7xl text-gold/30 leading-none">{s.n}</div>
              <h3 className="mt-4 font-display text-2xl text-foreground">{s.title}</h3>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{s.text}</p>
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 -right-4 w-8 h-px bg-gold/40" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Depoimentos() {
  const items = [
    { name: "Marina Silva", city: "São Paulo, SP", text: "O aroma transformou completamente a sensação do meu home office. Voltei a amar trabalhar em casa." },
    { name: "Renato Castro", city: "Curitiba, PR", text: "Atendimento impecável. Os difusores duram muito mais que outros que já experimentei." },
    { name: "Hotel Boutique Aurora", city: "Florianópolis, SC", text: "Criamos uma assinatura olfativa que nossos hóspedes pedem para levar para casa." },
  ];
  return (
    <section className="py-32 md:py-40 bg-surface">
      <div className="container-editorial">
        <div className="text-center mb-20">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold mb-6">— quem sente</p>
          <h2 className="font-display text-4xl md:text-5xl text-foreground">
            Histórias <em className="text-gold not-italic">sentidas.</em>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {items.map((t) => (
            <figure key={t.name} className="bg-background p-10 shadow-soft">
              <div className="text-gold font-display text-5xl leading-none">"</div>
              <blockquote className="mt-4 text-foreground/80 leading-relaxed font-light italic">
                {t.text}
              </blockquote>
              <figcaption className="mt-8 pt-6 border-t border-border">
                <div className="font-display text-lg text-foreground">{t.name}</div>
                <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground mt-1">
                  {t.city}
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function RedesSociais() {
  return (
    <section className="py-32 bg-background">
      <div className="container-editorial text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold mb-6">— acompanhe</p>
        <h2 className="font-display text-4xl md:text-5xl text-foreground mb-12">
          Siga a Gama Sensações
        </h2>
        <div className="flex flex-wrap justify-center gap-4">
          <a
            href="#"
            className="inline-flex items-center gap-3 px-8 py-4 border border-foreground/15 hover:border-gold hover:text-gold transition-colors text-xs uppercase tracking-[0.2em]"
          >
            Instagram
          </a>
          <a
            href="#"
            className="inline-flex items-center gap-3 px-8 py-4 border border-foreground/15 hover:border-gold hover:text-gold transition-colors text-xs uppercase tracking-[0.2em]"
          >
            Facebook
          </a>
        </div>
      </div>
    </section>
  );
}

function Newsletter() {
  return (
    <section className="bg-surface-dark text-background py-24">
      <div className="container-editorial max-w-3xl text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold mb-6">— newsletter</p>
        <h2 className="font-display text-4xl md:text-5xl mb-6">
          Receba lançamentos e <em className="text-gold not-italic">curadorias.</em>
        </h2>
        <p className="text-background/65 max-w-xl mx-auto mb-10">
          Aromas em primeira mão, edições especiais e descontos exclusivos para assinantes.
        </p>

        <form
          onSubmit={(e) => e.preventDefault()}
          className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto"
        >
          <input
            type="email"
            placeholder="Seu melhor e-mail"
            className="flex-1 bg-transparent border border-background/25 px-5 py-4 text-sm text-background placeholder:text-background/40 focus:border-gold outline-none transition-colors"
          />
          <button className="bg-gold text-foreground px-8 py-4 text-xs uppercase tracking-[0.2em] hover:bg-gold-light transition-colors">
            Inscrever-se
          </button>
        </form>
      </div>
    </section>
  );
}
