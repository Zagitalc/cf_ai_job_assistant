import React, { useCallback, useEffect, useMemo, useState } from "react";
import CVForm from "./components/CVForm";
import CVPreview from "./components/CVPreview";
import PreviewModal from "./components/PreviewModal";
import AIReviewPanel from "./components/AIReviewPanel";
import AIReviewModal from "./components/AIReviewModal";
import MobileSpeedDial from "./components/MobileSpeedDial";
import { TEMPLATE_OPTIONS } from "./constants/templates";
import { getDefaultSectionLayout, normalizeSectionLayout } from "./utils/sectionLayout";
import { buildFilenameSuggestions, resolveExportFilename, sanitizeFilenameBase } from "./utils/exportFilename";
import { applySuggestionPatch } from "./utils/aiPatch";
import "./index.css";
import "react-quill/dist/quill.snow.css";

const THEME_STORAGE_KEY = "onclickcv.theme";
const API_BASE_URL =
    process.env.REACT_APP_API_BASE_URL || (process.env.NODE_ENV === "production" ? "" : "http://localhost:4000");
const apiUrl = (path) => `${API_BASE_URL}${path}`;
const isAiReviewEnabled = () => String(process.env.REACT_APP_AI_REVIEW_ENABLED || "").toLowerCase() === "true";

const getInitialTheme = () => {
    if (typeof window === "undefined") {
        return "light";
    }

    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === "light" || storedTheme === "dark") {
        return storedTheme;
    }

    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        return "dark";
    }

    return "light";
};

const getInitialCvData = () => ({
    name: "",
    email: "",
    phone: "",
    linkedin: "",
    summary: "",
    workExperience: [],
    volunteerExperience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
    awards: [],
    additionalInfo: "",
    interests: "",
    sectionLayout: getDefaultSectionLayout()
});

const isMobileViewport = () => (typeof window !== "undefined" ? window.innerWidth <= 1023 : false);

const withSuggestionStatuses = (reviewData = {}) => ({
    ...reviewData,
    topFixes: (reviewData.topFixes || []).map((fix, index) => ({
        ...fix,
        id: fix.id || `sug_${index + 1}`,
        status: "pending"
    }))
});

