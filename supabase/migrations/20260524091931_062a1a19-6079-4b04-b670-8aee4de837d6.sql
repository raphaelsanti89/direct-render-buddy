
drop policy if exists "Anyone submits lead" on public.leads;
create policy "Anyone submits lead with email"
  on public.leads
  for insert
  with check (email is not null and char_length(email) between 4 and 255);
