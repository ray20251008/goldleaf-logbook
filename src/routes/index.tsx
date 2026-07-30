import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Trash2, Plus, BarChart3, ScrollText, FileDown, Printer } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildStats, monthKey, num, WORKERS, type JossRecord } from "@/lib/joss";
import { exportCsv, exportPdf } from "@/lib/export";
import { Leaderboard, ProductionTrend } from "@/components/stats-charts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "金紙製作紀錄表 | 進出貨與每月統計" },
      {
        name: "description",
        content:
          "記錄金紙進貨日、完成日、進貨籃數、出貨袋數與疊數，並自動統計每人每月產量與月底平均值。",
      },
      { property: "og:title", content: "金紙製作紀錄表 | 進出貨與每月統計" },
      {
        property: "og:description",
        content: "記錄金紙進貨日、完成日、進貨籃數、出貨袋數與疊數，並自動統計每人每月產量與月底平均值。",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const today = () => new Date().toISOString().slice(0, 10);

function Index() {
  const qc = useQueryClient();
  const [month, setMonth] = useState(() => today().slice(0, 7));
  const [worker, setWorker] = useState("");
  const [shared, setShared] = useState({
    intake_date: today(),
    done_date: "",
    note: "",
  });
  const [entries, setEntries] = useState<
    Record<string, { baskets_in: string; bags_out: string; stacks_out: string }>
  >(() =>
    Object.fromEntries(
      WORKERS.map((w) => [w, { baskets_in: "", bags_out: "", stacks_out: "" }]),
    ),
  );
  const [error, setError] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["joss_records"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("joss_records")
        .select("*")
        .order("intake_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as JossRecord[];
    },
  });

  const addRecord = useMutation({
    mutationFn: async () => {
      const payload = WORKERS.map((w) => ({
        worker: w,
        intake_date: shared.intake_date,
        done_date: shared.done_date || null,
        baskets_in: Number(entries[w]?.baskets_in) || 0,
        bags_out: Number(entries[w]?.bags_out) || 0,
        stacks_out: Number(entries[w]?.stacks_out) || 0,
        note: shared.note.trim() || null,
      }));
      const { error } = await supabase.from("joss_records").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      setShared((s) => ({ ...s, done_date: "", note: "" }));
      setEntries(
        Object.fromEntries(
          WORKERS.map((w) => [w, { baskets_in: "", bags_out: "", stacks_out: "" }]),
        ),
      );
      qc.invalidateQueries({ queryKey: ["joss_records"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const removeRecord = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("joss_records").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["joss_records"] }),
  });

  const months = useMemo(() => {
    const set = new Set(rows.map((r) => monthKey(r.intake_date)));
    set.add(month);
    return [...set].sort().reverse();
  }, [rows, month]);

  const workers = useMemo(
    () => [...new Set([...WORKERS, ...rows.map((r) => r.worker)])],
    [rows],
  );
  const scopedRows = useMemo(
    () => (worker ? rows.filter((r) => r.worker === worker) : rows),
    [rows, worker],
  );
  const stats = useMemo(() => buildStats(scopedRows, month), [scopedRows, month]);
  const monthRows = scopedRows.filter((r) => monthKey(r.intake_date) === month);

  const exportPayload = () => ({
    month,
    worker,
    stats: stats.list,
    totals: stats.totals,
    averages: stats.averages,
    records: monthRows,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!shared.intake_date) return setError("請選擇進貨日");
    addRecord.mutate();
  };

  return (
    <main className="min-h-screen px-4 py-10 md:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <div className="gold-bar mb-4 h-1.5 w-24 rounded-full" />
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-wide text-primary md:text-4xl">
            <ScrollText className="size-8" />
            金紙製作紀錄表
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            登錄每筆進出貨明細，系統自動統計每人每月產量與月底平均值。
          </p>
        </header>

        <section className="card-paper mb-8 p-5 md:p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Plus className="size-5 text-primary" />
            新增每日紀錄（四人）
          </h2>
          <form onSubmit={submit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="進貨日">
                <Input
                  type="date"
                  value={shared.intake_date}
                  onChange={(e) => setShared({ ...shared, intake_date: e.target.value })}
                />
              </Field>
              <Field label="完成日">
                <Input
                  type="date"
                  value={shared.done_date}
                  onChange={(e) => setShared({ ...shared, done_date: e.target.value })}
                />
              </Field>
              <Field label="備註">
                <Input
                  value={shared.note}
                  onChange={(e) => setShared({ ...shared, note: e.target.value })}
                  placeholder="選填"
                  maxLength={200}
                />
              </Field>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[320px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                    <Th>製作人員</Th>
                    <Th>製作疊數</Th>
                  </tr>
                </thead>
                <tbody>
                  {WORKERS.map((w) => (
                    <tr key={w} className="border-b border-border/60 last:border-0">
                      <Td className="font-medium">{w}</Td>
                      <Td>
                        <Input
                          type="number"
                          min="0"
                          step="0.5"
                          placeholder="0"
                          aria-label={`${w} 製作疊數`}
                          value={entries[w].stacks_out}
                          onChange={(e) =>
                            setEntries((prev) => ({
                              ...prev,
                              [w]: { ...prev[w], stacks_out: e.target.value },
                            }))
                          }
                        />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>


            <Button type="submit" disabled={addRecord.isPending} className="w-full md:w-auto">
              {addRecord.isPending ? "儲存中…" : "儲存四人紀錄"}
            </Button>
          </form>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </section>


        <section className="card-paper mb-8 p-5 md:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <BarChart3 className="size-5 text-primary" />
              每月統計
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="h-9 rounded-md border border-input bg-card px-3 text-sm"
                aria-label="選擇月份"
              >
                {months.map((m) => (
                  <option key={m} value={m}>
                    {m.replace("-", " 年 ")} 月
                  </option>
                ))}
              </select>
              <select
                value={worker}
                onChange={(e) => setWorker(e.target.value)}
                className="h-9 rounded-md border border-input bg-card px-3 text-sm"
                aria-label="選擇人員"
              >
                <option value="">全部人員</option>
                {workers.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
              <Button variant="outline" size="sm" onClick={() => exportCsv(exportPayload())}>
                <FileDown className="size-4" /> 匯出 CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportPdf(exportPayload())}>
                <Printer className="size-4" /> 匯出 PDF
              </Button>
            </div>
          </div>

          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <Stat label="本月總疊數" value={num(stats.totals.stacks)} />
            <Stat label="本月紀錄天數（人次）" value={num(stats.totals.records)} />
            <Stat
              label="每人平均疊數"
              value={num(Number(stats.averages.perPersonStacks.toFixed(2)))}
              highlight
            />
          </div>


          <div className="mb-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <ProductionTrend rows={rows} month={month} stats={stats.list} worker={worker} />
            <Leaderboard stats={stats.list} />
          </div>



          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <Th>製作人員</Th>
                  <Th>筆數</Th>
                  <Th>進貨籃數</Th>
                  <Th>出貨袋數</Th>
                  <Th>疊數</Th>
                  <Th>平均每筆袋數</Th>
                </tr>
              </thead>
              <tbody>
                {stats.list.map((s) => (
                  <tr key={s.worker} className="border-b border-border/60">
                    <Td className="font-medium">{s.worker}</Td>
                    <Td>{s.records}</Td>
                    <Td>{num(s.baskets)}</Td>
                    <Td>{num(s.bags)}</Td>
                    <Td>{num(s.stacks)}</Td>
                    <Td>{num(Number((s.bags / (s.records || 1)).toFixed(2)))}</Td>
                  </tr>
                ))}
                {stats.list.length === 0 && (
                  <tr>
                    <Td className="py-6 text-muted-foreground">本月尚無紀錄</Td>
                  </tr>
                )}
              </tbody>
              {stats.list.length > 0 && (
                <tfoot>
                  <tr className="bg-secondary/60 font-semibold">
                    <Td>月底平均（每人）</Td>
                    <Td>{num(Number((stats.totals.records / stats.list.length).toFixed(2)))}</Td>
                    <Td>{num(Number(stats.averages.perPersonBaskets.toFixed(2)))}</Td>
                    <Td>{num(Number(stats.averages.perPersonBags.toFixed(2)))}</Td>
                    <Td>{num(Number(stats.averages.perPersonStacks.toFixed(2)))}</Td>
                    <Td>{num(Number(stats.averages.perRecordBags.toFixed(2)))}</Td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </section>

        <section className="card-paper p-5 md:p-6">
          <h2 className="mb-4 text-lg font-semibold">
            本月明細 <span className="text-sm text-muted-foreground">（{monthRows.length} 筆）</span>
          </h2>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">載入中…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <Th>進貨日</Th>
                    <Th>完成日</Th>
                    <Th>製作人員</Th>
                    <Th>進貨籃數</Th>
                    <Th>出貨袋數</Th>
                    <Th>疊數</Th>
                    <Th>備註</Th>
                    <Th> </Th>
                  </tr>
                </thead>
                <tbody>
                  {monthRows.map((r) => (
                    <tr key={r.id} className="border-b border-border/60">
                      <Td>{r.intake_date}</Td>
                      <Td>{r.done_date ?? "—"}</Td>
                      <Td className="font-medium">{r.worker}</Td>
                      <Td>{num(r.baskets_in)}</Td>
                      <Td>{num(r.bags_out)}</Td>
                      <Td>{num(r.stacks_out)}</Td>
                      <Td className="text-muted-foreground">{r.note ?? "—"}</Td>
                      <Td>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="刪除紀錄"
                          onClick={() => removeRecord.mutate(r.id)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </Td>
                    </tr>
                  ))}
                  {monthRows.length === 0 && (
                    <tr>
                      <Td className="py-6 text-muted-foreground">本月尚無紀錄</Td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border border-border p-4 ${highlight ? "bg-secondary" : "bg-muted/40"}`}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-primary">{value}</p>
    </div>
  );
}

const Th = ({ children }: { children: React.ReactNode }) => (
  <th className="px-3 py-2 font-medium">{children}</th>
);
const Td = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <td className={`px-3 py-2 ${className}`}>{children}</td>
);
