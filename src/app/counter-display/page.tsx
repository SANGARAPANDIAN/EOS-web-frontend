"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useCounterQueue } from "@/modules/canteen-queue/api/counterQueue";
import { useQueueSocket } from "@/modules/canteen-queue/realtime/useQueueSocket";

/**
 * Public, unauthenticated wall-mounted counter screen — a top-level route
 * outside (portal), same precedent as src/app/login/page.tsx. Shows ONLY
 * token + status for orders that are ready — no dish/item detail, ever, by
 * design (the backend DTO shape never includes it). Customers wait for
 * their token to appear here instead of crowding the counter; there's no
 * auto-expiry — a ready order only leaves once the cashier marks it
 * received, so the "waiting Xm" line is informational, not a countdown. A
 * freshly-ready order gets a brief highlight pulse so a new arrival is
 * noticeable on a screen nobody is staring at continuously.
 */

function useClock(): string {
  const [time, setTime] = useState<Date | null>(null);
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!time) return "--:--:--";
  return time.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function elapsedSeconds(iso: string, now: number): number {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
}

export default function CounterDisplayPage() {
  useQueueSocket("counter");
  const { data } = useCounterQueue();
  const orders = data?.orders ?? [];
  const clock = useClock();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-white p-10 text-[#0b1220]">
      <div className="mb-10 flex items-end justify-between gap-6 border-b border-slate-200 pb-6">
        <div className="flex items-center gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white">
            <Icon name="storefront" size={30} />
          </div>
          <div>
            <p className="text-[12.5px] font-bold uppercase tracking-[.22em] text-blue-600">Sri Eshwar Canteen</p>
            <h1 className="mt-0.5 text-[34px] font-extrabold leading-none tracking-tight text-[#0b1220]">Ready for Pickup</h1>
          </div>
        </div>
        <p className="font-mono text-[30px] font-bold leading-none tabular-nums text-[#0b1220]">{clock}</p>
      </div>

      {orders.length === 0 ? (
        <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-slate-300">
          <Icon name="restaurant" size={72} />
          <p className="text-[22px] font-bold text-slate-400">No orders ready right now</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 xl:grid-cols-4">
          {orders.map((o) => {
            const secs = elapsedSeconds(o.readySince, now);
            const isFresh = secs < 20;
            const mins = Math.floor(secs / 60);
            return (
              <div
                key={o.orderId}
                className={`flex w-full flex-col items-center gap-2.5 overflow-hidden rounded-[24px] border px-2 py-9 shadow-sm transition-all duration-700 ${
                  isFresh
                    ? "scale-[1.03] border-blue-400 bg-blue-50 shadow-[0_10px_30px_-12px_rgba(37,99,235,0.35)]"
                    : "border-slate-200 bg-white"
                }`}
              >
                <span className="font-mono text-[clamp(2rem,6vw,3.75rem)] font-extrabold leading-none tracking-[.05em] text-[#0b1220]">
                  {o.token}
                </span>
                <span className="rounded-full bg-blue-600 px-3 py-1 text-[12px] font-bold uppercase tracking-[.12em] text-white">
                  Ready
                </span>
                <span className="text-[12px] font-medium text-slate-500">
                  {mins <= 0 ? "just now" : `waiting ${mins}m`}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-10 text-center text-[13px] font-medium text-slate-400">Collect your order at the counter with your token number</p>
    </div>
  );
}
