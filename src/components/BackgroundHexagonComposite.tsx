import BackgroundHexagon from "./BackgroundHexagon";

const BackgroundHexagonComposite = () => {
  return (
    <li>
      <figure className="hexagon">
        <BackgroundHexagon />
      </figure>
      <figure className="hexagon hue-wipe">
        <BackgroundHexagon />
      </figure>
    </li>
  );
};
export default BackgroundHexagonComposite;