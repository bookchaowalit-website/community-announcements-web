import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import Home from "@/app/page";
import RootLayout, { metadata } from "@/app/layout";

vi.mock("next/font/google", () => ({ Geist: () => ({ variable: "font-geist" }) }));

describe("home page", () => {
  it("renders the sample notices, the board lists and the local-only note on the App shell", () => {
    const html = renderToString(<Home />);
    expect(html).toContain("<h1>All notices</h1>");
    expect(html).toContain("The new project shelf is open");
    expect(html).toContain("Maintenance window");
    expect(html).toMatch(/All notices<\/span><span class="as-count">3</);
    expect(html).toContain("Studio · 23 Aug 2026");
    expect(html).toContain("Editorial · No date yet");
    expect(html).toContain("does not send email");
    expect(html).toContain('href="https://bookchaowalit.com/"');
  });

  it("puts the font variable on <html> and the site's own domain in metadata", () => {
    const html = renderToString(<RootLayout><p>child</p></RootLayout>);
    expect(html).toContain('<html lang="en" class="font-geist"');
    expect(String(metadata.metadataBase)).toBe("https://announcements.bookchaowalit.com/");
  });
});
