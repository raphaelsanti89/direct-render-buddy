import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { slugify, brl } from "@/lib/slug";
import { toast } from "sonner";
import { Pencil, Trash2, Eye, EyeOff, Sparkles, Upload, Download, FileDown, Plus, X, Copy, AlertTriangle, Trophy } from "lucide-react";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { Empty, Field, FormActions, FormDrawer } from "./admin.categorias";
import * as XLSX from "xlsx";

type SearchParams = { filter?: "baixo" | "todos" };

export const Route = createFileRoute("/admin/produtos")({
  head: () => ({ meta: [{ title: "Produtos — Admin" }] }),
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    filter: s.filter === "baixo" ? "baixo" : undefined,
  }),
  component: ProdutosAdmin,
});

type Cat = { id: string; nome: string };
type Fornecedor = { id: string; nome: string };
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
  fornecedor_id: string | null;
  imagens: string[] | null;
  volume: string | null;
  intensidade: number | null;
  sensacao_transmitida: string | null;
  durabilidade_media: string | null;
  ativo: boolean | null;
  destaque: boolean | null;
  lancamento: boolean | null;
  mais_vendido: boolean | null;
  estoque_atual: number | null;
  estoque_minimo: number | null;
  estoque_ideal: number | null;
};

const EMPTY: Partial<Prod> = {
  nome: "", slug: "", descricao_curta: "", descricao: "",
  preco_custo: null, margem_varejo_pct: 60,
  preco_varejo: 0, preco_assinatura: null,
  preco_b2b_1: null, preco_b2b_2: null, preco_b2b_3: null,
  categoria_id: null, fornecedor_id: null,
  imagens: [], volume: "", intensidade: 3, sensacao_transmitida: "",
  durabilidade_media: "", ativo: true, destaque: false, lancamento: false, mais_vendido: false,
  estoque_atual: 0, estoque_minimo: 0, estoque_ideal: 0,
};

// Descontos sugeridos (sobre o preço de varejo)
const DESC = { assinante: 0.13, b2b1: 0.15, b2b2: 0.20, b2b3: 0.25 };
const r2 = (n: number) => Math.round(n * 100) / 100;

