import { render } from "@testing-library/react";
import BackgroundHexagonCompositeList from "./BackgroundHexagonCompositeList";

describe("BackgroundHexagonCompositeList", () => {
  it.each(["top", "bottom", "left", "right"])(
    "renders a no-disc list with the %s orientation class",
    (orientation) => {
      const { container } = render(
        <BackgroundHexagonCompositeList orientation={orientation} />
      );
      const list = container.querySelector("ul");
      expect(list).toHaveClass("no-disc", orientation);
    }
  );

  it("renders five hexagon composites (ten hexagons)", () => {
    const { container } = render(
      <BackgroundHexagonCompositeList orientation="top" />
    );
    expect(container.querySelectorAll("ul > li")).toHaveLength(5);
    expect(container.querySelectorAll("img.svg-inject")).toHaveLength(10);
  });
});
