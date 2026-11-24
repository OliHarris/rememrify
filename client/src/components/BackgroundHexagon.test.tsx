import { render, screen } from "@testing-library/react";
import BackgroundHexagon from "./BackgroundHexagon";

describe("BackgroundHexagon", () => {
  it("renders the hexagon image marked for SVG injection", () => {
    render(<BackgroundHexagon />);
    const img = screen.getByRole("img", { name: "Hexagon" });
    expect(img).toHaveClass("svg-inject");
    expect(img).toHaveAttribute("src", "test-file-stub");
  });
});
