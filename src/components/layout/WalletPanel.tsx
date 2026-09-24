"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { ApiError } from "@/types/api";
import { useAuth } from "@/lib/auth/AuthContext";
import { useWallet, useWalletTransactions, useTopUpWallet, type WalletTransaction } from "@/modules/shared/api/wallet";

function money(n: number): string {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function TransactionRow({ txn }: { txn: WalletTransaction }) {
  const isCredit = txn.txn_type === "credit";
  const label = txn.outlet?.name ?? txn.remarks ?? (txn.source === "transfer" ? (txn.counterparty_email ?? "Transfer") : "Wallet");
  return (
    <div className="flex items-center justify-between gap-3 border-t border-divider px-4 py-3 first:border-0">
      <div className="min-w-0">
        <div className="truncate text-[13px] font-semibold text-ink">{label}</div>
        <div className="text-[11.5px] text-subtle">
          {timeAgo(txn.created_at)}
          {txn.status !== "success" && ` · ${txn.status}`}
        </div>
      </div>
      <span className={`shrink-0 text-[13.5px] font-bold ${isCredit ? "text-primary" : "text-ink"}`}>
        {isCredit ? "+" : "−"}
        {money(txn.amount)}
      </span>
    </div>
  );
}

export function WalletPanel({ onClose }: { onClose: () => void }) {
  const { session } = useAuth();
  const ref = useRef<HTMLDivElement>(null);
  const { data: wallet, isLoading: walletLoading } = useWallet();
  const { data: txnPage, isLoading: txnsLoading } = useWalletTransactions();
  const topUp = useTopUpWallet();

  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  async function handleTopUp() {
    setError(null);
    setSuccess(null);
    const value = Number(amount);
    if (!amount || Number.isNaN(value) || value < 10) {
      setError("Enter at least ₹10.");
      return;
    }
    try {
      const result = await topUp.mutateAsync({ amount: value, email: session?.user.email });
      setSuccess(`₹${value} added — new balance ${money(result.balance)}.`);
      setAmount("");
    } catch (err) {
      if (err instanceof Error && err.message === "Payment cancelled") return;
      setError(err instanceof ApiError ? err.message : "Top-up failed. Please try again.");
    }
  }

  const rows = txnPage?.data ?? [];

  return (
    <div
      ref={ref}
      className="absolute top-[46px] right-0 z-50 flex max-h-[520px] w-[360px] flex-col overflow-hidden rounded-card border border-border-default bg-surface shadow-modal"
    >
      <div className="border-b border-divider bg-accent-50 px-5 py-4">
        <div className="text-[12px] font-bold text-muted">Wallet Balance</div>
        <div className="mt-1 text-[26px] font-extrabold tracking-[-.02em] text-ink">
          {walletLoading ? <Spinner size={20} /> : money(wallet?.balance ?? 0)}
        </div>
      </div>

      <div className="border-b border-divider px-4 py-3.5">
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={10}
            placeholder="Amount to add"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex-1"
          />
          <Button variant="primarySmall" className="w-auto shrink-0" loading={topUp.isPending} onClick={handleTopUp}>
            Add Money
          </Button>
        </div>
        <div className="mt-2 flex gap-1.5">
          {[100, 250, 500, 1000].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setAmount(String(v))}
              className="rounded-pill border border-border-default px-2.5 py-1 text-[11.5px] font-bold text-muted hover:border-border-accent hover:text-primary"
            >
              ₹{v}
            </button>
          ))}
        </div>
        {error && <p className="mt-2 text-[12px] font-semibold text-danger-fg">{error}</p>}
        {success && !error && <p className="mt-2 text-[12px] font-semibold text-primary">{success}</p>}
      </div>

      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <span className="text-[12px] font-bold text-muted">Recent Activity</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {txnsLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size={20} />
          </div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-6 text-center text-[12.5px] text-subtle">No transactions yet.</div>
        ) : (
          rows.map((txn) => <TransactionRow key={txn.id} txn={txn} />)
        )}
      </div>
      <div className="border-t border-divider px-4 py-2 text-center text-[11px] text-subtle">
        <Icon name="lock" size={12} className="mr-1 inline align-text-bottom" />
        Secured by Razorpay
      </div>
    </div>
  );
}
