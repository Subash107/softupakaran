# SoftUpakaran – Kunyo-style UI (Static) + Docker (Port 8081)

This is a **static** storefront UI (HTML/CSS/JS) with:
- Categories / collections
- Product grid
- Product details page
- Cart modal (localStorage)
- Responsive dark UI

## Run with Docker (recommended)
From this folder:
```powershell
docker compose up --build
```

Open:
- http://localhost:8081

Stop:
```powershell
docker compose down
```

## Run without Docker
### Python
```powershell
python -m http.server 8081
```
Open:
- http://localhost:8081

## Replace products/images later
Edit `app.js`:
- `categories`
- `products`

Replace images in `/assets` with your real images and update paths if needed.


## Checkout: WhatsApp + eSewa QR
This build changes the Cart **Checkout** button to open a payment modal.

To set your WhatsApp and eSewa QR:
- Open `app.js` and edit:
  - `WHATSAPP_NUMBER`
  - `ESEWA_QR_IMAGE`

Replace the QR image by putting your file in `/assets` (example: `assets/esewa-qr.png`) and update `ESEWA_QR_IMAGE`.
