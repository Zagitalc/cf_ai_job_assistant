import React from "react";

const SectionEditorOverlay = ({ title, isMobile, onClose, children }) => (
    <div
        className={`section-editor-overlay ${isMobile ? "section-editor-overlay-mobile" : "section-editor-overlay-desktop"}`}
        role="dialog"
        aria-modal="true"
        aria-label={`${title} editor`}
    >
        <div className="section-editor-header">
            <div>
                <h3>{title}</h3>
                <p className="section-editor-subtitle">Focused editor</p>
            </div>
            <button type="button" className="section-editor-close" onClick={onClose}>
                Done
            </button>
        </div>
        <div className="section-editor-content">{children}</div>
    </div>
);

export default SectionEditorOverlay;
