const mockRender = jest.fn();
const mockCreateRoot = jest.fn(() => ({ render: mockRender }));

jest.mock("react-dom/client", () => ({
  __esModule: true,
  default: { createRoot: mockCreateRoot },
  createRoot: mockCreateRoot,
}));
jest.mock("./components/App.tsx", () => ({
  __esModule: true,
  default: function App() {
    return null;
  },
}));

describe("main entry point", () => {
  it("mounts <App /> into the #root element", async () => {
    document.body.innerHTML = '<div id="root"></div>';
    await import("./main");

    expect(mockCreateRoot).toHaveBeenCalledWith(document.getElementById("root"));
    expect(mockRender).toHaveBeenCalledTimes(1);
    const element = mockRender.mock.calls[0][0];
    expect(element.type.name).toBe("App");
  });
});
