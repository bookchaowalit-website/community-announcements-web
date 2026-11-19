"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AppFoot, AppTop, ListButton, Pill, PlusIcon, type Tone } from "@/components/app-shell";
import { FILTERS, SEED, STATUSES, STORAGE_KEY, addNotice, filterNotices, formatNotice, parseNotices, restoreNotice, type Draft, type Filter, type Notice, type NoticeStatus as Status } from "@/lib/announcements";
import { useStoredState } from "@/lib/use-stored-state";

type Removed = { notice: Notice; beforeId: string | null; nextShown?: string; prevShown?: string; viaKeyboard: boolean };
const EMPTY_DRAFT: Draft = { title: "", body: "", section: "Studio", status: "Draft" };
const TONE: Record<Status, Tone> = { Draft: "grey", Scheduled: "amber", Published: "green" };
const LIST_LABEL: Record<Filter, string> = { All: "All notices", Published: "Published", Scheduled: "Scheduled", Draft: "Drafts" };

// randomUUID only exists in secure contexts (HTTPS/localhost) and newer browsers.
function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `notice-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// One line of the notice per row (App shell rule); a longer one gets Show more.
function NoticeBody({ body }: { body: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const [clipped, setClipped] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => { if (el.dataset.expanded !== "true") setClipped(el.scrollWidth > el.clientWidth); };
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
    observer?.observe(el);
    measure();
    return () => observer?.disconnect();
  }, [body]);
  const long = expanded || clipped || body.includes("\n");
  return (
    <>
      <p ref={ref} id={id} className="as-row-detail" data-expanded={expanded ? "true" : undefined}>{body}</p>
      {long ? (
        <button type="button" className="as-plain as-row-more" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(!expanded)}>
          {expanded ? "Show less" : "Show more"}
        </button>
      ) : null}
    </>
  );
}

export default function Home() {
  const [items, setItems] = useStoredState(STORAGE_KEY, SEED, parseNotices);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [removed, setRemoved] = useState<Removed | null>(null);
  const [toastFocused, setToastFocused] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);
  const newRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  const toastRef = useRef<HTMLDivElement>(null);
  const wasComposing = useRef(false);
  const focusNext = useRef<string[] | null>(null);
  const visible = useMemo(() => filterNotices(items, filter, query), [items, filter, query]);
  const counts = useMemo(() => Object.fromEntries(FILTERS.map((value) => [value, value === "All" ? items.length : items.filter((item) => item.status === value).length])) as Record<Filter, number>, [items]);
  const [copied, setCopied] = useState<string | null>(null);

  // Opening the composer focuses the author; closing it returns focus to New notice.
  useEffect(() => {
    if (composing) titleRef.current?.focus();
    else if (wasComposing.current) newRef.current?.focus();
    wasComposing.current = composing;
  }, [composing]);
  useEffect(() => { if (removed?.viaKeyboard) undoRef.current?.focus(); }, [removed]);
  // After the toast closes, focus goes to the nearest row still shown, else New notice.
  useEffect(() => {
    const ids = focusNext.current;
    if (removed || !ids) return;
    focusNext.current = null;
    const rows = [...document.querySelectorAll<HTMLElement>(".as-row[data-notice]")];
    const row = ids.map((id) => rows.find((r) => r.dataset.notice === id)).find(Boolean);
    (row?.querySelector<HTMLButtonElement>(".as-danger") ?? newRef.current ?? titleRef.current)?.focus();
  }, [removed, items]);
  // Reserve the toast's height at the bottom so a control focused behind it scrolls clear.
  const toastShown = removed !== null;
  useLayoutEffect(() => {
    const toast = toastRef.current;
    if (!toastShown || !toast) return;
    const rootStyle = document.documentElement.style;
    const reserve = () => rootStyle.setProperty("--as-toast-space", `${toast.offsetHeight + 32}px`);
    reserve();
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(reserve) : null;
    observer?.observe(toast);
    return () => { observer?.disconnect(); rootStyle.removeProperty("--as-toast-space"); };
  }, [toastShown]);
  // The toast closes 6 s after a removal, but never while it holds focus.
  useEffect(() => {
    if (!removed || toastFocused) return;
    const timer = window.setTimeout(() => setRemoved(null), 6000);
    return () => window.clearTimeout(timer);
  }, [removed, toastFocused]);

  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = addNotice(items, draft, createId(), Date.now());
    if (next === items) return;
    setItems(next);
    // Show the new notice: its own list, and no search that might hide it.
    if (filter !== "All" && filter !== draft.status) setFilter(draft.status);
    setQuery("");
    setAnnouncement(`Pinned “${next[0].title}” to the board.`);
    setDraft(EMPTY_DRAFT);
    setComposing(false);
  }
  function clearSearch() {
    setQuery("");
    searchRef.current?.focus();
  }
  function remove(notice: Notice, viaKeyboard: boolean) {
    const index = items.findIndex((item) => item.id === notice.id);
    if (index < 0) return;
    const shownAt = visible.findIndex((item) => item.id === notice.id);
    setItems((current) => current.filter((item) => item.id !== notice.id));
    setRemoved({ notice, beforeId: items[index + 1]?.id ?? null, nextShown: visible[shownAt + 1]?.id, prevShown: shownAt > 0 ? visible[shownAt - 1].id : undefined, viaKeyboard });
    setAnnouncement(`Removed “${notice.title}”. Undo is available for a few seconds.`);
  }
  async function copy(notice: Notice) {
    try {
      await navigator.clipboard.writeText(formatNotice(notice));
      setCopied(notice.id);
      setAnnouncement(`Copied “${notice.title}”.`);
      window.setTimeout(() => setCopied((current) => (current === notice.id ? null : current)), 2000);
    } catch {
      setAnnouncement("Copy is not available in this browser. Select the text instead.");
    }
  }
  function closeToast(ids?: string[]) {
    focusNext.current = ids ?? [removed?.nextShown, removed?.prevShown].filter((id): id is string => Boolean(id));
    setRemoved(null);
    setToastFocused(false);
  }
  function undo() {
    if (!removed) return;
    const { notice, beforeId } = removed;
    setItems((current) => restoreNotice(current, notice, beforeId));
    setAnnouncement(`Restored “${notice.title}”.`);
    closeToast([notice.id]);
  }

  const ready = Boolean(draft.title.trim() && draft.body.trim());
  const title = LIST_LABEL[filter];
  const lists = FILTERS.map((value) => ({ value, tone: value === "All" ? undefined : TONE[value] }));

  return (
    <div className="as">
      <a className="as-skip" href="#main">Skip to content</a>
      <AppTop name="Announcements" tagline="A local notice desk" />

      <div className="as-body">
        <aside className="as-side" aria-label="Lists">
          <h2>Board</h2>
          <ul className="as-lists">
            {lists.map(({ value, tone }) => (
              <ListButton key={value} label={LIST_LABEL[value]} count={counts[value]} tone={tone} current={filter === value} onSelect={() => setFilter(value)} />
            ))}
          </ul>
        </aside>

        <main id="main" className="as-main">
          <div className="as-head">
            <div>
              <h1>{title}</h1>
              <p aria-live="polite">{visible.length} {visible.length === 1 ? "notice" : "notices"}{query.trim() ? ` matching “${query.trim()}”` : ""}</p>
            </div>
            <div className="as-tools">
              <label className="as-search">
                <span className="as-sr">Search notices</span>
                <input ref={searchRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" />
              </label>
              {composing ? null : <button ref={newRef} type="button" className="as-button" onClick={() => setComposing(true)}><PlusIcon />New notice</button>}
            </div>
          </div>

          {composing ? (
            <form className="as-composer" onSubmit={add} aria-label="New notice">
              <label className="as-field">Headline
                <input ref={titleRef} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="A clear thing worth saying" autoComplete="off" required />
              </label>
              <label className="as-field">Body
                <textarea value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} placeholder="Give the reader the useful context." rows={3} required />
              </label>
              <label className="as-field">Desk
                <input value={draft.section} onChange={(event) => setDraft({ ...draft, section: event.target.value })} placeholder="Studio" autoComplete="off" />
              </label>
              <div className="as-composer-foot">
                <div className="as-segmented-wrap">
                  <span id="status-label">State</span>
                  <div className="as-segmented" role="group" aria-labelledby="status-label">
                    {STATUSES.map((status) => (
                      <button key={status} type="button" aria-pressed={draft.status === status} onClick={() => setDraft({ ...draft, status })}>{status}</button>
                    ))}
                  </div>
                </div>
                <div className="as-composer-actions">
                  <button type="button" className="as-plain" onClick={() => { setComposing(false); setDraft(EMPTY_DRAFT); }}>Cancel</button>
                  <button type="submit" className="as-button" disabled={!ready}>Pin</button>
                </div>
              </div>
              {ready ? null : <p className="as-hint">Add a headline and a body to enable Pin.</p>}
            </form>
          ) : null}

          {visible.length ? (
            <ul className="as-list" aria-label={title}>
              {visible.map((notice) => (
                <li className="as-row" key={notice.id} data-notice={notice.id}>
                  <div>
                    <h3>{notice.title}</h3>
                    <NoticeBody body={notice.body} />
                    <p className="as-row-meta">{`${notice.section} · ${notice.date === "—" ? "No date yet" : notice.date}`}</p>
                  </div>
                  <Pill tone={TONE[notice.status]}>{notice.status}</Pill>
                  <div className="an-actions">
                    <button type="button" className="as-plain" aria-label={`Copy ${notice.title}`} onClick={() => copy(notice)}>{copied === notice.id ? "Copied" : "Copy"}</button>
                    <button type="button" className="as-plain as-danger" aria-label={`Remove ${notice.title}`} onClick={(event) => remove(notice, event.detail === 0)}>Remove</button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="as-list as-empty">
              {query.trim() ? (
                <>
                  <strong>Nothing matches</strong>
                  No notice in {filter === "All" ? "the board" : title} mentions “{query.trim()}”.
                  <div className="as-actions-row as-center"><button type="button" className="as-plain" onClick={clearSearch}>Clear search</button></div>
                </>
              ) : items.length === 0 ? (
                <><strong>The board is empty</strong>Press New notice to write the first one.</>
              ) : (
                <><strong>No {filter === "Draft" ? "drafts" : `${filter.toLowerCase()} notices`} yet</strong>Press New notice and set its state to add one here.</>
              )}
            </div>
          )}

          <p className="as-note">Notices are saved in this browser only. This desk does not send email, publish a feed or speak for a live CMS; the states describe this browser.</p>
        </main>
      </div>

      <p className="as-sr" role="status" aria-live="polite">{announcement}</p>
      {removed ? (
        <div
          ref={toastRef}
          className="as-toast"
          role="group"
          aria-label="Undo remove"
          onFocus={() => setToastFocused(true)}
          onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setToastFocused(false); }}
          onKeyDown={(event) => { if (event.key === "Escape") closeToast(); }}
        >
          <span>Removed “{removed.notice.title}”</span>
          <button ref={undoRef} type="button" className="as-plain" onClick={undo} aria-label="Undo remove">Undo</button>
        </div>
      ) : null}

      <AppFoot source="https://github.com/bookchaowalit-website/community-announcements-web" />
    </div>
  );
}
