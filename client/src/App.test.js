import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import App from "./App";

jest.mock("./components/CVForm", () => () => <div>Mock CV Form</div>);
jest.mock("./components/CVPreview", () => () => <div>Mock CV Preview</div>);

const createMatchMedia = (isDark) =>
    jest.fn().mockImplementation((query) => ({
        matches: isDark && query.includes("prefers-color-scheme: dark"),
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn()
    }));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("App", () => {
    let container;
    let root;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.appendChild(container);
        root = createRoot(container);

        window.localStorage.clear();
        window.matchMedia = createMatchMedia(false);
        Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 1200 });
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
    });

    it("loads theme from localStorage and toggles/persists it", () => {
        window.localStorage.setItem("onclickcv.theme", "dark");

        act(() => {
            root.render(<App />);
        });

        expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

        const themeButton = container.querySelector('button[aria-label="Switch to light mode"]');
        expect(themeButton).not.toBeNull();

        act(() => {
            Simulate.click(themeButton);
        });

        expect(document.documentElement.getAttribute("data-theme")).toBe("light");
        expect(window.localStorage.getItem("onclickcv.theme")).toBe("light");
    });

    it("falls back to system dark preference when there is no stored theme", () => {
        window.matchMedia = createMatchMedia(true);

        act(() => {
            root.render(<App />);
        });

        expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    });

    it("opens mobile preview modal from FAB", () => {
        window.innerWidth = 800;

        act(() => {
            root.render(<App />);
        });

        const previewFab = container.querySelector('button[aria-label="Open CV preview"]');
        expect(previewFab).not.toBeNull();

        act(() => {
            Simulate.click(previewFab);
        });

        expect(container.textContent).toContain("Preview");
    });

    it("keeps desktop preview panel visible in split layout", () => {
        window.innerWidth = 1280;

        act(() => {
            root.render(<App />);
        });

        expect(container.querySelector('[data-testid="preview-panel"]')).not.toBeNull();
        expect(container.querySelector('button[aria-label="Open CV preview"]')).toBeNull();
    });
});
