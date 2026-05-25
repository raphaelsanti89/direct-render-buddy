import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { slugify, brl } from "@/lib/slug";
import { toast } from "sonner";
import { Pencil, Trash2, Eye, EyeOff, Sparkles } from "lucide-react";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { Header, Empty, Field, FormActions, FormDrawer } from "./admin.categorias";

export const Route = createFileRoute("/admin/produtos")({
  head: () => ({ meta: [{ title: "Produtos — Admin" }] }),
  component: ProdutosAdmin,
});

type Cat = { id: string; nome: string };
type Prod = {
  id: string;
  nome: string;
  slug: string;
  descricao_curta: string | null;
  descricao: string | null;
  preco_custo: number | null;
  margem_varejo_pct: number | null;
  preco_varejo: number;
  preco_assinatura: number | null;
  preco_b2b_1: number | null;
  preco_b2b_2: number | null;
  preco_b2b_3: number | null;
  categoria_id: string | null;
  imagens: string[] | null;
  volume: string | null;
  intensidade: number | null;
  sensacao_transmitida: string | null;
  durabilidade_media: string | null;
  ativo: boolean | null;
  destaque: boolean | null;
  lancamento: boolean | null;
  mais_vendido: boolean | null;
};

const EMPTY: Partial<Prod> = {
  nome: "", slug: "", descricao_curta: "", descricao: "",
  preco_custo: null, margem_varejo_pct: 60,
  preco_varejo: 0, preco_assinatura: null,
  preco_b2b_1: null, preco_b2b_2: null, preco_b2b_3: null,
  categoria_id: null,
  imagens: [], volume: "", intensidade: 3, sensacao_transmitida: "",
  durabilidade_media: "", ativo: true, destaque: false, lancamento: false, mais_vendido: false,
};

// Descontos sugeridos (sobre o preço de varejo)
const DESC = { assinante: 0.13, b2b1: 0.15, b2b2: 0.20, b2b3: 0.25 };
const r2 = (n: number) => Math.round(n * 100) / 100;