function ProdutosAdmin() {
  const { filter } = Route.useSearch();
  const [items, setItems] = useState<Prod[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [margemPiso, setMargemPiso] = useState(50);
  const [margemMeta, setMargemMeta] = useState(55);
  const [velocidade, setVelocidade] = useState<Map<string, { campeao: boolean; qtd_30d: number }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Prod> | null>(null);

  async function load() {
    setLoading(true);
    const [{ data: p }, { data: c }, { data: f }, { data: cfg }, { data: vel }] = await Promise.all([
      supabase.rpc("admin_list_produtos"),
      supabase.from("categorias").select("id,nome").order("nome"),
      supabase.from("fornecedores").select("id,nome").order("nome"),
      supabase.from("configuracoes_gerais").select("chave,valor").in("chave", ["margem_piso", "margem_meta"]),
      supabase.rpc("admin_produtos_velocidade"),
    ]);
    setItems((p as Prod[]) ?? []);
    setCats((c as Cat[]) ?? []);
    setFornecedores((f as Fornecedor[]) ?? []);
    const cfgMap = new Map((cfg ?? []).map((r) => [r.chave, r.valor]));
    setMargemPiso(Number(cfgMap.get("margem_piso") ?? 50));
    setMargemMeta(Number(cfgMap.get("margem_meta") ?? 55));
    const velMap = new Map<string, { campeao: boolean; qtd_30d: number }>();
    ((vel as Array<{ produto_id: string; campeao: boolean; qtd_30d: number }>) ?? []).forEach((v) => {
      velMap.set(v.produto_id, { campeao: !!v.campeao, qtd_30d: v.qtd_30d });
    });
    setVelocidade(velMap);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const visibleItems = useMemo(() => {
    if (filter === "baixo") {
      return items.filter((p) => (p.estoque_atual ?? 0) <= (p.estoque_minimo ?? 0));
    }
    return items;
  }, [items, filter]);


  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const payload = {
      nome: editing.nome?.trim() ?? "",
      slug: editing.slug?.trim() || slugify(editing.nome ?? ""),
      descricao_curta: editing.descricao_curta || null,
      descricao: editing.descricao || null,
      preco_custo: editing.preco_custo != null ? Number(editing.preco_custo) : null,
      margem_varejo_pct: editing.margem_varejo_pct != null ? Number(editing.margem_varejo_pct) : null,
      preco_varejo: Number(editing.preco_varejo ?? 0),
      preco_assinatura: editing.preco_assinatura != null && editing.preco_assinatura !== ('' as any) ? Number(editing.preco_assinatura) : null,
      preco_b2b_1: editing.preco_b2b_1 != null && editing.preco_b2b_1 !== ('' as any) ? Number(editing.preco_b2b_1) : null,
      preco_b2b_2: editing.preco_b2b_2 != null && editing.preco_b2b_2 !== ('' as any) ? Number(editing.preco_b2b_2) : null,
      preco_b2b_3: editing.preco_b2b_3 != null && editing.preco_b2b_3 !== ('' as any) ? Number(editing.preco_b2b_3) : null,
      categoria_id: editing.categoria_id || null,
      fornecedor_id: editing.fornecedor_id || null,
      imagens: editing.imagens ?? [],
      volume: editing.volume || null,
      intensidade: editing.intensidade ?? null,
      sensacao_transmitida: editing.sensacao_transmitida || null,
      durabilidade_media: editing.durabilidade_media || null,
      ativo: editing.ativo ?? true,
      destaque: editing.destaque ?? false,
      lancamento: editing.lancamento ?? false,
      mais_vendido: editing.mais_vendido ?? false,
      estoque_atual: Number(editing.estoque_atual ?? 0),
      estoque_minimo: Number(editing.estoque_minimo ?? 0),
      estoque_ideal: Number(editing.estoque_ideal ?? 0),
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

  async function duplicate(p: Prod) {
    // Copia todos os campos relevantes; novo slug único; ativo=false até revisão.
    const baseSlug = slugify(`${p.nome}-copia`);
    let novoSlug = baseSlug;
    // Garante unicidade acrescentando -2, -3... se necessário
    for (let i = 2; i < 50; i++) {
      const { data: existente } = await supabase
        .from("produtos")
        .select("id")
        .eq("slug", novoSlug)
        .maybeSingle();
      if (!existente) break;
      novoSlug = `${baseSlug}-${i}`;
    }
    const payload = {
      nome: `${p.nome} (cópia)`,
      slug: novoSlug,
      descricao_curta: p.descricao_curta,
      descricao: p.descricao,
      preco_custo: p.preco_custo,
      margem_varejo_pct: p.margem_varejo_pct,
      preco_varejo: p.preco_varejo,
      preco_assinatura: p.preco_assinatura,
      preco_b2b_1: p.preco_b2b_1,
      preco_b2b_2: p.preco_b2b_2,
      preco_b2b_3: p.preco_b2b_3,
      categoria_id: p.categoria_id,
      imagens: p.imagens ?? [],
      volume: p.volume,
      intensidade: p.intensidade,
      sensacao_transmitida: p.sensacao_transmitida,
      durabilidade_media: p.durabilidade_media,
      ativo: false, // rascunho até revisão manual
      destaque: false,
      lancamento: p.lancamento,
      mais_vendido: false,
    };
    const { data, error } = await supabase
      .from("produtos")
      .insert(payload)
      .select("*")
      .single();
    if (error) return toast.error(error.message);
    toast.success("Produto duplicado — ajuste e ative para publicar");
    await load();
    setEditing(data as Prod);
  }

  return (
    <>
      <ProdutosHeader
        count={items.length}
        items={items}
        cats={cats}
        onNew={() => setEditing({ ...EMPTY })}
        onImported={load}
      />

      {filter === "baixo" && (
        <div className="mb-6 flex items-center justify-between gap-4 border border-destructive/40 bg-destructive/5 px-5 py-3">
          <div className="flex items-center gap-3 text-sm">
            <AlertTriangle size={16} className="text-destructive" />
            <span className="text-foreground">Filtro: produtos com estoque abaixo (ou igual) ao mínimo — {visibleItems.length} item(ns)</span>
          </div>
          <Link to="/admin/produtos" search={{ filter: undefined }} className="text-xs uppercase tracking-[0.18em] text-foreground/70 hover:text-gold">
            Limpar filtro
          </Link>
        </div>
      )}

      <div className="bg-background border border-border">
        {loading ? <Empty text="Carregando…" /> : visibleItems.length === 0 ? (
          <Empty text={filter === "baixo" ? "Nenhum produto com estoque baixo." : "Nenhum produto ainda."} />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
            {visibleItems.map((p) => (
              <ProductCard key={p.id} p={p} catName={cats.find((c) => c.id === p.categoria_id)?.nome} margemPiso={margemPiso} margemMeta={margemMeta} onEdit={() => setEditing(p)} onDelete={() => del(p)} onDuplicate={() => duplicate(p)} />
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
            <Field label="Fornecedor">
              <select
                className="form-input"
                value={editing.fornecedor_id ?? ""}
                onChange={(e) => setEditing({ ...editing, fornecedor_id: e.target.value || null })}
              >
                <option value="">— sem fornecedor —</option>
                {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
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

            <PricingCalculator editing={editing} setEditing={setEditing} />

            <div className="grid grid-cols-2 gap-4">
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

            <div className="border border-border p-5 bg-surface/30 space-y-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-gold">— estoque</p>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Estoque atual">
                  <input
                    type="number"
                    min={0}
                    className="form-input"
                    value={editing.estoque_atual ?? 0}
                    onChange={(e) => setEditing({ ...editing, estoque_atual: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Mínimo (comprar agora)">
                  <input
                    type="number"
                    min={0}
                    className="form-input"
                    value={editing.estoque_minimo ?? 0}
                    onChange={(e) => setEditing({ ...editing, estoque_minimo: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Ideal (comprar em breve)">
                  <input
                    type="number"
                    min={0}
                    className="form-input"
                    value={editing.estoque_ideal ?? 0}
                    onChange={(e) => setEditing({ ...editing, estoque_ideal: Number(e.target.value) })}
                  />
                </Field>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Abaixo (ou igual) ao mínimo aparece como <span className="text-destructive">comprar agora</span>; entre mínimo e ideal, como <span className="text-amber-600">comprar em breve</span>. A baixa acontece automaticamente quando o pedido é confirmado.
              </p>
            </div>

            <FormActions onCancel={() => setEditing(null)} saveLabel={editing.id ? "Salvar" : "Criar"} />
          </form>
        </FormDrawer>
      )}
    </>
  );
}

function ProductCard({ p, catName, margemPiso, margemMeta, onEdit, onDelete, onDuplicate }: { p: Prod; catName?: string; margemPiso: number; margemMeta: number; onEdit: () => void; onDelete: () => void; onDuplicate: () => void }) {
  const img = p.imagens?.[0];
  const custo = Number(p.preco_custo ?? 0);
  const varejo = Number(p.preco_varejo ?? 0);
  const margemPct = varejo > 0 && custo > 0 ? ((varejo - custo) / varejo) * 100 : null;
  let margemCls = "bg-surface text-foreground/60 border-border";
  if (margemPct != null) {
    if (margemPct < margemPiso) margemCls = "bg-destructive/15 text-destructive border-destructive/30";
    else if (margemPct < margemMeta) margemCls = "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
    else margemCls = "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30";
  }
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
        <div className="mt-3 flex flex-wrap gap-2">
          <StockBadge p={p} />
          {margemPct != null && (
            <span className={`inline-flex items-center text-[10px] uppercase tracking-[0.18em] px-2 py-1 border ${margemCls}`}>
              Margem {margemPct.toFixed(0)}%
            </span>
          )}
        </div>
        <div className="mt-auto pt-4 flex items-center justify-between">
          <span className="font-display text-lg text-foreground">{brl(p.preco_varejo)}</span>
          <div className="flex gap-2">
            <button onClick={onEdit} className="p-2 text-foreground/60 hover:text-gold" aria-label="Editar" title="Editar">
              <Pencil size={15} />
            </button>
            <button onClick={onDuplicate} className="p-2 text-foreground/60 hover:text-gold" aria-label="Duplicar" title="Duplicar">
              <Copy size={15} />
            </button>
            <button onClick={onDelete} className="p-2 text-foreground/60 hover:text-destructive" aria-label="Excluir" title="Excluir">
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StockBadge({ p }: { p: Prod }) {
  const atual = p.estoque_atual ?? 0;
  const min = p.estoque_minimo ?? 0;
  const ideal = p.estoque_ideal ?? 0;
  let tone = "bg-surface text-foreground/70 border-border";
  let label = `Estoque: ${atual}`;
  if (atual <= min) {
    tone = "bg-destructive/10 text-destructive border-destructive/30";
    label = `Estoque: ${atual} · comprar agora`;
  } else if (atual < ideal) {
    tone = "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30";
    label = `Estoque: ${atual} · comprar em breve`;
  }
  return (
    <span className={`inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] px-2 py-1 border ${tone}`}>
      {label}
    </span>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[9px] uppercase tracking-[0.2em] bg-foreground text-background px-2 py-1 inline-flex items-center gap-1">
      <Sparkles size={10} /> {children}
    </span>
  );
}

function PricingCalculator({
  editing,
  setEditing,
}: {
  editing: Partial<Prod>;
  setEditing: (p: Partial<Prod>) => void;
}) {
  const custo = Number(editing.preco_custo ?? 0);
  const margem = Number(editing.margem_varejo_pct ?? 0);
  const varejoSugerido = custo > 0 && margem > 0 ? r2(custo * (1 + margem / 100)) : 0;
  const varejoEfetivo = Number(editing.preco_varejo ?? varejoSugerido ?? 0);
  const margemValor = custo > 0 ? r2(varejoEfetivo - custo) : 0;

  // Aplica varejo sugerido quando muda custo/margem (sem sobrescrever edição manual posterior)
  function aplicarSugestaoVarejo() {
    if (varejoSugerido > 0) {
      setEditing({
        ...editing,
        preco_varejo: varejoSugerido,
        preco_assinatura: r2(varejoSugerido * (1 - DESC.assinante)),
        preco_b2b_1: r2(varejoSugerido * (1 - DESC.b2b1)),
        preco_b2b_2: r2(varejoSugerido * (1 - DESC.b2b2)),
        preco_b2b_3: r2(varejoSugerido * (1 - DESC.b2b3)),
      });
    }
  }

  return (
    <div className="border border-border p-5 bg-surface/30 space-y-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-gold">— precificação</p>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Preço de custo (R$) — interno">
          <input
            type="number"
            step="0.01"
            min={0}
            className="form-input"
            value={editing.preco_custo ?? ""}
            placeholder="Seu custo real"
            onChange={(e) =>
              setEditing({
                ...editing,
                preco_custo: e.target.value ? Number(e.target.value) : null,
              })
            }
          />
        </Field>
        <Field label="Margem de lucro varejo (%)">
          <input
            type="number"
            step="0.1"
            min={0}
            className="form-input"
            value={editing.margem_varejo_pct ?? ""}
            placeholder="ex.: 60"
            onChange={(e) =>
              setEditing({
                ...editing,
                margem_varejo_pct: e.target.value ? Number(e.target.value) : null,
              })
            }
          />
        </Field>
      </div>

      {custo > 0 && margem > 0 && (
        <div className="border border-dashed border-border p-4 bg-background space-y-2 font-mono text-[11px]">
          <p className="uppercase tracking-[0.25em] text-foreground/60 mb-2">
            Simulação de preços
          </p>
          <Row k="Preço de custo" v={brl(custo)} />
          <Row k={`Margem aplicada (${margem}%)`} v={`+ ${brl(margemValor || r2(custo * margem / 100))}`} />
          <div className="h-px bg-border my-2" />
          <Row k="Varejo sugerido" v={brl(varejoSugerido)} accent />
          <Row k="Assinante (−13%)" v={brl(r2(varejoSugerido * (1 - DESC.assinante)))} />
          <Row k="B2B Nível 1 (−15%)" v={brl(r2(varejoSugerido * (1 - DESC.b2b1)))} />
          <Row k="B2B Nível 2 (−20%)" v={brl(r2(varejoSugerido * (1 - DESC.b2b2)))} />
          <Row k="B2B Nível 3 (−25%)" v={brl(r2(varejoSugerido * (1 - DESC.b2b3)))} />
          <button
            type="button"
            onClick={aplicarSugestaoVarejo}
            className="mt-3 w-full bg-foreground text-background py-2 text-[10px] uppercase tracking-[0.2em] hover:bg-gold transition-colors"
          >
            Aplicar sugestão a todos os preços
          </button>
          <p className="text-[10px] text-muted-foreground normal-case tracking-normal leading-relaxed">
            Você pode editar manualmente qualquer valor abaixo. A calculadora é só uma sugestão.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field label="Preço varejo (R$) *">
          <input
            type="number"
            step="0.01"
            min={0}
            className="form-input"
            value={editing.preco_varejo ?? 0}
            onChange={(e) => setEditing({ ...editing, preco_varejo: Number(e.target.value) })}
            required
          />
        </Field>
        <Field label="Preço assinante (R$)">
          <input
            type="number"
            step="0.01"
            min={0}
            className="form-input"
            value={editing.preco_assinatura ?? ""}
            onChange={(e) =>
              setEditing({ ...editing, preco_assinatura: e.target.value ? Number(e.target.value) : null })
            }
          />
        </Field>
        <Field label="B2B Nível 1 (R$)">
          <input
            type="number"
            step="0.01"
            min={0}
            className="form-input"
            value={editing.preco_b2b_1 ?? ""}
            onChange={(e) =>
              setEditing({ ...editing, preco_b2b_1: e.target.value ? Number(e.target.value) : null })
            }
          />
        </Field>
        <Field label="B2B Nível 2 (R$)">
          <input
            type="number"
            step="0.01"
            min={0}
            className="form-input"
            value={editing.preco_b2b_2 ?? ""}
            onChange={(e) =>
              setEditing({ ...editing, preco_b2b_2: e.target.value ? Number(e.target.value) : null })
            }
          />
        </Field>
        <Field label="B2B Nível 3 (R$)">
          <input
            type="number"
            step="0.01"
            min={0}
            className="form-input"
            value={editing.preco_b2b_3 ?? ""}
            onChange={(e) =>
              setEditing({ ...editing, preco_b2b_3: e.target.value ? Number(e.target.value) : null })
            }
          />
        </Field>
      </div>
    </div>
  );
}

function Row({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${accent ? "text-foreground" : "text-foreground/80"}`}>
      <span className="uppercase tracking-[0.15em]">{k}</span>
      <span className={accent ? "font-display text-sm text-gold" : ""}>{v}</span>
    </div>
  );
}

// ============================================================
// IMPORT / EXPORT
// ============================================================

const EXPORT_COLS = [
  "nome", "slug", "categoria", "marca", "descricao_curta", "volume",
  "notas_olfativas", "intensidade", "sensacao_transmitida",
  "preco_custo", "margem", "preco_varejo", "preco_assinatura",
  "preco_b2b_1", "preco_b2b_2", "preco_b2b_3",
  "estoque", "destaque", "lancamento", "mais_vendido", "ativo",
] as const;

function csvEscape(v: any): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportProductsCsv(items: Prod[], cats: Cat[]) {
  const catName = (id: string | null) => cats.find((c) => c.id === id)?.nome ?? "";
  const rows = items.map((p) => [
    p.nome, p.slug, catName(p.categoria_id), "", p.descricao_curta ?? "", p.volume ?? "",
    Array.isArray((p as any).notas_olfativas) ? (p as any).notas_olfativas.join("|") : "",
    p.intensidade ?? "", p.sensacao_transmitida ?? "",
    p.preco_custo ?? "", p.margem_varejo_pct ?? "", p.preco_varejo,
    p.preco_assinatura ?? "", p.preco_b2b_1 ?? "", p.preco_b2b_2 ?? "", p.preco_b2b_3 ?? "",
    (p as any).estoque ?? 0, p.destaque ? "true" : "false",
    p.lancamento ? "true" : "false", p.mais_vendido ? "true" : "false",
    p.ativo ? "true" : "false",
  ]);
  const csv = [EXPORT_COLS.join(","), ...rows.map((r) => r.map(csvEscape).join(","))].join("\n");
  downloadFile(csv, `produtos-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv;charset=utf-8");
}

function downloadTemplate() {
  const sample = [
    "Aromatizador Bambu", "", "Aromatizadores", "Via Aroma", "Aroma suave e aconchegante", "250ml",
    "bambu|capim-limão", "3", "Relaxante",
    "35.00", "60", "89.90", "", "", "", "",
    "10", "false", "false", "false", "true",
  ];
  const csv = [EXPORT_COLS.join(","), sample.map(csvEscape).join(",")].join("\n");
  downloadFile(csv, "modelo-produtos.csv", "text/csv;charset=utf-8");
}

type ImportRow = Record<string, any>;

async function parseFile(file: File): Promise<ImportRow[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<ImportRow>(ws, { defval: "" });
}

const DESC_RATIOS = { assinatura: 0.13, b2b1: 0.15, b2b2: 0.20, b2b3: 0.25 };
const num = (v: any): number | null => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
const bool = (v: any): boolean => {
  const s = String(v).toLowerCase().trim();
  return s === "true" || s === "1" || s === "sim" || s === "yes";
};

function ProdutosHeader({
  count, items, cats, onNew, onImported,
}: {
  count: number; items: Prod[]; cats: Cat[]; onNew: () => void; onImported: () => void;
}) {
  const [showImport, setShowImport] = useState(false);
  return (
    <>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold mb-3">— catálogo</p>
          <h1 className="font-display text-5xl text-foreground">Produtos</h1>
          <p className="mt-2 text-sm text-muted-foreground">{count} cadastrado(s)</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-2 border border-border bg-background px-4 py-3 text-xs uppercase tracking-[0.18em] text-foreground hover:border-gold hover:text-gold transition-colors"
          >
            <Upload size={14} /> Importar CSV/Excel
          </button>
          <button
            onClick={() => exportProductsCsv(items, cats)}
            className="inline-flex items-center gap-2 border border-border bg-background px-4 py-3 text-xs uppercase tracking-[0.18em] text-foreground hover:border-gold hover:text-gold transition-colors"
          >
            <Download size={14} /> Exportar CSV
          </button>
          <button
            onClick={onNew}
            className="inline-flex items-center gap-2 bg-foreground text-background px-6 py-3 text-xs uppercase tracking-[0.18em] hover:bg-gold transition-colors"
          >
            <Plus size={14} /> Novo
          </button>
        </div>
      </div>
      {showImport && (
        <ImportModal cats={cats} onClose={() => setShowImport(false)} onDone={() => { setShowImport(false); onImported(); }} />
      )}
    </>
  );
}

function ImportModal({ cats, onClose, onDone }: { cats: Cat[]; onClose: () => void; onDone: () => void }) {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(f: File) {
    try {
      const parsed = await parseFile(f);
      if (parsed.length === 0) return toast.error("Arquivo vazio");
      setRows(parsed);
      setFileName(f.name);
      toast.success(`${parsed.length} linha(s) detectada(s)`);
    } catch (err: any) {
      toast.error(`Erro ao ler arquivo: ${err.message}`);
    }
  }

  async function confirmImport() {
    setImporting(true);
    let ok = 0;
    const errors: string[] = [];

    // Build categoria lookup, create missing ones
    const catMap = new Map(cats.map((c) => [c.nome.toLowerCase().trim(), c.id]));
    const newCats = new Set<string>();
    for (const row of rows) {
      const name = String(row.categoria ?? "").trim();
      if (name && !catMap.has(name.toLowerCase())) newCats.add(name);
    }
    for (const name of newCats) {
      const slug = slugify(name);
      const { data, error } = await supabase
        .from("categorias")
        .insert({ nome: name, slug })
        .select("id")
        .single();
      if (!error && data) catMap.set(name.toLowerCase(), data.id);
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const nome = String(row.nome ?? "").trim();
      const preco_varejo = num(row.preco_varejo);
      if (!nome) { errors.push(`Linha ${i + 2}: nome vazio`); continue; }
      if (preco_varejo == null || preco_varejo <= 0) { errors.push(`Linha ${i + 2} (${nome}): preco_varejo inválido`); continue; }

      const catName = String(row.categoria ?? "").trim();
      const categoria_id = catName ? catMap.get(catName.toLowerCase()) ?? null : null;

      const preco_assinatura = num(row.preco_assinatura) ?? r2(preco_varejo * (1 - DESC_RATIOS.assinatura));
      const preco_b2b_1 = num(row.preco_b2b_1) ?? r2(preco_varejo * (1 - DESC_RATIOS.b2b1));
      const preco_b2b_2 = num(row.preco_b2b_2) ?? r2(preco_varejo * (1 - DESC_RATIOS.b2b2));
      const preco_b2b_3 = num(row.preco_b2b_3) ?? r2(preco_varejo * (1 - DESC_RATIOS.b2b3));

      const notas = String(row.notas_olfativas ?? "").trim();
      const notas_olfativas = notas ? notas.split(/[|,;]/).map((s) => s.trim()).filter(Boolean) : null;

      const payload: any = {
        nome,
        slug: String(row.slug ?? "").trim() || slugify(nome),
        descricao_curta: row.descricao_curta || null,
        volume: row.volume || null,
        notas_olfativas,
        intensidade: num(row.intensidade),
        sensacao_transmitida: row.sensacao_transmitida || null,
        preco_custo: num(row.preco_custo),
        margem_varejo_pct: num(row.margem),
        preco_varejo,
        preco_assinatura,
        preco_b2b_1, preco_b2b_2, preco_b2b_3,
        estoque: num(row.estoque) ?? 0,
        destaque: bool(row.destaque),
        lancamento: bool(row.lancamento),
        mais_vendido: bool(row.mais_vendido),
        ativo: row.ativo === "" || row.ativo == null ? true : bool(row.ativo),
        categoria_id,
        imagens: [],
      };

      const { error } = await supabase.from("produtos").insert(payload);
      if (error) errors.push(`Linha ${i + 2} (${nome}): ${error.message}`);
      else ok++;
    }

    setImporting(false);
    if (ok > 0) toast.success(`${ok} produto(s) importado(s)`);
    if (errors.length > 0) toast.error(`${errors.length} erro(s): ${errors.slice(0, 3).join(" • ")}${errors.length > 3 ? "…" : ""}`, { duration: 8000 });
    onDone();
  }

  const preview = rows.slice(0, 5);
  const cols = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background border border-border max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="font-display text-2xl text-foreground">Importar produtos</h2>
          <button onClick={onClose} className="p-2 text-foreground/60 hover:text-gold"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-2 bg-foreground text-background px-5 py-3 text-xs uppercase tracking-[0.18em] hover:bg-gold transition-colors"
            >
              <Upload size={14} /> Escolher arquivo (.csv / .xlsx)
            </button>
            <button
              onClick={downloadTemplate}
              className="inline-flex items-center gap-2 border border-border px-5 py-3 text-xs uppercase tracking-[0.18em] text-foreground hover:border-gold hover:text-gold transition-colors"
            >
              <FileDown size={14} /> Baixar modelo
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            {fileName && <span className="text-xs font-mono text-muted-foreground">{fileName} · {rows.length} linha(s)</span>}
          </div>

          <div className="border border-border bg-surface/40 p-4 text-xs text-muted-foreground leading-relaxed">
            <p><strong className="text-foreground">Campos obrigatórios:</strong> nome e preco_varejo. Os demais são opcionais.</p>
            <p className="mt-1">Preços de assinante/B2B vazios serão calculados automaticamente (−13% / −15% / −20% / −25%).</p>
            <p className="mt-1">Categorias novas serão criadas automaticamente. Notas olfativas separadas por <code>|</code> ou <code>,</code>.</p>
            <p className="mt-1 text-gold">As fotos não são importadas — adicione depois editando cada produto.</p>
          </div>

          {preview.length > 0 && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-foreground/60 mb-2">Pré-visualização (5 primeiras linhas)</p>
              <div className="overflow-auto border border-border max-h-72">
                <table className="text-xs">
                  <thead className="bg-surface sticky top-0">
                    <tr>{cols.map((c) => <th key={c} className="text-left p-2 font-mono text-[10px] uppercase tracking-[0.15em] text-foreground/60 whitespace-nowrap">{c}</th>)}</tr>
                  </thead>
                  <tbody>
                    {preview.map((r, i) => (
                      <tr key={i} className="border-t border-border">
                        {cols.map((c) => <td key={c} className="p-2 whitespace-nowrap text-foreground/80">{String(r[c] ?? "")}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 p-6 border-t border-border">
          <button
            onClick={confirmImport}
            disabled={rows.length === 0 || importing}
            className="bg-foreground text-background px-6 py-3 text-xs uppercase tracking-[0.18em] hover:bg-gold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {importing ? "Importando…" : `Confirmar importação (${rows.length})`}
          </button>
          <button onClick={onClose} className="px-6 py-3 text-xs uppercase tracking-[0.18em] text-foreground/60 hover:text-foreground">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
