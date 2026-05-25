import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { slugify, brl } from "@/lib/slug";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { Header, Empty, Field, FormActions, FormDrawer } from "./admin.categorias";

export const Route = createFileRoute("/admin/kits")({
  head: () => ({ meta: [{ title: "Kits — Admin" }] }),
  component: KitsAdmin,
});

type Kit = {
  id: string;
  nome: string;
  slug: string;
  descricao_curta: string | null;
  descricao: string | null;
  preco_varejo: number;
  preco_original: number;
  preco_assinatura: number | null;
  percentual_economia: number | null;
  imagens: string[] | null;
  ativo: boolean | null;
  destaque: boolean | null;
  disponivel_assinatura: boolean | null;
  disponivel_b2b: boolean | null;
};

const EMPTY: Partial<Kit> = {
  nome: "", slug: "", descricao_curta: "", descricao: "",
  preco_varejo: 0, preco_original: 0, preco_assinatura: null,
  percentual_economia: null, imagens: [], ativo: true, destaque: false,
  disponivel_assinatura: true, disponivel_b2b: true,
};

function KitsAdmin() {
  const [items, setItems] = useState<Kit[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Kit> | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("kits").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data as Kit[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const preco = Number(editing.preco_varejo ?? 0);
    const original = Number(editing.preco_original ?? preco);
    const econ = original > preco ? Math.round(((original - preco) / original) * 100) : 0;
    const payload = {
      nome: editing.nome?.trim() ?? "",
      slug: editing.slug?.trim() || slugify(editing.nome ?? ""),
      descricao_curta: editing.descricao_curta || null,
      descricao: editing.descricao || null,
      preco_varejo: preco,
      preco_original: original,
      preco_assinatura: editing.preco_assinatura ? Number(editing.preco_assinatura) : null,
      percentual_economia: econ,
      imagens: editing.imagens ?? [],
      ativo: editing.ativo ?? true,
      destaque: editing.destaque ?? false,
      disponivel_assinatura: editing.disponivel_assinatura ?? true,
      disponivel_b2b: editing.disponivel_b2b ?? true,
    };
    if (!payload.nome) return toast.error("Nome é obrigatório");
    if (!payload.preco_varejo) return toast.error("Preço é obrigatório");

    if (editing.id) {
      const { error } = await supabase.from("kits").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Kit atualizado");
    } else {
      const { error } = await supabase.from("kits").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Kit criado");
    }
    setEditing(null);
    load();
  }

  async function del(k: Kit) {
    if (!confirm(`Excluir "${k.nome}"?`)) return;
    const { error } = await supabase.from("kits").delete().eq("id", k.id);
    if (error) return toast.error(error.message);
    toast.success("Kit excluído");
    load();
  }

  return (
    <>
      <Header title="Kits" subtitle={`${items.length} cadastrado(s)`} onNew={() => setEditing({ ...EMPTY })} />

      <div className="bg-background border border-border">
        {loading ? <Empty text="Carregando…" /> : items.length === 0 ? (
          <Empty text="Nenhum kit ainda." />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
            {items.map((k) => (
              <div key={k.id} className="bg-background flex flex-col">
                <div className="aspect-[4/5] bg-surface relative overflow-hidden">
                  {k.imagens?.[0] ? (
                    <img src={k.imagens[0]} alt={k.nome} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                      sem imagem
                    </div>
                  )}
                  {k.percentual_economia ? (
                    <span className="absolute top-3 right-3 bg-gold text-background font-mono text-[10px] uppercase tracking-[0.2em] px-2 py-1">
                      -{k.percentual_economia}%
                    </span>
                  ) : null}
                  {!k.ativo && (
                    <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                      <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-foreground">oculto</span>
                    </div>
                  )}
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-display text-xl text-foreground">{k.nome}</h3>
                  {k.descricao_curta && <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{k.descricao_curta}</p>}
                  <div className="mt-auto pt-4 flex items-center justify-between">
                    <div>
                      <span className="font-display text-lg text-foreground">{brl(k.preco_varejo)}</span>
                      {k.preco_original > k.preco_varejo && (
                        <span className="ml-2 text-xs text-muted-foreground line-through">{brl(k.preco_original)}</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditing(k)} className="p-2 text-foreground/60 hover:text-gold"><Pencil size={15} /></button>
                      <button onClick={() => del(k)} className="p-2 text-foreground/60 hover:text-destructive"><Trash2 size={15} /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <FormDrawer title={editing.id ? "Editar kit" : "Novo kit"} onClose={() => setEditing(null)}>
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
            <Field label="Descrição curta">
              <input
                className="form-input"
                value={editing.descricao_curta ?? ""}
                onChange={(e) => setEditing({ ...editing, descricao_curta: e.target.value })}
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
                folder="kits"
                max={6}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Preço varejo (R$) *">
                <input
                  type="number" step="0.01"
                  className="form-input"
                  value={editing.preco_varejo ?? 0}
                  onChange={(e) => setEditing({ ...editing, preco_varejo: Number(e.target.value) })}
                  required
                />
              </Field>
              <Field label="Preço original (R$)">
                <input
                  type="number" step="0.01"
                  className="form-input"
                  value={editing.preco_original ?? 0}
                  onChange={(e) => setEditing({ ...editing, preco_original: Number(e.target.value) })}
                  placeholder="Para mostrar economia"
                />
              </Field>
              <Field label="Preço assinatura (R$)">
                <input
                  type="number" step="0.01"
                  className="form-input"
                  value={editing.preco_assinatura ?? ""}
                  onChange={(e) => setEditing({ ...editing, preco_assinatura: e.target.value ? Number(e.target.value) : null })}
                />
              </Field>
            </div>
            <Field label="Sinalizações">
              <div className="grid grid-cols-2 gap-3">
                {([
                  ["ativo", "Ativo"],
                  ["destaque", "Destaque"],
                  ["disponivel_assinatura", "Disponível p/ assinatura"],
                  ["disponivel_b2b", "Disponível p/ B2B"],
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
