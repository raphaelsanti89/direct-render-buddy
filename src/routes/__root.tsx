import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect } from "react";

import appCss from "../styles.css?url";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { FloatingWhatsApp } from "@/components/FloatingWhatsApp";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import { CartProvider } from "@/contexts/CartContext";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold">404</p>
        <h1 className="mt-6 font-display text-5xl text-foreground">Página não encontrada</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
        <a
          href="/"
          className="mt-8 inline-flex items-center justify-center rounded-sm bg-foreground px-6 py-3 text-xs uppercase tracking-[0.18em] text-background transition-colors hover:bg-gold"
        >
          Voltar ao início
        </a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-3xl text-foreground">Algo não carregou</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Tente novamente em instantes.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-sm bg-foreground px-6 py-3 text-xs uppercase tracking-[0.18em] text-background hover:bg-gold transition-colors"
          >
            Tentar de novo
          </button>
        </div>
      </div>
    </div>
  );
}

const SITE_URL = "https://gamasensacoes.com.br";
const SITE_NAME = "Gama Sensações";
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.jpg`;

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Gama Sensações — Aromas, marketing sensorial e ambientação" },
      {
        name: "description",
        content:
          "Aromas que despertam sensações, criam memórias e transformam ambientes. Catálogo premium, kits sensoriais e linha corporativa B2B.",
      },
      {
        name: "keywords",
        content:
          "aromatizadores, marketing sensorial, aromas premium, home spray, difusores, velas aromáticas, ambientação corporativa, B2B, Gama Sensações",
      },
      { name: "author", content: SITE_NAME },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { name: "theme-color", content: "#ffffff" },
      { name: "msapplication-TileColor", content: "#ffffff" },
      { name: "format-detection", content: "telephone=no" },
      { name: "google-site-verification", content: "VnSXyiK1NmchG_WaurS1H8TPs_Gpj-kfkKQ0tGoZ4ms" },

      { property: "og:site_name", content: SITE_NAME },
      { property: "og:title", content: "Gama Sensações — Aromas, marketing sensorial e ambientação" },
      {
        property: "og:description",
        content: "Marketing sensorial premium, aromatização de ambientes e catálogo exclusivo.",
      },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "pt_BR" },
      { property: "og:url", content: SITE_URL },
      { property: "og:image", content: DEFAULT_OG_IMAGE },

      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Gama Sensações — Aromas, marketing sensorial e ambientação" },
      { name: "twitter:description", content: "Pixel Perfect implements a dynamic e-commerce platform with B2B and retail pricing, order management, and WhatsApp checkout." },
      { name: "twitter:image", content: DEFAULT_OG_IMAGE },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Montserrat:wght@300;400;500;600&family=DM+Mono:wght@300;400;500&display=swap" },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicons/favicon-16x16.png" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicons/favicon-32x32.png" },
      { rel: "apple-touch-icon", sizes: "57x57", href: "/favicons/apple-touch-icon-57x57.png" },
      { rel: "apple-touch-icon", sizes: "60x60", href: "/favicons/apple-touch-icon-60x60.png" },
      { rel: "apple-touch-icon", sizes: "72x72", href: "/favicons/apple-touch-icon-72x72.png" },
      { rel: "apple-touch-icon", sizes: "76x76", href: "/favicons/apple-touch-icon-76x76.png" },
      { rel: "icon", type: "image/png", sizes: "96x96", href: "/favicons/apple-touch-icon-96x96.png" },
      { rel: "apple-touch-icon", sizes: "114x114", href: "/favicons/apple-touch-icon-114x114.png" },
      { rel: "apple-touch-icon", sizes: "120x120", href: "/favicons/apple-touch-icon-120x120.png" },
      { rel: "apple-touch-icon", sizes: "144x144", href: "/favicons/apple-touch-icon-144x144.png" },
      { rel: "apple-touch-icon", sizes: "152x152", href: "/favicons/apple-touch-icon-152x152.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/favicons/apple-touch-icon-180x180.png" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/favicons/android-icon-192x192.png" },
      { rel: "manifest", href: "/site.webmanifest" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: SITE_NAME,
          url: SITE_URL,
          description: "Aromas premium, marketing sensorial e ambientação para casa, hotelaria e empresas.",
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <Layout />
      </CartProvider>
    </QueryClientProvider>
  );
}

function Layout() {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdmin = pathname.startsWith("/admin") || pathname === "/login";

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      router.invalidate();
    });
    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <>
      {!isAdmin && <Navbar />}
      <main className={isAdmin ? "" : "pt-0"}>
        <Outlet />
      </main>
      {!isAdmin && <Footer />}
      {!isAdmin && <FloatingWhatsApp />}
      <Toaster position="top-center" />
    </>
  );
}
