import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WeekPicker from "./WeekPicker";

// Capture the props WeekPicker hands to flatpickr so we can assert on them
// and trigger onChange without driving the real calendar widget.
type FlatpickrProps = {
  value?: unknown;
  options?: Record<string, unknown>;
  onChange: (dates: Date[]) => void;
};
const flatpickrProps: { current: FlatpickrProps | null } = { current: null };
jest.mock("react-flatpickr", () => ({
  __esModule: true,
  default: (props: FlatpickrProps) => {
    flatpickrProps.current = props;
    return (
      <button
        data-testid="flatpickr"
        onClick={() => props.onChange([new Date(2000, 0, 12)])}
      >
        pick
      </button>
    );
  },
}));

describe("WeekPicker", () => {
  beforeEach(() => {
    flatpickrProps.current = null;
  });

  it("hides the loading overlay when not loading", () => {
    const { container } = render(
      <WeekPicker loadData={false} dateRange={undefined} selectWholeWeek={jest.fn()} />
    );
    expect(container.querySelector(".loading-overlay")).not.toBeInTheDocument();
    expect(screen.queryByText("Loading Chart...")).not.toBeInTheDocument();
  });

  it("shows the loading overlay with the queen bee while loading", () => {
    render(
      <WeekPicker loadData={true} dateRange={undefined} selectWholeWeek={jest.fn()} />
    );
    expect(screen.getByText("Loading Chart...")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Queen Bee" })).toHaveAttribute(
      "src",
      "test-file-stub"
    );
  });

  it("configures flatpickr as an inline Saturday-first range picker over the archive dates", () => {
    const range: [Date, Date] = [new Date(2000, 0, 1), new Date(2000, 0, 7)];
    render(<WeekPicker loadData={false} dateRange={range} selectWholeWeek={jest.fn()} />);

    const props = flatpickrProps.current!;
    expect(props.value).toBe(range);
    expect(props.options).toMatchObject({
      mode: "range",
      inline: true,
      dateFormat: "d/m/y",
      minDate: new Date(1957, 0, 5),
      maxDate: new Date(2012, 3, 27),
      locale: { firstDayOfWeek: 6 },
    });
  });

  it("passes selected dates through to selectWholeWeek", async () => {
    const selectWholeWeek = jest.fn();
    render(
      <WeekPicker loadData={false} dateRange={undefined} selectWholeWeek={selectWholeWeek} />
    );
    await userEvent.click(screen.getByTestId("flatpickr"));
    expect(selectWholeWeek).toHaveBeenCalledWith([new Date(2000, 0, 12)]);
  });
});
