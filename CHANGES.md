# O'ZGARISHLAR RO'YXATI (Yangilanish v2.0)

Bu hujjatda tizimga kiritilgan barcha tuzatishlar, yangi modullar va deploy yo'riqnomasi keltirilgan.

---

## 1. TUZATILGAN XATOLAR VA XAVFSIZLIK

| # | Muammo | Yechim |
|---|--------|--------|
| 1 | Refresh token ishlatilmasdi — 24 soatdan keyin majburiy logout | Frontend'da **silent refresh** interceptor: 401 kelganda token avtomatik yangilanadi (navbat/queue bilan) |
| 2 | `/auth/refresh` yangi tokenga `role: undefined` yozardi | Rol endi bazadan olinadi, hisob faolligi va inspektor muddati ham tekshiriladi |
| 3 | Rate limiting yo'q edi | Login: 15 daqiqada 10 urinish; umumiy API: daqiqasiga 300 so'rov. `trust proxy` yoqildi (Railway uchun shart) |
| 4 | Bog'liq yozuvlari bor transformatorni o'chirish 500 xato berardi | Schema'da cascade delete (Alert/Maintenance/Inspection/Incident/WorkOrder → o'chadi, WorkPermit → transformersiz qoladi); P2003 xatosi endi tushunarli 409 javob |
| 5 | Hodim transformatorni boshqa hududga "ko'chira olardi" | PUT so'rovida `regionId` o'zgartirish taqiqlandi |
| 6 | Stalba/liniyalarda hudud filtri yo'q edi | PowerPole'ga `regionId` qo'shildi; hodim faqat o'z hududi (va eski hududsiz) obyektlarini ko'radi/o'zgartiradi |
| 7 | Naryad-ijozatda INSPECTOR yozish huquqiga ega edi, hudud tekshiruvi yo'q edi | `inspectorReadOnly` + PUT/DELETE'da hudud tekshiruvi qo'shildi |
| 8 | Audit log faqat login/logout'ni yozardi | Barcha CRUD amallar (transformator, hisoblagich, foydalanuvchi, hudud, podstansiya va h.k.) endi audit'ga tushadi. **Parollar logdan `***` bilan yashiriladi** |
| 9 | 404 handler noto'g'ri joyda edi | Tartib to'g'rilandi (404 → errorHandler) |
| 10 | Foydalanuvchi yaratishda `position` va `avatarUrl` saqlanmasdi (Zod kesib tashlar edi) | Validatsiya sxemasiga qo'shildi |
| 11 | Multer 1.x (zaifliklari ma'lum) | 2.x ga ko'tarildi (`npm install` deploy'da avtomatik) |
| 12 | Rasmlar deploy'da o'chib ketadi | `UPLOAD_DIR` env qo'llab-quvvatlanadi — pastdagi "Railway Volume" bo'limiga qarang |

## 2. YANGI MODUL: HISOBLAGICHLAR (A)

- **Yangi jadvallar:** `meters` (hisoblagich) va `meter_readings` (ko'rsatkichlar tarixi)
- Maydonlar: raqam, egasi (F.I.Sh.), manzil, telefon, turi (bir/uch fazali), model, holat (faol/nofaol/buzilgan/almashtirilgan), plomba №, tarif, o'rnatilgan sana, oxirgi ko'rsatkich, **bir nechta rasm**, izoh
- **"Hisoblagichlar" sahifasi:** hamma ustun bo'yicha qidiruv (raqam/egasi/manzil/telefon/plomba/model/transformator) + filtrlar (transformator, viloyat, holat, tur, rasm bor/yo'q, ko'rsatkich oralig'i, sana oralig'i) + ustun bo'yicha sortlash + CSV eksport
- **Batafsil sahifa:** rasmlar galereyasi (lightbox), oylik iste'mol grafigi, ko'rsatkichlar tarixi, yangi ko'rsatkich kiritish (iste'mol avtomatik hisoblanadi)
- **Transformator sahifasida:** biriktirilgan hisoblagichlar ro'yxati (rasm bilan) va soni
- Mobil telefonda rasm to'g'ridan-to'g'ri kameradan olinadi

## 3. XARITA (B)

- Popup'dagi "Batafsil" tugmasi saqlanib qoldi
- Yangi: marker ustiga **ikki marta bosilsa** to'g'ridan-to'g'ri batafsil sahifa ochiladi
- Popup sarlavhasi (inventar raqami) ham bosiladigan bo'ldi

## 4. QO'SHIMCHA MODULLAR (C)

1. **Tekshiruvlar sahifasi** — INSPECTOR ham tekshiruv kirita oladi (bu uning vazifasi), lekin faqat o'zi kiritganini tahrirlaydi
2. **Hodisalar sahifasi** — avariya jurnali (tur, daraja, vaqt, tavsif)
3. **Ish buyurtmalari sahifasi** — mas'ul hodim, muddat, ustuvorlik, holat
4. **Tuman darajasida biriktirish** — Foydalanuvchilar sahifasida hodimni butun viloyat yoki tanlangan tumanlarga biriktirish mumkin; ro'yxatlar va yozish huquqlari avtomatik cheklanadi
5. **Mening profilim** — ism/telefon/rasm tahrirlash, parol o'zgartirish (o'zgartirilgach barcha sessiyalar bekor qilinadi)
6. **Dashboard yangilandi** — hisoblagichlar statistikasi + oxirgi 6 oy dinamikasi grafigi (transformatorlar, hisoblagichlar, hodisalar, bajarilgan xizmatlar)
7. **CSV eksport** — hisoblagichlar ro'yxati ham eksport qilinadi (Excel'da ochiladi)

