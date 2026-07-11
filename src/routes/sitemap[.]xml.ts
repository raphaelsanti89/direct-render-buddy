import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BASE_URL = "https://gamasensacoes.com.br";

export const Route = createFileRoute("/sitemap.xml")({
  // `server.handlers` is added by @tanstack/start-client-core via module
  // augmentation. The augmentation isn't picked up in this project's
  // strict tsconfig, so we cast the options here.
  ...({ server: {
    handlers: {
      GET: async () => {
        const staticEntries = [
          { path: "/", priority: "1.0", changefreq: "weekly" },
          { path: "/produtos", priority: "0.9", changefreq: "daily" },
          { path: "/kits", priority: "0.9", changefreq: "weekly" },
          { path: "/categorias", priority: "0.8", changefreq: "weekly" },
          { path: "/cadastro-b2b", priority: "0.6", changefreq: "monthly" },
          { path: "/cadastro-assinatura", priority: "0.6", changefreq: "monthly" },
        ];

        const [produtos, kits, categorias] = await Promise.all([
          supabaseAdmin.from("produtos").select("slug, updated_at").eq("ativo", true),
          supabaseAdmin.from("kits").select("slug").eq("ativo", true),
          supabaseAdmin.from("categorias").select("slug"),
        ]);

        const dynamicUrls: string[] = [];
        for (const p of produtos.data ?? []) {
          if (!p.slug) continue;
          dynamicUrls.push(
            `  <url><loc>${BASE_URL}/produto/${p.slug}</loc>${p.updated_at ? `<lastmod>${new Date(p.updated_at).toISOString()}</lastmod>` : ""}<changefreq>weekly</changefreq><priority>0.8</priority></url>`,
          );
        }
        for (const k of kits.data ?? []) {
          if (!k.slug) continue;
          dynamicUrls.push(
            `  <url><loc>${BASE_URL}/kit/${k.slug}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`,
          );
        }
        for (const c of categorias.data ?? []) {
          if (!c.slug) continue;
          dynamicUrls.push(
            `  <url><loc>${BASE_URL}/categorias?cat=${c.slug}</loc><changefreq>weekly</changefreq><priority>0.6</priority></url>`,
          );
        }

        const staticUrls = staticEntries.map(
          (e) =>
            `  <url><loc>${BASE_URL}${e.path}</loc><changefreq>${e.changefreq}</changefreq><priority>${e.priority}</priority></url>`,
        );

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticUrls, ...dynamicUrls].join("\n")}
</urlset>`;

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
