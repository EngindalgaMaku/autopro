import { PrismaClient, Role, ServiceKind, StationType, VehicleSegment, WorkStage, DamageKind, ReadingPhase, PaymentMethod } from "@prisma/client";
import bcrypt from "bcryptjs";
import { SEGMENTS } from "../lib/stages";
import { newTrackingToken, newWorkOrderNumber } from "../lib/ids";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 AutoPro demo verileri oluşturuluyor...");

  // Mevcut demo işletmeyi temizle (varsa)
  const existingDemo = await prisma.user.findUnique({
    where: { email: "demo@autopro.com" },
    select: { businessId: true },
  });

  if (existingDemo) {
    console.log("Eski demo işletmesi temizleniyor...");
    await prisma.business.delete({ where: { id: existingDemo.businessId } });
  }

  // 1. İşletme
  const business = await prisma.business.create({
    data: {
      name: "AutoPro Detailing Maslak",
      phone: "02122850000",
      email: "info@autopro.com",
      address: "Atatürk Oto Sanayi Sitesi 2. Kısım 24. Sokak No:845",
      city: "İstanbul",
      district: "Sarıyer",
      latitude: 41.1124,
      longitude: 29.0231,
      taxNumber: "1234567890",
      vatRate: 20,
      pricesIncludeVat: true,
    },
  });

  // 2. Kullanıcılar (Şifre: 12345678)
  const defaultPasswordHash = await bcrypt.hash("12345678", 10);

  const owner = await prisma.user.create({
    data: {
      businessId: business.id,
      name: "Engin Dalga",
      email: "demo@autopro.com",
      phone: "05321000001",
      passwordHash: defaultPasswordHash,
      role: Role.OWNER,
      lastLoginAt: new Date(),
    },
  });

  const tech1 = await prisma.user.create({
    data: {
      businessId: business.id,
      name: "Ahmet Usta",
      email: "ahmet@autopro.com",
      phone: "05321000002",
      passwordHash: defaultPasswordHash,
      role: Role.TECHNICIAN,
      commissionRate: 12.0,
      lastLoginAt: new Date(),
    },
  });

  const tech2 = await prisma.user.create({
    data: {
      businessId: business.id,
      name: "Mehmet Usta",
      email: "mehmet@autopro.com",
      phone: "05321000003",
      passwordHash: defaultPasswordHash,
      role: Role.TECHNICIAN,
      commissionRate: 15.0,
      lastLoginAt: new Date(),
    },
  });

  const valet = await prisma.user.create({
    data: {
      businessId: business.id,
      name: "Caner Valet",
      email: "caner@autopro.com",
      phone: "05321000004",
      passwordHash: defaultPasswordHash,
      role: Role.VALET,
      lastLoginAt: new Date(),
    },
  });

  // 3. İstasyonlar
  const stationsData = [
    { name: "Yıkama Peronu 1", type: StationType.WASH_BAY, sortOrder: 0 },
    { name: "Yıkama Peronu 2", type: StationType.WASH_BAY, sortOrder: 1 },
    { name: "Lift Alanı", type: StationType.LIFT, sortOrder: 2 },
    { name: "Detailing & Seramik Odası", type: StationType.DETAILING_ROOM, sortOrder: 3 },
    { name: "PPF & Film Alanı", type: StationType.DETAILING_ROOM, sortOrder: 4 },
    { name: "İç Detay Alanı", type: StationType.INTERIOR, sortOrder: 5 },
  ];

  const stations = await Promise.all(
    stationsData.map((s) =>
      prisma.station.create({
        data: { ...s, businessId: business.id },
      })
    )
  );

  // 4. Araç Segment Katsayıları
  const segments = Object.keys(SEGMENTS) as VehicleSegment[];
  await prisma.segmentMultiplier.createMany({
    data: segments.map((seg) => ({
      businessId: business.id,
      segment: seg,
      multiplier: SEGMENTS[seg].defaultMultiplier,
    })),
  });

  // 5. Hizmetler
  const sDetayliYikama = await prisma.service.create({
    data: {
      businessId: business.id,
      name: "Detaylı İç-Dış Temizlik & Hızlı Cila",
      kind: ServiceKind.WASH,
      basePrice: 1200,
      durationMinutes: 90,
      stationType: StationType.WASH_BAY,
      sortOrder: 0,
    },
  });

  const sMotor = await prisma.service.create({
    data: {
      businessId: business.id,
      name: "Motor Yıkama ve Koruma",
      kind: ServiceKind.WASH,
      basePrice: 1500,
      durationMinutes: 60,
      stationType: StationType.WASH_BAY,
      sortOrder: 1,
    },
  });

  const sKoltuk = await prisma.service.create({
    data: {
      businessId: business.id,
      name: "Detaylı Koltuk Yıkama & Ozon Dezenfeksiyon",
      kind: ServiceKind.INTERIOR,
      basePrice: 3500,
      durationMinutes: 180,
      stationType: StationType.INTERIOR,
      reminderMonths: 6,
      sortOrder: 2,
    },
  });

  const sPastaCila = await prisma.service.create({
    data: {
      businessId: business.id,
      name: "2 Aşamalı Pasta Cila (Hale Giderme)",
      kind: ServiceKind.POLISH,
      basePrice: 6500,
      durationMinutes: 360,
      stationType: StationType.DETAILING_ROOM,
      sortOrder: 3,
    },
  });

  const sSeramik = await prisma.service.create({
    data: {
      businessId: business.id,
      name: "3 Yıllık Seramik Kaplama",
      kind: ServiceKind.CERAMIC,
      basePrice: 16000,
      durationMinutes: 720,
      stationType: StationType.DETAILING_ROOM,
      defaultProduct: "Gtechniq Crystal Serum Light",
      warrantyMonths: 36,
      reminderMonths: 6,
      sortOrder: 4,
    },
  });

  const sPPF = await prisma.service.create({
    data: {
      businessId: business.id,
      name: "PPF Ön Koruma Paketi",
      kind: ServiceKind.PPF,
      basePrice: 32000,
      durationMinutes: 960,
      stationType: StationType.DETAILING_ROOM,
      defaultProduct: "Stek DynoShield 190µm",
      warrantyMonths: 60,
      sortOrder: 5,
    },
  });

  const sCamFilmi = await prisma.service.create({
    data: {
      businessId: business.id,
      name: "LLumar Güvenlik ve Isı Kontrol Cam Filmi",
      kind: ServiceKind.WINDOW_FILM,
      basePrice: 7000,
      durationMinutes: 180,
      stationType: StationType.DETAILING_ROOM,
      defaultProduct: "LLumar ATR Serisi",
      warrantyMonths: 60,
      sortOrder: 6,
    },
  });

  const sJant = await prisma.service.create({
    data: {
      businessId: business.id,
      name: "Jant Seramiği ve Balata Tozu Temizliği",
      kind: ServiceKind.WHEEL,
      basePrice: 3000,
      durationMinutes: 120,
      stationType: StationType.DETAILING_ROOM,
      defaultProduct: "Gyeon Q2 Rim",
      sortOrder: 7,
    },
  });

  // 6. Hizmet Paketleri
  const pBahar = await prisma.servicePackage.create({
    data: {
      businessId: business.id,
      name: "Bahar Yenileme Paketi",
      price: 9500,
      sortOrder: 0,
      items: {
        create: [
          { serviceId: sDetayliYikama.id },
          { serviceId: sKoltuk.id },
          { serviceId: sPastaCila.id },
        ],
      },
    },
  });

  const pUltimate = await prisma.servicePackage.create({
    data: {
      businessId: business.id,
      name: "Ultimate Koruma Paketi (PPF + Seramik)",
      price: 48000,
      sortOrder: 1,
      items: {
        create: [
          { serviceId: sPPF.id },
          { serviceId: sSeramik.id },
          { serviceId: sCamFilmi.id },
        ],
      },
    },
  });

  // 7. Müşteriler ve Araçlar
  const cAli = await prisma.customer.create({
    data: {
      businessId: business.id,
      name: "Ali Kaya",
      phone: "05321112233",
      email: "ali.kaya@example.com",
      city: "İstanbul",
      district: "Beşiktaş",
      marketingConsent: true,
      notes: "Aracına çok titiz, mikrofiber bez kullanılmasını özellikle rica etti.",
    },
  });

  const vBmw = await prisma.vehicle.create({
    data: {
      businessId: business.id,
      customerId: cAli.id,
      plate: "34ABC123",
      brand: "BMW",
      model: "320i M Sport",
      year: 2023,
      color: "Safir Siyah",
      segment: VehicleSegment.SEDAN,
    },
  });

  const cZeynep = await prisma.customer.create({
    data: {
      businessId: business.id,
      name: "Zeynep Demir",
      phone: "05332223344",
      email: "zeynep.demir@example.com",
      city: "İstanbul",
      district: "Sarıyer",
      marketingConsent: true,
    },
  });

  const vPorsche = await prisma.vehicle.create({
    data: {
      businessId: business.id,
      customerId: cZeynep.id,
      plate: "34DEF456",
      brand: "Porsche",
      model: "Macan GTS",
      year: 2024,
      color: "Tebeşir Beyazı",
      segment: VehicleSegment.SUV,
    },
  });

  const cBurak = await prisma.customer.create({
    data: {
      businessId: business.id,
      name: "Burak Yılmaz",
      phone: "05443334455",
      city: "İstanbul",
      district: "Göktürk",
      notes: "Vale teslimatı istiyor.",
    },
  });

  const vMercedes = await prisma.vehicle.create({
    data: {
      businessId: business.id,
      customerId: cBurak.id,
      plate: "34GHK789",
      brand: "Mercedes-Benz",
      model: "G400d",
      year: 2023,
      color: "Mat Siyah",
      segment: VehicleSegment.SUV_LARGE,
    },
  });

  const cDeniz = await prisma.customer.create({
    data: {
      businessId: business.id,
      name: "Deniz Arslan",
      phone: "05554445566",
      city: "İstanbul",
      district: "Kadıköy",
    },
  });

  const vGolf = await prisma.vehicle.create({
    data: {
      businessId: business.id,
      customerId: cDeniz.id,
      plate: "34JKL012",
      brand: "Volkswagen",
      model: "Golf 8 R-Line",
      year: 2022,
      color: "Aytaşı Gri",
      segment: VehicleSegment.HATCHBACK,
    },
  });

  // 8. İş Emirleri (Farklı aşamalar ve gerçekçi içerikler)

  // 8.1. KABUL AŞAMASI (RECEIVED): BMW 320i - Hasar kaydı ve boya kalınlıkları ölçülmüş
  const now = new Date();
  const promisedTodayEvening = new Date(now.getTime() + 6 * 3600 * 1000);

  const orderBmw = await prisma.workOrder.create({
    data: {
      businessId: business.id,
      number: newWorkOrderNumber(),
      trackingToken: newTrackingToken(),
      customerId: cAli.id,
      vehicleId: vBmw.id,
      stage: WorkStage.RECEIVED,
      stationId: stations[2].id, // Lift
      technicianId: tech1.id,
      mileage: 18450,
      fuelLevel: "1/2",
      promisedAt: promisedTodayEvening,
      totalAmount: 10000,
      notes: "Hale izleri giderilecek, sol ön kapıdaki çizik polisajla alınmaya çalışılacak.",
      createdById: owner.id,
      items: {
        create: [
          {
            serviceId: sPastaCila.id,
            name: sPastaCila.name,
            basePrice: 6500,
            multiplier: 1.0,
            totalPrice: 6500,
            kind: ServiceKind.POLISH,
            technicianId: tech1.id,
            details: { stages: 2 },
          },
          {
            serviceId: sKoltuk.id,
            name: sKoltuk.name,
            basePrice: 3500,
            multiplier: 1.0,
            totalPrice: 3500,
            kind: ServiceKind.INTERIOR,
            technicianId: tech1.id,
            details: {},
          },
        ],
      },
      events: {
        create: [
          {
            stage: WorkStage.RECEIVED,
            note: "Araç atölyeye kabul edildi, hasar ekspertizi yapıldı.",
            userId: owner.id,
          },
        ],
      },
      payments: {
        create: [
          {
            amount: 3000,
            method: PaymentMethod.CASH,
            note: "Kabul kaparo tahsilatı",
            createdById: owner.id,
          },
        ],
      },
      inspection: {
        create: {
          createdById: owner.id,
          marks: {
            create: [
              {
                number: 1,
                part: "front_left_door",
                kind: DamageKind.SCRATCH,
                note: "10 cm yüzeysel çizik",
                x: 0.15,
                y: 0.35,
              },
              {
                number: 2,
                part: "front_bumper",
                kind: DamageKind.STONE_CHIP,
                note: "Plakalık altında taş izleri",
                x: 0.5,
                y: 0.05,
              },
              {
                number: 3,
                part: "wheel_front_left",
                kind: DamageKind.RIM,
                note: "Kaldırım sürtmesi",
                x: 0.05,
                y: 0.2,
              },
            ],
          },
          readings: {
            create: [
              { part: "hood", phase: ReadingPhase.BEFORE, microns: 135 },
              { part: "roof", phase: ReadingPhase.BEFORE, microns: 110 },
              { part: "trunk", phase: ReadingPhase.BEFORE, microns: 125 },
              { part: "front_left_door", phase: ReadingPhase.BEFORE, microns: 118 },
              { part: "front_right_door", phase: ReadingPhase.BEFORE, microns: 122 },
            ],
          },
        },
      },
    },
  });

  // 8.2. YIKAMA AŞAMASI (WASHING): Golf 8 R-Line
  await prisma.workOrder.create({
    data: {
      businessId: business.id,
      number: newWorkOrderNumber(),
      trackingToken: newTrackingToken(),
      customerId: cDeniz.id,
      vehicleId: vGolf.id,
      stage: WorkStage.WASHING,
      stationId: stations[0].id, // Yıkama Peronu 1
      technicianId: tech1.id,
      mileage: 32000,
      fuelLevel: "3/4",
      promisedAt: new Date(now.getTime() + 3 * 3600 * 1000),
      totalAmount: 2430, // 0.9 Hatchback multiplier
      notes: "Demir tozu temizliği ve motor yıkama dahil.",
      createdById: owner.id,
      items: {
        create: [
          {
            serviceId: sDetayliYikama.id,
            name: sDetayliYikama.name,
            basePrice: 1200,
            multiplier: 0.9,
            totalPrice: 1080,
            kind: ServiceKind.WASH,
            technicianId: tech1.id,
          },
          {
            serviceId: sMotor.id,
            name: sMotor.name,
            basePrice: 1500,
            multiplier: 0.9,
            totalPrice: 1350,
            kind: ServiceKind.WASH,
            technicianId: tech1.id,
          },
        ],
      },
      events: {
        create: [
          { stage: WorkStage.RECEIVED, note: "Araç kabul edildi.", userId: owner.id },
          { stage: WorkStage.WASHING, note: "Yıkama peronuna alındı.", userId: tech1.id },
        ],
      },
      payments: {
        create: [
          {
            amount: 2430,
            method: PaymentMethod.CARD,
            note: "Peşin ödeme",
            createdById: owner.id,
          },
        ],
      },
    },
  });

  // 8.3. DETAILING / UYGULAMA AŞAMASI (DETAILING): Porsche Macan (SUV)
  await prisma.workOrder.create({
    data: {
      businessId: business.id,
      number: newWorkOrderNumber(),
      trackingToken: newTrackingToken(),
      customerId: cZeynep.id,
      vehicleId: vPorsche.id,
      stage: WorkStage.DETAILING,
      stationId: stations[4].id, // PPF & Film Alanı
      technicianId: tech2.id,
      mileage: 6200,
      fuelLevel: "DOLU",
      promisedAt: new Date(now.getTime() + 24 * 3600 * 1000), // Yarın teslim
      totalAmount: 60000, // 1.25 SUV multiplier
      notes: "PPF ön paket kaplanıyor. Ardından 3 yıl seramik uygulanacak.",
      createdById: owner.id,
      items: {
        create: [
          {
            serviceId: sPPF.id,
            name: sPPF.name,
            basePrice: 32000,
            multiplier: 1.25,
            totalPrice: 40000,
            kind: ServiceKind.PPF,
            technicianId: tech2.id,
            details: {
              product: "Stek DynoShield",
              zones: ["Ön tampon", "Kaput", "Ön çamurluklar", "Aynalar", "Farlar"],
              warrantyMonths: 60,
            },
          },
          {
            serviceId: sSeramik.id,
            name: sSeramik.name,
            basePrice: 16000,
            multiplier: 1.25,
            totalPrice: 20000,
            kind: ServiceKind.CERAMIC,
            technicianId: tech1.id,
            details: {
              product: "Gtechniq CSL",
              layers: 2,
              warrantyMonths: 36,
            },
          },
        ],
      },
      events: {
        create: [
          { stage: WorkStage.RECEIVED, note: "Kabul tamamlandı.", userId: owner.id },
          { stage: WorkStage.WASHING, note: "Kil ve demir tozu arındırma yapıldı.", userId: tech1.id },
          { stage: WorkStage.DETAILING, note: "PPF kaplama odasına alındı.", userId: tech2.id },
        ],
      },
      payments: {
        create: [
          {
            amount: 30000,
            method: PaymentMethod.BANK_TRANSFER,
            note: "Garanti Bankası Havale",
            createdById: owner.id,
          },
        ],
      },
    },
  });

  // 8.4. TESLİME HAZIR (READY): Mercedes G400d (Büyük SUV) - Vale teslimatı
  await prisma.workOrder.create({
    data: {
      businessId: business.id,
      number: newWorkOrderNumber(),
      trackingToken: newTrackingToken(),
      customerId: cBurak.id,
      vehicleId: vMercedes.id,
      stage: WorkStage.READY,
      stationId: stations[5].id, // İç Detay
      technicianId: tech1.id,
      mileage: 41200,
      fuelLevel: "1/4",
      valetDropoff: true,
      promisedAt: new Date(now.getTime() - 30 * 60 * 1000), // 30 dk önce söz verilmiş (hazır)
      totalAmount: 9750, // 1.50 Büyük SUV multiplier
      notes: "Son kontroller tamamlandı. Müşteri arandı, vale Caner yola çıkacak.",
      createdById: owner.id,
      items: {
        create: [
          {
            serviceId: sKoltuk.id,
            name: sKoltuk.name,
            basePrice: 3500,
            multiplier: 1.5,
            totalPrice: 5250,
            kind: ServiceKind.INTERIOR,
            technicianId: tech1.id,
          },
          {
            serviceId: sJant.id,
            name: sJant.name,
            basePrice: 3000,
            multiplier: 1.5,
            totalPrice: 4500,
            kind: ServiceKind.WHEEL,
            technicianId: tech1.id,
            details: { work: "CERAMIC", count: 4 },
          },
        ],
      },
      events: {
        create: [
          { stage: WorkStage.RECEIVED, note: "Araç alındı.", userId: owner.id },
          { stage: WorkStage.WASHING, note: "Yıkandı.", userId: tech1.id },
          { stage: WorkStage.DETAILING, note: "Uygulama bitti.", userId: tech1.id },
          { stage: WorkStage.QUALITY_CHECK, note: "Kalite kontrol onaylandı.", userId: owner.id },
          { stage: WorkStage.READY, note: "Teslime hazır.", userId: tech1.id },
        ],
      },
      payments: {
        create: [
          {
            amount: 5000,
            method: PaymentMethod.CARD,
            note: "Kabulde çekilen kaparo",
            createdById: owner.id,
          },
        ],
      },
    },
  });

  // 9. Randevular (Bugün için)
  const today14 = new Date(now);
  today14.setHours(14, 0, 0, 0);
  const today1530 = new Date(now);
  today1530.setHours(15, 30, 0, 0);

  const today17 = new Date(now);
  today17.setHours(17, 0, 0, 0);
  const today18 = new Date(now);
  today18.setHours(18, 0, 0, 0);

  await prisma.appointment.create({
    data: {
      businessId: business.id,
      customerId: cAli.id,
      vehicleId: vBmw.id,
      stationId: stations[3].id,
      title: "Pasta cila & boya koruma kabulü",
      startsAt: today14,
      endsAt: today1530,
      status: "BOOKED",
      notes: "Müşteri randevu saatinde getirecek.",
    },
  });

  await prisma.appointment.create({
    data: {
      businessId: business.id,
      customerId: cDeniz.id,
      vehicleId: vGolf.id,
      stationId: stations[0].id,
      title: "Hızlı detaylı yıkama & ekspres cila",
      startsAt: today17,
      endsAt: today18,
      status: "BOOKED",
      notes: "Beklemeli randevu.",
    },
  });

  // 10. Periyodik Bakım Hatırlatmaları (Bugün panosunda görünecek)
  const in3Days = new Date(now.getTime() + 3 * 24 * 3600 * 1000);
  const in6Days = new Date(now.getTime() + 6 * 24 * 3600 * 1000);

  await prisma.reminder.create({
    data: {
      businessId: business.id,
      customerId: cAli.id,
      vehicleId: vBmw.id,
      title: "6. Ay Seramik Kaplama Kontrolü ve Hidrofobik Bakım",
      dueAt: in3Days,
      status: "PENDING",
    },
  });

  await prisma.reminder.create({
    data: {
      businessId: business.id,
      customerId: cDeniz.id,
      vehicleId: vGolf.id,
      title: "Koltuk Ozon Sterilizasyon Kontrolü",
      dueAt: in6Days,
      status: "PENDING",
    },
  });

  // 11. Kasa Giderleri (Kasa sayfasındaki gelir/gider tablosu için)
  const yesterday = new Date(now.getTime() - 24 * 3600 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 48 * 3600 * 1000);

  await prisma.expense.createMany({
    data: [
      {
        businessId: business.id,
        amount: 8500,
        category: "SUPPLIES",
        description: "Menzerna pasta grubu ve Gtechniq seramik bezleri",
        method: PaymentMethod.CARD,
        spentAt: twoDaysAgo,
        createdById: owner.id,
      },
      {
        businessId: business.id,
        amount: 14000,
        category: "FILM",
        description: "Stek DynoShield 15m rulo poliüretan film",
        method: PaymentMethod.BANK_TRANSFER,
        spentAt: yesterday,
        createdById: owner.id,
      },
      {
        businessId: business.id,
        amount: 2400,
        category: "UTILITIES",
        description: "Yıkama peronları elektrik ve kompresör bakım bedeli",
        method: PaymentMethod.BANK_TRANSFER,
        spentAt: now,
        createdById: owner.id,
      },
      {
        businessId: business.id,
        amount: 1250,
        category: "FOOD",
        description: "Atölye personel haftalık yemek gideri",
        method: PaymentMethod.CASH,
        spentAt: now,
        createdById: owner.id,
      },
    ],
  });

  console.log("✅ AutoPro demo verileri başarıyla oluşturuldu!");
  console.log("--------------------------------------------------");
  console.log("Yönetici Girişi:");
  console.log("  E-posta: demo@autopro.com");
  console.log("  Şifre:   12345678");
  console.log("Usta Girişleri:");
  console.log("  Ahmet Usta (ahmet@autopro.com)   - Şifre: 12345678");
  console.log("  Mehmet Usta (mehmet@autopro.com) - Şifre: 12345678");
  console.log("--------------------------------------------------");
}

main()
  .catch((e) => {
    console.error("❌ Seed hatası:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
