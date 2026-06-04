import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { salesTable } from "./db/schema/sales.js";

if (!process.env.DATABASE_URL) {
  console.error("ERROR: DATABASE_URL environment variable is required.");
  console.error("  export DATABASE_URL=postgresql://user:password@localhost:5432/sales_dashboard");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const db = drizzle(client);

const REGIONS = ["Northeast", "Southeast", "Midwest", "Southwest", "West"];
const CATEGORIES: Record<string, string[]> = {
  Electronics:      ["Laptop Pro", "Wireless Headphones", "Smart TV 55\"", "Tablet Ultra", "Gaming Console", "Smartphone X"],
  "Home & Garden":  ["Robot Vacuum", "Air Purifier", "Cordless Drill", "Garden Hose Kit", "LED Desk Lamp", "Coffee Maker"],
  Sports:           ["Yoga Mat", "Resistance Bands Set", "Running Shoes", "Cycling Helmet", "Dumbbell Set", "Foam Roller"],
  Apparel:          ["Winter Jacket", "Running Shorts", "Casual Sneakers", "Wool Sweater", "Athletic Socks", "Baseball Cap"],
  Beauty:           ["Facial Serum", "Electric Toothbrush", "Hair Dryer Pro", "Moisturizer SPF50", "Perfume Gift Set", "Lip Gloss Kit"],
  "Food & Beverage":["Protein Powder", "Organic Coffee Beans", "Green Tea Box", "Vitamin C Gummies", "Whey Isolate", "Energy Bars"],
};
const PRICE_RANGES: Record<string, [number, number]> = {
  Electronics:       [299, 2499],
  "Home & Garden":   [29,  599],
  Sports:            [15,  299],
  Apparel:           [12,  249],
  Beauty:            [8,   189],
  "Food & Beverage": [10,   89],
};

function rng(seed: number) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}

function randBetween(r: () => number, min: number, max: number) {
  return min + r() * (max - min);
}

function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function daysInMonth(y: number, m: number) {
  return new Date(y, m, 0).getDate();
}

const TOTAL_ROWS = 29740;
const YEARS = [2022, 2023, 2024];
const r = rng(42);

console.log(`Seeding ${TOTAL_ROWS} rows into sales table…`);

const rows: typeof salesTable.$inferInsert[] = [];
const categoryNames = Object.keys(CATEGORIES);

for (let i = 0; i < TOTAL_ROWS; i++) {
  const year = YEARS[Math.floor(r() * YEARS.length)];
  const month = Math.floor(r() * 12) + 1;
  const day = Math.floor(r() * daysInMonth(year, month)) + 1;
  const region = REGIONS[Math.floor(r() * REGIONS.length)];
  const category = categoryNames[Math.floor(r() * categoryNames.length)];
  const products = CATEGORIES[category];
  const product = products[Math.floor(r() * products.length)];
  const [minP, maxP] = PRICE_RANGES[category];
  const unitPrice = randBetween(r, minP, maxP);
  const units = Math.floor(r() * 5) + 1;
  const revenue = +(unitPrice * units).toFixed(2);

  rows.push({
    date: isoDate(year, month, day),
    region,
    category,
    product,
    revenue: String(revenue),
    units,
  });
}

const BATCH = 500;
for (let i = 0; i < rows.length; i += BATCH) {
  await db.insert(salesTable).values(rows.slice(i, i + BATCH));
  process.stdout.write(`\r  inserted ${Math.min(i + BATCH, rows.length).toLocaleString()} / ${TOTAL_ROWS.toLocaleString()}`);
}

console.log("\nDone! Sales table seeded successfully.");
await client.end();
