create policy "dev allow insert provider_accounts"
on public.provider_accounts
for insert
with check (true);
create policy "dev allow insert provider_tokens"
on public.provider_tokens
for insert
with check (true);