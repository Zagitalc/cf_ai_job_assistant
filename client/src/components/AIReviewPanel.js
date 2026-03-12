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
    const showFooterActions = status === "ready" && pendingSuggestions.length > 0;
    const hasReviewData = Boolean(data);
    const numericScore = Number(data?.overall?.score || 0);
    const showScoreBubble = Number.isFinite(numericScore) && (numericScore > 0 || status === "ready");
    const overallTierLabel = isLoading && !showScoreBubble ? "Review In Progress" : (data?.overall?.tier || "Review Ready");
    const overallSummary = isLoading && !showScoreBubble
        ? "Analyzing your CV and preparing targeted feedback."
        : (data?.overall?.summary || "Review completed.");
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
    const sectionEntries = Object.entries(data?.bySection || {}).filter(([, value]) => value && (value.strengths?.length || value.suggestions?.length));

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

            {hasReviewData ? (
                <>
                    <div className="ai-overall-card">
                        {showScoreBubble ? (
                            <div className="ai-overall-score">{Math.max(0, Math.round(numericScore))}</div>
                        ) : (
                            <div className="ai-overall-progress" aria-hidden="true">
                                <span className="btn-spinner" />
                            </div>
                        )}
                        <div>
                            <div className="ai-overall-tier">{overallTierLabel}</div>
                            <p>{overallSummary}</p>
                        </div>
                    </div>

                    {data?.jobMatch ? (
                        <div className="ai-jobmatch-results">
                            <h4>Job Match</h4>
                            <div className="ai-jobmatch-score">Estimated match score: {Math.max(0, Math.round(Number(data.jobMatch.score || 0)))}</div>
                            <div className="ai-jobmatch-grid">
                                {Array.isArray(data.jobMatch.roleFitNotes) && data.jobMatch.roleFitNotes.length > 0 ? (
                                    <div className="entry-list-item">
                                        <div>
                                            <strong>Role Fit Notes</strong>
                                            <p>{data.jobMatch.roleFitNotes.join(" ")}</p>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    ) : null}

                    {issueTypes.length > 0 ? (
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
                    ) : !isLoading ? (
                        <div className="ai-empty-state warm">
                            Review completed. No concrete patch suggestions were returned, but the summary and section notes below still reflect the result.
                        </div>
                    ) : null}

                    {sectionEntries.length > 0 ? (
                        <div>
                            <h3 className="ai-section-heading">Section Notes</h3>
                            <div className="ai-review-results">
                                {sectionEntries.map(([sectionId, value]) => (
                                    <div key={sectionId} className="ai-group">
                                        <div className="ai-group-head">
                                            <h3>{sectionId}</h3>
                                        </div>
                                        <div className="entry-list">
                                            {Array.isArray(value.strengths) && value.strengths.length > 0 ? (
                                                <div className="entry-list-item">
                                                    <div>
                                                        <strong>Strengths</strong>
                                                        <p>{value.strengths.join(" ")}</p>
                                                    </div>
                                                </div>
                                            ) : null}
                                            {Array.isArray(value.suggestions) && value.suggestions.length > 0 ? (
                                                <div className="entry-list-item">
                                                    <div>
                                                        <strong>Suggestions</strong>
                                                        <p>{value.suggestions.join(" ")}</p>
                                                    </div>
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : null}
                </>
            ) : (
                <div className="ai-empty-state warm">
                    Your CV looks good to review. Run AI Review to get targeted rewrites by section.
                </div>
            )}

            {showFooterActions ? (
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
