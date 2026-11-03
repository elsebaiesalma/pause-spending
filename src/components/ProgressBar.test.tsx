import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ProgressBar } from "./ProgressBar";

describe("ProgressBar", () => {
  it("exposes its value to assistive tech", () => {
    const html = renderToStaticMarkup(<ProgressBar value={3} max={5} label="3 of 5 pauses" />);

    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuemin="0"');
    expect(html).toContain('aria-valuemax="5"');
    expect(html).toContain('aria-valuenow="3"');
    expect(html).toContain('aria-label="3 of 5 pauses"');
  });

  it("clamps the value into range and survives a zero maximum", () => {
    expect(renderToStaticMarkup(<ProgressBar value={9} max={5} label="x" />)).toContain('aria-valuenow="5"');
    expect(renderToStaticMarkup(<ProgressBar value={-2} max={5} label="x" />)).toContain('aria-valuenow="0"');
    expect(renderToStaticMarkup(<ProgressBar value={0} max={0} label="x" />)).toContain('aria-valuemax="1"');
  });

  it("sets the fill and the stagger step as custom properties", () => {
    const html = renderToStaticMarkup(<ProgressBar value={1} max={4} label="x" step={2} />);

    expect(html).toContain("--fill:0.25");
    expect(html).toContain("--step:2");
  });
});
