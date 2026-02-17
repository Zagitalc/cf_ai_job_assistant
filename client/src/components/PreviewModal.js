import React from "react";
import ExportFilenamePicker from "./ExportFilenamePicker";

const PreviewModal = ({
    isOpen,
    onClose,
    onExport,
    isExporting,
    exportingFormat,
    exportFileBaseName,
    onExportFileBaseNameChange,
    exportFileSuggestions,
    children
}) => {
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
                            onClick={() => onExport("pdf", exportFileBaseName)}
                            disabled={isExporting}
                            className="preview-modal-btn"
                        >
                            {isExporting && exportingFormat === "pdf" ? "Exporting..." : "PDF"}
                        </button>
                        <button
                            type="button"
                            onClick={() => onExport("word", exportFileBaseName)}
                            disabled={isExporting}
                            className="preview-modal-btn"
                        >
                            {isExporting && exportingFormat === "word" ? "Exporting..." : "Word"}
                        </button>
                    </div>
                </div>
                <div className="preview-modal-filename">
                    <ExportFilenamePicker
                        inputId="preview-export-filename"
                        value={exportFileBaseName}
                        onChange={onExportFileBaseNameChange}
                        suggestions={exportFileSuggestions}
                    />
                </div>
                <div className="preview-modal-body">{children}</div>
            </div>
        </div>
    );
};

export default PreviewModal;
