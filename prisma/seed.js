const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const taxonomy = [
  { name: "Kitchen Appliances", slug: "kitchen-appliances", children: ["Gas Hobs & Cookers", "Electric Cookers", "Built-in Ovens", "Microwaves", "Range Hoods"] },
  { name: "Water Heating", slug: "water-heating", children: ["Instant Water Heaters", "Gas Water Heaters", "Storage Water Heaters"] },
  { name: "Water Treatment", slug: "water-treatment", children: ["Water Purifiers"] },
  { name: "Smart Home & Security", slug: "smart-home-security", children: ["Smart Locks", "Smart Home Devices"] },
  { name: "Cleaning", slug: "cleaning", children: ["Dishwashers"] },
  { name: "Bathroom", slug: "bathroom", children: ["Smart Toilets"] },
  { name: "Collections", slug: "collections", children: ["Golden Diamond Series"] },
  { name: "Promotions", slug: "promotions", children: [] }
];

// Catalogue transcribed from the official BOLESI Kenya products and Golden Diamond listings.
// Products with no published price remain DRAFT and are never exposed to customers.
const catalogue = [
  { name: "Built-in 3 Gas Stainless Hob", sku: "LS-ML-8301G", price: 40500, category: "Gas Hobs & Cookers", model: "LS-ML-8301G", description: "Cutout: 630 × 405 mm. Product: 780 × 450 × 115 mm. Packing: 825 × 495 × 170 mm." },
  { name: "Built-in 4 Gas Stainless Hob", sku: "BLS-ML-8403G", price: 39600, category: "Gas Hobs & Cookers", model: "BLS-ML-8403G", description: "Cutout: 560 × 480 mm. Product: 590 × 510 × 115 mm. Packing: 630 × 555 × 150 mm. Stainless steel panel." },
  { name: "Built-in 4 Gas Hob", sku: "BLS-ML-8402G", price: 46300, category: "Gas Hobs & Cookers", model: "BLS-ML-8402G", description: "Cutout: 730 × 480 mm. Product: 780 × 520 × 115 mm. Packing: 825 × 560 × 170 mm." },
  { name: "Built-in 3+1 Cooker Hob", sku: "BLS-ML-D8401G", price: 45100, category: "Gas Hobs & Cookers", model: "BLS-ML-D8401G", description: "Cutout: 560 × 480 mm. Product: 590 × 520 × 115 mm. Packing: 630 × 555 × 150 mm. Golden Diamond Series." },
  { name: "Built-in 4+1 Cooker Hob", sku: "BLS-ML-D8501G", price: 53600, category: "Gas Hobs & Cookers", model: "BLS-ML-D8501G", description: "Cutout: 840 × 480 mm. Product: 870 × 520 × 115 mm. Packing: 920 × 555 × 150 mm." },
  { name: "Built-in 6 Gas Glass Cooker Hob", sku: "BLS-ML-8602G", price: 62500, category: "Gas Hobs & Cookers", model: "BLS-ML-8602G", description: "Cutout: 840 × 480 mm. Product: 870 × 510 × 115 mm. Packing: 940 × 555 × 150 mm." },
  { name: "Built-in 6 Gas Glass Cooker Hob", sku: "BLS-ML-8601G", price: 63600, category: "Gas Hobs & Cookers", model: "BLS-ML-8601G", description: "Cutout: 840 × 480 mm. Product: 870 × 520 × 115 mm. Packing: 940 × 555 × 150 mm." },
  { name: "Built-in 5 Gas Glass Cooker Hob", sku: "HOB-HB-57005", price: 30700, category: "Gas Hobs & Cookers", model: "HOB-HB-57005", description: "Panel: 760 × 520 mm. Cutout: 730 × 480 mm." },
  { name: "Built-in 3+1 Cooker Hob", sku: "HOB-HM-T46007-A", price: 35600, category: "Gas Hobs & Cookers", model: "HOB-HM-T46007-A", description: "Panel: 600 × 520 mm. Cutout: 560 × 480 mm." },
  { name: "Built-in 4 Gas Stainless Cooker Hob", sku: "HOB-HB46004", price: 28700, category: "Gas Hobs & Cookers", model: "HOB-HB46004", description: "Panel: 600 × 520 mm. Cutout: 560 × 480 mm." },
  { name: "Built-in 4 Gas Stainless Cooker Hob", sku: "HOB-H59-46016", price: 28700, category: "Gas Hobs & Cookers", model: "HOB-H59-46016", description: "Stainless steel panel. Panel: 590 × 510 mm. Cutout: 560 × 480 mm." },
  { name: "Built-in 2 Gas Glass Hob", sku: "HOB-H29-203B", price: 17000, category: "Gas Hobs & Cookers", model: "HOB-H29-203B", description: "Panel: 300 × 520 mm. Cutout: 260 × 480 mm." },
  { name: "Built-in 2 Gas Glass Hob", sku: "HOB-BLS-S08", price: 22000, category: "Gas Hobs & Cookers", model: "HOB-BLS-S08", description: "Panel: 750 × 430 mm. Cutout: 630 × 330 mm." },
  { name: "Built-in 4+1 Cooker Hob", sku: "HOB-HB-59035D", price: 43800, category: "Gas Hobs & Cookers", model: "HOB-HB-59035D", description: "Panel: 900 × 520 mm. Cutout: 860 × 480 mm." },
  { name: "Range Hood T555B", sku: "T555B", price: 36800, category: "Range Hoods", model: "T555B", description: "900 mm range hood. Can be fitted with a smoke pipe or used in internal-circulation mode. Touch and gesture controls." },
  { name: "Range Hood HA9002", sku: "HA9002", price: 26800, category: "Range Hoods", model: "HA9002", description: "900 mm range hood. Can be fitted with a smoke pipe or used in internal-circulation mode." },
  { name: "Kitchen Hood B2-60/90W", sku: "B2-60-90W", price: 21800, category: "Range Hoods", model: "B2-60/90W", description: "Kitchen hood available in 600 mm (KES 21,800) or 900 mm (KES 28,000). Select size with BOLESI before ordering." },
  { name: "Fully Automatic Smart Lock QI9", sku: "QI9", price: 49500, category: "Smart Locks", model: "QI9", description: "Fully automatic smart lock with app remote-control function." },
  { name: "Fully Automatic Smart Lock A5pro", sku: "A5pro", price: 35000, category: "Smart Locks", model: "A5pro", description: "Six unlocking methods listed by BOLESI: password, fingerprint, card, face, mechanical key and app. Includes electronic peephole and anti-pry alarm." },
  { name: "Semi-automatic Smart Lock G1F-N9", sku: "G1F-N9", price: 19000, category: "Smart Locks", model: "G1F-N9", description: "Five unlocking methods: password, fingerprint, card, mechanical key and app. Anti-pry alarm and time-limited passwords." },
  { name: "Smart Lock A8", sku: "A8", price: 22000, category: "Smart Locks", model: "A8", description: "Bluetooth connection, app-managed temporary and time-limited passwords. Listed for apartments and similar properties." },
  { name: "Large-flow Home Water Purifier", sku: "BLS-120X", price: 41100, category: "Water Purifiers", model: "BLS-120X", description: "Machine size: 550 × 410 × 160 mm." },
  { name: "Storage Electric Water Heater Y810 40/60/80/100L", sku: "Y810-40-60-80-100", price: 22000, category: "Storage Water Heaters", model: "Y810-40/60/80/100", description: "Published prices by capacity: 40L KES 22,000; 60L KES 27,980; 80L KES 31,400; 100L KES 34,800. Confirm the chosen capacity before purchase." },
  { name: "Instant Water Heater 6000W", sku: "SL-X1-60", price: 19000, category: "Instant Water Heaters", model: "SL-X1-60", description: "6000W. Machine size: 197 × 285 × 65 mm." },
  { name: "Instant Water Heater 7000W SL-A6-70", sku: "SL-A6-70", price: 28000, category: "Instant Water Heaters", model: "SL-A6-70", description: "7000W. Machine size: 218 × 328 × 80 mm." },
  { name: "Small Storage Water Heater MA8815", sku: "MA8815", price: 18800, category: "Storage Water Heaters", model: "MA8815", description: "Machine size: 350 × 340 × 350 mm." },
  { name: "Golden Diamond Water Heater BLS-B8-100", sku: "BLS-B8-100", price: 46000, category: "Golden Diamond Series", model: "BLS-B8-100", description: "Touch panel. 3500W–6000W. IPX4. Product: 395 × 250 × 80 mm. Packing: 480 × 300 × 125 mm." },
  { name: "Golden Diamond Built-in Microwave Oven BLS-WBL199-28L", sku: "BLS-WBL199-28L", price: 39800, category: "Golden Diamond Series", model: "BLS-WBL199-28L", description: "Product size listed as 595 × 375 × 388 mm. Confirm exact appliance specification with BOLESI." },
  { name: "Golden Diamond Storage Water Heater BLS-YH100G", sku: "BLS-YH100G", price: 69400, category: "Golden Diamond Series", model: "BLS-YH100G", description: "100L capacity. 220V, 2000W, 50Hz. IPX4. Product specification copied from BOLESI listing." },
  { name: "Built-in Oven F-188", sku: "F-188", price: 79800, category: "Built-in Ovens", model: "F-188", description: "Product size listed as 600 × 600 × 500 mm. Packing: 635 × 570 × 640 mm." },
  { name: "Range Hood LYD6061-B", sku: "LYD6061-B", price: 79800, category: "Range Hoods", model: "LYD6061-B", description: "900 mm range hood. Listed in Golden Diamond Series." },
  { name: "Gas Water Heater BLS-R08-16L", sku: "BLS-R08-16L", price: null, category: "Gas Water Heaters", model: "BLS-R08-16L", description: "Natural gas; electric pulse ignition; 150W. Product size: 576 × 343 × 166 mm. Price not published; confirm with BOLESI." },
  { name: "Instant Electric Water Heater BLS-A7-70", sku: "BLS-A7-70", price: 26000, category: "Instant Water Heaters", model: "BLS-A7-70", description: "7000W. Product size listed as 400 × 265 × 55 mm." },
  { name: "Instant Electric Water Heater SL-X1-60ST", sku: "SL-X1-60ST", price: null, category: "Instant Water Heaters", model: "SL-X1-60ST", description: "3500W–6000W, IPX4, touch panel. Product size: 280 × 190 × 65 mm. Price not published; confirm with BOLESI." },
  { name: "Instant Water Heater BLS-SL-X6-70ST", sku: "BLS-SL-X6-70ST", price: null, category: "Instant Water Heaters", model: "BLS-SL-X6-70ST", description: "7500W, IPX4, touch panel. Product size: 400 × 265 × 60 mm. Price not published; confirm with BOLESI." },
  { name: "Instant Electric Water Heater BLS-A8-85", sku: "BLS-A8-85", price: 30000, category: "Instant Water Heaters", model: "BLS-A8-85", description: "8500W. Product size: 479 × 278 × 55 mm." },
  { name: "Advanced Home Water Purifier A120X", sku: "A120X", price: null, category: "Water Purifiers", model: "A120X", description: "Product size: 410 × 410 × 620 mm. Price not published; confirm with BOLESI." },
  { name: "Storage Water Heater Y810 50/80/100L", sku: "Y810-50-80-100", price: null, category: "Storage Water Heaters", model: "Y810-50L/Y810-80L/Y810-100L", description: "50L, 80L and 100L variants. 220V, 1500W, 50Hz. Price not published on this listing; confirm with BOLESI." },
  { name: "Storage Water Heater BLS-YH100G", sku: "BLS-YH100G-STORAGE", price: null, category: "Storage Water Heaters", model: "BLS-YH100G", description: "100L, 220V, 2000W. Product size: 960 × 505 × 305 mm. Price not published on this listing; confirm with BOLESI." },
  { name: "Smart Toilet 2215C", sku: "2215C", price: null, category: "Smart Toilets", model: "2215C", description: "Quick-heating type. Ceramic/PP cover. 680 × 410 × 460 mm. Drainage pit spacing: 300/400 mm. Price not published; confirm with BOLESI." },
  { name: "Smart Toilet W10C", sku: "W10C", price: null, category: "Smart Toilets", model: "W10C", description: "Quick-heating type. Ceramic/PP cover. 680 × 410 × 480 mm. Drainage pit spacing: 300/400 mm. Price not published; confirm with BOLESI." },
  { name: "Range Hood T-18", sku: "T-18", price: null, category: "Range Hoods", model: "T-18", description: "900 mm. Packing size listed as 1015 × 513 × 305 × 505 mm. Price not published; confirm with BOLESI." },
  { name: "Range Hood C-60C", sku: "C-60C", price: null, category: "Range Hoods", model: "C-60C", description: "600 mm. Price not published; confirm with BOLESI." },
  { name: "Range Hood B2-90W", sku: "B2-90W", price: null, category: "Range Hoods", model: "B2-90W", description: "900 mm. Price not published for this model listing; confirm with BOLESI." },
  { name: "Range Hood B2-60W", sku: "B2-60W", price: null, category: "Range Hoods", model: "B2-60W", description: "600 mm. Listed in Golden Diamond Series. Price not published; confirm with BOLESI." },
  { name: "Range Hood C-90-WT", sku: "C-90-WT", price: null, category: "Range Hoods", model: "C-90-WT", description: "900 mm. Price not published; confirm with BOLESI." },
  { name: "Built-in Gas Hob H59-4006B", sku: "H59-4006B", price: 38980, category: "Gas Hobs & Cookers", model: "HOB-H59-4006B", description: "Panel listed as 600 × 520 mm; cutout 560 × 480 mm. Source description conflicts on panel material; verify before publication." },
  { name: "Built-in 5 Gas Glass Hob HOB-HB-59002", sku: "HOB-HB-59002", price: 48460, category: "Gas Hobs & Cookers", model: "HOB-HB-59002", description: "Panel: 900 × 520 mm. Cutout: 860 × 480 mm." },
  { name: "Built-in 5 Gas Glass Hob HOB-HB-5022G", sku: "HOB-HB-5022G", price: 47350, category: "Gas Hobs & Cookers", model: "HOB-HB-5022G", description: "Panel: 760 × 520 mm. Cutout: 730 × 480 mm." },
  { name: "Instant Water Heater SL-A7-70", sku: "SL-A7-70", price: 26000, category: "Instant Water Heaters", model: "SL-A7-70", description: "7000W. Product size: 400 × 265 × 55 mm." },
  { name: "Built-in Multifunction Oven F125 65L", sku: "F125-65L", price: 53500, category: "Built-in Ovens", model: "F125 65L", description: "Built-in multifunction oven. Machine size: 595 × 595 × 500 mm." },
  { name: "Electric Ceramic Stove YL-CF6002D", sku: "YL-CF6002D", price: 44900, category: "Electric Cookers", model: "YL-CF6002D", description: "6000W, 220–240V, 50/60Hz. Cutout: 560 × 490 mm. Product: 590 × 520 × 52 mm." },
  { name: "Built-in Dishwasher BLS-Q03E", sku: "BLS-Q03E", price: 92800, category: "Dishwashers", model: "BLS-Q03E", description: "Product: 598 × 550 × 815 mm. Package: 645 × 645 × 884 mm." },
  { name: "Desktop Microwave Oven BLS-20UG21-L-1-20L", sku: "BLS-20UG21-L-1-20L", price: 32800, category: "Microwaves", model: "BLS-20UG21-L-1-20L", description: "20L desktop microwave oven. Source listing gives size 595 × 375 × 388 mm; verify specification with BOLESI." },
  { name: "Built-in Oven F-125", sku: "F-125", price: 53500, category: "Built-in Ovens", model: "F-125", description: "Product size: 600 × 600 × 500 mm. Packing: 635 × 570 × 640 mm." }
];

