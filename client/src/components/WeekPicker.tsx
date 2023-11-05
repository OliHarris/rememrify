import Flatpickr from "react-flatpickr";

import queenBeeImage from "../assets/images/queen-bee.svg";

interface WeekPickerInterface {
  loadData: boolean;
  dateRange: [Date, Date] | undefined;
  selectWholeWeek: (value: Date[]) => void;
}

const WeekPicker = ({
  loadData,
  dateRange,
  selectWholeWeek,
}: WeekPickerInterface) => {
  return (
    <div id="weekpicker">
      {loadData && (
        <div className="loading-overlay">
          <div>
            <span>
              <div className="load-chart">Loading Chart...</div>
              <div className="floating">
                <figure className="bee-character">
                  <img className="svg" src={queenBeeImage} alt="Queen Bee" />
                </figure>
              </div>
            </span>
          </div>
        </div>
      )}
      <Flatpickr
        value={dateRange}
        options={{
          mode: "range",
          inline: true,
          dateFormat: "d/m/y",
          minDate: new Date(1957, 0, 5),
          maxDate: new Date(2012, 3, 27),
          locale: {
            firstDayOfWeek: 6,
          },
        }}
        onChange={(e) => selectWholeWeek(e)}
      />
    </div>
  );
};
export default WeekPicker;
