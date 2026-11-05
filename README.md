# MomoSip Online Ordering & Management System

A responsive café ordering website with three connected experiences:
- Public customer menu and online order submission
- Individual staff login with a point-of-sale order screen and order status management
- Super Admin portal for products, categories, banners, orders, and staff accounts

Business context: **MomoSip — Unniyal Beach**.

## 1. What you need

- A Supabase account and a new Supabase project
- Node.js 20+ installed on your computer
- A GitHub account (for hosting)

## 2. Configure Supabase

1. Create a project at https://supabase.com.
2. Open **SQL Editor → New query**.
3. Copy and run the complete file `supabase/migrations/0001_momosip.sql`.
4. Open **Authentication → Users → Add user** and create your owner/admin account.
5. In SQL Editor, promote that account to Super Admin (replace the email):

   ```sql
   update public.profiles
   set role = 'super_admin', full_name = 'MomoSip Owner', is_active = true
   where email = 'YOUR-ADMIN-EMAIL';
   ```

6. Copy the Project URL and anon/public key from **Project Settings → API**. The anon key is intended for browser use; never expose the service-role key.

## 3. Configure the staff-management function

The Super Admin portal creates individual staff logins through a protected Supabase Edge Function.

Install the Supabase CLI, log in, link your project, then run:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy manage-staff
```

Supabase provides `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to deployed Edge Functions. Do not put the service-role key in `.env` or frontend code.

## 4. Run the website locally

```bash
npm install
cp .env.example .env
```

Edit `.env`:

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
VITE_WHATSAPP_NUMBER=919999999999
```

Then:

```bash
npm run dev
```

Open the local URL printed by Vite. Test with your admin login.

## 5. Create staff accounts

1. Sign in using the owner account.
2. Open **Staff accounts**.
3. Enter each staff member's name, email and temporary password (minimum 8 characters).
4. Share their individual login credentials securely.
5. Staff use the same **Staff / Admin Login** entry point. Their role determines which portal they see.

Staff can create orders and update order statuses. They cannot manage products, banners, categories, or accounts. The database also enforces these permissions with Row Level Security.

## 6. Add products and banners

- Super Admin → Products: add/edit/delete products, set price, category, veg/non-veg and availability, upload an image.
- Super Admin → Categories: add or delete menu categories.
- Super Admin → Banners: add/edit/delete homepage banners and upload banner images.
- Super Admin → Orders: see all orders and update statuses.
- Super Admin → Staff accounts: create and disable staff logins.

The public menu only displays products marked available and active banners.

## 7. Deploy online

Recommended: Vercel or Netlify for the Vite frontend.

Build command: `npm run build`  
Output directory: `dist`

Add the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment variables in the hosting dashboard, then deploy. Connect your GitHub repository for automatic redeployment.

Supabase is the shared backend, so the public menu, staff devices and admin devices all use the same live data. Enable HTTPS on the deployed domain.

## Important notes before going live

- The WhatsApp number in `.env.example` is only a placeholder; this implementation currently saves customer orders directly to the online order database and does not send WhatsApp messages.
- The public ordering flow calculates prices on the server/database, not from browser-submitted prices.
- The first admin must be promoted manually in SQL. Never make public sign-up available for admin roles.
- Add your actual MomoSip product list, prices, descriptions, and banner images in the Super Admin portal.
- Configure Supabase Auth email/password policies, backups, and production domain settings before launch.
- For production, add payment gateway integration only after selecting the payment provider and merchant account.
