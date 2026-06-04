import { Router, type IRouter } from "express";
import { db, salesTable } from "../db/index.js";
import { sql, eq } from "drizzle-orm";

const router: IRouter = Router();

function parseIntOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = parseInt(String(v), 10);
  return isNaN(n) ? null : n;
}

function parseStringOrNull(v: unknown): string | null {
  if (v == null || v === "" || v === "null") return null;
  return String(v);
}

function buildWhere(year: number | null, region: string | null, category: string | null, month: number | null) {
  const parts: ReturnType<typeof sql>[] = [];
  if (year != null) parts.push(sql`EXTRACT(YEAR FROM ${salesTable.date}) = ${year}`);
  if (month != null) parts.push(sql`EXTRACT(MONTH FROM ${salesTable.date}) = ${month}`);
  if (region != null) parts.push(sql`${salesTable.region} = ${region}`);
  if (category != null) parts.push(sql`${salesTable.category} = ${category}`);
  return parts.length > 0 ? sql`WHERE ${sql.join(parts, sql` AND `)}` : sql``;
}

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

router.get("/sales/summary", async (req, res): Promise<void> => {
  const year = parseIntOrNull(req.query.year);
  const region = parseStringOrNull(req.query.region);
  const where = buildWhere(year, region, null, null);

  const { rows: summaryRows } = await db.execute<{ total_revenue: string; total_orders: string }>(sql`
    SELECT COALESCE(SUM(revenue::numeric), 0) AS total_revenue, COUNT(*)::int AS total_orders
    FROM sales ${where}
  `);

  const totalRevenue = parseFloat(summaryRows[0]?.total_revenue ?? "0");
  const totalOrders = parseInt(String(summaryRows[0]?.total_orders ?? 0), 10);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const { rows: regionRows } = await db.execute<{ region: string }>(sql`
    SELECT region FROM sales ${where}
    GROUP BY region ORDER BY SUM(revenue::numeric) DESC LIMIT 1
  `);

  const { rows: categoryRows } = await db.execute<{ category: string }>(sql`
    SELECT category FROM sales ${where}
    GROUP BY category ORDER BY SUM(revenue::numeric) DESC LIMIT 1
  `);

  const { rows: growthRows } = await db.execute<{ current: string; previous: string }>(sql`
    SELECT
      COALESCE(SUM(CASE WHEN DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE) THEN revenue::numeric ELSE 0 END), 0) AS current,
      COALESCE(SUM(CASE WHEN DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') THEN revenue::numeric ELSE 0 END), 0) AS previous
    FROM sales
  `);

  const currentMonth = parseFloat(growthRows[0]?.current ?? "0");
  const previousMonth = parseFloat(growthRows[0]?.previous ?? "0");
  const revenueGrowth = previousMonth > 0 ? ((currentMonth - previousMonth) / previousMonth) * 100 : 0;

  res.json({
    totalRevenue,
    totalOrders,
    avgOrderValue,
    topRegion: regionRows[0]?.region ?? "N/A",
    topCategory: categoryRows[0]?.category ?? "N/A",
    revenueGrowth: Math.round(revenueGrowth * 100) / 100,
  });
});

router.get("/sales/by-region", async (req, res): Promise<void> => {
  const year = parseIntOrNull(req.query.year);
  const month = parseIntOrNull(req.query.month);
  const where = buildWhere(year, null, null, month);

  const { rows } = await db.execute<{ region: string; revenue: string; orders: string }>(sql`
    SELECT region, SUM(revenue::numeric) AS revenue, COUNT(*)::int AS orders
    FROM sales ${where}
    GROUP BY region ORDER BY SUM(revenue::numeric) DESC
  `);

  res.json(rows.map((r) => ({
    region: r.region,
    revenue: parseFloat(r.revenue),
    orders: parseInt(String(r.orders), 10),
    growth: null,
  })));
});

router.get("/sales/by-month", async (req, res): Promise<void> => {
  const year = parseIntOrNull(req.query.year);
  const region = parseStringOrNull(req.query.region);
  const category = parseStringOrNull(req.query.category);
  const where = buildWhere(year, region, category, null);

  const { rows } = await db.execute<{ month: string; year: string; revenue: string; orders: string }>(sql`
    SELECT
      EXTRACT(MONTH FROM date)::int AS month,
      EXTRACT(YEAR FROM date)::int AS year,
      SUM(revenue::numeric) AS revenue,
      COUNT(*)::int AS orders
    FROM sales ${where}
    GROUP BY EXTRACT(YEAR FROM date), EXTRACT(MONTH FROM date)
    ORDER BY EXTRACT(YEAR FROM date), EXTRACT(MONTH FROM date)
  `);

  res.json(rows.map((r) => ({
    month: parseInt(String(r.month), 10),
    monthLabel: MONTH_LABELS[parseInt(String(r.month), 10) - 1] ?? String(r.month),
    revenue: parseFloat(r.revenue),
    orders: parseInt(String(r.orders), 10),
    year: r.year ? parseInt(String(r.year), 10) : null,
  })));
});

