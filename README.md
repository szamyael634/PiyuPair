  # Smart Tutoring Marketplace

  This is a code bundle for Smart Tutoring Marketplace. The original project is available at https://www.figma.com/design/6zvCh3G9h0oRPgSJC58rNL/Smart-Tutoring-Marketplace.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Bootstrap the First Admin

  This project stores user profiles in the Supabase KV table `kv_store_824d015e`, so the first admin account needs both:

  1. A Supabase Auth user
  2. A matching profile row in the KV table

  Use the bootstrap script:

  ```bash
  SUPABASE_URL=https://your-project.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
  ADMIN_EMAIL=admin@example.com \
  ADMIN_PASSWORD=ChangeMe123! \
  ADMIN_NAME="Platform Admin" \
  npm run bootstrap:admin
  ```

  Optional:

  - `KV_TABLE` defaults to `kv_store_824d015e`

  On Windows PowerShell:

  ```powershell
  $env:SUPABASE_URL="https://your-project.supabase.co"
  $env:SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
  $env:ADMIN_EMAIL="admin@example.com"
  $env:ADMIN_PASSWORD="ChangeMe123!"
  $env:ADMIN_NAME="Platform Admin"
  npm run bootstrap:admin
  ```
  # Smart Tutoring Marketplace

  This is a code bundle for Smart Tutoring Marketplace. The original project is available at https://www.figma.com/design/6zvCh3G9h0oRPgSJC58rNL/Smart-Tutoring-Marketplace.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.
  