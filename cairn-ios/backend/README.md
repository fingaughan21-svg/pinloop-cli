# Shared community backend (Supabase)

Until this is set up, Cairn keeps tips, votes, comments and photos on each phone. Follow
these steps to share them between everyone. Supabase's free tier is plenty to start with.

1. **Create a project** at https://supabase.com (choose the London region for UK users).
2. **Create the tables:** in the dashboard open *SQL Editor → New query*, paste the whole of
   `supabase/schema.sql`, and press *Run*.
3. **Send codes instead of links:** open *Authentication → Emails → Magic Link* and change the
   template body so it includes the code, e.g.
   `<p>Your Cairn sign-in code is <strong>{{ .Token }}</strong></p>`.
4. **Set up email sending:** Supabase's built-in email is rate-limited and for testing only.
   Before launch, add an email provider under *Authentication → SMTP Settings*
   (e.g. Resend or Postmark).
5. **Connect the app:** copy the *Project URL* and *anon public* key from
   *Project Settings → API* into `Cairn/Community/CommunityConfig.swift`, replacing `nil`.

Then rebuild. Sign-in switches to "email me a code", and everything people post is shared.

## Moderation

- Reports land in the `reports` table (*Table Editor → reports*).
- To hide a tip or comment, set its `hidden` column to `true`. Its author still sees it, nobody else does.
- To remove a user and everything they posted, delete them under *Authentication → Users*.
