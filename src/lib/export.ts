import { num, type JossRecord, type WorkerMonthStat } from "@/lib/joss";

const BOM = "\uFEFF";

const esc = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(rows: (string | number)[][]) {
  return BOM + rows.map((r) => r.map(esc).join(",")).join("\r\n");
}

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export type ExportPayload = {
  month: string;
  worker: string; // "" = 全部
  stats: WorkerMonthStat[];
  totals: { records: number; baskets: number; bags: number; stacks: number };
  averages: {
    perPersonBaskets: number;
    perPersonBags: number;
    perPersonStacks: number;
    perRecordBags: number;
  };
  records: JossRecord[];
};

const f2 = (n: number) => Number((n || 0).toFixed(2));

export function buildExportRows(p: ExportPayload): (string | number)[][] {
  const scope = p.worker || "全部人員";
  const rows: (string | number)[][] = [
    ["金紙製作紀錄統計"],
    ["月份", p.month, "人員", scope],
    [],
    ["製作人員", "紀錄天數", "總疊數", "平均每日疊數"],
  ];
  for (const s of p.stats) {
    rows.push([s.worker, s.records, s.stacks, f2(s.stacks / (s.records || 1))]);
  }
  rows.push([
    "月底平均（每人）",
    f2(p.totals.records / (p.stats.length || 1)),
    f2(p.averages.perPersonStacks),
    f2(p.totals.stacks / (p.totals.records || 1)),
  ]);
  rows.push([]);
  rows.push(["明細"]);
  rows.push(["進貨日", "完成日", "製作人員", "疊數", "備註"]);
  for (const r of p.records) {
    rows.push([r.intake_date, r.done_date ?? "", r.worker, r.stacks_out, r.note ?? ""]);
  }
  return rows;
}

export function exportCsv(p: ExportPayload) {
  const name = `金紙統計_${p.month}${p.worker ? `_${p.worker}` : ""}.csv`;
  downloadCsv(name, buildExportRows(p));
}

export function exportPdf(p: ExportPayload) {
  const scope = p.worker || "全部人員";
  const statRows = p.stats
    .map(
      (s) => `<tr><td>${s.worker}</td><td>${s.records}</td><td>${num(s.stacks)}</td>
      <td>${num(f2(s.stacks / (s.records || 1)))}</td></tr>`,
    )
    .join("");
  const detailRows = p.records
    .map(
      (r) => `<tr><td>${r.intake_date}</td><td>${r.done_date ?? "—"}</td><td>${r.worker}</td>
      <td>${num(r.stacks_out)}</td><td>${r.note ?? "—"}</td></tr>`,
    )
    .join("");

  const html = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8">
<title>金紙統計 ${p.month} ${scope}</title>
<style>
  @page { size: A4; margin: 14mm; }
  body { font-family: "Noto Serif TC","PingFang TC","Microsoft JhengHei",serif; color:#2b1a12; }
  h1 { font-size: 20px; margin:0 0 4px; color:#8f1d1d; }
  p.meta { margin:0 0 16px; font-size:12px; color:#6b5b52; }
  h2 { font-size:14px; margin:18px 0 6px; border-left:4px solid #c9a227; padding-left:8px; }
  table { width:100%; border-collapse:collapse; font-size:11px; }
  th,td { border:1px solid #ddd0c4; padding:5px 6px; text-align:left; }
  th { background:#f5ece0; }
  tfoot td { background:#faf3e8; font-weight:700; }
</style></head><body>
<h1>金紙製作紀錄統計</h1>
<p class="meta">月份：${p.month}　|　人員：${scope}　|　匯出時間：${new Date().toLocaleString("zh-TW")}</p>
<h2>每人統計</h2>
<table><thead><tr><th>製作人員</th><th>筆數</th><th>進貨籃數</th><th>出貨袋數</th><th>疊數</th><th>平均每筆袋數</th></tr></thead>
<tbody>${statRows || `<tr><td colspan="6">無資料</td></tr>`}</tbody>
<tfoot><tr><td>月底平均（每人）</td><td>${num(f2(p.totals.records / (p.stats.length || 1)))}</td>
<td>${num(f2(p.averages.perPersonBaskets))}</td><td>${num(f2(p.averages.perPersonBags))}</td>
<td>${num(f2(p.averages.perPersonStacks))}</td><td>${num(f2(p.averages.perRecordBags))}</td></tr></tfoot></table>
<h2>明細（${p.records.length} 筆）</h2>
<table><thead><tr><th>進貨日</th><th>完成日</th><th>製作人員</th><th>進貨籃數</th><th>出貨袋數</th><th>疊數</th><th>備註</th></tr></thead>
<tbody>${detailRows || `<tr><td colspan="7">無資料</td></tr>`}</tbody></table>
<script>window.onload=()=>{window.focus();window.print();}<\/script>
</body></html>`;

  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  return true;
}
