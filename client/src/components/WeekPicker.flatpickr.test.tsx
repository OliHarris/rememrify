import { render } from "@testing-library/react";
import WeekPicker from "./WeekPicker";

// Integration check against the real flatpickr widget (no mocks).
describe("WeekPicker with the real flatpickr", () => {
  it("renders an inline calendar starting on Saturday", () => {
    const { container } = render(
      <WeekPicker
        loadData={false}
        dateRange={[new Date(2000, 0, 1), new Date(2000, 0, 7)]}
        selectWholeWeek={jest.fn()}
      />
    );
    expect(container.querySelector(".flatpickr-calendar.inline")).toBeInTheDocument();
    const firstWeekday = container.querySelector(".flatpickr-weekday");
    expect(firstWeekday?.textContent?.trim()).toBe("Sat");
  });

  it("highlights the selected week range", () => {
    const { container } = render(
      <WeekPicker
        loadData={false}
        dateRange={[new Date(2000, 0, 1), new Date(2000, 0, 7)]}
        selectWholeWeek={jest.fn()}
      />
    );
    expect(container.querySelector(".flatpickr-day.startRange")).toHaveAttribute(
      "aria-label",
      "January 1, 2000"
    );
    expect(container.querySelector(".flatpickr-day.endRange")).toHaveAttribute(
      "aria-label",
      "January 7, 2000"
    );
  });
});
