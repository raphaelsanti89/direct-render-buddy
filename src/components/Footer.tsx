import { Link } from "@tanstack/react-router";
import { Instagram, Facebook, Mail, MapPin, Clock } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-surface-dark text-background pt-24 pb-10">
      <div className="container-editorial grid gap-14 md:grid-cols-12">
        <div className="md:col-span-4 space-y-6">
          <div className="font-display text-3xl tracking-wide">
            Gama <span className="text-gold italic">Sensações</span>
          </div>
          <p className="text-sm text-background/65 leading-relaxed max-w-xs">
            Aroma é memória. Sensação é presença. Transformamos ambientes em experiências sensoriais.
          </p>
          <div className="flex gap-4">
            <a
              href="#"
              aria-label="Instagram"
              className="w-10 h-10 rounded-full border border-background/20 flex items-center justify-center hover:border-gold hover:text-gold transition-colors"
            >
              <Instagram size={16} />
            </a>
            <a
              href="#"
              aria-label="Facebook"
              className="w-10 h-10 rounded-full border border-background/20 flex items-center justify-center hover:border-gold hover:text-gold transition-colors"
            >
              <Facebook size={16} />
            </a>
          </div>
        </div>

        <div className="md:col-span-3 space-y-4">
          <h4 className="text-xs uppercase tracking-[0.22em] text-gold">Navegação</h4>
          <ul className="space-y-3 text-sm text-background/70">
            <li><Link to="/" className="hover:text-gold transition-colors">Início</Link></li>
            <li><Link to="/produtos" className="hover:text-gold transition-colors">Produtos</Link></li>
            <li><Link to="/kits" className="hover:text-gold transition-colors">Kits Sensoriais</Link></li>
            <li><Link to="/assinatura" className="hover:text-gold transition-colors">Assinatura</Link></li>
            <li><Link to="/categorias" className="hover:text-gold transition-colors">Categorias</Link></li>
          </ul>
        </div>

        <div className="md:col-span-5 space-y-4">
          <h4 className="text-xs uppercase tracking-[0.22em] text-gold">Atendimento</h4>
          <ul className="space-y-3 text-sm text-background/70">
            <li className="flex items-start gap-3">
              <Mail size={15} className="mt-0.5 text-gold/80" />
              <span>contato@gamasensacoes.com.br</span>
            </li>
            <li className="flex items-start gap-3">
              <Clock size={15} className="mt-0.5 text-gold/80" />
              <span>Seg–Sex: 9h às 18h | Sáb: 9h às 13h</span>
            </li>
            <li className="flex items-start gap-3">
              <MapPin size={15} className="mt-0.5 text-gold/80" />
              <span>Brasil — entregamos para todo território nacional</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="container-editorial mt-16 pt-8 border-t border-background/10 flex flex-col md:flex-row justify-between gap-4 text-xs text-background/50">
        <p>© {new Date().getFullYear()} Gama Sensações — Todos os direitos reservados.</p>
        <div className="flex gap-6">
          <a href="#" className="hover:text-gold">Política de Privacidade</a>
          <a href="#" className="hover:text-gold">Termos de Uso</a>
        </div>
      </div>
    </footer>
  );
}
