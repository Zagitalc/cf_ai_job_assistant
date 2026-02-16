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

    it("toggles mobile preview state", () => {
        act(() => {
            root.render(<App />);
        });

        const previewToggle = container.querySelector('button[aria-label="Show CV preview"]');
        expect(previewToggle).not.toBeNull();
        expect(previewToggle.getAttribute("aria-pressed")).toBe("false");

        act(() => {
            Simulate.click(previewToggle);
        });

        const formToggle = container.querySelector('button[aria-label="Show CV form"]');
        expect(formToggle).not.toBeNull();
        expect(formToggle.getAttribute("aria-pressed")).toBe("true");
    });
});
