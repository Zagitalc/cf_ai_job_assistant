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
    subtitle,
    statusTone,
    reviewMarker,
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
                <div className="card-title-meta">
                    <span className="card-stack-title">{section.title}</span>
                    {subtitle ? <span className="card-stack-subtitle">{subtitle}</span> : null}
                </div>
                {section.pinned ? <span className="card-pin" title="Pinned">📌</span> : null}
            </div>
            <div className="card-stack-actions">
                <span className={`card-status-dot tone-${statusTone || "neutral"}`} aria-hidden="true" />
                {reviewMarker === "hasSuggestions" ? <span className="card-review-dot pending" aria-hidden="true" /> : null}
                {reviewMarker === "resolved" ? <span className="card-review-dot resolved" aria-hidden="true" /> : null}
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
    </section>
);

export default SectionCard;
