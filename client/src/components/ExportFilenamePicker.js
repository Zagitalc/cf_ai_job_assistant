import React from "react";

const ExportFilenamePicker = ({ inputId, value, onChange, suggestions }) => (
    <div className="export-filename-row">
        <label htmlFor={inputId} className="form-label">File name</label>
        <input
            id={inputId}
            type="text"
            className="form-input"
            value={value || ""}
            onChange={(event) => onChange && onChange(event.target.value)}
            placeholder="Choose file name"
        />
        <div className="filename-suggestion-group">
            {(suggestions || []).map((suggestion) => (
                <button
                    key={suggestion}
                    type="button"
                    className={`filename-suggestion-chip ${suggestion === value ? "selected" : ""}`}
                    onClick={() => onChange && onChange(suggestion)}
                >
                    {suggestion}
                </button>
            ))}
        </div>
    </div>
);

export default ExportFilenamePicker;

