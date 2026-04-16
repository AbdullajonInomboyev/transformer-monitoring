# Railway ga Deployment

Transformator Monitoring tizimini Railway.app ga joylashtirish bo'yicha to'liq qo'llanma.

## Talablar

- GitHub hisob
- Railway.app hisob ([railway.app](https://railway.app) da ro'yxatdan o'ting)
- Loyiha GitHub repozitoriyasida bo'lishi kerak

## 1-qadam: GitHub ga yuklash

Loyihani GitHub ga yuklang:

```bash
cd transformer-monitoring
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/transformer-monitoring.git
git push -u origin main
```

## 2-qadam: Railway da yangi proyekt

1. [railway.app](https://railway.app) ga kiring
2. **"New Project"** bosing
3. **"Deploy from GitHub repo"** tanlang
4. Loyihangizni tanlang

## 3-qadam: PostgreSQL qo'shish

1. Proyekt ichida **"+ New"** bosing
2. **"Database"** → **"PostgreSQL"** tanlang
3. Railway avtomatik PostgreSQL yaratadi
4. `DATABASE_URL` avtomatik sozlanadi

## 4-qadam: Backend service qo'shish

1. **"+ New"** → **"GitHub Repo"** tanlang
2. Loyihani tanlang
3. **Settings** → **Root Directory** ni `backend` ga o'zgartiring
4. **Variables** bo'limida quyidagilarni qo'shing:

```
NODE_ENV=production
JWT_SECRET=<kuchli-tasodifiy-string>
JWT_REFRESH_SECRET=<boshqa-kuchli-string>
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGIN=https://frontend-url.railway.app
ADMIN_EMAIL=admin@transformer.uz
ADMIN_PASSWORD=Admin@2026!
ADMIN_NAME=Super Admin
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

Eslatma: `DATABASE_URL` da `${{Postgres.DATABASE_URL}}` yozing — Railway avtomatik ulanadi.

5. **Deploy** bosing

6. Deploy tugagach, **Shell** oching va seed qiling:
```bash
npm run db:seed
```

## 5-qadam: Frontend service qo'shish

1. **"+ New"** → **"GitHub Repo"** tanlang (o'sha loyihani)
2. **Settings** → **Root Directory** ni `frontend` ga o'zgartiring
3. **Variables** qo'shing:

```
VITE_API_URL=https://backend-url.railway.app/api
```

4. **Deploy** bosing

## 6-qadam: Domain sozlash

1. Backend service → **Settings** → **Networking** → **Generate Domain** bosing
2. Frontend service → **Settings** → **Networking** → **Generate Domain** bosing
3. Har ikkisining URL ini oling

## 7-qadam: URL larni yangilash

Backend Variables ga qaytib, `CORS_ORIGIN` ni frontend URL bilan yangilang:
```
CORS_ORIGIN=https://frontend-abc123.up.railway.app
```

Frontend Variables ga qaytib, `VITE_API_URL` ni backend URL bilan yangilang:
```
VITE_API_URL=https://backend-abc123.up.railway.app/api
```

Har ikkisini qayta deploy qiling.

## Tayyor!

Saytingiz Railway da ishlaydi:
- Frontend: `https://frontend-abc123.up.railway.app`
- Backend API: `https://backend-abc123.up.railway.app`

**Login:**
- Admin: `admin@transformer.uz` / `Admin@2026!`
- Hodim: `hodim@transformer.uz` / `Hodim@2026!`
- Tekshiruvchi: `tekshiruvchi@transformer.uz` / `Tekshir@2026!`

## Tavsiyalar

**Xavfsizlik:**
- `JWT_SECRET` va `ADMIN_PASSWORD` ni kuchli qilib o'zgartiring
- Production da `NODE_ENV=production` bo'lsin
- Admin parolini birinchi kirishdan keyin o'zgartiring

**Fayl yuklash:**
- Railway ephemeral storage (deployment da fayllar yo'qoladi)
- Uzoq muddatli saqlash uchun AWS S3 yoki Cloudinary qo'shing
- Yoki Railway Volume ishlatishingiz mumkin

**Database backup:**
- Railway da PostgreSQL avtomatik backup qiladi
- Dashboardda **Database** → **Backups** ni tekshiring

## Muammolar

**Deploy xatolik:** Logs ni tekshiring (Deployments → View Logs)

**Database ulanmayapti:** `DATABASE_URL` ni tekshiring, Postgres service ishlayotganini tekshiring

**CORS xatolik:** `CORS_ORIGIN` da frontend URL to'g'ri yozilganini tekshiring
