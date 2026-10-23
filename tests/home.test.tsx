import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";

describe("home page", () => {
  it("renders the sample board, its count and the local-only notice", () => {
    const html = renderToString(<Home />);
    expect(html).toContain("Put the right note in the right hands.");
    expect(html).toContain("The new project shelf is open");
    expect(html).toContain("Maintenance window");
    expect(html).toContain("<strong>3<!-- --> <!-- -->notices</strong>");
    expect(html).toContain("01<!-- --> / <!-- -->Studio");
    expect(html).toContain("It does not send email, publish a feed, or speak for a live CMS.");
  });
});
