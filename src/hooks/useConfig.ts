import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ConfigMap = Record<string, string>;

let cache: ConfigMap | null = null;
const subs = new Set<(c: ConfigMap) => void>();

async function load() {
  const { data, error } = await supabase
    .from("configuracoes_gerais")
    .select("chave,valor");
  if (error) {
    console.error("[config] load error", error);
    return;
  }
  const map: ConfigMap = {};
  for (const row of data ?? []) map[row.chave as string] = (row.valor as string) ?? "";
  cache = map;
  subs.forEach((s) => s(map));
}

/** Lê configuracoes_gerais como mapa chave→valor. Cache em memória. */
export function useConfig() {
  const [config, setConfig] = useState<ConfigMap>(cache ?? {});
  const [loading, setLoading] = useState(cache === null);

  useEffect(() => {
    const handler = (c: ConfigMap) => {
      setConfig(c);
      setLoading(false);
    };
    subs.add(handler);
    if (cache === null) load();
    else setLoading(false);
    return () => {
      subs.delete(handler);
    };
  }, []);

  return { config, loading, reload: load };
}
