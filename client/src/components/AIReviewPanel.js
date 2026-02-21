import React from "react";
import AISuggestionList from "./AISuggestionList";

const AIReviewPanel = ({
    reviewState,
    onRunReview,
    onModeChange,
    onJobDescriptionChange,
    onAcceptSuggestion,
    onDismissSuggestion
}) => {
    const mode = reviewState?.mode || "full";
    const isLoading = reviewState?.status === "loading";
    const hasError = reviewState?.status === "error";
    const data = reviewState?.data || null;

    return (
        <section className="ai-review-panel" aria-label="AI review panel">
            <div className="ai-panel-header">
                <div>
                    <h2>AI Review</h2>
                    <p>Get targeted suggestions based on your structured CV data.</p>
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
                        placeholder="Paste the target job description..."
                        rows={6}
                        className="form-textarea"
                    />
                </div>
            ) : null}

            {hasError ? <div className="form-error">{reviewState.error}</div> : null}

            {data ? (
                <div className="ai-review-results">
                    <div className="ai-overall-card">
                        <div className="ai-overall-score">{Number(data.overall?.score || 0).toFixed(0)}</div>
                        <div>
                            <div className="ai-overall-tier">{data.overall?.tier || "N/A"}</div>
                            <p>{data.overall?.summary || ""}</p>
                        </div>
                    </div>

                    <h3 className="ai-section-heading">Top Fixes</h3>
                    <AISuggestionList
                        suggestions={data.topFixes || []}
                        onAccept={onAcceptSuggestion}
                        onDismiss={onDismissSuggestion}
                        emptyLabel="No high-priority fixes."
                    />

                    {mode === "job-match" && data.jobMatch ? (
                        <div className="ai-jobmatch-results">
                            <h3 className="ai-section-heading">Job Match</h3>
                            <div className="ai-jobmatch-score">Match Score: {Number(data.jobMatch.score || 0).toFixed(0)}</div>
                            <div className="ai-jobmatch-grid">
                                <div>
                                    <h4>Missing Keywords</h4>
                                    <ul>
                                        {(data.jobMatch.missingKeywords || []).map((item) => (
                                            <li key={item}>{item}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <h4>Matched Keywords</h4>
                                    <ul>
                                        {(data.jobMatch.matchedKeywords || []).map((item) => (
                                            <li key={item}>{item}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            ) : (
                <div className="ai-empty-state">Run AI review to see full feedback and prioritized fixes.</div>
            )}
        </section>
    );
};

export default AIReviewPanel;
