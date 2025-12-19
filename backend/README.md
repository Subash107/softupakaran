# SoftUpakaran Backend (Upgraded)

Node.js + Express + SQLite backend for your SoftUpakaran store.

This upgraded backend adds:

- ✅ User registration & login (JWT)
- ✅ Admin can view **users** and **customer feedback**
- ✅ Admin can update **WhatsApp number**
- ✅ Admin can upload **eSewa QR** image (served from `/uploads`)
- ✅ Public endpoint to fetch current WhatsApp + eSewa QR for customer checkout pages

---

## Quick start

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

API runs on: **http://localhost:4000**

> First run creates `./data/softupakaran.db` and seeds demo categories/products.

---

## Environment

Edit `.env`:

- `ADMIN_EMAIL` / `ADMIN_PASSWORD` (admin user auto-created if missing)
- `JWT_SECRET` (change this!)
- `ADMIN_TOKEN` (optional legacy token; still works)

---

## Main Endpoints

### Auth
- `POST /api/auth/register` → `{ token }`
- `POST /api/auth/login` → `{ token }`
- `GET /api/me` (Bearer token)

### Public settings (customer side)
- `GET /api/public/settings`
  - returns `{ whatsapp_number, esewa_qr_url }`

### Feedback
- `POST /api/feedback` (optional Bearer token)

### Admin
> Admin auth supports **either**:
> - `Authorization: Bearer <admin jwt>` **or**
> - `x-admin-token: <ADMIN_TOKEN>` (legacy)

- `GET /api/admin/users`
- `GET /api/admin/feedback`
- `PATCH /api/admin/feedback/:id` (set status)
- `PUT /api/admin/settings/whatsapp`
- `POST /api/admin/settings/esewa-qr` (multipart file upload)

### Store
- `GET /api/categories`
- `GET /api/products` (`?category=pubg`)
- `GET /api/products/:id`

### Orders
- `POST /api/orders`
- `GET /api/orders` (admin only)

---

## Examples

### Login as admin
```bash
curl -X POST http://localhost:4000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@softupakaran.local\",\"password\":\"admin12345\"}"
```

### Update WhatsApp number (admin)
```bash
curl -X PUT http://localhost:4000/api/admin/settings/whatsapp ^
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"whatsapp\":\"+97798XXXXXXXX\"}"
```

### Upload eSewa QR (admin)
```bash
curl -X POST http://localhost:4000/api/admin/settings/esewa-qr ^
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" ^
  -F "file=@D:\\path\\to\\esewa-qr.png"
```

Then customers can read it from:
`GET /api/public/settings`
