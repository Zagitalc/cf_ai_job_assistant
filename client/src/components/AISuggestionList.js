import React from "react";

const ROOT_LABELS = {
    summary: "Profile Summary",
    workExperience: "Work Experience",
    volunteerExperience: "Volunteer Experience",
    education: "Education",
    projects: "Projects",
    skills: "Skills",
    certifications: "Certifications",
    awards: "Awards",
    additionalInfo: "Additional Info"
};

const FIELD_LABELS = {
    startDate: "Start Date",
    endDate: "End Date",
    additionalInfo: "Additional Info"
};

const splitFieldPath = (fieldPath = "") => {
    const tokens = [];
    const matcher = /([^[.\]]+)|\[(\d+)\]/g;
    let match = matcher.exec(fieldPath);

    while (match) {
        if (typeof match[1] === "string") {
            tokens.push(match[1]);
        } else if (typeof match[2] === "string") {
            tokens.push(Number(match[2]));
        }
        match = matcher.exec(fieldPath);
    }

    return tokens;
};

const humanize = (value = "") =>
    String(value)
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/[-_]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/^./, (char) => char.toUpperCase());

const formatTargetLabel = (fieldPath = "") => {
    if (!fieldPath) {
        return "";
    }

    const tokens = splitFieldPath(fieldPath);
    if (!tokens.length) {
        return "";
    }

    const root = tokens[0];
    const rootLabel = ROOT_LABELS[root] || humanize(root);
    const indexToken = typeof tokens[1] === "number" ? tokens[1] : null;
    const fieldToken = tokens.find((token) => typeof token === "string" && token !== root);
    const fieldLabel = fieldToken ? (FIELD_LABELS[fieldToken] || humanize(fieldToken)) : "";

    if (indexToken !== null && fieldLabel) {
        return `${rootLabel} #${indexToken + 1} - ${fieldLabel}`;
    }

    if (indexToken !== null) {
        return `${rootLabel} #${indexToken + 1}`;
    }

    if (fieldLabel) {
        return `${rootLabel} - ${fieldLabel}`;
    }

    return rootLabel;
};

const AISuggestionList = ({ suggestions = [], onAccept, onDismiss, emptyLabel = "No suggestions yet." }) => {
    if (!suggestions.length) {
        return <div className="ai-empty-state">{emptyLabel}</div>;
    }

    return (
        <div className="ai-suggestion-list">
            {suggestions.map((suggestion) => (
                <article
                    key={suggestion.id}
                    className={`ai-suggestion-card status-${suggestion.status || "pending"}`}
                >
                    <div className="ai-suggestion-header">
                        <h4>{suggestion.title || "Suggestion"}</h4>
                        <span className="ai-suggestion-priority">P{suggestion.priority || 0}</span>
                    </div>
                    <p className="ai-suggestion-reason">{suggestion.reason}</p>
                    {formatTargetLabel(suggestion.fieldPath) ? (
                        <div className="ai-suggestion-path">Target: {formatTargetLabel(suggestion.fieldPath)}</div>
                    ) : null}
                    <div className="ai-suggestion-text">{suggestion.suggestedText}</div>
                    <div className="ai-suggestion-actions">
                        <button
                            type="button"
                            className="ai-action-btn"
                            onClick={() => onAccept && onAccept(suggestion)}
                            disabled={suggestion.status === "accepted"}
                        >
                            {suggestion.status === "accepted" ? "Applied" : "Accept"}
                        </button>
                        <button
                            type="button"
                            className="ai-action-btn ghost"
                            onClick={() => onDismiss && onDismiss(suggestion)}
                            disabled={suggestion.status === "dismissed"}
                        >
                            {suggestion.status === "dismissed" ? "Dismissed" : "Dismiss"}
                        </button>
                    </div>
                </article>
            ))}
        </div>
    );
};

export default AISuggestionList;
