# Transformator Monitoring Tizimi — Backend API

Davlat miqyosidagi transformatorlar monitoring tizimi.

## Texnologiyalar

- **Node.js** + **Express** — API server
- **PostgreSQL** — Ma'lumotlar bazasi
- **Prisma ORM** — Bazaga ulanish
- **JWT** — Autentifikatsiya
- **Zod** — Validatsiya
- **bcryptjs** — Parol shifrlash

## O'rnatish

### 1. Paketlarni o'rnatish

```bash
cd backend
npm install
```

### 2. PostgreSQL bazasini yaratish

```sql
CREATE DATABASE transformer_db;
```

### 3. Environment sozlash

```bash
cp .env.example .env
# .env faylida DATABASE_URL ni o'zgartiring
```

### 4. Migratsiya va Seed

```bash
npx prisma migrate dev --name init
npm run db:seed
```

### 5. Serverni ishga tushirish

```bash
npm run dev
```

Server `http://localhost:5000` da ishlaydi.

## API Endpointlar

### Auth
| Method | Endpoint | Tavsif |
|--------|----------|--------|
| POST | `/api/auth/login` | Tizimga kirish |
| POST | `/api/auth/refresh` | Token yangilash |
| POST | `/api/auth/logout` | Tizimdan chiqish |
| GET | `/api/auth/me` | Joriy foydalanuvchi |

### Users (faqat ADMIN)
| Method | Endpoint | Tavsif |
|--------|----------|--------|
| GET | `/api/users` | Ro'yxat |
| POST | `/api/users` | Yangi yaratish |
| PUT | `/api/users/:id` | Tahrirlash |
| DELETE | `/api/users/:id` | O'chirish |

### Regions
| Method | Endpoint | Tavsif |
|--------|----------|--------|
| GET | `/api/regions` | Viloyatlar |
| GET | `/api/regions/all` | Dropdown uchun |
| POST | `/api/regions` | Yangi (ADMIN) |

### Transformers
| Method | Endpoint | Tavsif |
|--------|----------|--------|
| GET | `/api/transformers` | Ro'yxat (filtrlar) |
| GET | `/api/transformers/map` | Xarita uchun |
| GET | `/api/transformers/:id` | Batafsil |
| POST | `/api/transformers` | Yangi yaratish |
| PUT | `/api/transformers/:id` | Tahrirlash |
| DELETE | `/api/transformers/:id` | O'chirish |

### Dashboard
| Method | Endpoint | Tavsif |
|--------|----------|--------|
| GET | `/api/dashboard/overview` | Umumiy statistika |
| GET | `/api/dashboard/region-capacity` | Hudud quvvati |
| GET | `/api/dashboard/critical-transformers` | Kritik ro'yxat |

## Rollar

| Rol | Huquqlar |
|-----|----------|
| **ADMIN** | To'liq boshqaruv, foydalanuvchi yaratish |
| **EMPLOYEE** | O'z hududida CRUD |
| **INSPECTOR** | Vaqtincha faqat ko'rish |

## Demo Login

```
Admin:        admin@transformer.uz / Admin@2026!
Hodim:        hodim@transformer.uz / Hodim@2026!
Tekshiruvchi: tekshiruvchi@transformer.uz / Tekshir@2026!
```
