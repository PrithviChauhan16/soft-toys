# PEPE KUN — Functional Supabase version

This package keeps the original PEPE KUN visual design, banner, collection photos, showcase section, product quick-view, and page structure. The changes are focused on making the existing features work with Supabase.

## Included pages
- `index.html` — original shop page
- `cart.html` — persistent cart, quantity controls, remove, checkout
- `login.html` — Supabase login and sign-up
- `admin.html` — protected admin dashboard, products, categories, orders and enquiries
- `script.js` — shop functionality
- `style.css` — original styling
- `ChatGPT Image Sep 13, 2026, 02_19_44 AM.png` — original PEPE KUN banner
- `SUPABASE_SETUP.sql` — database/RLS setup and categories table

## Supabase tables
The site uses:
- `products`
- `carts`
- `orders`
- `enquiries`
- `categories` (for persistent Admin Categories)

If your first four tables already exist, do not recreate them blindly. The SQL uses `create table if not exists` and recreates the relevant policies. Run it in the Supabase SQL editor if you need to apply the RLS/category setup.

## Admin
Admin email used by the website:
`admin@pepekun.com`

The admin page checks the signed-in Supabase account email, and the SQL policies also restrict admin database writes to that email.

## GitHub Pages Auth
In Supabase Dashboard → Authentication → URL Configuration, set your Site URL to your GitHub Pages address, for example:

https://prithvichauhan16.github.io/pepefinal/

Make sure the same address is allowed for authentication redirects.

## What is saved
- Products: Supabase
- Categories: Supabase after the category table migration
- Signed-in carts: Supabase
- Orders and delivery details: Supabase
- Contact enquiries: Supabase
- Guest cart: LocalStorage until the user signs in; it is then merged with the saved account cart.

## Important
The frontend uses the Supabase anon key. Do not put a Supabase `service_role` key into these files.
