/**
 * Creates the first staff account -- the one that exists before anyone can
 * sign in and use the Team page to invite the rest.
 *
 * Does exactly what the in-app invite does: asks Supabase to mint a one-time
 * invite token and prints the link. Open it in a browser to set a password.
 *
 *   npm run invite -- you@example.com
 *   SITE_URL=https://your-app.vercel.app npm run invite -- you@example.com
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local', quiet: true })

async function main() {
  const email = process.argv[2]?.trim().toLowerCase()
  if (!email || !email.includes('@')) {
    console.error('Usage: npm run invite -- you@example.com')
    process.exit(1)
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
    process.exit(1)
  }

  const site = (process.env.SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')

  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await admin.auth.admin.generateLink({ type: 'invite', email })
  if (error) {
    console.error('Could not create invite:', error.message)
    process.exit(1)
  }

  const link = `${site}/auth/confirm?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=invite`

  console.log(`\nInvite created for ${email}. Open this link once to set a password:\n`)
  console.log(`  ${link}\n`)
  console.log(`The app must be running at ${site} for the link to work.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
