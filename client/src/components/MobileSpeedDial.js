import React from "react";

const MobileSpeedDial = ({ activeView, onChangeView, onOpenAI, hasPendingSuggestions, aiEnabled }) => (
    <nav className="mobile-bottom-nav no-print" aria-label="Primary mobile navigation">
        <button
            type="button"
            className={`mobile-nav-btn ${activeView === "stack" ? "active" : ""}`}
            onClick={() => onChangeView && onChangeView("stack")}
        >
            <span className="mobile-nav-label">Stack</span>
        </button>

        <button
            type="button"
            className={`mobile-nav-btn mobile-nav-center ${hasPendingSuggestions ? "pending" : ""}`}
            onClick={() => onOpenAI && onOpenAI()}
            disabled={!aiEnabled}
            aria-label="Open AI review"
        >
            <span className="mobile-nav-label">AI</span>
        </button>

        <button
            type="button"
            className={`mobile-nav-btn ${activeView === "preview" ? "active" : ""}`}
            onClick={() => onChangeView && onChangeView("preview")}
        >
            <span className="mobile-nav-label">Preview</span>
        </button>
    </nav>
);

export default MobileSpeedDial;

