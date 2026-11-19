// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/page";
import { STORAGE_KEY } from "@/lib/announcements";
import { resetStoredCache } from "@/lib/use-stored-state";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;
const $ = <T extends Element = HTMLElement>(selector: string) => host.querySelector(selector) as T | null;
const button = (text: string, scope: ParentNode = host) => [...scope.querySelectorAll("button")].find((b) => b.textContent?.trim().startsWith(text)) as HTMLButtonElement;
const rows = () => [...host.querySelectorAll(".as-row h3")].map((h) => h.textContent);
const press = (el: Element, detail = 0) => act(() => { el.dispatchEvent(new MouseEvent("click", { bubbles: true, detail })); });
function type(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  act(() => {
    Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
const SHELF = "The new project shelf is open";

beforeEach(() => {
  localStorage.clear();
  resetStoredCache();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root.render(<Home />));
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("composer", () => {
  it("keeps Pin disabled until headline and body have text, pins on top and returns focus", () => {
    press(button("New notice"));
    expect(document.activeElement).toBe($(".as-composer input"));
    const pin = () => button("Pin", $(".as-composer")!);
    expect(pin().disabled).toBe(true);
    expect(host.textContent).toContain("Add a headline and a body to enable Pin.");
    type($<HTMLInputElement>(".as-composer input")!, "Office closed Friday");
    expect(pin().disabled).toBe(true);
    type($<HTMLTextAreaElement>(".as-composer textarea")!, "Back on Monday.");
    press(button("Published", $(".as-composer")!));
    press(pin());
    expect(rows()[0]).toBe("Office closed Friday");
    expect(document.activeElement?.textContent).toContain("New notice");
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)[0]).toMatchObject({ title: "Office closed Friday", status: "Published", section: "Studio" });
  });

  it("pinning from another list switches to the new notice's list; Cancel adds nothing", () => {
    press(button("Published", $(".as-side")!));
    press(button("New notice"));
    type($<HTMLInputElement>(".as-composer input")!, "Draft one");
    type($<HTMLTextAreaElement>(".as-composer textarea")!, "body");
    press(button("Pin", $(".as-composer")!));
    expect($("h1")!.textContent).toBe("Drafts");
    press(button("New notice"));
    type($<HTMLInputElement>(".as-composer input")!, "never");
    press(button("Cancel"));
    expect(rows()).not.toContain("never");
  });

  it("still pins without crypto.randomUUID", () => {
    vi.stubGlobal("crypto", {});
    press(button("New notice"));
    type($<HTMLInputElement>(".as-composer input")!, "Plain");
    type($<HTMLTextAreaElement>(".as-composer textarea")!, "HTTP");
    press(button("Pin", $(".as-composer")!));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)[0].id).toMatch(/^notice-\d+-[a-z0-9]+$/);
  });
});

describe("lists, search and copy", () => {
  it("filters, searches and shows distinct empty states", () => {
    press(button("Scheduled", $(".as-side")!));
    expect(rows()).toEqual(["Maintenance window"]);
    press($(`[aria-label="Remove Maintenance window"]`)!, 1);
    expect(host.textContent).toContain("No scheduled notices yet");
    press(button("All notices", $(".as-side")!));
    type($<HTMLInputElement>(".as-search input")!, "zzz");
    expect(host.textContent).toContain("Nothing matches");
    press(button("Clear search"));
    expect(document.activeElement).toBe($(".as-search input"));
  });

  it("Copy writes the notice to the clipboard and says so; a blocked clipboard is reported", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    await act(async () => { $(`[aria-label="Copy ${SHELF}"]`)!.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining(SHELF));
    expect($(`[aria-label="Copy ${SHELF}"]`)!.textContent).toBe("Copied");
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("no")) } });
    await act(async () => { $(`[aria-label="Copy ${SHELF}"]`)!.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    expect(host.textContent).toContain("Copy is not available");
  });
});

describe("remove and undo", () => {
  it("removes with a toast; Undo puts it back in place and focuses its row", () => {
    press($(`[aria-label="Remove ${SHELF}"]`)!);
    expect(rows()).not.toContain(SHELF);
    expect(document.activeElement).toBe(button("Undo"));
    press(button("Undo"));
    expect(rows()[0]).toBe(SHELF);
    expect(document.activeElement?.getAttribute("aria-label")).toBe(`Remove ${SHELF}`);
  });

  it("Escape and the timer close the toast; an empty board says how to start", () => {
    press($(`[aria-label="Remove ${SHELF}"]`)!);
    act(() => { $(".as-toast")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Remove Maintenance window");
    press($('[aria-label="Remove Maintenance window"]')!, 1);
    vi.useFakeTimers();
    press($('[aria-label="Remove A note before the next release"]')!, 1);
    act(() => { vi.advanceTimersByTime(6100); });
    expect($(".as-toast")).toBeNull();
    expect(host.textContent).toContain("The board is empty");
  });
});

describe("batch Undo", () => {
  afterEach(() => { vi.useRealTimers(); });
  // detail 0 = keyboard (Enter/Space) click, 1 = pointer click.
  const click = (el: Element, detail: number) => act(() => { el.dispatchEvent(new MouseEvent("click", { bubbles: true, detail })); });
  const shownRows = () => [...host.querySelectorAll<HTMLElement>(".as-row[data-notice]")];
  const rowIds = () => shownRows().map((row) => row.getAttribute("data-notice"));
  const removeButton = (i: number) => shownRows()[i].querySelector<HTMLButtonElement>(".as-danger")!;
  const undoButton = () => host.querySelector<HTMLButtonElement>(".as-toast button")!;

  it("consecutive removes restore together with one Undo", () => {
    vi.useFakeTimers();
    const before = rowIds();
    expect(before.length).toBeGreaterThanOrEqual(3);
    click(removeButton(1), 1);
    act(() => { vi.advanceTimersByTime(4000); });
    click(removeButton(0), 1);
    expect(rowIds()).toEqual(before.slice(2));
    expect(host.querySelector(".as-toast span")!.textContent).toBe("Removed 2 notices");
    expect(undoButton().getAttribute("aria-label")).toBe("Undo remove of 2 notices");
    // The second removal restarted the 6 s window: 4 s later it is still open.
    act(() => { vi.advanceTimersByTime(4000); });
    click(undoButton(), 1);
    expect(rowIds()).toEqual(before);
    expect(host.querySelector(".as-toast")).toBeNull();
    expect(host.querySelector(".as-sr[role=status]")!.textContent).toBe("Restored 2 notices.");
  });

  it("keyboard remove focuses Undo", () => {
    const before = rowIds();
    click(removeButton(0), 0);
    expect(document.activeElement).toBe(undoButton());
    click(removeButton(0), 0);
    expect(document.activeElement).toBe(undoButton());
    click(undoButton(), 0);
    expect(rowIds()).toEqual(before);
    // Back on the restored row removed last (it was second in the list).
    expect(document.activeElement).toBe(removeButton(1));
  });
});
