import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Props = {
  value: string[];
  onChange: (urls: string[]) => void;
  folder: string;
  max?: number;
};

export function ImageUpload({ value, onChange, folder, max = 6 }: Props) {
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || !files.length) return;
    if (value.length + files.length > max) {
      toast.error(`Máximo ${max} imagens`);
      return;
    }
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${folder}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("catalogo").upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });
        if (error) throw error;
        const { data } = supabase.storage.from("catalogo").getPublicUrl(path);
        uploaded.push(data.publicUrl);
      }
      onChange([...value, ...uploaded]);
      toast.success(`${uploaded.length} imagem(ns) enviada(s)`);
    } catch (e) {
      console.error(e);
      toast.error("Falha no upload");
    } finally {
      setUploading(false);
    }
  }

  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  return (
    <div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {value.map((url, i) => (
          <div key={url} className="relative group aspect-square bg-surface border border-border overflow-hidden">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute top-1 right-1 bg-background/90 p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gold hover:text-background"
              aria-label="Remover"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        {value.length < max && (
          <label className="aspect-square flex flex-col items-center justify-center gap-2 border border-dashed border-border bg-surface hover:bg-background cursor-pointer transition-colors">
            {uploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} strokeWidth={1.25} />}
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
              {uploading ? "Enviando" : "Adicionar"}
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              multiple
              className="hidden"
              disabled={uploading}
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>
        )}
      </div>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {value.length}/{max} · JPG, PNG, WEBP, AVIF · até 10 MB cada
      </p>
    </div>
  );
}
