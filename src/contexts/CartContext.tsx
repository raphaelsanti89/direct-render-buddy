import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { PrecosItem } from "@/lib/preco";

export type CartItemKind = "produto" | "kit";

export type CartItem = {
  kind: CartItemKind;
  id: string;
  slug: string;
  nome: string;
  imagem: string | null;
  precos: PrecosItem;
  qty: number;
};

type Ctx = {
  items: CartItem[];
  count: number;
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  setQty: (kind: CartItemKind, id: string, qty: number) => void;
  remove: (kind: CartItemKind, id: string) => void;
  clear: () => void;
};

const CartContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "gama:cart:v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as CartItem[]);
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items, hydrated]);

  const ctx = useMemo<Ctx>(
    () => ({
      items,
      count: items.reduce((s, i) => s + i.qty, 0),
      add: (item, qty = 1) =>
        setItems((prev) => {
          const idx = prev.findIndex((p) => p.kind === item.kind && p.id === item.id);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], qty: copy[idx].qty + qty };
            return copy;
          }
          return [...prev, { ...item, qty }];
        }),
      setQty: (kind, id, qty) =>
        setItems((prev) =>
          prev
            .map((p) => (p.kind === kind && p.id === id ? { ...p, qty: Math.max(0, qty) } : p))
            .filter((p) => p.qty > 0),
        ),
      remove: (kind, id) => setItems((prev) => prev.filter((p) => !(p.kind === kind && p.id === id))),
      clear: () => setItems([]),
    }),
    [items],
  );

  return <CartContext.Provider value={ctx}>{children}</CartContext.Provider>;
}

export function useCart(): Ctx {
  const c = useContext(CartContext);
  if (!c) throw new Error("useCart must be used inside CartProvider");
  return c;
}
