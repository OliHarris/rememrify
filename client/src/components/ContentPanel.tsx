import { ReactNode } from "react";

interface ContentPanelInterface {
  total: number;
  weekStart: string;
  tableOutput: ReactNode;
}

const ContentPanel = ({
  total,
  weekStart,
  tableOutput,
}: ContentPanelInterface) => {
  return (
    <div className="content">
      <h2>UK Top {total} Chart</h2>
      <div className="spacer">
        Week starting: <strong>{weekStart}</strong>
      </div>
      <hr />
      <article id="wikichart">{tableOutput}</article>
      <hr />
      <p>Note: Some results returned may not be completely precise!</p>
    </div>
  );
};
export default ContentPanel;
