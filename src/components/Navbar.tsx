import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X, ShoppingBag } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useConfig } from "@/hooks/useConfig";


const links = [
  { to: "/", label: "Início" },
  { to: "/categorias", label: "Categorias" },
  { to: "/produtos", label: "Produtos" },
  { to: "/kits", label: "Kits" },
  { to: "/cadastro-b2b", label: "B2B" },
  { to: "/cadastro-assinatura", label: "Assinatura" },
] as const;

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { count } = useCart();
  const { config } = useConfig();
  const logo = config.logo_url_clara || "";


  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-40 transition-all duration-500 ${
        scrolled
          ? "bg-background/85 backdrop-blur-md border-b border-border/60"
          : "bg-transparent"
      }`}
    >
      <div className="container-editorial flex items-center justify-between h-20">
        <Link to="/" className="group flex items-center" aria-label="Gama Sensações">
          {logo ? (
            <img src={logo} alt="Gama Sensações" className="h-10 w-auto object-contain" />
          ) : (
            <span className="font-display text-2xl tracking-wide text-foreground">
              Gama <span className="text-gold italic">Sensações</span>
            </span>
          )}
        </Link>


        <nav className="hidden lg:flex items-center gap-10">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to as string}
              className="text-[13px] uppercase tracking-[0.18em] text-foreground/75 hover:text-gold transition-colors"
              activeProps={{ className: "text-gold" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/carrinho"
            aria-label="Carrinho"
            className="relative p-2 text-foreground/80 hover:text-gold transition-colors"
          >
            <ShoppingBag size={20} />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-gold text-background text-[10px] font-mono flex items-center justify-center">
                {count}
              </span>
            )}
          </Link>
          <button
            className="lg:hidden p-2 text-foreground"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden bg-background border-t border-border animate-fade-in">
          <nav className="container-editorial py-6 flex flex-col gap-4">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to as string}
                onClick={() => setOpen(false)}
                className="text-sm uppercase tracking-[0.18em] text-foreground/80 py-2"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
