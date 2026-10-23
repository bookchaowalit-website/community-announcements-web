import { describe, expect, it } from "vitest";
import { NO_DATE, SEED, addNotice, filterNotices, formatDate, formatNotice, parseNotices, positionLabel, removeNotice } from "@/lib/announcements";

const draft = { title: " Launch ", body: " It is out. ", section: " ", status: "Published" as const };

describe("addNotice", () => {
  it("dates a published notice with the day it was pinned", () => {
    // Regression: every new Published notice was stamped "23 Aug 2026", whatever the day.
    const next = addNotice(SEED, draft, "n1", Date.UTC(2026, 9, 23, 12));
    expect(next[0]).toEqual({ id: "n1", title: "Launch", body: "It is out.", section: "General", status: "Published", date: "23 Oct 2026" });
  });

  it("leaves drafts and scheduled notices undated", () => {
    expect(addNotice(SEED, { ...draft, status: "Draft" }, "n2", 0)[0].date).toBe(NO_DATE);
    expect(addNotice(SEED, { ...draft, status: "Scheduled" }, "n3", 0)[0].date).toBe(NO_DATE);
  });

  it("refuses a blank headline or body", () => {
    expect(addNotice(SEED, { ...draft, title: "  " }, "n4", 0)).toBe(SEED);
    expect(addNotice(SEED, { ...draft, body: "" }, "n5", 0)).toBe(SEED);
  });
});

describe("positionLabel", () => {
  it("pads to two digits without breaking at ten", () => {
    // Regression: the page rendered `0{index + 1}`, so the tenth notice showed "010".
    expect(positionLabel(0)).toBe("01");
    expect(positionLabel(9)).toBe("10");
    expect(positionLabel(10)).toBe("11");
  });
});

describe("filterNotices", () => {
  it("filters by state and searches title, body and desk", () => {
    expect(filterNotices(SEED, "Draft", "").map((n) => n.id)).toEqual(["3"]);
    expect(filterNotices(SEED, "All", " operations ").map((n) => n.id)).toEqual(["2"]);
    expect(filterNotices(SEED, "Published", "maintenance")).toEqual([]);
  });
});

describe("parseNotices", () => {
  it("ignores missing, broken and non-array storage", () => {
    expect(parseNotices(null)).toBeNull();
    expect(parseNotices("[")).toBeNull();
    expect(parseNotices('"text"')).toBeNull();
  });

  it("drops malformed notices", () => {
    expect(parseNotices(JSON.stringify([SEED[0], { ...SEED[1], status: "Live" }, {}]))).toEqual([SEED[0]]);
  });
});

describe("helpers", () => {
  it("formats dates and copy text", () => {
    expect(formatDate(Date.UTC(2026, 7, 29, 12))).toBe("29 Aug 2026");
    expect(formatNotice(SEED[1])).toBe("Maintenance window\n\nA short quiet period is planned while the next collection is prepared.");
    expect(removeNotice(SEED, "2").map((n) => n.id)).toEqual(["1", "3"]);
  });
});