---

## DEPLOY YO'RIQNOMASI (Railway)

### 1-qadam. Bazani yangilash (MUHIM!)

Yangi jadvallar (`meters`, `meter_readings`) va ustunlar qo'shildi. GitHub'ga push qilishdan OLDIN yoki keyin Railway'da bir marta bajarish kerak:

**Variant A (tavsiya):** Railway'da backend servisining **Settings → Deploy → Custom Start Command** (yoki `railway.json`) da start buyrug'ini vaqtincha shunday qiling:
```
npx prisma db push --accept-data-loss=false && npm start
```
Aslida `db push` faqat YANGI jadval/ustun qo'shadi — mavjud ma'lumotlar o'chmaydi. Bir marta deploy bo'lgach, buyruqni yana `npm start` ga qaytarsangiz ham bo'ladi (yoki shunday qoldiring — zarari yo'q).

**Variant B:** Kompyuteringizda `.env` ga Railway'ning public `DATABASE_URL` ini yozib:
```bash
cd backend
npx prisma db push
```

### 2-qadam. Rasmlar uchun Railway Volume (bir marta)

Aks holda har deploy'da yuklangan rasmlar o'chadi:
1. Railway'da backend servisini oching → **Settings** → **Volumes** → **Add Volume**
2. Mount path: `/data/uploads`
3. **Variables** ga qo'shing: `UPLOAD_DIR=/data/uploads`
4. Redeploy

### 3-qadam. Push

```bash
git add .
git commit -m "v2.0: hisoblagichlar moduli, xavfsizlik tuzatishlari, yangi sahifalar"
git push
```
Railway avtomatik deploy qiladi (`npm install` yangi multer'ni ham o'rnatadi).

### Tekshirish ro'yxati (deploy'dan keyin)
- [ ] Login ishlayapti, 24 soatdan keyin ham chiqarib yubormaydi
- [ ] "Hisoblagichlar" menyusi ochilyapti, yangi hisoblagich yaratilyapti (rasm bilan)
- [ ] Transformator sahifasida hisoblagichlar ko'rinyapti
- [ ] Ko'rsatkich kiritilganda iste'mol hisoblanyapti
- [ ] Profil → parol o'zgartirish ishlayapti
- [ ] Rasm yuklab, redeploy qilganda rasm saqlanib qolyapti (Volume ulangan bo'lsa)

---

## ESLATMALAR

- **INSPECTOR istisno huquqi:** tekshiruvlar bo'limida INSPECTOR yozuv kirita oladi (uning asosiy vazifasi), qolgan barcha bo'limlarda faqat ko'radi. Agar buni xohlamasangiz, `backend/src/routes/inspection.routes.js` dagi izohga qarang — `inspectorReadOnly` ni qo'shish kifoya.
- `TransformerForm.tsx` da eski (loyihaning avvalgi versiyasidan qolgan) TypeScript ogohlantirishlari bor — ular build'ga xalaqit bermaydi, funksionallikka ta'sir qilmaydi.
- Eksport CSV UTF-8 BOM bilan — Excel o'zbekcha harflarni to'g'ri ochadi.
