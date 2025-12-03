import express from "express";
import { fetchLicenseDetailsPage } from "../fetcher.js"; // your existing fetcher that calls SCORM API

const router = express.Router();

router.post("/license-details", async (req, res) => {
  try {
    const { date_from, date_to, page } = req.body || {};

    // Read secret token/password from server env (never from client)
    const token = process.env.SCORM_TOKEN!;
    const password = process.env.SCORM_PASSWORD!;
    const id = process.env.SCORM_ID!;

    if (!token || !password || !id) {
      return res.status(500).json({ error: "server misconfigured" });
    }

    // Call the fetcher that wraps the SCORM API and returns array of rows
    const rows = await fetchLicenseDetailsPage({
      token,
      password,
      id,
      date_from,
      date_to,
      page: page ?? 1,
    });

    // Return the array only (client-side types expect LicenseRow[])
    res.json({ ok: true, license: rows });
  } catch (err: any) {
    console.error("license proxy error", err);
    res.status(500).json({ ok: false, error: err.message || "unexpected" });
  }
});

export default router;
