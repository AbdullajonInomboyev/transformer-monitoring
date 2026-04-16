const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// O'zbekiston viloyatlari
const regions = [
  { name: 'Toshkent shahri', nameRu: 'Город Ташкент', nameEn: 'Tashkent City', code: 'TK', population: 2594500, areaKm2: 334.8 },
  { name: 'Toshkent viloyati', nameRu: 'Ташкентская область', nameEn: 'Tashkent Region', code: 'TV', population: 2920200, areaKm2: 15300 },
  { name: 'Samarqand', nameRu: 'Самарканд', nameEn: 'Samarkand', code: 'SM', population: 551200, areaKm2: 120 },
  { name: 'Buxoro', nameRu: 'Бухара', nameEn: 'Bukhara', code: 'BH', population: 282900, areaKm2: 91 },
  { name: 'Xiva', nameRu: 'Хива', nameEn: 'Khiva', code: 'KV', population: 92000, areaKm2: 62 },
  { name: 'Namangan', nameRu: 'Наманган', nameEn: 'Namangan', code: 'NM', population: 475300, areaKm2: 145 },
  { name: 'Andijon', nameRu: 'Андижан', nameEn: 'Andijan', code: 'AN', population: 447600, areaKm2: 74 },
  { name: "Farg'ona", nameRu: 'Фергана', nameEn: 'Fergana', code: 'FG', population: 264300, areaKm2: 95 },
  { name: 'Qarshi', nameRu: 'Карши', nameEn: 'Karshi', code: 'QR', population: 258100, areaKm2: 78 },
  { name: 'Navoiy', nameRu: 'Навои', nameEn: 'Navoi', code: 'NV', population: 134100, areaKm2: 85 },
  { name: 'Termiz', nameRu: 'Термез', nameEn: 'Termez', code: 'TM', population: 143800, areaKm2: 95 },
  { name: 'Jizzax', nameRu: 'Джизак', nameEn: 'Jizzakh', code: 'JZ', population: 171400, areaKm2: 105 },
  { name: 'Sirdaryo', nameRu: 'Сырдарья', nameEn: 'Sirdaryo', code: 'SD', population: 842700, areaKm2: 58 },
  { name: "Qoraqalpog'iston", nameRu: 'Каракалпакстан', nameEn: 'Karakalpakstan', code: 'QQ', population: 1898100, areaKm2: 166600 },
  { name: 'Xorazm', nameRu: 'Хорезм', nameEn: 'Khorezm', code: 'XR', population: 1882000, areaKm2: 6300 },
];

// Toshkent shahri tumanlari
const tashkentDistricts = [
  { name: 'Bektemir', code: 'TK-BE', population: 85000, areaKm2: 15.2 },
  { name: 'Mirobod', code: 'TK-MI', population: 120000, areaKm2: 18.5 },
  { name: "Mirzo-Ulug'bek", code: 'TK-MU', population: 245000, areaKm2: 22.8 },
  { name: 'Sergeli', code: 'TK-SE', population: 195000, areaKm2: 35.6 },
  { name: 'Olmazor', code: 'TK-OL', population: 165000, areaKm2: 28.4 },
  { name: 'Uchtepa', code: 'TK-UC', population: 178000, areaKm2: 24.3 },
  { name: 'Shayxontohur', code: 'TK-SH', population: 142000, areaKm2: 19.7 },
  { name: 'Yashnobod', code: 'TK-YA', population: 138000, areaKm2: 21.5 },
  { name: 'Chilonzor', code: 'TK-CH', population: 268000, areaKm2: 42.8 },
  { name: 'Yunusobod', code: 'TK-YU', population: 198000, areaKm2: 41.2 },
];

// Namangan tumanlari
const namanganDistricts = [
  { name: 'Namangan shahri', code: 'NM-SH', population: 280000, areaKm2: 45 },
  { name: 'Chortoq', code: 'NM-CH', population: 42000, areaKm2: 18 },
  { name: 'Chust', code: 'NM-CU', population: 55000, areaKm2: 22 },
  { name: 'Kosonsoy', code: 'NM-KO', population: 38000, areaKm2: 30 },
  { name: 'Mingbuloq', code: 'NM-MB', population: 32000, areaKm2: 15 },
  { name: 'Yanginamangan', code: 'NM-YN', population: 28000, areaKm2: 12 },
];