router.get("/sales/by-category", async (req, res): Promise<void> => {
  const year = parseIntOrNull(req.query.year);
  const region = parseStringOrNull(req.query.region);
  const where = buildWhere(year, region, null, null);

  const { rows } = await db.execute<{ category: string; revenue: string; orders: string; total: string }>(sql`
    SELECT
      category,
      SUM(revenue::numeric) AS revenue,
      COUNT(*)::int AS orders,
      SUM(SUM(revenue::numeric)) OVER () AS total
    FROM sales ${where}
    GROUP BY category
    ORDER BY SUM(revenue::numeric) DESC
  `);

  res.json(rows.map((r) => ({
    category: r.category,
    revenue: parseFloat(r.revenue),
    orders: parseInt(String(r.orders), 10),
    percentage: r.total && parseFloat(r.total) > 0
      ? Math.round((parseFloat(r.revenue) / parseFloat(r.total)) * 10000) / 100
      : null,
  })));
});

router.get("/sales/transactions", async (req, res): Promise<void> => {
  const page = Math.max(1, parseIntOrNull(req.query.page) ?? 1);
  const pageSize = Math.min(100, Math.max(1, parseIntOrNull(req.query.pageSize) ?? 20));
  const region = parseStringOrNull(req.query.region);
  const category = parseStringOrNull(req.query.category);
  const year = parseIntOrNull(req.query.year);
  const month = parseIntOrNull(req.query.month);
  const where = buildWhere(year, region, category, month);
  const offset = (page - 1) * pageSize;

  const [{ rows: countRows }, { rows: dataRows }] = await Promise.all([
    db.execute<{ count: string }>(sql`SELECT COUNT(*)::int AS count FROM sales ${where}`),
    db.execute<{ id: string; date: string; region: string; category: string; product: string; revenue: string; units: string }>(sql`
      SELECT id, date::text, region, category, product, revenue::numeric AS revenue, units
      FROM sales ${where}
      ORDER BY date DESC, id DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `),
  ]);

  res.json({
    data: dataRows.map((r) => ({
      id: parseInt(String(r.id), 10),
      date: r.date,
      region: r.region,
      category: r.category,
      product: r.product,
      revenue: parseFloat(String(r.revenue)),
      units: parseInt(String(r.units), 10),
    })),
    total: parseInt(String(countRows[0]?.count ?? 0), 10),
    page,
    pageSize,
  });
});

router.get("/sales/top-products", async (req, res): Promise<void> => {
  const limit = Math.min(50, Math.max(1, parseIntOrNull(req.query.limit) ?? 10));
  const year = parseIntOrNull(req.query.year);
  const region = parseStringOrNull(req.query.region);
  const where = buildWhere(year, region, null, null);

  const { rows } = await db.execute<{ product: string; category: string; revenue: string; units: string }>(sql`
    SELECT product, category, SUM(revenue::numeric) AS revenue, SUM(units)::int AS units
    FROM sales ${where}
    GROUP BY product, category
    ORDER BY SUM(revenue::numeric) DESC
    LIMIT ${limit}
  `);

  res.json(rows.map((r) => ({
    product: r.product,
    category: r.category,
    revenue: parseFloat(r.revenue),
    units: parseInt(String(r.units), 10),
  })));
});

router.get("/sales/filters", async (req, res): Promise<void> => {
  const [{ rows: regionRows }, { rows: categoryRows }, { rows: yearRows }] = await Promise.all([
    db.execute<{ region: string }>(sql`SELECT DISTINCT region FROM sales ORDER BY region`),
    db.execute<{ category: string }>(sql`SELECT DISTINCT category FROM sales ORDER BY category`),
    db.execute<{ year: string }>(sql`SELECT DISTINCT EXTRACT(YEAR FROM date)::int AS year FROM sales ORDER BY year DESC`),
  ]);

  res.json({
    regions: regionRows.map((r) => r.region),
    categories: categoryRows.map((r) => r.category),
    years: yearRows.map((r) => parseInt(String(r.year), 10)),
  });
});

export default router;
