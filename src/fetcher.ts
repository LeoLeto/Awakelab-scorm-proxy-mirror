import axios from "axios";
import { RawLicenseRow } from "./types.js";

const BASE_URL = "https://app.scormproxy.com/awakelab/API/";

function formBody(params: Record<string, string | number>) {
  return new URLSearchParams(
    Object.entries(params).reduce((acc, [k, v]) => {
      if (v !== undefined && v !== null) acc[k] = String(v);
      return acc;
    }, {} as Record<string, string>)
  ).toString();
}

export async function fetchLicenseDetailsPage(opts: {
  page?: number;
  date_from?: string;
  date_to?: string;
  token: string;
  password: string;
  id: string;
}): Promise<RawLicenseRow[]> {
  const { page = 1, date_from, date_to, token, password, id } = opts;
  const payload: Record<string, string | number> = {
    action: "API_REPORT_LICENSE_DETAILS",
    output: "JSON",
    token,
    password,
    id,
    page,
  };
  if (date_from) payload.date_from = date_from;
  if (date_to) payload.date_to = date_to;

  const res = await axios.post(BASE_URL, formBody(payload), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    },
    timeout: 30000,
  });

  const data = res.data;
  const licensesContainer = data?.message?.licenses;
  const licenseArray = licensesContainer?.license;
  if (!licenseArray || !Array.isArray(licenseArray)) return [];
  return licenseArray as RawLicenseRow[];
}

export async function fetchAllLicenseDetails(opts: {
  fromDate: string;
  toDate: string;
  token: string;
  password: string;
  id: string;
}): Promise<RawLicenseRow[]> {
  const { fromDate, toDate, token, password, id } = opts;
  let page = 1;
  const all: RawLicenseRow[] = [];
  while (true) {
    const rows = await fetchLicenseDetailsPage({
      page,
      date_from: fromDate,
      date_to: toDate,
      token,
      password,
      id,
    });
    if (!rows.length) break;
    // attach provenance
    for (const r of rows) {
      r._fetch_date_from = fromDate;
      r._fetch_date_to = toDate;
      r._source_page = page;
    }
    all.push(...rows);
    page++;
  }
  return all;
}
