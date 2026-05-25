import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/slug";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/admin/categorias")({
  head: () => ({ meta: [{ title: "Categorias — Admin" }] }),
  component: CategoriasAdmin,
});

type Cat = {
  id: string;
  nome: string;
  slug: string;
  descricao: string | null;
  ordem: number | null;
  ativo: boolean | null;
};

function CategoriasAdmin() {
  const [items, setItems] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Cat> | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("categorias")
      .select("*")
      .order("ordem", { ascending: true })
      .order("nome", { ascending: true });
    if (error) toast.error(error.message);
    setItems((data as Cat[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const payload = {
      nome: editing.nome?.trim() ?? "",
      slug: (editing.slug?.trim() || slugify(editing.nome ?? "")),
      descricao: editing.descricao ?? null,
      ordem: editing.ordem ?? 0,
      ativo: editing.ativo ?? true,
    };
    if (!payload.nome || !payload.slug) {
      toast.error("Nome é obrigatório");
      return;
    }
    if (editing.id) {
      const { error } = await supabase.from("categorias").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Categoria atualizada");
    } else {
      const { error } = await supabase.from("categorias").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Categoria criada");
    }
    setEditing(null);
    load();
  }

  async function del(id: string, nome: string) {
    if (!confirm(`Excluir "${nome}"?`)) return;
    const { error } = await supabase.from("categorias").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Categoria excluída");
    load();
  }

  return (
    <>
      <Header
        title="Categorias"
        subtitle={`${items.length} cadastrada(s)`}
        onNew={() => setEditing({ nome: "", slug: "", descricao: "", ordem: items.length, ativo: true })}
      />

      <div className="bg-background border border-border">
        {loading ? (
          <Empty text="Carregando…" />
        ) : items.length === 0 ? (
          <Empty text="Nenhuma categoria ainda. Crie a primeira." />
        ) : (
          <div className="divide-y divide-border">
            {items.map((c) => (
              <div key={c.id} className="flex items-center gap-4 p-5">
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground w-8">
                  {String(c.ordem ?? 0).padStart(2, "0")}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-display text-xl text-foreground">{c.nome}</h3>
                    {!c.ativo && (
                      <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground bg-surface px-2 py-0.5">
                        oculta
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-1">
                    /{c.slug}
                  </p>
                </div>
                <button
                  onClick={() => setEditing(c)}
                  className="p-2 text-foreground/60 hover:text-gold transition-colors"
                  aria-label="Editar"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => del(c.id, c.nome)}
                  className="p-2 text-foreground/60 hover:text-destructive transition-colors"
                  aria-label="Excluir"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <FormDrawer title={editing.id ? "Editar categoria" : "Nova categoria"} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="space-y-5">
            <Field label="Nome *">
              <input
                className="form-input"
                value={editing.nome ?? ""}
                onChange={(e) => setEditing({ ...editing, nome: e.target.value, slug: editing.id ? editing.slug : slugify(e.target.value) })}
                required
              />
            </Field>
            <Field label="Slug (URL)">
              <input
                className="form-input font-mono text-sm"
                value={editing.slug ?? ""}
                onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })}
              />
            </Field>
            <Field label="Descrição">
              <textarea
                className="form-input min-h-[100px]"
                value={editing.descricao ?? ""}
                onChange={(e) => setEditing({ ...editing, descricao: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Ordem">
                <input
                  type="number"
                  className="form-input"
                  value={editing.ordem ?? 0}
                  onChange={(e) => setEditing({ ...editing, ordem: Number(e.target.value) })}
                />
              </Field>
              <Field label="Visibilidade">
                <button
                  type="button"
                  onClick={() => setEditing({ ...editing, ativo: !editing.ativo })}
                  className="form-input flex items-center justify-between"
                >
                  <span className="text-sm">{editing.ativo ? "Ativa" : "Oculta"}</span>
                  {editing.ativo ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              </Field>
            </div>
            <FormActions onCancel={() => setEditing(null)} saveLabel={editing.id ? "Salvar" : "Criar"} />
          </form>
        </FormDrawer>
      )}
    </>
  );
}

export function Header({ title, subtitle, onNew }: { title: string; subtitle?: string; onNew: () => void }) {
  return (
    <div className="flex items-end justify-between mb-10">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold mb-3">— catálogo</p>
        <h1 className="font-display text-5xl text-foreground">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      <button
        onClick={onNew}
        className="inline-flex items-center gap-2 bg-foreground text-background px-6 py-3 text-xs uppercase tracking-[0.18em] hover:bg-gold transition-colors"
      >
        <Plus size={14} /> Novo
      </button>
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return <div className="p-16 text-center text-sm text-muted-foreground">{text}</div>;
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">
        {label}
      </span>
      {children}
    </label>
  );
}

export function FormActions({ onCancel, saveLabel = "Salvar" }: { onCancel: () => void; saveLabel?: string }) {
  return (
    <div className="flex items-center gap-3 pt-4 border-t border-border">
      <button
        type="submit"
        className="bg-foreground text-background px-6 py-3 text-xs uppercase tracking-[0.18em] hover:bg-gold transition-colors"
      >
        {saveLabel}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="px-6 py-3 text-xs uppercase tracking-[0.18em] text-foreground/70 hover:text-foreground"
      >
        Cancelar
      </button>
    </div>
  );
}

export function FormDrawer({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-foreground/40 animate-fade-in" />
      <div
        className="relative w-full max-w-xl bg-background border-l border-border h-full overflow-y-auto animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-background border-b border-border px-8 py-5 flex items-center justify-between z-10">
          <h2 className="font-display text-2xl text-foreground">{title}</h2>
          <button onClick={onClose} className="p-2 text-foreground/60 hover:text-foreground">
            <X size={18} />
          </button>
        </div>
        <div className="p-8">{children}</div>
      </div>
    </div>
  );
}
