import { render, screen } from "@testing-library/react";
import BackgroundHexagonComposite from "./BackgroundHexagonComposite";

describe("BackgroundHexagonComposite", () => {
  it("renders a list item with a plain and a hue-wipe hexagon", () => {
    const { container } = render(
      <ul>
        <BackgroundHexagonComposite />
      </ul>
    );
    const figures = container.querySelectorAll("li > figure.hexagon");
    expect(figures).toHaveLength(2);
    expect(figures[0]).not.toHaveClass("hue-wipe");
    expect(figures[1]).toHaveClass("hue-wipe");
    expect(screen.getAllByRole("img", { name: "Hexagon" })).toHaveLength(2);
  });
});
