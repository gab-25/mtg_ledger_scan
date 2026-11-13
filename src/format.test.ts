import { capfirst, dateLong, dateTime, euro, intcomma, naturalday, naturaltime, pluralize, time } from "./format";

// Expected strings are Django's output (en-us, TIME_ZONE Europe/Rome) for the same values.
const NOW = new Date("2026-11-10T11:00:00Z"); // 12:00 in Rome
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();
const S = 1000, M = 60 * S, H = 60 * M, D = 24 * H;
const nb = " ";

describe("numbers", () => {
  it("intcomma", () => {
    expect(intcomma(21)).toBe("21");
    expect(intcomma(1234567)).toBe("1,234,567");
    expect(intcomma(null)).toBe("0");
  });

  it("euro like floatformat:'0g' and '2g'", () => {
    expect(euro("1234.5", 0)).toBe("€1,235");
    expect(euro("2.5", 0)).toBe("€3");
    expect(euro("0.505", 2)).toBe("€0.51");
    expect(euro("1234567.891", 2)).toBe("€1,234,567.89");
    expect(euro(0, 0)).toBe("€0");
    expect(euro(null, 2)).toBe("");
  });

  it("pluralize", () => {
    expect(pluralize(1)).toBe("");
    expect(pluralize(0)).toBe("s");
    expect(pluralize(3, "y", "ies")).toBe("ies");
  });
});

describe("dates in Europe/Rome", () => {
  const lateUtc = "2026-11-09T23:30:00Z"; // already the 10th in Rome

  it("date, date and time, time", () => {
    expect(dateLong(lateUtc)).toBe("10 Nov 2026");
    expect(dateTime(lateUtc)).toBe("10 Nov 2026 00:30");
    expect(time(lateUtc)).toBe("00:30");
    expect(time("2026-11-09T23:30:07Z", true)).toBe("00:30:07");
    expect(dateLong(null)).toBe("");
  });

  it("naturalday", () => {
    expect(naturalday("2026-11-09T23:30:00Z", undefined, NOW)).toBe("today");
    expect(naturalday("2026-11-09T22:30:00Z", undefined, NOW)).toBe("yesterday");
    expect(naturalday("2026-11-11T08:00:00Z", undefined, NOW)).toBe("tomorrow");
    expect(naturalday("2026-11-04T10:00:00Z", undefined, NOW)).toBe("Nov. 4, 2026");
    expect(naturalday("2026-11-04T10:00:00Z", "M j", NOW)).toBe("Nov 4");
    expect(naturalday("2025-03-03T10:00:00Z", undefined, NOW)).toBe("March 3, 2025");
    expect(naturalday("2025-09-03T10:00:00Z", undefined, NOW)).toBe("Sept. 3, 2025");
    expect(capfirst(naturalday("2026-11-09T23:30:00Z", undefined, NOW))).toBe("Today");
  });

  it("naturaltime", () => {
    expect(naturaltime(ago(0), NOW)).toBe("now");
    expect(naturaltime(ago(S), NOW)).toBe("a second ago");
    expect(naturaltime(ago(30 * S), NOW)).toBe(`30${nb}seconds ago`);
    expect(naturaltime(ago(M), NOW)).toBe("a minute ago");
    expect(naturaltime(ago(5 * M), NOW)).toBe(`5${nb}minutes ago`);
    expect(naturaltime(ago(H), NOW)).toBe("an hour ago");
    expect(naturaltime(ago(3 * H), NOW)).toBe(`3${nb}hours ago`);
    expect(naturaltime(ago(D + 3 * H), NOW)).toBe(`1${nb}day, 3${nb}hours ago`);
    expect(naturaltime(ago(7 * D), NOW)).toBe(`1${nb}week ago`);
    expect(naturaltime(ago(15 * D), NOW)).toBe(`2${nb}weeks, 1${nb}day ago`);
    expect(naturaltime(ago(40 * D), NOW)).toBe(`1${nb}month, 1${nb}week ago`);
    expect(naturaltime(ago(400 * D), NOW)).toBe(`1${nb}year, 1${nb}month ago`);
  });
});
