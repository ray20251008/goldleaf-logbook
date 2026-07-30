import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { Trophy, TrendingUp } from "lucide-react";

import {
  buildRanking,
  buildTrend,
  recentMonths,
  num,
  type JossRecord,
  type WorkerMonthStat,
} from "@/lib/joss";

const PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--primary)",
];

export function ProductionTrend({
  rows,
  month,
  stats,
  worker,
}: {
  rows: JossRecord[];
  month: string;
  stats: WorkerMonthStat[];
  worker: string;
}) {
  const months = useMemo(() => recentMonths(rows, month, 6), [rows, month]);
  const people = useMemo(
    () => (worker ? [worker] : stats.slice(0, 6).map((s) => s.worker)),
    [worker, stats],
  );
  const data = useMemo(() => buildTrend(rows, months, people), [rows, months, people]);

  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <TrendingUp className="size-4 text-primary" />
        每人每月產量趨勢（疊數 · 近 6 個月）
      </h3>
      {people.length === 0 ? (
        <p className="py-8 text-sm text-muted-foreground">尚無資料可繪製圖表</p>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickFormatter={(m: string) => m.slice(5) + "月"}
              />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {people.map((w, i) => (
                <Line
                  key={w}
                  type="monotone"
                  dataKey={w}
                  stroke={PALETTE[i % PALETTE.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export function Leaderboard({ stats }: { stats: WorkerMonthStat[] }) {
  const ranking = useMemo(() => buildRanking(stats), [stats]);
  const max = ranking[0]?.avgStacksPerRecord || 1;

  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Trophy className="size-4 text-primary" />
        本月排行榜（依平均每筆出貨袋數）
      </h3>
      {ranking.length === 0 ? (
        <p className="py-8 text-sm text-muted-foreground">本月尚無紀錄</p>
      ) : (
        <ol className="space-y-2">
          {ranking.map((r, i) => (
            <li
              key={r.worker}
              className="rounded-lg border border-border bg-muted/30 px-3 py-2"
            >
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 font-medium">
                  <span
                    className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-bold ${
                      i === 0
                        ? "bg-accent text-accent-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {i + 1}
                  </span>
                  {r.worker}
                </span>
                <span className="font-display text-base font-bold text-primary">
                  {num(r.avgBagsPerRecord)} 袋/筆
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.max(4, (r.avgBagsPerRecord / max) * 100)}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {r.records} 筆 · 總 {num(r.bags)} 袋 · {num(r.baskets)} 籃 · {num(r.stacks)} 疊
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
