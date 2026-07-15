import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { slugify, brl } from "@/lib/slug";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, X, Search, AlertTriangle } from "lucide-react";
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
  preco_b2b_1: number | null;
  preco_b2b_2: number | null;
  preco_b2b_3: number | null;
  percentual_economia: number | null;
  imagens: string[] | null;
  ativo: boolean | null;
  destaque: boolean | null;
  disponivel_assinatura: boolean | null;
  disponivel_b2b: boolean | null;
  custo_embalagem: number | null;
  desconto_kit_pct: number | null;
};

type Produto = {
  id: string;
  nome: string;
  categoria_id: string | null;
  preco_custo: number | null;
  preco_varejo: number;
  preco_assinatura: number | null;
  preco_b2b_1: number | null;
  preco_b2b_2: number | null;
  preco_b2b_3: number | null;
  estoque: number | null;
};

type Componente = {
  produto_id: string;
  quantidade: number;
  produto?: Produto;
};

const EMPTY: Partial<Kit> = {
  nome: "", slug: "", descricao_curta: "", descricao: "",
  preco_varejo: 0, preco_original: 0, preco_assinatura: null,
  preco_b2b_1: null, preco_b2b_2: null, preco_b2b_3: null,
  percentual_economia: null, imagens: [], ativo: true, destaque: false,
  disponivel_assinatura: true, disponivel_b2b: true,
  custo_embalagem: 0, desconto_kit_pct: 10,
};

const r2 = (n: number) => Math.round(n * 100) / 100;

