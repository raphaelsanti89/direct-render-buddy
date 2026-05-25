import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowUpRight } from "lucide-react";

type Cat = {
  id: string;
  nome: string;
  slug: string;
  descricao: string | null;
  icone: string | null;
};

export const Route = createFileRoute("/categorias")({
  head: () => ({
    meta: [
      { title: "Categorias — Gama Sensações" },
      { name: "description", content: "Explore as famílias olfativas e as coleções da Gama Sensações." },
      { property: "og:title", content: "Categorias — Gama Sensações" },
      { property: "og:description", content: "Famílias olfativas e coleções sensoriais." },
    ],
  }),
  component: CategoriasPage,
});

function CategoriasPage() {
  const [items, setItems] = useState<Cat[]>([]);

  useEffect(() => {
    supabase
      .from("categorias")
      .select("id,nome,slug,descricao,icone")
      .eq("ativo", true)
      .order("ordem")
      .then(({ data }) => setItems((data as Cat[]) ?? []));
  }, []);

  return (
    <div className="min-h-screen bg-background pt-32 pb-24">
      <div className="container-editorial">
        <div className="max-w-2xl mb-16">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold mb-4">— famílias olfativas</p>
          <h1 className="font-display text-5xl md:text-6xl text-foreground">Categorias</h1>
          <p className="mt-6 text-muted-foreground">
            Cada coleção é um universo sensorial. Encontre a que conversa com sua memória.
          </p>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Em breve, novas categorias.</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
            {items.map((c) => (
              <Link
                key={c.id}
                to="/produtos"
                search={{ categoria: c.slug }}
                className="bg-background p-10 group hover:bg-surface transition-colors"
              >
                <div className="flex items-start justify-between mb-6">
                  <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                    /{c.slug}
                  </span>
                  <ArrowUpRight size={18} className="text-foreground/60 group-hover:text-gold transition-colors" />
                </div>
                <h2 className="font-display text-3xl text-foreground">{c.nome}</h2>
                {c.descricao && (
                  <p className="mt-4 text-sm text-muted-foreground line-clamp-3">{c.descricao}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
