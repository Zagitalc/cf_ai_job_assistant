import React from "react";

const AIReviewModal = ({ isOpen, onClose, children }) => {
    if (!isOpen) {
        return null;
    }

    return (
        <div className="ai-modal-root no-print" role="dialog" aria-modal="true" aria-label="AI review modal">
            <div className="ai-modal-panel">
                <div className="ai-modal-header">
                    <button type="button" onClick={onClose} className="preview-modal-btn preview-modal-close">
                        Done
                    </button>
                    <span className="preview-modal-title">AI Review</span>
                </div>
                <div className="ai-modal-body">{children}</div>
            </div>
        </div>
    );
};

export default AIReviewModal;