function KitsAdmin() {
  const [items, setItems] = useState<Kit[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Kit> | null>(null);
  const [componentes, setComponentes] = useState<Componente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    // RPCs SECURITY DEFINER (com checagem de admin) — necessárias porque a role
    // `authenticated` não enxerga mais colunas de custo/margem/embalagem na tabela base.
    const [{ data: kitsData, error }, { data: prodData }, { data: catData }] = await Promise.all([
      supabase.rpc("admin_list_kits"),
      supabase.rpc("admin_list_produtos"),
      supabase.from("categorias").select("id,nome"),
    ]);
    if (error) toast.error(error.message);
    setItems((kitsData as Kit[]) ?? []);
    setProdutos((prodData as Produto[]) ?? []);
    const cats: Record<string, string> = {};
    (catData ?? []).forEach((c: any) => { cats[c.id] = c.nome; });
    setCategorias(cats);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function openEdit(k: Partial<Kit>) {
    setEditing(k);
    if (k.id) {
      const { data } = await supabase.rpc("admin_get_kit_componentes", { p_kit_id: k.id });
      setComponentes(((data as any[]) ?? []).map((c) => ({ produto_id: c.produto_id, quantidade: c.quantidade })));
    } else {
      setComponentes([]);
    }
  }


  // cálculos derivados
  const calc = useMemo(() => {
    const rows = componentes.map((c) => ({ ...c, produto: produtos.find((p) => p.id === c.produto_id) })).filter((c) => c.produto);
    const custoComponentes = rows.reduce((s, c) => s + (Number(c.produto!.preco_custo ?? 0) * c.quantidade), 0);
    const custoTotal = custoComponentes + Number(editing?.custo_embalagem ?? 0);
    const desc = Number(editing?.desconto_kit_pct ?? 0) / 100;
    const perfil = (get: (p: Produto) => number) => {
      const cheio = rows.reduce((s, c) => s + get(c.produto!) * c.quantidade, 0);
      const venda = r2(cheio * (1 - desc));
      const margem = venda > 0 ? ((venda - custoTotal) / venda) * 100 : 0;
      return { cheio, venda, margem };
    };
    const varejo = perfil((p) => Number(p.preco_varejo));
    const assinatura = perfil((p) => Number(p.preco_assinatura ?? p.preco_varejo));
    const b2b1 = perfil((p) => Number(p.preco_b2b_1 ?? p.preco_varejo));
    const b2b2 = perfil((p) => Number(p.preco_b2b_2 ?? p.preco_varejo));
    const b2b3 = perfil((p) => Number(p.preco_b2b_3 ?? p.preco_varejo));
    const semEstoque = rows.filter((c) => (c.produto!.estoque ?? 0) < c.quantidade);
    return { rows, custoTotal, varejo, assinatura, b2b1, b2b2, b2b3, semEstoque };
  }, [componentes, produtos, editing?.custo_embalagem, editing?.desconto_kit_pct]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    if (!editing.nome?.trim()) return toast.error("Nome é obrigatório");
    if (componentes.length === 0) return toast.error("Adicione ao menos um produto ao kit");
    if (editing.ativo && calc.semEstoque.length > 0) {
      return toast.error(`Não é possível publicar: ${calc.semEstoque.length} componente(s) sem estoque suficiente`);
    }
    const original = r2(calc.varejo.cheio);
    const venda = calc.varejo.venda;
    const econ = original > venda ? Math.round(((original - venda) / original) * 100) : 0;
    const payload: any = {
      nome: editing.nome.trim(),
      slug: editing.slug?.trim() || slugify(editing.nome),
      descricao_curta: editing.descricao_curta || null,
      descricao: editing.descricao || null,
      preco_varejo: venda,
      preco_original: original,
      preco_assinatura: calc.assinatura.venda || null,
      preco_b2b_1: calc.b2b1.venda || null,
      preco_b2b_2: calc.b2b2.venda || null,
      preco_b2b_3: calc.b2b3.venda || null,
      percentual_economia: econ,
      imagens: editing.imagens ?? [],
      ativo: editing.ativo ?? true,
      destaque: editing.destaque ?? false,
      disponivel_assinatura: editing.disponivel_assinatura ?? true,
      disponivel_b2b: editing.disponivel_b2b ?? true,
      custo_embalagem: Number(editing.custo_embalagem ?? 0),
      desconto_kit_pct: Number(editing.desconto_kit_pct ?? 0),
    };

    let kitId = editing.id;
    if (kitId) {
      const { error } = await supabase.from("kits").update(payload).eq("id", kitId);
      if (error) return toast.error(error.message);
    } else {
      const { data, error } = await supabase.from("kits").insert(payload).select("id").single();
      if (error) return toast.error(error.message);
      kitId = (data as any).id;
    }

    // Regravar composição do zero
    const kc = supabase as any;
    await kc.from("kit_componentes").delete().eq("kit_id", kitId);
    if (componentes.length) {
      const rows = componentes.map((c) => ({ kit_id: kitId, produto_id: c.produto_id, quantidade: c.quantidade }));
      const { error } = await kc.from("kit_componentes").insert(rows);
      if (error) return toast.error(error.message);
    }

    toast.success(editing.id ? "Kit atualizado" : "Kit criado");
    setEditing(null);
    setComponentes([]);
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
      <Header title="Kits" subtitle={`${items.length} cadastrado(s)`} onNew={() => openEdit({ ...EMPTY })} />

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
                      <button onClick={() => openEdit(k)} className="p-2 text-foreground/60 hover:text-gold"><Pencil size={15} /></button>
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
        <FormDrawer title={editing.id ? "Editar kit" : "Novo kit"} onClose={() => { setEditing(null); setComponentes([]); }}>
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

            {/* ===== Composição ===== */}
            <div className="space-y-3 border-t border-border pt-5">
              <div className="flex items-center justify-between">
                <label className="font-display text-lg text-foreground">Composição do kit</label>
                <Link to="/admin/produtos" className="text-xs uppercase tracking-[0.2em] text-gold hover:underline inline-flex items-center gap-1">
                  <Plus size={12} /> Cadastrar novo produto
                </Link>
              </div>
              <ProdutoPicker
                produtos={produtos}
                categorias={categorias}
                jaAdicionados={componentes.map((c) => c.produto_id)}
                onAdd={(id) => setComponentes([...componentes, { produto_id: id, quantidade: 1 }])}
              />
              {componentes.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Nenhum produto adicionado ainda.</p>
              ) : (
                <div className="border border-border">
                  {componentes.map((c, i) => {
                    const p = produtos.find((x) => x.id === c.produto_id);
                    const semEst = p && (p.estoque ?? 0) < c.quantidade;
                    return (
                      <div key={c.produto_id} className="flex items-center gap-3 p-3 border-b border-border last:border-b-0">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-foreground truncate">{p?.nome ?? "(produto removido)"}</div>
                          <div className="text-xs text-muted-foreground">
                            Custo {brl(Number(p?.preco_custo ?? 0))} · Varejo {brl(Number(p?.preco_varejo ?? 0))} · Estoque {p?.estoque ?? 0}
                          </div>
                        </div>
                        <input
                          type="number" min={1}
                          className="form-input w-20 text-center"
                          value={c.quantidade}
                          onChange={(e) => {
                            const q = Math.max(1, Number(e.target.value) || 1);
                            const next = [...componentes]; next[i] = { ...c, quantidade: q }; setComponentes(next);
                          }}
                        />
                        {semEst && (
                          <span title="Estoque insuficiente" className="text-destructive"><AlertTriangle size={16} /></span>
                        )}
                        <button
                          type="button"
                          onClick={() => setComponentes(componentes.filter((_, j) => j !== i))}
                          className="p-2 text-foreground/60 hover:text-destructive"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              {calc.semEstoque.length > 0 && (
                <p className="text-xs text-destructive flex items-center gap-2">
                  <AlertTriangle size={14} />
                  {calc.semEstoque.length} componente(s) sem estoque suficiente — o kit não poderá ficar ativo enquanto isso persistir.
                </p>
              )}
            </div>

            {/* ===== Precificação ===== */}
            <div className="grid grid-cols-2 gap-4 border-t border-border pt-5">
              <Field label="Custo de embalagem (R$)">
                <input
                  type="number" step="0.01" min={0}
                  className="form-input"
                  value={editing.custo_embalagem ?? 0}
                  onChange={(e) => setEditing({ ...editing, custo_embalagem: Number(e.target.value) })}
                />
              </Field>
              <Field label="Desconto do kit (%)">
                <input
                  type="number" step="0.5" min={0} max={90}
                  className="form-input"
                  value={editing.desconto_kit_pct ?? 10}
                  onChange={(e) => setEditing({ ...editing, desconto_kit_pct: Number(e.target.value) })}
                />
              </Field>
            </div>

            <div className="border border-border bg-surface p-4 space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Preview de preços (calculado automaticamente)</p>
              <div className="text-xs text-muted-foreground">Custo total: <span className="text-foreground font-medium">{brl(calc.custoTotal)}</span></div>
              <table className="w-full text-xs mt-2">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-1">Perfil</th>
                    <th className="py-1">Cheio</th>
                    <th className="py-1">Venda</th>
                    <th className="py-1">Margem</th>
                  </tr>
                </thead>
                <tbody className="text-foreground">
                  {([
                    ["Varejo", calc.varejo],
                    ["Assinante", calc.assinatura],
                    ["B2B 1", calc.b2b1],
                    ["B2B 2", calc.b2b2],
                    ["B2B 3", calc.b2b3],
                  ] as const).map(([lbl, v]) => (
                    <tr key={lbl} className="border-t border-border">
                      <td className="py-1.5">{lbl}</td>
                      <td className="py-1.5 text-muted-foreground line-through">{brl(v.cheio)}</td>
                      <td className="py-1.5 font-medium">{brl(v.venda)}</td>
                      <td className={`py-1.5 font-medium ${v.margem < 40 ? "text-destructive" : "text-foreground"}`}>
                        {v.margem.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
            <FormActions onCancel={() => { setEditing(null); setComponentes([]); }} saveLabel={editing.id ? "Salvar" : "Criar"} />
          </form>
        </FormDrawer>
      )}
    </>
  );
}

function ProdutoPicker({
  produtos, categorias, jaAdicionados, onAdd,
}: {
  produtos: Produto[];
  categorias: Record<string, string>;
  jaAdicionados: string[];
  onAdd: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    if (!q.trim()) return [] as Produto[];
    const needle = q.toLowerCase();
    return produtos
      .filter((p) => !jaAdicionados.includes(p.id))
      .filter((p) => p.nome.toLowerCase().includes(needle) || (categorias[p.categoria_id ?? ""] ?? "").toLowerCase().includes(needle))
      .slice(0, 8);
  }, [q, produtos, jaAdicionados, categorias]);

  return (
    <div className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          className="form-input pl-9"
          placeholder="Buscar produto por nome ou categoria…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {results.length > 0 && (
        <div className="absolute z-10 left-0 right-0 mt-1 bg-background border border-border shadow-elevated max-h-64 overflow-auto">
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => { onAdd(p.id); setQ(""); }}
              className="w-full text-left px-3 py-2 hover:bg-surface border-b border-border last:border-b-0"
            >
              <div className="text-sm text-foreground">{p.nome}</div>
              <div className="text-xs text-muted-foreground">
                {categorias[p.categoria_id ?? ""] ?? "—"} · Varejo {brl(Number(p.preco_varejo))} · Estoque {p.estoque ?? 0}
              </div>
            </button>
          ))}
        </div>
      )}
      {q.trim() && results.length === 0 && (
        <div className="absolute z-10 left-0 right-0 mt-1 bg-background border border-border p-3 text-sm text-muted-foreground">
          Nenhum produto encontrado. <Link to="/admin/produtos" className="text-gold hover:underline">Cadastrar novo produto</Link>
        </div>
      )}
    </div>
  );
}
