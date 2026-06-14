-- Catégorie manuelle optionnelle pour les articles de courses.
-- NULL = catégorie auto-déduite du nom (lib/grocery-category.ts).
alter table public.groceries add column if not exists category text;
