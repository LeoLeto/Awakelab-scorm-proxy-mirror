import express from "express";
import { createPool } from "../db.js";

const router = express.Router();

router.get("/customers", async (req, res) => {
  try {
    const pool = createPool();
    const [rows] = await pool.query(
      `SELECT DISTINCT customer_name 
       FROM API_REPORT_LICENSE_DETAILS 
       WHERE customer_name IS NOT NULL 
       ORDER BY customer_name`
    );
    await pool.end();
    res.json({ ok: true, customers: rows });
  } catch (err: any) {
    console.error("customers error", err);
    res.status(500).json({ ok: false, error: err.message || "unexpected" });
  }
});

router.get("/products", async (req, res) => {
  try {
    const { customer_name } = req.query;
    
    if (!customer_name) {
      return res.status(400).json({ ok: false, error: "customer_name is required" });
    }

    const pool = createPool();
    const [rows] = await pool.query(
      `SELECT DISTINCT product_title 
       FROM API_REPORT_LICENSE_DETAILS 
       WHERE customer_name = ? AND product_title IS NOT NULL 
       ORDER BY product_title`,
      [customer_name]
    );
    await pool.end();
    res.json({ ok: true, products: rows });
  } catch (err: any) {
    console.error("products error", err);
    res.status(500).json({ ok: false, error: err.message || "unexpected" });
  }
});

router.post("/license-details", async (req, res) => {
  try {
    const { date_from, date_to, page, customer_name, product_title } = req.body || {};
    const pageNum = page ?? 1;
    const pageSize = 100;

    console.log("Received request:", { date_from, date_to, page, customer_name, product_title });

    const pool = createPool();
    
    // Build WHERE clause for filtering
    const params: any[] = [];
    const conditions: string[] = [];
    
    if (date_from && date_to) {
      conditions.push(`tracking_first_access >= ? AND tracking_first_access <= ?`);
      params.push(date_from, date_to);
    } else if (date_from) {
      conditions.push(`tracking_first_access >= ?`);
      params.push(date_from);
    } else if (date_to) {
      conditions.push(`tracking_first_access <= ?`);
      params.push(date_to);
    }
    
    if (customer_name) {
      conditions.push(`customer_name = ?`);
      params.push(customer_name);
    }
    
    if (product_title) {
      conditions.push(`product_title = ?`);
      params.push(product_title);
    }
    
    const whereClause = conditions.length > 0 ? ` WHERE ` + conditions.join(' AND ') : '';
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM API_REPORT_LICENSE_DETAILS${whereClause}`;
    const [countResult] = await pool.query(countQuery, params);
    const totalCount = (countResult as any)[0]?.total || 0;
    
    // Build paginated query
    let query = `SELECT * FROM API_REPORT_LICENSE_DETAILS${whereClause}`;
    query += ` LIMIT ? OFFSET ?`;
    const queryParams = [...params, pageSize, (pageNum - 1) * pageSize];
    
    console.log("Executing query:", query, queryParams);
    
    const [rows] = await pool.query(query, queryParams);
    await pool.end();

    console.log("Query successful, rows:", Array.isArray(rows) ? rows.length : 0, "of", totalCount);
    
    // Log first record to check URL fields
    if (Array.isArray(rows) && rows.length > 0) {
      const firstRow = rows[0] as any;
      console.log("Sample record:", {
        customer_name: firstRow.customer_name,
        customer_url: firstRow.customer_url,
        customer_url2: firstRow.customer_url2,
        customer_url3: firstRow.customer_url3,
      });
    }
    
    res.json({ ok: true, license: rows, total: totalCount });
  } catch (err: any) {
    console.error("license proxy error", err);
    console.error("Error stack:", err.stack);
    res.status(500).json({ ok: false, error: err.message || "unexpected" });
  }
});

router.post("/license-details/export", async (req, res) => {
  try {
    const { date_from, date_to, customer_name, product_title } = req.body || {};

    console.log("Export request:", { date_from, date_to, customer_name, product_title });

    const pool = createPool();
    
    // Build WHERE clause for filtering (same as regular endpoint)
    const params: any[] = [];
    const conditions: string[] = [];
    
    if (date_from && date_to) {
      conditions.push(`tracking_first_access >= ? AND tracking_first_access <= ?`);
      params.push(date_from, date_to);
    } else if (date_from) {
      conditions.push(`tracking_first_access >= ?`);
      params.push(date_from);
    } else if (date_to) {
      conditions.push(`tracking_first_access <= ?`);
      params.push(date_to);
    }
    
    if (customer_name) {
      conditions.push(`customer_name = ?`);
      params.push(customer_name);
    }
    
    if (product_title) {
      conditions.push(`product_title = ?`);
      params.push(product_title);
    }
    
    const whereClause = conditions.length > 0 ? ` WHERE ` + conditions.join(' AND ') : '';
    
    // Get ALL matching records (no LIMIT)
    const query = `SELECT * FROM API_REPORT_LICENSE_DETAILS${whereClause}`;
    
    console.log("Executing export query:", query, params);
    
    const [rows] = await pool.query(query, params);
    await pool.end();

    console.log("Export query successful, rows:", Array.isArray(rows) ? rows.length : 0);
    
    res.json({ ok: true, license: rows });
  } catch (err: any) {
    console.error("license export error", err);
    console.error("Error stack:", err.stack);
    res.status(500).json({ ok: false, error: err.message || "unexpected" });
  }
});

export default router;
