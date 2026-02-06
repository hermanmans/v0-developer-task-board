const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_URL',
  'SUPABASE_JWT_SECRET',
  'SUPABASE_SERVICE_ROLE_KEY',
]

const missing = required.filter((k) => !process.env[k])
if (missing.length > 0) {
  console.error('\nMissing required environment variables:')
  missing.forEach((k) => console.error('- ' + k))
  console.error('\nSet these in Vercel (Project → Settings → Environment Variables) or in your local .env')
  process.exit(1)
}

console.log('Environment check passed')