function App() {
    const aiReviewEnabled = isAiReviewEnabled();
    const [cvData, setCvData] = useState(getInitialCvData);
    const [template, setTemplate] = useState("A");
    const [isExporting, setIsExporting] = useState(false);
    const [exportingFormat, setExportingFormat] = useState("");
    const [exportError, setExportError] = useState(null);
    const [theme, setTheme] = useState(getInitialTheme);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [showAIReviewModal, setShowAIReviewModal] = useState(false);
    const [isMobile, setIsMobile] = useState(isMobileViewport);
    const [desktopRightView, setDesktopRightView] = useState("preview");
    const [exportFileBaseName, setExportFileBaseName] = useState("");
    const [layoutMetrics, setLayoutMetrics] = useState({
        totalPages: 1,
        sectionHeights: {},
        pageContentHeight: 1075
    });
    const [sectionAiState, setSectionAiState] = useState({});
    const [aiReviewState, setAiReviewState] = useState({
        status: "idle",
        error: "",
        mode: "full",
        jobDescription: "",
        data: null
    });

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }, [theme]);

    useEffect(() => {
        const update = () => setIsMobile(isMobileViewport());
        update();

        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);

    useEffect(() => {
        if (!isMobile) {
            setShowPreviewModal(false);
            setShowAIReviewModal(false);
        }
    }, [isMobile]);

    useEffect(() => {
        if (!aiReviewEnabled) {
            setDesktopRightView("preview");
            setShowAIReviewModal(false);
        }
    }, [aiReviewEnabled]);

    const normalizedSectionLayout = useMemo(
        () => normalizeSectionLayout(cvData.sectionLayout, cvData),
        [cvData.sectionLayout, cvData]
    );
    const exportFileSuggestions = useMemo(
        () => buildFilenameSuggestions(cvData, template),
        [cvData, template]
    );

    useEffect(() => {
        if (!exportFileBaseName.trim()) {
            setExportFileBaseName(exportFileSuggestions[0] || "CV");
        }
    }, [exportFileBaseName, exportFileSuggestions]);

    const updateSectionLayout = useCallback(
        (nextLayout) => {
            setCvData((prev) => ({
                ...prev,
                sectionLayout: normalizeSectionLayout(nextLayout, prev)
            }));
        },
        [setCvData]
    );

    const handleExport = async (format, requestedBaseName = "") => {
        setIsExporting(true);
        setExportingFormat(format);
        setExportError(null);

        try {
            const endpoint = apiUrl(`/api/export/${format}`);
            const payload = {
                cvData: {
                    ...cvData,
                    sectionLayout: normalizeSectionLayout(cvData.sectionLayout, cvData)
                },
                template
            };

            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`${format.toUpperCase()} export failed`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            const chosenBase = sanitizeFilenameBase(
                requestedBaseName || exportFileBaseName || exportFileSuggestions[0] || "CV"
            );
            link.download = resolveExportFilename(chosenBase, format);
            link.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error(error);
            setExportError(`Failed to export ${format.toUpperCase()}: ${error.message}`);
        } finally {
            setIsExporting(false);
            setExportingFormat("");
        }
    };

    const handleSaveCV = async (userId) => {
        try {
            const response = await fetch(apiUrl("/api/cv/save"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    cvData: {
                        ...cvData,
                        sectionLayout: normalizeSectionLayout(cvData.sectionLayout, cvData)
                    },
                    userId
                })
            });

            if (!response.ok) {
                throw new Error("Failed to save CV");
            }

            alert("CV saved!");
        } catch (err) {
            alert(`Error saving CV: ${err.message}`);
        }
    };

    const handleLoadCV = async (userId) => {
        try {
            const response = await fetch(apiUrl(`/api/cv/${userId}`));
            if (!response.ok) {
                throw new Error("CV not found");
            }

            const data = await response.json();
            const normalized = normalizeSectionLayout(data.sectionLayout, data);
            setCvData({ ...getInitialCvData(), ...data, sectionLayout: normalized });
            setSectionAiState({});
            setAiReviewState((prev) => ({ ...prev, status: "idle", error: "", data: null }));
            alert("CV loaded!");
        } catch (err) {
            alert(`Error loading CV: ${err.message}`);
        }
    };

    const toggleTheme = () => {
        setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
    };

    const handleLayoutMetricsChange = useCallback((metrics) => {
        setLayoutMetrics(metrics);
    }, []);

    const requestAIReview = useCallback(
        async (payload) => {
            const response = await fetch(apiUrl("/api/ai/review"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                const detail = Array.isArray(data?.details) && data.details.length > 0 ? String(data.details[0]) : "";
                const message = detail ? `${data?.error || "AI review request failed."} ${detail}` : (data?.error || "AI review request failed.");
                throw new Error(message);
            }

            return data;
        },
        []
    );

    const handleRequestSectionAi = useCallback(
        async (sectionId) => {
            if (!aiReviewEnabled) {
                return;
            }

            if (sectionId === "personal") {
                setSectionAiState((prev) => ({
                    ...prev,
                    [sectionId]: {
                        ...(prev[sectionId] || {}),
                        status: "error",
                        error: "AI suggestions are not available for Personal Info.",
                        hasFetched: true,
                        isExpanded: true,
                        suggestions: []
                    }
                }));
                return;
            }

            setSectionAiState((prev) => ({
                ...prev,
                [sectionId]: {
                    ...(prev[sectionId] || {}),
                    status: "loading",
                    error: "",
                    hasFetched: true,
                    isExpanded: !isMobile
                }
            }));

            try {
                const responseData = await requestAIReview({
                    mode: "section",
                    sectionId,
                    cvData,
                    sectionLayout: normalizedSectionLayout
                });

                setSectionAiState((prev) => ({
                    ...prev,
                    [sectionId]: {
                        ...(prev[sectionId] || {}),
                        status: "ready",
                        error: "",
                        hasFetched: true,
                        isExpanded: !isMobile,
                        suggestions: withSuggestionStatuses(responseData).topFixes || []
                    }
                }));
            } catch (error) {
                setSectionAiState((prev) => ({
                    ...prev,
                    [sectionId]: {
                        ...(prev[sectionId] || {}),
                        status: "error",
                        error: error.message,
                        hasFetched: true,
                        isExpanded: true
                    }
                }));
            }
        },
        [aiReviewEnabled, cvData, isMobile, normalizedSectionLayout, requestAIReview]
    );

    const markSectionSuggestion = useCallback((sectionId, suggestionId, status) => {
        setSectionAiState((prev) => {
            const current = prev[sectionId] || {};
            return {
                ...prev,
                [sectionId]: {
                    ...current,
                    suggestions: (current.suggestions || []).map((suggestion) =>
                        suggestion.id === suggestionId ? { ...suggestion, status } : suggestion
                    )
                }
            };
        });
    }, []);

    const handleAcceptSectionSuggestion = useCallback(
        (sectionId, suggestionId) => {
            const suggestion = (sectionAiState?.[sectionId]?.suggestions || []).find((entry) => entry.id === suggestionId);
            if (!suggestion) {
                return;
            }

            setCvData((prev) => {
                const patchResult = applySuggestionPatch(prev, suggestion.fieldPath, suggestion.suggestedText);
                if (!patchResult.ok) {
                    setSectionAiState((statePrev) => ({
                        ...statePrev,
                        [sectionId]: {
                            ...(statePrev[sectionId] || {}),
                            error: patchResult.error || "Failed to apply suggestion.",
                            status: "error",
                            isExpanded: true
                        }
                    }));
                    return prev;
                }

                return patchResult.data;
            });

            markSectionSuggestion(sectionId, suggestionId, "accepted");
        },
        [markSectionSuggestion, sectionAiState]
    );

    const handleDismissSectionSuggestion = useCallback(
        (sectionId, suggestionId) => {
            markSectionSuggestion(sectionId, suggestionId, "dismissed");
        },
        [markSectionSuggestion]
    );

    const handleToggleSectionSuggestions = useCallback((sectionId) => {
        setSectionAiState((prev) => ({
            ...prev,
            [sectionId]: {
                ...(prev[sectionId] || {}),
                isExpanded: !prev[sectionId]?.isExpanded
            }
        }));
    }, []);

    const handleRunAIReview = useCallback(async () => {
        if (!aiReviewEnabled) {
            return;
        }

        setAiReviewState((prev) => ({
            ...prev,
            status: "loading",
            error: ""
        }));

        try {
            const mode = aiReviewState.mode || "full";
            if (mode === "job-match" && !String(aiReviewState.jobDescription || "").trim()) {
                setAiReviewState((prev) => ({
                    ...prev,
                    status: "error",
                    error: "Job description is required for Job Match mode."
                }));
                return;
            }
            const payload = {
                mode,
                cvData,
                sectionLayout: normalizedSectionLayout
            };

            if (mode === "job-match") {
                payload.jobDescription = aiReviewState.jobDescription || "";
            }

            const responseData = await requestAIReview(payload);
            setAiReviewState((prev) => ({
                ...prev,
                status: "ready",
                error: "",
                data: withSuggestionStatuses(responseData)
            }));
        } catch (error) {
            setAiReviewState((prev) => ({
                ...prev,
                status: "error",
                error: error.message
            }));
        }
    }, [aiReviewEnabled, aiReviewState.jobDescription, aiReviewState.mode, cvData, normalizedSectionLayout, requestAIReview]);

    const markFullReviewSuggestion = useCallback((suggestionId, status) => {
        setAiReviewState((prev) => ({
            ...prev,
            data: prev.data
                ? {
                      ...prev.data,
                      topFixes: (prev.data.topFixes || []).map((suggestion) =>
                          suggestion.id === suggestionId ? { ...suggestion, status } : suggestion
                      )
                  }
                : prev.data
        }));
    }, []);

    const handleAcceptFullSuggestion = useCallback(
        (suggestion) => {
            if (!suggestion) {
                return;
            }

            setCvData((prev) => {
                const patchResult = applySuggestionPatch(prev, suggestion.fieldPath, suggestion.suggestedText);
                if (!patchResult.ok) {
                    setAiReviewState((statePrev) => ({
                        ...statePrev,
                        status: "error",
                        error: patchResult.error || "Failed to apply suggestion."
                    }));
                    return prev;
                }

                return patchResult.data;
            });

            markFullReviewSuggestion(suggestion.id, "accepted");
        },
        [markFullReviewSuggestion]
    );

    const handleDismissFullSuggestion = useCallback(
        (suggestion) => {
            if (!suggestion) {
                return;
            }
            markFullReviewSuggestion(suggestion.id, "dismissed");
        },
        [markFullReviewSuggestion]
    );

    const openAIReview = useCallback(() => {
        if (!aiReviewEnabled) {
            return;
        }

        if (isMobile) {
            setShowAIReviewModal(true);
            return;
        }

        setDesktopRightView("ai");
    }, [aiReviewEnabled, isMobile]);

    return (
        <div className="app-shell">
            <header className="app-header no-print">
                <div className="my-container app-header-inner">
                    <h1 className="app-title">OnClickCV</h1>
                    <div className="header-actions">
                        <button
                            type="button"
                            onClick={toggleTheme}
                            className="theme-toggle-btn"
                            aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
                        >
                            {theme === "light" ? "Dark Mode" : "Light Mode"}
                        </button>
                    </div>
                </div>
            </header>

            <main className="my-container">
                <div className="app-content">
                    <div data-testid="form-panel" className="app-form-panel">
                        <CVForm
                            cvData={cvData}
                            setCvData={setCvData}
                            sectionLayout={normalizedSectionLayout}
                            setSectionLayout={updateSectionLayout}
                            template={template}
                            setTemplate={setTemplate}
                            templateOptions={TEMPLATE_OPTIONS}
                            onExport={handleExport}
                            isExporting={isExporting}
                            exportingFormat={exportingFormat}
                            exportError={exportError}
                            exportFileBaseName={exportFileBaseName}
                            onExportFileBaseNameChange={setExportFileBaseName}
                            exportFileSuggestions={exportFileSuggestions}
                            onSave={handleSaveCV}
                            onLoad={handleLoadCV}
                            layoutMetrics={layoutMetrics}
                            isMobile={isMobile}
                            aiEnabled={aiReviewEnabled}
                            sectionAiState={sectionAiState}
                            onRequestSectionAi={handleRequestSectionAi}
                            onAcceptSectionSuggestion={handleAcceptSectionSuggestion}
                            onDismissSectionSuggestion={handleDismissSectionSuggestion}
                            onToggleSectionSuggestions={handleToggleSectionSuggestions}
                            onOpenAIReview={openAIReview}
                            aiReviewStatus={aiReviewState.status}
                        />
                    </div>

                    {!isMobile ? (
                        <div data-testid="preview-panel" className="app-preview-panel">
                            {aiReviewEnabled ? (
                                <div className="preview-panel-tabs no-print">
                                    <button
                                        type="button"
                                        className={`panel-tab-btn ${desktopRightView === "preview" ? "active" : ""}`}
                                        onClick={() => setDesktopRightView("preview")}
                                    >
                                        Preview
                                    </button>
                                    <button
                                        type="button"
                                        className={`panel-tab-btn ${desktopRightView === "ai" ? "active" : ""}`}
                                        onClick={() => setDesktopRightView("ai")}
                                    >
                                        AI Review
                                    </button>
                                </div>
                            ) : null}

                            {aiReviewEnabled && desktopRightView === "ai" ? (
                                <AIReviewPanel
                                    reviewState={aiReviewState}
                                    onRunReview={handleRunAIReview}
                                    onModeChange={(mode) =>
                                        setAiReviewState((prev) => ({
                                            ...prev,
                                            mode,
                                            error: "",
                                            data: mode === prev.mode ? prev.data : null
                                        }))
                                    }
                                    onJobDescriptionChange={(jobDescription) =>
                                        setAiReviewState((prev) => ({
                                            ...prev,
                                            jobDescription
                                        }))
                                    }
                                    onAcceptSuggestion={handleAcceptFullSuggestion}
                                    onDismissSuggestion={handleDismissFullSuggestion}
                                />
                            ) : (
                                <CVPreview
                                    cvData={cvData}
                                    sectionLayout={normalizedSectionLayout}
                                    template={template}
                                    onLayoutMetricsChange={handleLayoutMetricsChange}
                                />
                            )}
                        </div>
                    ) : null}
                </div>
            </main>

            {isMobile ? (
                aiReviewEnabled ? (
                    <MobileSpeedDial
                        aiEnabled={aiReviewEnabled}
                        onOpenPreview={() => setShowPreviewModal(true)}
                        onOpenAI={() => setShowAIReviewModal(true)}
                    />
                ) : (
                    <button
                        type="button"
                        className="preview-fab no-print"
                        onClick={() => setShowPreviewModal(true)}
                        aria-label="Open CV preview"
                    >
                        Preview
                    </button>
                )
            ) : null}

            <PreviewModal
                isOpen={isMobile && showPreviewModal}
                onClose={() => setShowPreviewModal(false)}
                onExport={handleExport}
                isExporting={isExporting}
                exportingFormat={exportingFormat}
                exportFileBaseName={exportFileBaseName}
                onExportFileBaseNameChange={setExportFileBaseName}
                exportFileSuggestions={exportFileSuggestions}
            >
                <CVPreview
                    cvData={cvData}
                    sectionLayout={normalizedSectionLayout}
                    template={template}
                    onLayoutMetricsChange={handleLayoutMetricsChange}
                />
            </PreviewModal>

            <AIReviewModal isOpen={isMobile && showAIReviewModal} onClose={() => setShowAIReviewModal(false)}>
                <AIReviewPanel
                    reviewState={aiReviewState}
                    onRunReview={handleRunAIReview}
                    onModeChange={(mode) =>
                        setAiReviewState((prev) => ({
                            ...prev,
                            mode,
                            error: "",
                            data: mode === prev.mode ? prev.data : null
                        }))
                    }
                    onJobDescriptionChange={(jobDescription) =>
                        setAiReviewState((prev) => ({
                            ...prev,
                            jobDescription
                        }))
                    }
                    onAcceptSuggestion={handleAcceptFullSuggestion}
                    onDismissSuggestion={handleDismissFullSuggestion}
                />
            </AIReviewModal>
        </div>
    );
}

export default App;
