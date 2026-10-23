// Notice board data and pure logic, shared by the page and the MCP route. Notices stay in the browser.

export type NoticeStatus = "Published" | "Draft" | "Scheduled";
export type Notice = { id: string; title: string; body: string; status: NoticeStatus; section: string; date: string };
export type Filter = "All" | NoticeStatus;
export type Draft = { title: string; body: string; section: string; status: NoticeStatus };

export const STORAGE_KEY = "announcements-v2";
export const STATUSES: NoticeStatus[] = ["Draft", "Scheduled", "Published"];
export const FILTERS: Filter[] = ["All", "Published", "Scheduled", "Draft"];
export const NO_DATE = "—";

export const SEED: Notice[] = [
  { id: "1", title: "The new project shelf is open", body: "Five product worlds have moved from starter shells into their own visual language.", status: "Published", section: "Studio", date: "23 Aug 2026" },
  { id: "2", title: "Maintenance window", body: "A short quiet period is planned while the next collection is prepared.", status: "Scheduled", section: "Operations", date: "29 Aug 2026" },
  { id: "3", title: "A note before the next release", body: "Draft the useful context before the launch day arrives.", status: "Draft", section: "Editorial", date: NO_DATE },
];

function isNotice(value: unknown): value is Notice {
  if (!value || typeof value !== "object") return false;
  const n = value as Record<string, unknown>;
  return (
    ["id", "title", "body", "section", "date"].every((key) => typeof n[key] === "string") &&
    (STATUSES as unknown[]).includes(n.status)
  );
}

// Stored data is untrusted: anything that is not an array of well-formed notices is ignored (null).
export function parseNotices(raw: string | null): Notice[] | null {
  if (raw === null) return null;
  try {
    const data: unknown = JSON.parse(raw);
    return Array.isArray(data) ? data.filter(isNotice) : null;
  } catch {
    return null;
  }
}

export function filterNotices(notices: Notice[], filter: Filter, query: string): Notice[] {
  const needle = query.trim().toLowerCase();
  return notices.filter(
    (notice) =>
      (filter === "All" || notice.status === filter) &&
      `${notice.title} ${notice.body} ${notice.section}`.toLowerCase().includes(needle),
  );
}

// "23 Aug 2026", the format the sample notices use.
export function formatDate(time: number): string {
  return new Date(time).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function addNotice(notices: Notice[], draft: Draft, id: string, now: number): Notice[] {
  const title = draft.title.trim();
  const body = draft.body.trim();
  if (!title || !body) return notices;
  const section = draft.section.trim() || "General";
  const date = draft.status === "Published" ? formatDate(now) : NO_DATE;
  return [{ id, title, body, section, status: draft.status, date }, ...notices];
}

export function removeNotice(notices: Notice[], id: string): Notice[] {
  return notices.filter((notice) => notice.id !== id);
}

// Board position label: 01, 02 ... 10, 11 (not "010").
export function positionLabel(index: number): string {
  return String(index + 1).padStart(2, "0");
}

export function formatNotice(notice: Notice): string {
  return `${notice.title}\n\n${notice.body}`;
}
