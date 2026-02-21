import React from "react";

const SectionCard = ({
    section,
    isOpen,
    onToggle,
    onOpenComplex,
    canDrag,
    onDragStart,
    onDragOver,
    onDrop,
    isDragging,
    statusLabel,
    statusTone,
    sectionCategoryLabel,
    showAiAction,
    onAiClick,
    aiActionDisabled,
    aiActionLabel,
    footer,
    children
}) => (
    <section
        className={`cv-section-card card-stack-item ${isDragging ? "card-dragging" : ""}`}
        data-section-id={section.id}
        draggable={canDrag}
        onDragStart={(event) => onDragStart(event, section.id)}
        onDragOver={(event) => onDragOver(event, section.id)}
        onDrop={(event) => onDrop(event, section.id)}
    >
        <div className="card-stack-header">
            <div className="card-stack-title-wrap">
                <span className={`drag-handle ${canDrag ? "" : "drag-disabled"}`} aria-hidden="true">
                    ≡
                </span>
                <span className="card-stack-title">{section.title}</span>
                {section.pinned ? <span className="card-pin" title="Pinned">📌</span> : null}
                {sectionCategoryLabel ? <span className="card-type-chip">{sectionCategoryLabel}</span> : null}
            </div>
            <div className="card-stack-actions">
                {statusLabel ? <span className="card-status-chip">{statusLabel}</span> : null}
                <span className={`card-status-dot tone-${statusTone || "neutral"}`} aria-hidden="true" />
                {showAiAction ? (
                    <button
                        type="button"
                        onClick={() => onAiClick && onAiClick(section.id)}
                        className="card-ai-btn"
                        disabled={aiActionDisabled}
                    >
                        {aiActionLabel || "AI"}
                    </button>
                ) : null}
                {section.isComplex ? (
                    <button type="button" onClick={() => onOpenComplex(section.id)} className="card-action-btn">
                        Edit
                    </button>
                ) : (
                    <button type="button" onClick={() => onToggle(section.id)} className="card-action-btn" aria-expanded={isOpen}>
                        {isOpen ? "Hide" : "Open"}
                    </button>
                )}
            </div>
        </div>
        {!section.isComplex && isOpen ? <div className="cv-section-body">{children}</div> : null}
        {section.isComplex ? <div className="card-complex-hint">Open dedicated editor for this section.</div> : null}
        {footer ? <div className="cv-section-footer">{footer}</div> : null}
    </section>
);

export default SectionCard;
