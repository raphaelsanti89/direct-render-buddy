## Promover conta para admin

Vou executar uma atualização no banco para promover o usuário `raphaelb.d.a@gmail.com` ao papel `admin`.

### O que será feito

1. Localizar o `user_id` correspondente ao email `raphaelb.d.a@gmail.com` em `auth.users`.
2. Atualizar a linha em `public.user_roles` desse usuário de `customer` para `admin` (ou inserir caso não exista).

### SQL previsto

```sql
UPDATE public.user_roles
SET role = 'admin'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'raphaelb.d.a@gmail.com');
```

(Com fallback de INSERT caso a linha ainda não exista.)

### Após a execução

- Faça logout e login novamente em `/login` para que o token reflita o novo papel.
- O acesso a `/admin` ficará liberado.
- Em seguida, podemos seguir para a **Fase 2 — Catálogo de produtos** (CRUD de categorias, produtos e kits no painel admin).

Confirme para eu aplicar a promoção.