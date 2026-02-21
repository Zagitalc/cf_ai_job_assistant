import React from "react";

const AIReviewModal = ({ isOpen, onClose, children }) => {
    if (!isOpen) {
        return null;
    }

    return (
        <div className="preview-modal-root no-print" role="dialog" aria-modal="true" aria-label="AI review modal">
            <div className="preview-modal-panel ai-review-modal-panel">
                <div className="preview-modal-header">
                    <button type="button" onClick={onClose} className="preview-modal-btn preview-modal-close">
                        Close
                    </button>
                    <span className="preview-modal-title">AI Review</span>
                    <div className="preview-modal-actions" />
                </div>
                <div className="preview-modal-body ai-review-modal-body">{children}</div>
            </div>
        </div>
    );
};

export default AIReviewModal;
