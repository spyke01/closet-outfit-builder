# Branded auth email templates (Supabase Auth)

Use these to replace Supabase's default auth emails with your branded templates.

## 1) Template files

- Confirm signup: `supabase/templates/confirmation.html`
- Invite user: `supabase/templates/invite-user.html`
- Magic link: `supabase/templates/magic-link.html`
- Change email address: `supabase/templates/change-email-address.html`
- Reset password: `supabase/templates/reset-password.html`
- Reauthentication: `supabase/templates/reauthentication.html`

## 2) Update templates in Supabase Dashboard

1. Open your Supabase project.
2. Go to `Authentication` -> `Email Templates`.
3. For each template below, paste the matching HTML file:
   - `Confirm signup` -> `supabase/templates/confirmation.html`
   - `Invite user` -> `supabase/templates/invite-user.html`
   - `Magic Link` -> `supabase/templates/magic-link.html`
   - `Change Email Address` -> `supabase/templates/change-email-address.html`
   - `Reset Password` -> `supabase/templates/reset-password.html`
   - `Reauthentication` -> `supabase/templates/reauthentication.html`
4. Recommended subjects:
   - Confirm signup: `Confirm your My AI Outfit account`
   - Invite user: `You're invited to My AI Outfit`
   - Magic link: `Your My AI Outfit sign-in link`
   - Change email address: `Confirm your new My AI Outfit email`
   - Reset password: `Reset your My AI Outfit password`
   - Reauthentication: `Confirm it's you`
5. Save each template and send test emails.

## 3) Verify redirect and sender settings

In `Authentication` -> `URL Configuration`:

- Ensure `Site URL` is your production domain.
- Ensure `Redirect URLs` include your auth confirm callback URL.

In `Authentication` -> `Settings`:

- Configure a branded sender name/email and custom SMTP provider if needed.

## Notes

- The template uses Supabase variables `{{ .ConfirmationURL }}` and `{{ .SiteURL }}`.
- It is designed with inline CSS and table layout for Gmail/Outlook compatibility.
- Templates include your hosted logo and switch between light/dark variants where supported.
