import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Trash2, Plus, BarChart3, ScrollText } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildStats, monthKey, num, type JossRecord } from "@/lib/joss";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "金紙製作紀錄表 | 進出貨與每月統計" },
      {
        name: "description",
        content:
          "記錄金紙進貨日、完成日、進貨籃數、出貨袋數與疊數，並自動統計每人每月產量與月底平均值。",
      },
      { property: "og:title", content: "金紙製作紀錄表" },
      {
        property: "og:description",
        content: "登錄金紙進出貨明細，自動彙整每人每月產量與平均值。",
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
  const [form, setForm] = useState({
    worker: "",
    intake_date: today(),
    done_date: "",
    baskets_in: "",
    bags_out: "",
    stacks_out: "",
    note: "",
  });
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
      const { error } = await supabase.from("joss_records").insert({
        worker: form.worker.trim(),
        intake_date: form.intake_date,
        done_date: form.done_date || null,
        baskets_in: Number(form.baskets_in) || 0,
        bags_out: Number(form.bags_out) || 0,
        stacks_out: Number(form.stacks_out) || 0,
        note: form.note.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setForm((f) => ({
        ...f,
        done_date: "",
        baskets_in: "",
        bags_out: "",
        stacks_out: "",
        note: "",
      }));
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

  const stats = useMemo(() => buildStats(rows, month), [rows, month]);
  const monthRows = rows.filter((r) => monthKey(r.intake_date) === month);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.worker.trim()) return setError("請填寫製作人員姓名");
    if (!form.intake_date) return setError("請選擇進貨日");
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
            新增紀錄
          </h2>
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-4">
            <Field label="製作人員">
              <Input
                value={form.worker}
                onChange={(e) => setForm({ ...form, worker: e.target.value })}
                placeholder="例：阿明"
                maxLength={40}
              />
            </Field>
            <Field label="進貨日">
              <Input
                type="date"
                value={form.intake_date}
                onChange={(e) => setForm({ ...form, intake_date: e.target.value })}
              />
            </Field>
            <Field label="完成日">
              <Input
                type="date"
                value={form.done_date}
                onChange={(e) => setForm({ ...form, done_date: e.target.value })}
              />
            </Field>
            <Field label="進貨籃數">
              <Input
                type="number"
                min="0"
                step="0.5"
                value={form.baskets_in}
                onChange={(e) => setForm({ ...form, baskets_in: e.target.value })}
                placeholder="0"
              />
            </Field>
            <Field label="出貨袋數">
              <Input
                type="number"
                min="0"
                step="0.5"
                value={form.bags_out}
                onChange={(e) => setForm({ ...form, bags_out: e.target.value })}
                placeholder="0"
              />
            </Field>
            <Field label="出貨疊數">
              <Input
                type="number"
                min="0"
                step="0.5"
                value={form.stacks_out}
                onChange={(e) => setForm({ ...form, stacks_out: e.target.value })}
                placeholder="0"
              />
            </Field>
            <Field label="備註">
              <Input
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="選填"
                maxLength={200}
              />
            </Field>
            <div className="flex items-end">
              <Button type="submit" className="w-full" disabled={addRecord.isPending}>
                {addRecord.isPending ? "儲存中…" : "新增紀錄"}
              </Button>
            </div>
          </form>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </section>

        <section className="card-paper mb-8 p-5 md:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <BarChart3 className="size-5 text-primary" />
              每月統計
            </h2>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-9 rounded-md border border-input bg-card px-3 text-sm"
            >
              {months.map((m) => (
                <option key={m} value={m}>
                  {m.replace("-", " 年 ")} 月
                </option>
              ))}
            </select>
          </div>

          <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="本月總進貨籃數" value={num(stats.totals.baskets)} />
            <Stat label="本月總出貨袋數" value={num(stats.totals.bags)} />
            <Stat label="本月總疊數" value={num(stats.totals.stacks)} />
            <Stat
              label="每人平均出貨袋數"
              value={num(Number(stats.averages.perPersonBags.toFixed(2)))}
              highlight
            />
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
