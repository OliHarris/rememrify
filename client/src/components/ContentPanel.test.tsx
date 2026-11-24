import { render, screen } from "@testing-library/react";
import ContentPanel from "./ContentPanel";

describe("ContentPanel", () => {
  it("shows the chart size and week start", () => {
    render(<ContentPanel total={20} weekStart="01/01/2000" tableOutput={null} />);
    expect(
      screen.getByRole("heading", { name: "UK Top 20 Chart" })
    ).toBeInTheDocument();
    expect(screen.getByText("01/01/2000").tagName).toBe("STRONG");
    expect(screen.getByText(/Week starting:/)).toBeInTheDocument();
  });

  it("renders the table output inside the #wikichart article", () => {
    const { container } = render(
      <ContentPanel
        total={10}
        weekStart="08/01/2000"
        tableOutput={<table data-testid="chart-table" />}
      />
    );
    const article = container.querySelector("article#wikichart");
    expect(article).toContainElement(screen.getByTestId("chart-table"));
    expect(screen.getByRole("heading", { name: "UK Top 10 Chart" })).toBeInTheDocument();
  });

  it("renders an empty chart area when there is no output", () => {
    const { container } = render(
      <ContentPanel total={20} weekStart="" tableOutput={null} />
    );
    expect(container.querySelector("#wikichart")).toBeEmptyDOMElement();
    expect(
      screen.getByText("Note: Some results returned may not be completely precise!")
    ).toBeInTheDocument();
  });
});
