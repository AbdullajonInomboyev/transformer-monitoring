# Transformator Monitoring Tizimi

O'zbekiston Respublikasi miqyosidagi transformatorlar monitoring tizimi.

## Xususiyatlar

- 3 foydalanuvchi roli: Admin, Hodim, Tekshiruvchi
- Interaktiv xarita (Leaflet + OpenStreetMap)
- Hudud poligoni: Admin xaritada qizil chegara chizadi
- GPS lokatsiya aniqlash
- Rasm yuklash (galereya va kamera)
- Dashboard grafiklar va statistika
- 15 viloyat va tumanlar
- Audit log

## Lokal ishga tushirish

### Backend
```bash
cd backend
npm install
cp .env.example .env
# .env da DATABASE_URL ni o'zgartiring
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

### Frontend (yangi terminal)
```bash
cd frontend
npm install
npm run dev
```

Brauzer: http://localhost:5173

## Demo login
- Admin: admin@transformer.uz / Admin@2026!
- Hodim: hodim@transformer.uz / Hodim@2026!
- Tekshiruvchi: tekshiruvchi@transformer.uz / Tekshir@2026!

## Railway ga deployment

Batafsil qo'llanma: `RAILWAY_DEPLOYMENT.md` faylida
