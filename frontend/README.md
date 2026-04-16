# Transformator Monitoring Tizimi — Frontend

React + TypeScript + Tailwind CSS + Leaflet xarita

## Texnologiyalar

- **React 19** + **TypeScript** — UI framework
- **Vite** — Build tool
- **Tailwind CSS** — Styling
- **React Router 7** — Routing
- **Zustand** — State management
- **Recharts** — Grafiklar
- **Leaflet + React-Leaflet** — Interaktiv xarita
- **Axios** — HTTP client
- **Lucide React** — Ikonlar

## O'rnatish

```bash
cd frontend
npm install
npm run dev
```

Frontend `http://localhost:5173` da ishlaydi.

## Sahifalar

| Sahifa | Yo'l | Tavsif |
|--------|------|--------|
| Login | `/login` | Tizimga kirish |
| Dashboard | `/dashboard` | Statistika, grafiklar |
| Xarita | `/map` | Leaflet xarita, markerlar |
| Hududlar | `/regions` | Viloyat/tumanlar boshqaruvi |
| Podstansiyalar | `/substations` | Podstansiyalar ro'yxati |
| Transformatorlar | `/transformers` | Filtrlash, jadval |
| Yangi Transformer | `/transformers/new` | 6 bosqichli forma |
| Ogohlantirishlar | `/alerts` | System alerts |
| Texnik xizmat | `/maintenance` | Maintenance records |
| Foydalanuvchilar | `/users` | Admin only |
| Audit log | `/audit` | Admin only |

## Rollar

- **ADMIN** — Barcha sahifalar, foydalanuvchi boshqaruvi
- **EMPLOYEE** — O'z hududidagi ma'lumotlar, CRUD
- **INSPECTOR** — Faqat ko'rish, tahrirlash tugmalari yashirin
