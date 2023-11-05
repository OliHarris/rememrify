import BackgroundHexagonComposite from "./BackgroundHexagonComposite";

interface BackgroundHexagonCompositeListInterface {
  orientation: string;
}

const BackgroundHexagonCompositeList = ({
  orientation,
}: BackgroundHexagonCompositeListInterface) => {
  return (
    <ul className={`no-disc ${orientation}`}>
      <BackgroundHexagonComposite />
      <BackgroundHexagonComposite />
      <BackgroundHexagonComposite />
      <BackgroundHexagonComposite />
      <BackgroundHexagonComposite />
    </ul>
  );
};
export default BackgroundHexagonCompositeList;