function ProdutosAdmin() {
  const [items, setItems] = useState<Prod[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Prod> | null>(null);

  async function load() {
    setLoading(true);
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from("produtos").select("*").order("created_at", { ascending: false }),
      supabase.from("categorias").select("id,nome").order("nome"),
    ]);
    setItems((p as Prod[]) ?? []);
    setCats((c as Cat[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const payload = {
      nome: editing.nome?.trim() ?? "",
      slug: editing.slug?.trim() || slugify(editing.nome ?? ""),
      descricao_curta: editing.descricao_curta || null,
      descricao: editing.descricao || null,
      preco_varejo: Number(editing.preco_varejo ?? 0),
      preco_assinatura: editing.preco_assinatura ? Number(editing.preco_assinatura) : null,
      categoria_id: editing.categoria_id || null,
      imagens: editing.imagens ?? [],
      volume: editing.volume || null,
      intensidade: editing.intensidade ?? null,
      sensacao_transmitida: editing.sensacao_transmitida || null,
      durabilidade_media: editing.durabilidade_media || null,
      ativo: editing.ativo ?? true,
      destaque: editing.destaque ?? false,
      lancamento: editing.lancamento ?? false,
      mais_vendido: editing.mais_vendido ?? false,
    };
    if (!payload.nome) return toast.error("Nome é obrigatório");
    if (!payload.preco_varejo) return toast.error("Preço é obrigatório");

    if (editing.id) {
      const { error } = await supabase.from("produtos").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Produto atualizado");
    } else {
      const { error } = await supabase.from("produtos").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Produto criado");
    }
    setEditing(null);
    load();
  }

  async function del(p: Prod) {
    if (!confirm(`Excluir "${p.nome}"?`)) return;
    const { error } = await supabase.from("produtos").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Produto excluído");
    load();
  }

  return (
    <>
      <Header title="Produtos" subtitle={`${items.length} cadastrado(s)`} onNew={() => setEditing({ ...EMPTY })} />

      <div className="bg-background border border-border">
        {loading ? <Empty text="Carregando…" /> : items.length === 0 ? (
          <Empty text="Nenhum produto ainda." />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
            {items.map((p) => (
              <ProductCard key={p.id} p={p} catName={cats.find((c) => c.id === p.categoria_id)?.nome} onEdit={() => setEditing(p)} onDelete={() => del(p)} />
            ))}
          </div>
        )}
      </div>

      {editing && (
        <FormDrawer title={editing.id ? "Editar produto" : "Novo produto"} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="space-y-5">
            <Field label="Nome *">
              <input
                className="form-input"
                value={editing.nome ?? ""}
                onChange={(e) => setEditing({ ...editing, nome: e.target.value, slug: editing.id ? editing.slug : slugify(e.target.value) })}
                required
              />
            </Field>
            <Field label="Slug">
              <input
                className="form-input font-mono text-sm"
                value={editing.slug ?? ""}
                onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })}
              />
            </Field>
            <Field label="Categoria">
              <select
                className="form-input"
                value={editing.categoria_id ?? ""}
                onChange={(e) => setEditing({ ...editing, categoria_id: e.target.value || null })}
              >
                <option value="">— sem categoria —</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </Field>
            <Field label="Descrição curta">
              <input
                className="form-input"
                value={editing.descricao_curta ?? ""}
                onChange={(e) => setEditing({ ...editing, descricao_curta: e.target.value })}
                placeholder="Frase de até 1 linha que aparece nos cards"
              />
            </Field>
            <Field label="Descrição completa">
              <textarea
                className="form-input min-h-[140px]"
                value={editing.descricao ?? ""}
                onChange={(e) => setEditing({ ...editing, descricao: e.target.value })}
              />
            </Field>

            <Field label="Imagens">
              <ImageUpload
                value={editing.imagens ?? []}
                onChange={(urls) => setEditing({ ...editing, imagens: urls })}
                folder="produtos"
                max={6}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Preço varejo (R$) *">
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={editing.preco_varejo ?? 0}
                  onChange={(e) => setEditing({ ...editing, preco_varejo: Number(e.target.value) })}
                  required
                />
              </Field>
              <Field label="Preço assinatura (R$)">
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={editing.preco_assinatura ?? ""}
                  onChange={(e) => setEditing({ ...editing, preco_assinatura: e.target.value ? Number(e.target.value) : null })}
                />
              </Field>
              <Field label="Volume">
                <input
                  className="form-input"
                  value={editing.volume ?? ""}
                  onChange={(e) => setEditing({ ...editing, volume: e.target.value })}
                  placeholder="ex.: 250 ml"
                />
              </Field>
              <Field label="Durabilidade">
                <input
                  className="form-input"
                  value={editing.durabilidade_media ?? ""}
                  onChange={(e) => setEditing({ ...editing, durabilidade_media: e.target.value })}
                  placeholder="ex.: 30 dias"
                />
              </Field>
              <Field label="Sensação transmitida">
                <input
                  className="form-input"
                  value={editing.sensacao_transmitida ?? ""}
                  onChange={(e) => setEditing({ ...editing, sensacao_transmitida: e.target.value })}
                  placeholder="ex.: Acolhimento"
                />
              </Field>
              <Field label="Intensidade (1–5)">
                <input
                  type="number"
                  min={1}
                  max={5}
                  className="form-input"
                  value={editing.intensidade ?? 3}
                  onChange={(e) => setEditing({ ...editing, intensidade: Number(e.target.value) })}
                />
              </Field>
            </div>

            <Field label="Sinalizações">
              <div className="grid grid-cols-2 gap-3">
                {([
                  ["ativo", "Ativo (visível no site)"],
                  ["destaque", "Destaque"],
                  ["lancamento", "Lançamento"],
                  ["mais_vendido", "Mais vendido"],
                ] as const).map(([k, lbl]) => (
                  <label key={k} className="flex items-center gap-3 form-input cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!(editing as any)[k]}
                      onChange={(e) => setEditing({ ...editing, [k]: e.target.checked })}
                    />
                    <span className="text-sm">{lbl}</span>
                  </label>
                ))}
              </div>
            </Field>

            <FormActions onCancel={() => setEditing(null)} saveLabel={editing.id ? "Salvar" : "Criar"} />
          </form>
        </FormDrawer>
      )}
    </>
  );
}

function ProductCard({ p, catName, onEdit, onDelete }: { p: Prod; catName?: string; onEdit: () => void; onDelete: () => void }) {
  const img = p.imagens?.[0];
  return (
    <div className="bg-background flex flex-col">
      <div className="aspect-[4/5] bg-surface relative overflow-hidden">
        {img ? <img src={img} alt={p.nome} className="w-full h-full object-cover" /> : (
          <div className="w-full h-full flex items-center justify-center font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            sem imagem
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-1">
          {p.destaque && <Badge>Destaque</Badge>}
          {p.lancamento && <Badge>Novo</Badge>}
        </div>
        {!p.ativo && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-foreground">oculto</span>
          </div>
        )}
      </div>
      <div className="p-5 flex-1 flex flex-col">
        {catName && (
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-gold mb-2">{catName}</p>
        )}
        <h3 className="font-display text-xl text-foreground">{p.nome}</h3>
        {p.descricao_curta && (
          <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{p.descricao_curta}</p>
        )}
        <div className="mt-auto pt-4 flex items-center justify-between">
          <span className="font-display text-lg text-foreground">{brl(p.preco_varejo)}</span>
          <div className="flex gap-2">
            <button onClick={onEdit} className="p-2 text-foreground/60 hover:text-gold" aria-label="Editar">
              <Pencil size={15} />
            </button>
            <button onClick={onDelete} className="p-2 text-foreground/60 hover:text-destructive" aria-label="Excluir">
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[9px] uppercase tracking-[0.2em] bg-foreground text-background px-2 py-1 inline-flex items-center gap-1">
      <Sparkles size={10} /> {children}
    </span>
  );
}