async function seed() {
  console.log('🌱 Seeding boshlandi...\n');

  // 1. Admin yaratish
  console.log('👤 Admin yaratilmoqda...');
  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@2026!', 12);
  
  const admin = await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL || 'admin@transformer.uz' },
    update: {},
    create: {
      email: process.env.ADMIN_EMAIL || 'admin@transformer.uz',
      passwordHash,
      fullName: process.env.ADMIN_NAME || 'Super Admin',
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log(`   ✅ Admin: ${admin.email}`);

  // 2. Viloyatlar
  console.log('\n🗺️  Viloyatlar yaratilmoqda...');
  const createdRegions = {};
  
  for (const region of regions) {
    const created = await prisma.region.upsert({
      where: { code: region.code },
      update: region,
      create: region,
    });
    createdRegions[region.code] = created.id;
    console.log(`   ✅ ${region.name} (${region.code})`);
  }

  // 3. Tumanlar
  console.log('\n🏘️  Tumanlar yaratilmoqda...');
  
  for (const district of tashkentDistricts) {
    await prisma.district.upsert({
      where: { code: district.code },
      update: { ...district, regionId: createdRegions['TK'] },
      create: { ...district, regionId: createdRegions['TK'] },
    });
    console.log(`   ✅ ${district.name}`);
  }

  for (const district of namanganDistricts) {
    await prisma.district.upsert({
      where: { code: district.code },
      update: { ...district, regionId: createdRegions['NM'] },
      create: { ...district, regionId: createdRegions['NM'] },
    });
    console.log(`   ✅ ${district.name}`);
  }

  // 4. Demo hodim yaratish
  console.log('\n👷 Demo hodim yaratilmoqda...');
  const employeeHash = await bcrypt.hash('Hodim@2026!', 12);
  
  const employee = await prisma.user.upsert({
    where: { email: 'hodim@transformer.uz' },
    update: {},
    create: {
      email: 'hodim@transformer.uz',
      passwordHash: employeeHash,
      fullName: 'Namangan Hodimi',
      role: 'EMPLOYEE',
      regionId: createdRegions['NM'],
      isActive: true,
    },
  });
  console.log(`   ✅ Hodim: ${employee.email} (Namangan)`);

  // 5. Demo tekshiruvchi yaratish
  console.log('\n🔍 Demo tekshiruvchi yaratilmoqda...');
  const inspectorHash = await bcrypt.hash('Tekshir@2026!', 12);
  
  const inspector = await prisma.user.upsert({
    where: { email: 'tekshiruvchi@transformer.uz' },
    update: {},
    create: {
      email: 'tekshiruvchi@transformer.uz',
      passwordHash: inspectorHash,
      fullName: 'Tekshiruvchi Ismoilov',
      role: 'INSPECTOR',
      regionId: createdRegions['NM'],
      isActive: true,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 kun
    },
  });
  console.log(`   ✅ Tekshiruvchi: ${inspector.email} (30 kunlik)`);

  // 6. Demo podstansiya
  console.log('\n⚡ Demo podstansiya yaratilmoqda...');
  const substation = await prisma.substation.upsert({
    where: { code: 'AXS-001' },
    update: {},
    create: {
      name: 'Axsikent',
      code: 'AXS-001',
      regionId: createdRegions['NM'],
      latitude: 41.03274,
      longitude: 71.61204,
      address: 'Namangan viloyati, Axsikent',
    },
  });
  console.log(`   ✅ ${substation.name}`);

  // 7. Demo transformatorlar
  console.log('\n🔌 Demo transformatorlar yaratilmoqda...');
  
  const demoTransformers = [
    {
      inventoryNumber: 'TR-NM-001',
      model: 'TMG-1000',
      manufacturer: 'Chirchiq Transformator Zavodi',
      capacityKva: 1000,
      latitude: 41.03274,
      longitude: 71.61204,
      address: 'Axsikent, Markaziy ko\'cha',
      status: 'OPERATIONAL',
      healthScore: 92,
      connectedHouseholds: 2000,
      estimatedPopulation: 475300,
      manufactureYear: 2020,
      areaType: 'Turar joy',
    },
    {
      inventoryNumber: 'TR-NM-002',
      model: 'TP-441',
      manufacturer: 'ABB',
      capacityKva: 250,
      latitude: 41.01461,
      longitude: 71.61733,
      address: 'Namangan, Chortoq tumani',
      status: 'OPERATIONAL',
      healthScore: 87,
      connectedHouseholds: 200,
      estimatedPopulation: 475300,
      manufactureYear: 2022,
      areaType: 'Turar joy',
    },
    {
      inventoryNumber: 'TR-NM-003',
      model: 'TP-441',
      manufacturer: 'Siemens',
      capacityKva: 250,
      latitude: 41.01472,
      longitude: 71.61726,
      address: 'Namangan, Yangibozor',
      status: 'WARNING',
      healthScore: 45,
      connectedHouseholds: 200,
      estimatedPopulation: 475300,
      manufactureYear: 2018,
      areaType: 'Sanoat',
    },
  ];

  for (const t of demoTransformers) {
    await prisma.transformer.upsert({
      where: { inventoryNumber: t.inventoryNumber },
      update: {},
      create: {
        ...t,
        regionId: createdRegions['NM'],
        substationId: substation.id,
        createdById: admin.id,
        installationDate: new Date(`${t.manufactureYear}-01-15`),
      },
    });
    console.log(`   ✅ ${t.inventoryNumber} — ${t.model} (${t.capacityKva} kVA)`);
  }

  console.log('\n════════════════════════════════════════');
  console.log('✅ Seeding muvaffaqiyatli yakunlandi!');
  console.log('════════════════════════════════════════');
  console.log('\nLogin ma\'lumotlari:');
  console.log('  Admin:       admin@transformer.uz / Admin@2026!');
  console.log('  Hodim:       hodim@transformer.uz / Hodim@2026!');
  console.log('  Tekshiruvchi: tekshiruvchi@transformer.uz / Tekshir@2026!');
  console.log('════════════════════════════════════════\n');
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
