# Auth email templates

Postbase-branded versions of Supabase's auth emails. Supabase doesn't read these
files: paste each one into **Supabase → Authentication → Emails → Templates**.
The first line of each file is the subject to use.

| File | Supabase template |
| --- | --- |
| `confirm-signup.html` | Confirm signup (new users) |
| `magic-link.html` | Magic link (returning users) |
| `invite.html` | Invite user |
| `change-email.html` | Change email address |
| `reset-password.html` | Reset password |

They are sent through custom SMTP (Resend, from the `postbase.so` domain), set in
Authentication → Emails → SMTP Settings. The "expires in 1 hour" copy matches the
default email OTP expiry (Authentication → Providers → Email).
