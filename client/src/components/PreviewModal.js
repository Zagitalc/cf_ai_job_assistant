import React from "react";

const PreviewModal = ({ isOpen, onClose, onExport, isExporting, exportingFormat, children }) => {
    if (!isOpen) {
        return null;
    }

    return (
        <div className="preview-modal-root no-print" role="dialog" aria-modal="true" aria-label="CV preview modal">
            <div className="preview-modal-panel">
                <div className="preview-modal-header">
                    <button type="button" onClick={onClose} className="preview-modal-btn preview-modal-close">
                        Edit
                    </button>
                    <span className="preview-modal-title">Resume Preview</span>
                    <div className="preview-modal-actions">
                        <button
                            type="button"
                            onClick={() => onExport("pdf")}
                            disabled={isExporting}
                            className="preview-modal-btn"
                        >
                            {isExporting && exportingFormat === "pdf" ? "Exporting..." : "PDF"}
                        </button>
                        <button
                            type="button"
                            onClick={() => onExport("word")}
                            disabled={isExporting}
                            className="preview-modal-btn"
                        >
                            {isExporting && exportingFormat === "word" ? "Exporting..." : "Word"}
                        </button>
                    </div>
                </div>
                <div className="preview-modal-body">{children}</div>
            </div>
        </div>
    );
};

export default PreviewModal;
