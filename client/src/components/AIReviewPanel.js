import React, { useMemo, useState } from "react";
import { getWordDiffSegments } from "../utils/textDiff";

const ISSUE_LABELS = {
    impact: "Impact",
    clarity: "Clarity",
    ats: "ATS",
    length: "Length"
};

const sortByIssueOrder = (left = "", right = "") => {
    const order = ["impact", "clarity", "ats", "length"];
    return order.indexOf(left) - order.indexOf(right);
};

const DiffText = ({ originalText, suggestedText }) => {
    const segments = useMemo(
        () => getWordDiffSegments(originalText || "", suggestedText || ""),
        [originalText, suggestedText]
    );

    return (
        <p className="ai-diff-line">
            {segments.map((segment, index) => {
                if (segment.type === "add") {
                    return (
                        <mark key={`${segment.type}-${segment.text}-${index}`} className="ai-diff-add">
                            {segment.text}
                        </mark>
                    );
                }
                if (segment.type === "remove") {
                    return (
                        <span key={`${segment.type}-${segment.text}-${index}`} className="ai-diff-remove">
                            {segment.text}
                        </span>
                    );
                }
                return (
                    <span key={`${segment.type}-${segment.text}-${index}`} className="ai-diff-same">
                        {segment.text}
                    </span>
                );
            })}
        </p>
    );
};

const AIReviewPanel = ({
    reviewState,
    onRunReview,
    onModeChange,
    onJobDescriptionChange,
    onAcceptSuggestion,
    onDismissSuggestion,
    onApplyAll
}) => {
    const [confirmApplyAll, setConfirmApplyAll] = useState(false);
    const mode = reviewState?.mode || "full";
    const data = reviewState?.data || null;
    const status = reviewState?.status || "idle";
    const isLoading = status === "loading" || status === "streaming";
    const hasError = status === "error";

    const pendingSuggestions = (data?.topFixes || []).filter((item) => item.status !== "dismissed" && item.status !== "accepted");
    const groupedSuggestions = useMemo(() => {
        const grouped = {};
        (data?.topFixes || []).forEach((suggestion) => {
            const type = suggestion.issueType || "clarity";
            if (!grouped[type]) {
                grouped[type] = [];
            }
            grouped[type].push(suggestion);
        });
        return grouped;
    }, [data?.topFixes]);

    const issueTypes = Object.keys(groupedSuggestions).sort(sortByIssueOrder);

    return (
        <section className="ai-review-panel glass-sheet" aria-label="AI review panel">
            <div className="ai-sheet-handle" />
            <div className="ai-panel-header">
                <div>
                    <h2>Optimization Report</h2>
                    <p>{pendingSuggestions.length > 0 ? `${pendingSuggestions.length} improvements found` : "Run a review to get section-level upgrades."}</p>
                </div>
                <button type="button" className="primary-btn" onClick={onRunReview} disabled={isLoading}>
                    {isLoading ? "Reviewing..." : "Run Review"}
                </button>
            </div>

            <div className="ai-mode-row">
                <label htmlFor="ai-mode-select" className="form-label">Mode</label>
                <select
                    id="ai-mode-select"
                    value={mode}
                    onChange={(event) => onModeChange && onModeChange(event.target.value)}
                    className="form-select"
                >
                    <option value="full">Full Review</option>
                    <option value="job-match">Job Match</option>
                </select>
            </div>

            {mode === "job-match" ? (
                <div className="ai-job-match-wrap">
                    <label htmlFor="job-description" className="form-label">Job Description</label>
                    <textarea
                        id="job-description"
                        value={reviewState?.jobDescription || ""}
                        onChange={(event) => onJobDescriptionChange && onJobDescriptionChange(event.target.value)}
                        placeholder="Paste a target job description..."
                        rows={5}
                        className="form-textarea"
                    />
                </div>
            ) : null}

            {hasError ? <div className="form-error">{reviewState.error}</div> : null}

            {data && issueTypes.length > 0 ? (
                <div className="ai-review-results">
                    {issueTypes.map((type) => (
                        <div key={type} className="ai-group">
                            <div className="ai-group-head">
                                <h3>{ISSUE_LABELS[type] || "Suggestions"}</h3>
                                <span>{groupedSuggestions[type].length} Suggestions</span>
                            </div>
                            <div className="ai-group-list">
                                {groupedSuggestions[type].map((suggestion) => (
                                    <article key={suggestion.id} className={`ai-suggestion-sheet-card status-${suggestion.status || "pending"}`}>
                                        <div className="ai-suggestion-card-head">
                                            <span className="ai-issue-pill">{ISSUE_LABELS[type] || "Issue"}</span>
                                            <button
                                                type="button"
                                                className="dismiss-icon-btn"
                                                onClick={() => onDismissSuggestion && onDismissSuggestion(suggestion)}
                                                disabled={suggestion.status === "dismissed"}
                                                aria-label="Dismiss suggestion"
                                            >
                                                ×
                                            </button>
                                        </div>
                                        <h4>{suggestion.title || "Suggestion"}</h4>
                                        <DiffText originalText={suggestion.originalText} suggestedText={suggestion.suggestedText} />
                                        <p className="ai-suggestion-reason">{suggestion.reason}</p>
                                        <div className="ai-suggestion-actions">
                                            <button
                                                type="button"
                                                className="ai-action-btn"
                                                onClick={() => onAcceptSuggestion && onAcceptSuggestion(suggestion)}
                                                disabled={suggestion.status === "accepted"}
                                            >
                                                {suggestion.status === "accepted" ? "Applied" : "Apply Change"}
                                            </button>
                                            <button
                                                type="button"
                                                className="ai-action-btn ghost"
                                                onClick={() => onDismissSuggestion && onDismissSuggestion(suggestion)}
                                                disabled={suggestion.status === "dismissed"}
                                            >
                                                {suggestion.status === "dismissed" ? "Dismissed" : "Dismiss"}
                                            </button>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="ai-empty-state warm">
                    Your CV looks good to review. Run AI Review to get targeted rewrites by section.
                </div>
            )}

            {data ? (
                <div className="ai-sheet-footer">
                    {confirmApplyAll ? (
                        <button
                            type="button"
                            className="primary-btn"
                            onClick={() => {
                                setConfirmApplyAll(false);
                                onApplyAll && onApplyAll();
                            }}
                            disabled={pendingSuggestions.length === 0}
                        >
                            Confirm Apply All ({pendingSuggestions.length})
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="secondary-btn"
                            onClick={() => setConfirmApplyAll(true)}
                            disabled={pendingSuggestions.length === 0}
                        >
                            Apply All ({pendingSuggestions.length})
                        </button>
                    )}
                    <button type="button" className="text-btn" onClick={() => setConfirmApplyAll(false)}>
                        Dismiss
                    </button>
                </div>
            ) : null}
        </section>
    );
};

export default AIReviewPanel;

