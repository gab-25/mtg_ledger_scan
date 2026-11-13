// Number and date formatting matching the Django templates of mtg_ledger_core (en-us, TIME_ZONE Europe/Rome):
// intcomma, floatformat:"0g"/"2g", date:"j M Y", naturalday, naturaltime, capfirst, pluralize.

export const TIME_ZONE = "Europe/Rome";
const NBSP = " ";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// Django's "N" format (Associated Press style).
const AP_MONTHS = ["Jan.", "Feb.", "March", "April", "May", "June", "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."];

const group = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

export function intcomma(n: number | null | undefined): string {
  return group(String(Math.trunc(n ?? 0)));
}

/** A decimal string rounded half up to `digits` decimals (Django rounds Decimals with ROUND_HALF_UP). */
function roundHalfUp(value: string | number, digits: number): string {
  const text = typeof value === "number" ? String(value) : value.trim();
  const negative = text.startsWith("-");
  const [intPart, frac = ""] = text.replace(/^[-+]/, "").split(".");
  const scaled = BigInt((intPart || "0") + frac.padEnd(digits + 1, "0").slice(0, digits + 1));
  const rounded = (scaled + 5n) / 10n; // drop the extra digit, rounding half up
  const s = rounded.toString().padStart(digits + 1, "0");
  const whole = s.slice(0, s.length - digits);
  const decimals = digits ? "." + s.slice(s.length - digits) : "";
  const zero = /^0*$/.test(whole + decimals.slice(1));
  return (negative && !zero ? "-" : "") + group(whole) + decimals;
}

/** "€1,234.50" (digits 2) or "€1,235" (digits 0); "" for no value. */
export function euro(value: string | number | null | undefined, digits: 0 | 2): string {
  if (value === null || value === undefined || value === "") return "";
  return "€" + roundHalfUp(value, digits);
}

export const pluralize = (n: number, singular = "", plural = "s") => (n === 1 ? singular : plural);

export const capfirst = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

type Parts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

const partsFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE, year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
  second: "2-digit", hourCycle: "h23",
});

/** Calendar fields of a moment in Europe/Rome. */
function local(date: Date): Parts {
  const p: Record<string, number> = {};
  for (const { type, value } of partsFormat.formatToParts(date)) p[type] = Number(value);
  return { year: p.year, month: p.month, day: p.day, hour: p.hour, minute: p.minute, second: p.second };
}

const pad = (n: number) => String(n).padStart(2, "0");
const parse = (iso: string | Date) => (iso instanceof Date ? iso : new Date(iso));

/** date:"j M Y" → "9 Nov 2026" */
export function dateLong(iso: string | null | undefined): string {
  if (!iso) return "";
  const p = local(parse(iso));
  return `${p.day} ${MONTHS[p.month - 1]} ${p.year}`;
}

/** time:"H:i" → "18:05"; with seconds, time:"H:i:s" → "18:05:09" */
export function time(iso: string | null | undefined, seconds = false): string {
  if (!iso) return "";
  const p = local(parse(iso));
  return `${pad(p.hour)}:${pad(p.minute)}${seconds ? `:${pad(p.second)}` : ""}`;
}

/** date:"j M Y H:i" → "9 Nov 2026 18:05" */
export function dateTime(iso: string | null | undefined): string {
  return iso ? `${dateLong(iso)} ${time(iso)}` : "";
}

/** naturalday: today / yesterday / tomorrow, else DATE_FORMAT ("Nov. 9, 2026") or "M j" ("Nov 9"). */
export function naturalday(iso: string | null | undefined, format?: "M j", now: Date = new Date()): string {
  if (!iso) return "";
  const p = local(parse(iso));
  const t = local(now);
  const days = (Date.UTC(p.year, p.month - 1, p.day) - Date.UTC(t.year, t.month - 1, t.day)) / 86400000;
  if (days === 0) return "today";
  if (days === -1) return "yesterday";
  if (days === 1) return "tomorrow";
  if (format === "M j") return `${MONTHS[p.month - 1]} ${p.day}`;
  return `${AP_MONTHS[p.month - 1]} ${p.day}, ${p.year}`;
}

const unit = (n: number, word: string) => `${n}${NBSP}${word}${n === 1 ? "" : "s"}`;

/** Django's timesince(d, now) with depth 2: calendar years and months, then weeks, days, hours, minutes. */
function timesince(d: Date, now: Date): string {
  let months = (now.getUTCFullYear() - d.getUTCFullYear()) * 12 + (now.getUTCMonth() - d.getUTCMonth());
  const dayTime = (x: Date) => x.getUTCDate() * 86400000 + (x.getTime() % 86400000);
  if (dayTime(d) > dayTime(now)) months -= 1;
  const years = Math.floor(months / 12);
  months %= 12;
  let pivot = d;
  if (years || months) {
    const y = d.getUTCFullYear() + years + Math.floor((d.getUTCMonth() + months) / 12);
    const m = (d.getUTCMonth() + months) % 12;
    const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    pivot = new Date(Date.UTC(y, m, Math.min(d.getUTCDate(), lastDay), d.getUTCHours(), d.getUTCMinutes(),
      d.getUTCSeconds(), d.getUTCMilliseconds()));
  }
  let remaining = Math.floor((now.getTime() - pivot.getTime()) / 1000);
  const partials = [years, months];
  for (const chunk of [604800, 86400, 3600, 60]) {
    const count = Math.floor(remaining / chunk);
    partials.push(count);
    remaining -= count * chunk;
  }
  const names = ["year", "month", "week", "day", "hour", "minute"];
  const first = partials.findIndex((n) => n > 0);
  if (first === -1) return unit(0, "minute");
  const result = [unit(partials[first], names[first])];
  if (first + 1 < partials.length && partials[first + 1] > 0) result.push(unit(partials[first + 1], names[first + 1]));
  return result.join(", ");
}

/** naturaltime for past moments: "now", "a minute ago", "3 hours ago", "1 day, 3 hours ago"… */
export function naturaltime(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return "";
  const value = parse(iso);
  const seconds = Math.floor((now.getTime() - value.getTime()) / 1000);
  if (seconds < 0) return "now";
  if (seconds >= 86400) return `${timesince(value, now)} ago`;
  if (seconds === 0) return "now";
  if (seconds < 60) return seconds === 1 ? "a second ago" : `${seconds}${NBSP}seconds ago`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    return m === 1 ? "a minute ago" : `${m}${NBSP}minutes ago`;
  }
  const h = Math.floor(seconds / 3600);
  return h === 1 ? "an hour ago" : `${h}${NBSP}hours ago`;
}
