export type JossRecord = {
  id: string;
  worker: string;
  intake_date: string;
  done_date: string | null;
  baskets_in: number;
  bags_out: number;
  stacks_out: number;
  note: string | null;
  created_at: string;
};

export const monthKey = (d: string) => d.slice(0, 7);

export const num = (v: number) =>
  new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 2 }).format(v || 0);

export type WorkerMonthStat = {
  worker: string;
  month: string;
  records: number;
  baskets: number;
  bags: number;
  stacks: number;
};

export function buildStats(rows: JossRecord[], month: string) {
  const inMonth = rows.filter((r) => monthKey(r.intake_date) === month);
  const map = new Map<string, WorkerMonthStat>();
  for (const r of inMonth) {
    const cur = map.get(r.worker) ?? {
      worker: r.worker,
      month,
      records: 0,
      baskets: 0,
      bags: 0,
      stacks: 0,
    };
    cur.records += 1;
    cur.baskets += Number(r.baskets_in) || 0;
    cur.bags += Number(r.bags_out) || 0;
    cur.stacks += Number(r.stacks_out) || 0;
    map.set(r.worker, cur);
  }
  const list = [...map.values()].sort((a, b) => b.bags - a.bags);
  const totals = list.reduce(
    (acc, s) => ({
      records: acc.records + s.records,
      baskets: acc.baskets + s.baskets,
      bags: acc.bags + s.bags,
      stacks: acc.stacks + s.stacks,
    }),
    { records: 0, baskets: 0, bags: 0, stacks: 0 },
  );
  const people = list.length || 1;
  return {
    list,
    totals,
    averages: {
      perPersonBaskets: totals.baskets / people,
      perPersonBags: totals.bags / people,
      perPersonStacks: totals.stacks / people,
      perRecordBags: totals.bags / (totals.records || 1),
    },
    count: inMonth.length,
  };
}

export function recentMonths(rows: JossRecord[], upTo: string, count = 6) {
  const [y, m] = upTo.split("-").map(Number);
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

export type TrendPoint = { month: string } & Record<string, number | string>;

/** 每人每月出貨袋數趨勢（僅列出所選人員，或當月產量前 N 名） */
export function buildTrend(
  rows: JossRecord[],
  months: string[],
  workers: string[],
): TrendPoint[] {
  return months.map((mo) => {
    const point: TrendPoint = { month: mo };
    for (const w of workers) {
      point[w] = rows
        .filter((r) => r.worker === w && monthKey(r.intake_date) === mo)
        .reduce((s, r) => s + (Number(r.bags_out) || 0), 0);
    }
    return point;
  });
}

export type RankRow = WorkerMonthStat & { avgBagsPerRecord: number };

export function buildRanking(stats: WorkerMonthStat[]): RankRow[] {
  return stats
    .map((s) => ({ ...s, avgBagsPerRecord: Number((s.bags / (s.records || 1)).toFixed(2)) }))
    .sort((a, b) => b.avgBagsPerRecord - a.avgBagsPerRecord || b.bags - a.bags);
}
