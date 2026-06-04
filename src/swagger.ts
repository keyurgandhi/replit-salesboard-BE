export const swaggerSpec = {
  openapi: "3.0.0",
  info: {
    title: "Sales Dashboard API",
    version: "1.0.0",
    description:
      "REST API for the Sales Dashboard. Provides aggregated KPIs, time-series revenue data, regional and category breakdowns, top products, and paginated transactions — all backed by PostgreSQL.",
    contact: { name: "Sales Dashboard" },
  },
  servers: [{ url: "/api", description: "API Server" }],
  tags: [
    { name: "Health", description: "Server health check" },
    { name: "Sales", description: "Sales data endpoints" },
  ],
  components: {
    parameters: {
      year: {
        name: "year",
        in: "query",
        required: false,
        description: "Filter by calendar year (e.g. 2024). Omit for all years.",
        schema: { type: "integer", example: 2024 },
      },
      region: {
        name: "region",
        in: "query",
        required: false,
        description: "Filter by sales region (e.g. Northeast). Omit for all regions.",
        schema: { type: "string", example: "Northeast" },
      },
      category: {
        name: "category",
        in: "query",
        required: false,
        description: "Filter by product category (e.g. Electronics). Omit for all categories.",
        schema: { type: "string", example: "Electronics" },
      },
    },
    schemas: {
      HealthStatus: {
        type: "object",
        required: ["status"],
        properties: {
          status: { type: "string", example: "ok" },
        },
      },
      SalesSummary: {
        type: "object",
        description: "Top-level KPIs for the dashboard",
        properties: {
          totalRevenue: { type: "number", format: "double", example: 38407055.58, description: "Sum of all revenue in the filtered period" },
          totalOrders: { type: "integer", example: 29740, description: "Number of sale records" },
          avgOrderValue: { type: "number", format: "double", example: 1291.43, description: "Average revenue per transaction" },
          revenueGrowth: { type: "number", format: "double", example: 12.5, description: "Month-over-month revenue growth (%)" },
          topRegion: { type: "string", example: "Northeast", description: "Region with highest revenue" },
          topCategory: { type: "string", example: "Electronics", description: "Category with highest revenue" },
        },
      },
      RegionRevenue: {
        type: "object",
        properties: {
          region: { type: "string", example: "Northeast" },
          revenue: { type: "number", format: "double", example: 10234567.89 },
          orders: { type: "integer", example: 5234 },
        },
      },
      MonthRevenue: {
        type: "object",
        properties: {
          month: { type: "integer", example: 1 },
          year: { type: "integer", example: 2024 },
          monthLabel: { type: "string", example: "Jan" },
          revenue: { type: "number", format: "double", example: 1234567.89 },
          orders: { type: "integer", example: 1234 },
        },
      },
      CategoryRevenue: {
        type: "object",
        properties: {
          category: { type: "string", example: "Electronics" },
          revenue: { type: "number", format: "double", example: 12345678.9 },
          orders: { type: "integer", example: 5678 },
          percentage: { type: "number", format: "double", example: 32.1, nullable: true },
        },
      },
      ProductRevenue: {
        type: "object",
        properties: {
          product: { type: "string", example: "Laptop Pro" },
          category: { type: "string", example: "Electronics" },
          revenue: { type: "number", format: "double", example: 1234567.89 },
          units: { type: "integer", example: 567 },
        },
      },
      Transaction: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          date: { type: "string", format: "date", example: "2024-01-15" },
          region: { type: "string", example: "Northeast" },
          category: { type: "string", example: "Electronics" },
          product: { type: "string", example: "Laptop Pro" },
          revenue: { type: "number", format: "double", example: 1299.99 },
          units: { type: "integer", example: 2 },
        },
      },
      TransactionPage: {
        type: "object",
        properties: {
          data: { type: "array", items: { $ref: "#/components/schemas/Transaction" } },
          total: { type: "integer", example: 29740 },
          page: { type: "integer", example: 1 },
          pageSize: { type: "integer", example: 20 },
        },
      },
      SalesFilters: {
        type: "object",
        properties: {
          regions: { type: "array", items: { type: "string" }, example: ["Midwest", "Northeast", "Southeast", "Southwest", "West"] },
          categories: { type: "array", items: { type: "string" }, example: ["Clothing", "Electronics", "Food & Beverage"] },
          years: { type: "array", items: { type: "integer" }, example: [2024, 2023, 2022] },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          error: { type: "string", example: "Internal server error" },
        },
      },
    },
  },
  paths: {
    "/healthz": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        description: "Returns 200 when the server is up and ready to serve requests.",
        operationId: "healthCheck",
        responses: {
          "200": {
            description: "Server is healthy",
            content: { "application/json": { schema: { $ref: "#/components/schemas/HealthStatus" } } },
          },
        },
      },
    },
    "/sales/summary": {
      get: {
        tags: ["Sales"],
        summary: "KPI summary",
        description: "Returns top-level KPIs: total revenue, total orders, average order value, month-over-month growth, top region and category.",
        operationId: "getSalesSummary",
        parameters: [
          { $ref: "#/components/parameters/year" },
          { $ref: "#/components/parameters/region" },
        ],
        responses: {
          "200": {
            description: "KPI summary object",
            content: { "application/json": { schema: { $ref: "#/components/schemas/SalesSummary" } } },
          },
          "500": { description: "Server error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/sales/by-region": {
      get: {
        tags: ["Sales"],
        summary: "Revenue by region",
        description: "Returns revenue and order count grouped by region, sorted by revenue descending.",
        operationId: "getSalesByRegion",
        parameters: [
          { $ref: "#/components/parameters/year" },
          {
            name: "month",
            in: "query",
            required: false,
            description: "Filter by month number (1–12).",
            schema: { type: "integer", minimum: 1, maximum: 12, example: 3 },
          },
        ],
        responses: {
          "200": {
            description: "Array of region revenue objects",
            content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/RegionRevenue" } } } },
          },
          "500": { description: "Server error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/sales/by-month": {
      get: {
        tags: ["Sales"],
        summary: "Revenue by month",
        description: "Returns revenue and order count aggregated by year and month. Use for time-series charts.",
        operationId: "getSalesByMonth",
        parameters: [
          { $ref: "#/components/parameters/year" },
          { $ref: "#/components/parameters/region" },
          { $ref: "#/components/parameters/category" },
        ],
        responses: {
          "200": {
            description: "Array of month revenue objects ordered chronologically",
            content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/MonthRevenue" } } } },
          },
          "500": { description: "Server error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/sales/by-category": {
      get: {
        tags: ["Sales"],
        summary: "Revenue by category",
        description: "Returns revenue, order count, and percentage share for each product category.",
        operationId: "getSalesByCategory",
        parameters: [
          { $ref: "#/components/parameters/year" },
          { $ref: "#/components/parameters/region" },
        ],
        responses: {
          "200": {
            description: "Array of category revenue objects sorted by revenue descending",
            content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/CategoryRevenue" } } } },
          },
          "500": { description: "Server error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/sales/top-products": {
      get: {
        tags: ["Sales"],
        summary: "Top products by revenue",
        description: "Returns the top N products sorted by total revenue. Useful for leaderboard tables.",
        operationId: "getTopProducts",
        parameters: [
          { $ref: "#/components/parameters/year" },
          { $ref: "#/components/parameters/region" },
          {
            name: "limit",
            in: "query",
            required: false,
            description: "Maximum number of products to return (1–50, default 10).",
            schema: { type: "integer", minimum: 1, maximum: 50, default: 10, example: 10 },
          },
        ],
        responses: {
          "200": {
            description: "Array of product revenue objects",
            content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/ProductRevenue" } } } },
          },
          "500": { description: "Server error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/sales/transactions": {
      get: {
        tags: ["Sales"],
        summary: "Paginated transactions",
        description: "Returns a paginated list of individual sale records sorted by date descending.",
        operationId: "getSalesTransactions",
        parameters: [
          {
            name: "page",
            in: "query",
            required: false,
            description: "Page number (1-based, default 1).",
            schema: { type: "integer", minimum: 1, default: 1, example: 1 },
          },
          {
            name: "pageSize",
            in: "query",
            required: false,
            description: "Records per page (1–100, default 20).",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 20, example: 20 },
          },
          { $ref: "#/components/parameters/year" },
          { $ref: "#/components/parameters/region" },
          { $ref: "#/components/parameters/category" },
          {
            name: "month",
            in: "query",
            required: false,
            description: "Filter by month (1–12).",
            schema: { type: "integer", minimum: 1, maximum: 12, example: 6 },
          },
        ],
        responses: {
          "200": {
            description: "Paginated transaction response",
            content: { "application/json": { schema: { $ref: "#/components/schemas/TransactionPage" } } },
          },
          "500": { description: "Server error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/sales/filters": {
      get: {
        tags: ["Sales"],
        summary: "Available filter options",
        description: "Returns distinct regions, categories, and years present in the database — use to populate filter dropdowns.",
        operationId: "getSalesFilters",
        responses: {
          "200": {
            description: "Filter options",
            content: { "application/json": { schema: { $ref: "#/components/schemas/SalesFilters" } } },
          },
          "500": { description: "Server error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
  },
};
