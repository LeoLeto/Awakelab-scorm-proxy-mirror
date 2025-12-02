import express from "express";
import { ingestLicenses } from "./ingest.js";
const app = express();
app.get("/ingest/licenses", async (req, res) => {
  try {
    const report = await ingestLicenses();
    res.json({ ok: true, report });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ ok: false, error: String(err) });
  }
});
const PORT = process.env.HTTP_PORT ? Number(process.env.HTTP_PORT) : 3000;
app.listen(PORT, () => console.log(`ingest server listening ${PORT}`));
