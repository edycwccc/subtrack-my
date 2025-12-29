"use client";
import { useEffect, useMemo, useState } from "react";
import { Trash2, AlertTriangle } from "lucide-react";

type Category = "Video" | "Music" | "Tools" | "视频" | "音乐" | "工具";
type Currency = "RM" | "USD";

type Subscription = {
  id: string;
  name: string;
  amount: number;
  category: Category;
  emoji: string;
  nextDate: string;
  billingDay: number;
  currency: Currency;
};

const CATEGORY_EMOJI: Record<Category, string> = {
  视频: "📺",
  音乐: "🎵",
  工具: "🛠️",
  Video: "📺",
  Music: "🎵",
  Tools: "🛠️",
};

const COMMON_APPS = [
  "Netflix",
  "Spotify",
  "YouTube Premium",
  "Disney+ Hotstar",
  "iCloud",
  "ChatGPT Plus",
  "GrabUnlimited",
  "Midjourney",
];

const STORAGE_KEY = "subtrack-my.subscriptions";
const RATE_KEY = "subtrack-my.usdRate";

function nextBillingISOFromDay(billingDay: number, fromDate = new Date()) {
  const y = fromDate.getFullYear();
  const m = fromDate.getMonth();
  const today = fromDate.getDate();
  const targetMonth = today <= billingDay ? m : m + 1;
  const nextYear = y + (targetMonth > 11 ? 1 : 0);
  const nextMonthIndex = targetMonth % 12;
  const daysInTargetMonth = new Date(nextYear, nextMonthIndex + 1, 0).getDate();
  const clampedDay = Math.min(billingDay, daysInTargetMonth);
  const d = new Date(nextYear, nextMonthIndex, clampedDay);
  return d.toISOString().split("T")[0];
}

function formatDisplayDate(iso: string) {
  const d = new Date(iso);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = d.getDate();
  const m = months[d.getMonth()];
  const s =
    day % 10 === 1 && day % 100 !== 11
      ? "st"
      : day % 10 === 2 && day % 100 !== 12
      ? "nd"
      : day % 10 === 3 && day % 100 !== 13
      ? "rd"
      : "th";
  return `${m} ${day}${s}`;
}

function daysUntil(iso: string) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(iso);
  const targetDay = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate()
  );
  const ms = targetDay.getTime() - today.getTime();
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
}

