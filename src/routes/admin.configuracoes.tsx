import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Settings, Upload, Loader2, X } from "lucide-react";

export const Route = createFileRoute("/admin/configuracoes")({
  component: AdminConfiguracoes,
});


type Row = { chave: string; valor: string | null; descricao: string | null };

function AdminConfiguracoes() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("configuracoes_gerais")
      .select("chave,valor,descricao")
      .order("chave")
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        setRows((data as Row[]) ?? []);
      });
  }, []);

  function setValor(chave: string, valor: string) {
    setRows((prev) => prev?.map((r) => (r.chave === chave ? { ...r, valor } : r)) ?? null);
  }

  async function salvar(r: Row) {
    setSaving(r.chave);
    const { error } = await supabase
      .from("configuracoes_gerais")
      .update({ valor: r.valor ?? "", updated_at: new Date().toISOString() })
      .eq("chave", r.chave);
    setSaving(null);
    if (error) toast.error(error.message);
    else toast.success("Salvo.");
  }

  if (!rows) {
    return <p className="font-mono text-xs text-muted-foreground animate-pulse">Carregando…</p>;
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <Settings className="text-gold" size={18} />
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold">— configurações gerais</p>
      </div>
      <h1 className="font-display text-4xl text-foreground mb-2">Dados da empresa</h1>
      <p className="text-sm text-muted-foreground mb-10 max-w-2xl">
        Esses valores aparecem no site público. O <strong>WhatsApp para pedidos</strong> é usado pelo botão
        flutuante e pelo checkout do carrinho — preencha só com DDI+DDD+número (ex.: <code>5511999990000</code>).
      </p>

      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.chave} className="grid md:grid-cols-[260px_1fr_auto] gap-3 items-start border border-border bg-background p-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-foreground">{r.chave}</p>
              {r.descricao && (
                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{r.descricao}</p>
              )}
            </div>
            {r.chave.startsWith("logo_url") ? (
              <LogoUpload value={r.valor ?? ""} onChange={(v) => setValor(r.chave, v)} chave={r.chave} />
            ) : r.chave.includes("mensagem") || r.chave.includes("endereco") ? (
              <textarea
                className="form-input min-h-[60px]"
                value={r.valor ?? ""}
                onChange={(e) => setValor(r.chave, e.target.value)}
                maxLength={1000}
              />
            ) : (
              <input
                className="form-input"
                value={r.valor ?? ""}
                onChange={(e) => setValor(r.chave, e.target.value)}
                maxLength={500}
              />
            )}

            <button
              type="button"
              onClick={() => salvar(r)}
              disabled={saving === r.chave}
              className="bg-foreground text-background px-5 py-2 text-xs uppercase tracking-[0.18em] hover:bg-gold transition-colors disabled:opacity-50"
            >
              {saving === r.chave ? "…" : "Salvar"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function LogoUpload({
  value,
  onChange,
  chave,
}: {
  value: string;
  onChange: (v: string) => void;
  chave: string;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isDark = chave.includes("escura");

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem (PNG, SVG, WEBP).");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "png";
      const path = `logos/${chave}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("catalogo")
        .upload(path, file, { cacheControl: "3600", upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("catalogo").getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Logo enviada. Clique em Salvar para aplicar.");
    } catch (e) {
      console.error(e);
      toast.error("Falha no upload.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-32 h-16 flex items-center justify-center border border-border overflow-hidden ${
          isDark ? "bg-surface-dark" : "bg-background"
        }`}
      >
        {value ? (
          <img src={value} alt="Logo" className="max-w-full max-h-full object-contain" />
        ) : (
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
            sem logo
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 border border-border px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] hover:bg-surface disabled:opacity-50"
        >
          {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
          {uploading ? "Enviando" : value ? "Trocar PNG" : "Enviar PNG"}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
          >
            <X size={11} /> Remover
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/svg+xml,image/webp"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </div>
    </div>
  );
}

