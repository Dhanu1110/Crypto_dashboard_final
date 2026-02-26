
ALTER TABLE public.profiles
ADD COLUMN email_alerts_enabled boolean NOT NULL DEFAULT true,
ADD COLUMN email_portfolio_summary boolean NOT NULL DEFAULT true;
