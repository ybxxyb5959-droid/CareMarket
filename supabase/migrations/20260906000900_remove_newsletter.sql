-- Retire the newsletter feature and its test subscriptions.
-- Keep the applied creation migration for consistent database history.
drop table if exists public.newsletter_subscribers;