const slugify = (value) => String(value || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const categorySlug = (name) => {
  const known = {
    "Gas Hobs & Cookers": "gas-hobs-cookers",
    "Electric Cookers": "electric-cookers",
    "Built-in Ovens": "built-in-ovens",
    "Microwaves": "microwaves",
    "Range Hoods": "range-hoods",
    "Instant Water Heaters": "instant-water-heaters",
    "Gas Water Heaters": "gas-water-heaters",
    "Storage Water Heaters": "storage-water-heaters",
    "Water Purifiers": "water-purifiers",
    "Smart Locks": "smart-locks",
    "Dishwashers": "dishwashers",
    "Smart Toilets": "smart-toilets",
    "Golden Diamond Series": "golden-diamond-series"
  };
  return known[name] || slugify(name);
};

// Use only verified source images; a category image is used where the same official
// catalogue image clearly represents that product family. Missing prices remain drafts.
const categoryImages = {
  "Gas Hobs & Cookers": "https://cdn.xuansiwei.com/liuji7923/1701137816768/tupian%203.png?x-oss-process=style%2Fpng_small",
  "Smart Locks": "https://cdn.xuansiwei.com/liuji7923/1701137581371/tupian%2016.png?x-oss-process=style%2Fpng_small",
  "Built-in Ovens": "https://cdn.xuansiwei.com/liuji7923/1776104519469/tupian2_r__1446-1412_c__0c0c0d_.png?x-oss-process=style%2Fpng_small",
  "Range Hoods": "https://cdn.xuansiwei.com/liuji7923/1701137762425/tupian%206.png?x-oss-process=style%2Fpng_small",
  "Instant Water Heaters": "https://cdn.xuansiwei.com/liuji7923/1701137528586/tupian%2020.png?x-oss-process=style%2Fpng_small",
  "Electric Cookers": "https://s.alicdn.com/@sc04/kf/Hb2c1984cb8ad478eae1877366cfc9550w/Induction-and-Ceramic-Mix-Hob-Touch-Screen-2-Plate-Black-Crystal-Plate-Cooker-Induction-Hob-with-Ceramic-Top.jpg",
  "Microwaves": "https://image.made-in-china.com/202f0j00gNdczvwJUyqn/20L-Solo-Microwave-Oven-Mechanical-Countertop-Microwave-Table-Microwave.webp",
  "Dishwashers": "https://www.joegraham.co.uk/media/misc/matrix_mdi6011_1341249_34-0100-0341.png",
  "Water Purifiers": "https://static.wixstatic.com/media/e1931c_a6936a88ed874cafb077319532286bec~mv2.webp/v1/fill/w_640%2Ch_640%2Cal_c%2Cq_85%2Cusm_0.66_1.00_0.01%2Cenc_avif%2Cquality_auto/e1931c_a6936a88ed874cafb077319532286bec~mv2.webp",
  "Storage Water Heaters": "https://static.euroterm24.pl/GA/L0/70/-0/1-/05/00/00/0/BIG.jpg?hash=284a4d0215878bf6ebed94a4664dd04c",
  "Gas Water Heaters": "https://www.noritz.com.cn/upload/product/202504091702580026.png",
  "Smart Toilets": "https://hwell-wc.com/uppic/i8-1.jpg",
  "Smart Home Devices": "https://cdn.xuansiwei.com/liuji7923/1701137581371/tupian%2016.png?x-oss-process=style%2Fpng_small"
};

async function main() {
  const categories = new Map();
  for (const group of taxonomy) {
    const parent = await prisma.category.upsert({
      where: { slug: group.slug },
      update: { name: group.name, isActive: true },
      create: { name: group.name, slug: group.slug }
    });
    for (const name of group.children) {
      const slug = slugify(name);
      const category = await prisma.category.upsert({
        where: { slug },
        update: { name, parentId: parent.id, isActive: true },
        create: { name, slug, parentId: parent.id }
      });
      categories.set(name, category.id);
    }
    categories.set(group.name, parent.id);
  }

  // Create category records for product groups not present in the starter taxonomy.
  for (const p of catalogue) {
    const name = p.category;
    const slug = categorySlug(name);
    if (!categories.has(name)) {
      const category = await prisma.category.upsert({
        where: { slug },
        update: { name, isActive: true },
        create: { name, slug, isActive: true }
      });
      categories.set(name, category.id);
    }
  }

  let created = 0;
  let updated = 0;
  let drafts = 0;
  for (const p of catalogue) {
    const priceKnown = Number.isFinite(p.price) && p.price > 0;
    const categoryId = categories.get(p.category) || null;
    const slug = slugify(p.name) + "-" + slugify(p.sku);
    const existing = await prisma.product.findUnique({ where: { sku: p.sku }, include: { images: true } });
    const data = {
      name: p.name,
      slug,
      sku: p.sku,
      model: p.model || p.sku,
      brand: "BOLESI",
      description: p.description,
      specifications: { source: "https://www.bolesi-kenya.com/products.html?c=13231", sourceVerified: true },
      price: priceKnown ? p.price : 0,
      status: priceKnown ? "ACTIVE" : "DRAFT",
      categoryId,
      isFeatured: false
    };
    if (existing) {
      await prisma.product.update({ where: { id: existing.id }, data });
      // Backfill an image for previously imported products that have none.
      // Keep any existing product-specific images untouched.
      const imageUrl = categoryImages[p.category];
      if (imageUrl && (!existing.images || existing.images.length === 0)) {
        await prisma.productImage.create({
          data: { url: imageUrl, alt: p.name, sortOrder: 0, productId: existing.id }
        });
      }
      updated++;
    } else {
      const imageUrl = categoryImages[p.category];
      await prisma.product.create({
        data: {
          ...data,
          images: imageUrl ? { create: [{ url: imageUrl, alt: p.name, sortOrder: 0 }] } : undefined
        }
      });
      created++;
    }
    if (!priceKnown) drafts++;
  }
  console.log(`BOLESI catalogue sync complete: ${created} created, ${updated} updated, ${drafts} draft products (price not published by source).`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
