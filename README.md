
  # Tutoring Platform Development

  This is a code bundle for Tutoring Platform Development. The original project is available at https://www.figma.com/design/rEHzVxnjMdeiS9UQPQiaZn/Tutoring-Platform-Development.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Stripe payment demo

  The `/payment` page uses a Supabase Edge Function to create a Stripe Checkout Session and then redirects the browser to Stripe.

  Required Edge Function environment variables:
  - `STRIPE_SECRET_KEY` (Stripe *test* secret key, starts with `sk_test_...`)
  - `FRONTEND_URL` (base URL of the frontend, e.g. `http://localhost:5173`)

  Endpoint used by the frontend:
  - `POST /functions/v1/server/make-server-45108270/stripe/create-checkout-session`

  ## Supabase (public) config

  The frontend reads these from Vite env vars (with fallbacks for local demo):
  - `VITE_SUPABASE_PROJECT_ID`
  - `VITE_SUPABASE_ANON_KEY`

  ## Floating support chat + tickets

  A floating Support button appears in the bottom-right of the app. It has:
  - **Chat**: asks questions to a simple bot endpoint
  - **File Ticket**: submits a ticket that developers can review in the Supabase `kv_store_45108270` table

  Endpoints used by the frontend:
  - `POST /functions/v1/server/make-server-45108270/support/chat`
  - `POST /functions/v1/server/make-server-45108270/support/ticket`
  