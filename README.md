# Smart Tutoring Marketplace

This project is a tutoring platform frontend (Vite + React) backed by Supabase Auth, Edge Functions, and a KV-style table for app data.

## Run Locally

1. Install dependencies:

```bash
npm i
```

2. Start the development server:

```bash
npm run dev
```

## Environment Variables

The app supports env vars for deployment while keeping safe local fallbacks.

Required for production:

- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY
- VITE_SUPABASE_ANON_JWT

Optional:

- VITE_SUPABASE_PROJECT_ID

## Bootstrap the First Admin

This project stores user profiles in the KV table `kv_store_824d015e`, so the first admin needs both:

1. A Supabase Auth user
2. A matching profile row in the KV table

Run:

```bash
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
ADMIN_EMAIL=admin@example.com \
ADMIN_PASSWORD=ChangeMe123! \
ADMIN_NAME="Platform Admin" \
npm run bootstrap:admin
```

Optional:

- KV_TABLE defaults to `kv_store_824d015e`

PowerShell example:

```powershell
$env:SUPABASE_URL="https://your-project.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
$env:ADMIN_EMAIL="admin@example.com"
$env:ADMIN_PASSWORD="ChangeMe123!"
$env:ADMIN_NAME="Platform Admin"
npm run bootstrap:admin
```

## Deploy (Vercel)

1. Import this GitHub repository in Vercel.
2. Framework preset: Vite.
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add the production env vars listed above.