export default function Home() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [amountText, setAmountText] = useState("");
  const [category, setCategory] = useState<Category>("Video");
  const [billingDayText, setBillingDayText] = useState("");
  const [currency, setCurrency] = useState<Currency>("RM");
  const [usdRateText, setUsdRateText] = useState("4.7");
  const [query, setQuery] = useState("");

  useEffect(() => {
    setTimeout(() => setIsMounted(true), 0);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Subscription[];
        if (Array.isArray(parsed)) {
          setTimeout(() => setSubscriptions(parsed), 0);
        }
      }
    } catch {}
    setTimeout(() => setBillingDayText(String(new Date().getDate())), 0);
    try {
      const r = localStorage.getItem(RATE_KEY);
      if (r) setTimeout(() => setUsdRateText(r), 0);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(subscriptions));
    } catch {}
  }, [subscriptions]);

  useEffect(() => {
    try {
      localStorage.setItem(RATE_KEY, usdRateText);
    } catch {}
  }, [usdRateText]);

  const usdRate = useMemo(() => {
    const n = parseFloat(usdRateText);
    return isNaN(n) || n <= 0 ? 4.7 : n;
  }, [usdRateText]);

  const total = useMemo(
    () =>
      subscriptions.reduce((sum, s) => {
        const amt = s.currency === "USD" ? s.amount * usdRate : s.amount;
        return sum + (amt || 0);
      }, 0),
    [subscriptions, usdRate]
  );
  const annual = useMemo(() => total * 12, [total]);
  const appSuggestions = useMemo(() => {
    const q = name.trim().toLowerCase();
    if (!q) return [];
    return COMMON_APPS.filter(
      (a) => a.toLowerCase().includes(q) && a.toLowerCase() !== q
    ).slice(0, 6);
  }, [name]);

  function resetForm() {
    setName("");
    setAmountText("");
    setCategory("Video");
    setBillingDayText(String(new Date().getDate()));
    setCurrency("RM");
  }

  function addSubscription() {
    const amount = parseFloat(amountText);
    const billingDay = parseInt(billingDayText, 10);
    if (
      !name.trim() ||
      isNaN(amount) ||
      amount <= 0 ||
      isNaN(billingDay) ||
      billingDay < 1 ||
      billingDay > 31
    )
      return;
    const sub: Subscription = {
      id: `${Date.now()}`,
      name: name.trim(),
      amount,
      category,
      emoji: CATEGORY_EMOJI[category],
      nextDate: nextBillingISOFromDay(billingDay),
      billingDay,
      currency,
    };
    setSubscriptions((prev) => [sub, ...prev]);
    setModalOpen(false);
    resetForm();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-950 to-black text-white">
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
        <header className="rounded-3xl border border-white/20 bg-white/10 p-6 shadow-xl backdrop-blur-xl">
          <div className="text-sm text-white/70">Monthly Subscription Spending</div>
          <div className="mt-2 text-5xl font-semibold tracking-tight">
            RM {isMounted ? total.toFixed(2) : "--"}
          </div>
          <div className="mt-2 text-xs text-white/60">
            Estimated Annual Spending: RM {isMounted ? annual.toFixed(2) : "--"}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="text-xs text-white/60">USD→RM Rate</div>
            <input
              value={usdRateText}
              onChange={(e) => setUsdRateText(e.target.value)}
              inputMode="decimal"
              className="w-28 sm:w-20 rounded-md border border-white/10 bg-white/5 px-3 sm:px-2 py-2 sm:py-1 text-sm sm:text-xs text-white/70 outline-none ring-fuchsia-500/40 focus:ring-2"
            />
          </div>
        </header>

        <section className="mt-6 space-y-3">
          <div className="flex items-center">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search subscriptions"
              className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/50 outline-none ring-fuchsia-500/50 focus:ring-2"
            />
          </div>
          {!isMounted ? (
            <div className="rounded-2xl border border-white/15 bg-white/5 p-6 backdrop-blur">
              <div className="h-5 w-32 animate-pulse rounded bg-white/20" />
              <div className="mt-4 h-4 w-64 animate-pulse rounded bg-white/10" />
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="rounded-2xl border border-white/15 bg-white/5 p-6 text-white/70 backdrop-blur">
              No subscriptions yet. Tap the + button to get started!
            </div>
          ) : (
            subscriptions
              .filter((s) => {
                const q = query.trim().toLowerCase();
                if (!q) return true;
                return s.name.toLowerCase().includes(q);
              })
              .map((s) => (
              <div
                key={s.id}
                className="group relative flex items-center justify-between rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-2xl">
                    {s.emoji}
                  </div>
                  <div className="min-w-0">
                    <div className="text-base font-medium truncate">{s.name}</div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-white/60">
                        Next billing: {formatDisplayDate(s.nextDate)}
                      </span>
                      {isMounted && (
                        (() => {
                          const d = daysUntil(s.nextDate);
                          const urgent = d < 3;
                          if (d === 0) {
                            return (
                              <span className="flex items-center gap-1 rounded-md border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-red-500">
                                <AlertTriangle className="h-3 w-3" />
                                Due Today
                              </span>
                            );
                          }
                          if (urgent) {
                            return (
                              <span className="rounded-md border border-orange-500/40 bg-orange-500/10 px-2 py-0.5 text-orange-400">
                                {d} days remaining
                              </span>
                            );
                          }
                          return (
                            <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-400">
                              {d} days remaining
                            </span>
                          );
                        })()
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-lg font-semibold">
                      RM{" "}
                      {(s.currency === "USD"
                        ? s.amount * usdRate
                        : s.amount
                      ).toFixed(2)}
                    </div>
                  </div>
                  <button
                    aria-label="Delete subscription"
                    onClick={() => {
                      if (!isMounted) return;
                      const ok = window.confirm("Delete this subscription?");
                      if (ok) {
                        setSubscriptions((prev) => prev.filter((x) => x.id !== s.id));
                      }
                    }}
                    className="rounded-md p-2 sm:p-1 text-white/60 opacity-20 transition hover:scale-110 group-hover:opacity-100 group-hover:text-red-500"
                  >
                    <Trash2 className="h-6 w-6 sm:h-5 sm:w-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </section>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur sm:flex-row">
          <div className="text-xs text-white/60">Enjoying SubTrack MY?</div>
          <a
            href="https://www.buymeacoffee.com/edycwccc"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-full border border-fuchsia-500/30 bg-gradient-to-br from-white/10 to-white/5 px-5 py-2 text-sm font-medium text-white shadow-lg shadow-fuchsia-600/20 backdrop-blur transition hover:scale-105 hover:border-fuchsia-400/50 hover:bg-white/10"
          >
            Buy me a Teh C ☕
          </a>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          aria-label="Add subscription"
          className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-fuchsia-600 text-3xl shadow-lg shadow-fuchsia-600/30 transition hover:bg-fuchsia-500"
        >
          +
        </button>

        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-md rounded-3xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-xl">
              <div className="text-lg font-medium">Add Subscription</div>
              <div className="mt-5 space-y-4">
                <div>
                  <div className="mb-2 text-sm text-white/70">App Name</div>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Netflix"
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/50 outline-none ring-fuchsia-500/50 focus:ring-2"
                  />
                  {appSuggestions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {appSuggestions.map((a) => (
                        <button
                          key={a}
                          onClick={() => setName(a)}
                          className="rounded-lg border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/80 transition hover:bg-white/15"
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <div className="mb-2 text-sm text-white/70">Monthly Fee</div>
                  <input
                    value={amountText}
                    onChange={(e) => setAmountText(e.target.value)}
                    inputMode="decimal"
                    placeholder="e.g., 45"
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/50 outline-none ring-fuchsia-500/50 focus:ring-2"
                  />
                </div>
                <div>
                  <div className="mb-2 text-sm text-white/70">Category</div>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Category)}
                    className="w-full appearance-none rounded-xl border border-white/20 bg-neutral-900 px-4 py-3 text-white outline-none ring-fuchsia-500/50 focus:ring-2"
                    style={{ backgroundColor: "#0a0a0a", color: "#ffffff" }}
                  >
                    <option value="Video" style={{ backgroundColor: "#0a0a0a", color: "#ffffff" }}>
                      Video
                    </option>
                    <option value="Music" style={{ backgroundColor: "#0a0a0a", color: "#ffffff" }}>
                      Music
                    </option>
                    <option value="Tools" style={{ backgroundColor: "#0a0a0a", color: "#ffffff" }}>
                      Tools
                    </option>
                  </select>
                </div>
                <div>
                  <div className="mb-2 text-sm text-white/70">Currency</div>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as Currency)}
                    className="w-full appearance-none rounded-xl border border-white/20 bg-neutral-900 px-4 py-3 text-white outline-none ring-fuchsia-500/50 focus:ring-2"
                    style={{ backgroundColor: "#0a0a0a", color: "#ffffff" }}
                  >
                    <option value="RM" style={{ backgroundColor: "#0a0a0a", color: "#ffffff" }}>
                      RM
                    </option>
                    <option value="USD" style={{ backgroundColor: "#0a0a0a", color: "#ffffff" }}>
                      USD
                    </option>
                  </select>
                </div>
                <div>
                  <div className="mb-2 text-sm text-white/70">Billing Day (1-31)</div>
                  <input
                    value={billingDayText}
                    onChange={(e) => setBillingDayText(e.target.value)}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={31}
                    placeholder="e.g., 15"
                    className="w-full rounded-xl border border-white/20 bg-neutral-900 px-4 py-3 text-white placeholder-white/50 outline-none ring-fuchsia-500/50 focus:ring-2"
                    style={{ backgroundColor: "#0a0a0a", color: "#ffffff" }}
                  />
                </div>
              </div>
              <div className="mt-6 flex items-center gap-3">
                <button
                  onClick={() => {
                    setModalOpen(false);
                    resetForm();
                  }}
                  className="flex-1 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white/80 transition hover:bg-white/15"
                >
                  Cancel
                </button>
                <button
                  onClick={addSubscription}
                  className="flex-1 rounded-xl bg-fuchsia-600 px-4 py-3 font-medium text-white transition hover:bg-fuchsia-500"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
