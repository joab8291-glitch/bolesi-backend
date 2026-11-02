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
async function main() {
  for (const group of taxonomy) {
    const parent = await prisma.category.upsert({ where: { slug: group.slug }, update: { name: group.name, isActive: true }, create: { name: group.name, slug: group.slug } });
    for (const name of group.children) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      await prisma.category.upsert({ where: { slug }, update: { name, parentId: parent.id, isActive: true }, create: { name, slug, parentId: parent.id } });
    }
  }
  console.log("BOLESI starter categories ensured.");
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
