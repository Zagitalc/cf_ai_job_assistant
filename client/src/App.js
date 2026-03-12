import React, { useCallback, useEffect, useMemo, useState } from "react";
import CVForm from "./components/CVForm";
import CVPreview from "./components/CVPreview";
import AIReviewPanel from "./components/AIReviewPanel";
import AIReviewModal from "./components/AIReviewModal";
import JobAssistantPanel from "./components/JobAssistantPanel";
import MobileSpeedDial from "./components/MobileSpeedDial";
import { TEMPLATE_OPTIONS } from "./constants/templates";
import { getDefaultSectionLayout, normalizeSectionLayout } from "./utils/sectionLayout";
import { buildFilenameSuggestions, resolveExportFilename, sanitizeFilenameBase } from "./utils/exportFilename";
import { applySuggestionPatch, parseSuggestionFieldPath } from "./utils/aiPatch";
import { consumeSse } from "./utils/aiStream";
import "./index.css";
import "react-quill/dist/quill.snow.css";

const getBrowserOrigin = () => (typeof window !== "undefined" ? window.location.origin : "");
const API_BASE_URL =
    process.env.REACT_APP_API_BASE_URL || (process.env.NODE_ENV === "production" ? "" : "http://localhost:8787");
const AGENT_BASE_URL = process.env.REACT_APP_AGENT_BASE_URL || API_BASE_URL || getBrowserOrigin();
const apiUrl = (path) => `${API_BASE_URL}${path}`;
const isAiReviewEnabled = () => String(process.env.REACT_APP_AI_REVIEW_ENABLED || "").toLowerCase() === "true";
const isPdfExportEnabled = () => String(process.env.REACT_APP_PDF_EXPORT_ENABLED || "true").toLowerCase() !== "false";
const isMobileViewport = () => (typeof window !== "undefined" ? window.innerWidth <= 1023 : false);

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

const ensureString = (value) => (typeof value === "string" ? value : "");
const ensureStringArray = (value) => (Array.isArray(value) ? value.map((item) => String(item || "")) : []);

const normalizeCvDataShape = (input = {}) => {
    const base = getInitialCvData();
    const next = {
        ...base,
        ...input,
        name: ensureString(input.name),
        email: ensureString(input.email),
        phone: ensureString(input.phone),
        linkedin: ensureString(input.linkedin),
        summary: ensureString(input.summary),
        workExperience: ensureStringArray(input.workExperience),
        volunteerExperience: ensureStringArray(input.volunteerExperience),
        skills: ensureStringArray(input.skills),
        projects: ensureStringArray(input.projects),
        certifications: ensureStringArray(input.certifications),
        awards: ensureStringArray(input.awards),
        additionalInfo: ensureString(input.additionalInfo),
        interests: ensureString(input.interests),
        education: Array.isArray(input.education)
            ? input.education.map((entry = {}) => ({
                  degree: ensureString(entry.degree),
                  school: ensureString(entry.school),
                  location: ensureString(entry.location),
                  startDate: ensureString(entry.startDate),
                  endDate: ensureString(entry.endDate),
                  additionalInfo: ensureString(entry.additionalInfo)
              }))
            : []
    };

    next.sectionLayout = normalizeSectionLayout(input.sectionLayout || {}, next);
    return next;
};

const getValueFromFieldPath = (target, fieldPath = "") => {
    const tokens = parseSuggestionFieldPath(fieldPath);
    if (!tokens.length) {
        return "";
    }

    let cursor = target;
    for (let index = 0; index < tokens.length; index += 1) {
        const token = tokens[index];
        if (cursor === null || cursor === undefined) {
            return "";
        }
        cursor = cursor[token];
    }
    return typeof cursor === "string" ? cursor : "";
};

const sectionIdFromFieldPath = (fieldPath = "") => {
    const root = String(parseSuggestionFieldPath(fieldPath)?.[0] || "");
    if (root === "summary") return "summary";
    if (root === "workExperience") return "work";
    if (root === "volunteerExperience") return "volunteer";
    if (root === "education") return "education";
    if (root === "projects") return "projects";
    if (root === "skills") return "skills";
    if (root === "certifications") return "certifications";
    if (root === "awards") return "awards";
    if (root === "additionalInfo") return "additional-info";
    return "";
};

const normalizeSuggestionForClient = (fix = {}, cvData = {}, index = 0) => ({
    ...fix,
    id: fix.id || `sug_${index + 1}`,
    sectionId: fix.sectionId || sectionIdFromFieldPath(fix.fieldPath),
    issueType: String(fix.issueType || "clarity").toLowerCase(),
    originalText: String(fix.originalText || getValueFromFieldPath(cvData, fix.fieldPath || "")).trim(),
    status: fix.status || "pending"
});

const withSuggestionStatuses = (reviewData = {}, cvData = {}) => ({
    ...reviewData,
    topFixes: (reviewData.topFixes || []).map((fix, index) => normalizeSuggestionForClient(fix, cvData, index))
});

const buildSectionMarkers = (suggestions = []) => {
    const grouped = {};
    suggestions.forEach((suggestion) => {
        const sectionId = suggestion.sectionId || sectionIdFromFieldPath(suggestion.fieldPath);
        if (!sectionId) {
            return;
        }
        if (!grouped[sectionId]) {
            grouped[sectionId] = [];
        }
        grouped[sectionId].push(suggestion);
    });

    const markers = {};
    Object.entries(grouped).forEach(([sectionId, sectionSuggestions]) => {
        const hasPending = sectionSuggestions.some((item) => item.status === "pending");
        markers[sectionId] = hasPending ? "hasSuggestions" : "resolved";
    });
    return markers;
};

function App() {
    const aiReviewEnabled = isAiReviewEnabled();
    const pdfExportEnabled = isPdfExportEnabled();
    const [cvData, setCvData] = useState(getInitialCvData);
    const [userId, setUserId] = useState("");
    const [template, setTemplate] = useState("A");
    const [isExporting, setIsExporting] = useState(false);
    const [exportingFormat, setExportingFormat] = useState("");
    const [exportError, setExportError] = useState(null);
    const [showAIReviewModal, setShowAIReviewModal] = useState(false);
    const [isMobile, setIsMobile] = useState(isMobileViewport);
    const [mobileView, setMobileView] = useState("stack");
    const [mobileAiView, setMobileAiView] = useState("review");
    const [desktopRightView, setDesktopRightView] = useState("preview");
    const [exportFileBaseName, setExportFileBaseName] = useState("");
    const [layoutMetrics, setLayoutMetrics] = useState({
        totalPages: 1,
        sectionHeights: {},
        pageContentHeight: 1075
    });
    const [reviewMarkers, setReviewMarkers] = useState({});
    const [activeStreamController, setActiveStreamController] = useState(null);
    const [aiReviewState, setAiReviewState] = useState({
        status: "idle",
        error: "",
        mode: "full",
        jobDescription: "",
        data: null
    });

    useEffect(() => {
        const update = () => setIsMobile(isMobileViewport());
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);

    useEffect(() => {
        if (!isMobile) {
            setShowAIReviewModal(false);
            setMobileView("stack");
        }
    }, [isMobile]);

    useEffect(() => {
        if (!aiReviewEnabled) {
            setDesktopRightView("preview");
            setShowAIReviewModal(false);
            setMobileAiView("review");
        }
    }, [aiReviewEnabled]);

    useEffect(() => () => {
        activeStreamController?.abort();
    }, [activeStreamController]);

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
        if (format === "pdf" && !pdfExportEnabled) {
            setExportError("PDF export is unavailable in local-only dev mode. Use remote worker dev for Browser Rendering.");
            return;
        }

        setIsExporting(true);
        setExportingFormat(format);
        setExportError(null);

        try {
            const endpoint = apiUrl(`/api/export/${format}`);
            const payload = {
                cvData: {
                    ...normalizeCvDataShape(cvData),
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
                let errorMessage = `${format.toUpperCase()} export failed`;
                try {
                    const errorPayload = await response.json();
                    if (typeof errorPayload?.error === "string" && errorPayload.error.trim()) {
                        errorMessage = errorPayload.error.trim();
                    }
                } catch (_error) {
                    // Fall back to the generic error message.
                }
                throw new Error(errorMessage);
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
            setExportError(`Failed to export ${format.toUpperCase()}: ${error.message}`);
        } finally {
            setIsExporting(false);
            setExportingFormat("");
        }
    };

    const applySuggestionToCv = useCallback((suggestion) => {
        if (!suggestion) {
            return { ok: false, error: "Suggestion is missing." };
        }

        const patchResult = applySuggestionPatch(cvData, suggestion.fieldPath, suggestion.suggestedText);
        if (!patchResult.ok) {
            const error = patchResult.error || "Failed to apply suggestion.";
            setAiReviewState((statePrev) => ({
                ...statePrev,
                status: "error",
                error
            }));
            return { ok: false, error };
        }

        setCvData(patchResult.data);
        return { ok: true };
    }, [cvData]);

    const handleSaveCV = async () => {
        const normalizedUserId = String(userId || "").trim();
        if (!normalizedUserId) {
            alert("User ID is required to save CV data.");
            return;
        }

        try {
            const normalized = normalizeCvDataShape(cvData);
            const response = await fetch(apiUrl("/api/cv/save"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    cvData: {
                        ...normalized,
                        sectionLayout: normalizeSectionLayout(normalized.sectionLayout, normalized)
                    },
                    userId: normalizedUserId
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

    const handleLoadCV = async () => {
        const normalizedUserId = String(userId || "").trim();
        if (!normalizedUserId) {
            alert("User ID is required to load CV data.");
            return;
        }

        try {
            const response = await fetch(apiUrl(`/api/cv/${normalizedUserId}`));
            if (!response.ok) {
                throw new Error("CV not found");
            }

            const data = await response.json();
            const normalized = normalizeCvDataShape(data);
            setCvData(normalized);
            setReviewMarkers({});
            setAiReviewState((prev) => ({ ...prev, status: "idle", error: "", data: null }));
            alert("CV loaded!");
        } catch (err) {
            alert(`Error loading CV: ${err.message}`);
        }
    };

    const handleLayoutMetricsChange = useCallback((metrics) => {
        setLayoutMetrics(metrics);
    }, []);

    const requestAIReview = useCallback(async (payload) => {
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
    }, []);

    const requestAIReviewStream = useCallback(async (payload, onEvent, signal) => {
        const response = await fetch(apiUrl("/api/ai/review/stream"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            const detail = Array.isArray(data?.details) && data.details.length > 0 ? String(data.details[0]) : "";
            const message = detail ? `${data?.error || "AI review stream failed."} ${detail}` : (data?.error || "AI review stream failed.");
            throw new Error(message);
        }

        await consumeSse(response, {
            onEvent
        }, signal);
    }, []);

    const refreshMarkersFromSuggestions = useCallback((suggestions = []) => {
        setReviewMarkers(buildSectionMarkers(suggestions));
    }, []);

    const handleRunAIReview = useCallback(async () => {
        if (!aiReviewEnabled) {
            return;
        }

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

        activeStreamController?.abort();
        const controller = new AbortController();
        setActiveStreamController(controller);
        setReviewMarkers({});
        setAiReviewState((prev) => ({
            ...prev,
            status: "loading",
            error: "",
            data: null
        }));

        let completed = false;
        try {
            await requestAIReviewStream(
                payload,
                (event, eventPayload) => {
                    if (event === "start") {
                        setAiReviewState((prev) => ({
                            ...prev,
                            status: "streaming",
                            error: "",
                            data: prev.data || {
                                mode,
                                generatedAt: eventPayload.generatedAt || new Date().toISOString(),
                                overall: {
                                    tier: "Fair",
                                    score: 0,
                                    summary: ""
                                },
                                topFixes: [],
                                bySection: {}
                            }
                        }));
                        return;
                    }

                    if (event === "overall") {
                        setAiReviewState((prev) => ({
                            ...prev,
                            status: "streaming",
                            error: "",
                            data: {
                                mode,
                                generatedAt: eventPayload.generatedAt || new Date().toISOString(),
                                overall: eventPayload.overall || prev.data?.overall || { tier: "Fair", score: 0, summary: "" },
                                topFixes: prev.data?.topFixes || [],
                                bySection: eventPayload.bySection || {},
                                ...(mode === "job-match" ? { jobMatch: eventPayload.jobMatch || null } : {})
                            }
                        }));
                        return;
                    }

                    if (event === "suggestion") {
                        setAiReviewState((prev) => {
                            const suggestion = normalizeSuggestionForClient(
                                eventPayload?.suggestion || {},
                                cvData,
                                (prev.data?.topFixes || []).length
                            );
                            const nextTopFixes = [...(prev.data?.topFixes || []), suggestion];
                            refreshMarkersFromSuggestions(nextTopFixes);
                            return {
                                ...prev,
                                status: "streaming",
                                data: {
                                    ...(prev.data || {}),
                                    topFixes: nextTopFixes
                                }
                            };
                        });
                        return;
                    }

                    if (event === "complete") {
                        completed = true;
                        setAiReviewState((prev) => ({
                            ...prev,
                            status: "ready",
                            error: ""
                        }));
                        return;
                    }

                    if (event === "error") {
                        throw new Error(eventPayload?.error || "AI review stream failed.");
                    }
                },
                controller.signal
            );

            if (!completed) {
                throw new Error("AI review stream ended before completion.");
            }
        } catch (error) {
            if (error?.name === "AbortError") {
                return;
            }

            try {
                const responseData = await requestAIReview(payload);
                const normalizedResponse = withSuggestionStatuses(responseData, cvData);
                setAiReviewState((prev) => ({
                    ...prev,
                    status: "ready",
                    error: "",
                    data: normalizedResponse
                }));
                refreshMarkersFromSuggestions(normalizedResponse.topFixes || []);
            } catch (fallbackError) {
                setAiReviewState((prev) => ({
                    ...prev,
                    status: "error",
                    error: fallbackError.message || error.message
                }));
            }
        } finally {
            setActiveStreamController((current) => (current === controller ? null : current));
        }
    }, [
        activeStreamController,
        aiReviewEnabled,
        aiReviewState.jobDescription,
        aiReviewState.mode,
        cvData,
        normalizedSectionLayout,
        refreshMarkersFromSuggestions,
        requestAIReview,
        requestAIReviewStream
    ]);

    const markSuggestionStatus = useCallback((suggestionId, status) => {
        setAiReviewState((prev) => {
            if (!prev.data) {
                return prev;
            }

            const nextTopFixes = (prev.data.topFixes || []).map((suggestion) =>
                suggestion.id === suggestionId ? { ...suggestion, status } : suggestion
            );
            refreshMarkersFromSuggestions(nextTopFixes);
            return {
                ...prev,
                data: {
                    ...prev.data,
                    topFixes: nextTopFixes
                }
            };
        });
    }, [refreshMarkersFromSuggestions]);

    const handleAcceptFullSuggestion = useCallback((suggestion) => {
        if (!suggestion) {
            return;
        }

        const result = applySuggestionToCv(suggestion);
        if (result.ok) {
            markSuggestionStatus(suggestion.id, "accepted");
        }
    }, [applySuggestionToCv, markSuggestionStatus]);

    const handleDismissFullSuggestion = useCallback((suggestion) => {
        if (!suggestion) {
            return;
        }
        markSuggestionStatus(suggestion.id, "dismissed");
    }, [markSuggestionStatus]);

    const handleApplyAllSuggestions = useCallback(() => {
        const pending = (aiReviewState.data?.topFixes || []).filter((item) => item.status === "pending");
        if (pending.length === 0) {
            return;
        }

        setCvData((prev) => {
            let next = prev;
            pending.forEach((suggestion) => {
                const patchResult = applySuggestionPatch(next, suggestion.fieldPath, suggestion.suggestedText);
                if (patchResult.ok) {
                    next = patchResult.data;
                }
            });
            return next;
        });

        setAiReviewState((prev) => {
            if (!prev.data) {
                return prev;
            }
            const nextTopFixes = (prev.data.topFixes || []).map((suggestion) =>
                suggestion.status === "pending" ? { ...suggestion, status: "accepted" } : suggestion
            );
            refreshMarkersFromSuggestions(nextTopFixes);
            return {
                ...prev,
                data: {
                    ...prev.data,
                    topFixes: nextTopFixes
                }
            };
        });
    }, [aiReviewState.data?.topFixes, refreshMarkersFromSuggestions]);

    const openAIReview = useCallback(() => {
        if (!aiReviewEnabled) {
            return;
        }

        if (isMobile) {
            setMobileAiView("review");
            setShowAIReviewModal(true);
            return;
        }

        setDesktopRightView("ai");
    }, [aiReviewEnabled, isMobile]);

    const hasPendingSuggestions = Object.values(reviewMarkers).some((value) => value === "hasSuggestions");

    return (
        <div className="app-shell">
            <header className="app-header no-print">
                <div className="my-container app-header-inner">
                    <h1 className="app-title">OnClickCV</h1>
                </div>
            </header>

            <main className="my-container">
                <div className={`app-content ${isMobile ? "mobile-layout" : ""}`}>
                    {(!isMobile || mobileView === "stack") ? (
                        <div data-testid="form-panel" className="app-form-panel">
                            <CVForm
                                cvData={cvData}
                                setCvData={setCvData}
                                userId={userId}
                                onUserIdChange={setUserId}
                                sectionLayout={normalizedSectionLayout}
                                setSectionLayout={updateSectionLayout}
                                template={template}
                                setTemplate={setTemplate}
                                templateOptions={TEMPLATE_OPTIONS}
                                onExport={handleExport}
                                isExporting={isExporting}
                                exportingFormat={exportingFormat}
                                exportError={exportError}
                                pdfExportEnabled={pdfExportEnabled}
                                exportFileBaseName={exportFileBaseName}
                                onExportFileBaseNameChange={setExportFileBaseName}
                                exportFileSuggestions={exportFileSuggestions}
                                onSave={handleSaveCV}
                                onLoad={handleLoadCV}
                                layoutMetrics={layoutMetrics}
                                isMobile={isMobile}
                                aiEnabled={aiReviewEnabled}
                                reviewMarkers={reviewMarkers}
                                onOpenAIReview={openAIReview}
                                aiReviewStatus={aiReviewState.status}
                            />
                        </div>
                    ) : null}

                    {(!isMobile || mobileView === "preview") ? (
                        <div data-testid="preview-panel" className="app-preview-panel">
                            {!isMobile && aiReviewEnabled ? (
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
                                    <button
                                        type="button"
                                        className={`panel-tab-btn ${desktopRightView === "assistant" ? "active" : ""}`}
                                        onClick={() => setDesktopRightView("assistant")}
                                    >
                                        Assistant
                                    </button>
                                </div>
                            ) : null}

                            {!isMobile && aiReviewEnabled && desktopRightView === "ai" ? (
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
                                    onApplyAll={handleApplyAllSuggestions}
                                />
                            ) : !isMobile && aiReviewEnabled && desktopRightView === "assistant" ? (
                                <JobAssistantPanel
                                    userId={userId}
                                    cvData={cvData}
                                    jobDescription={aiReviewState.jobDescription}
                                    onJobDescriptionChange={(jobDescription) =>
                                        setAiReviewState((prev) => ({
                                            ...prev,
                                            jobDescription
                                        }))
                                    }
                                    onApplySuggestion={applySuggestionToCv}
                                    agentHost={AGENT_BASE_URL}
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
                <MobileSpeedDial
                    aiEnabled={aiReviewEnabled}
                    activeView={mobileView}
                    onChangeView={setMobileView}
                    onOpenAI={() => {
                        setMobileAiView("review");
                        setShowAIReviewModal(true);
                    }}
                    hasPendingSuggestions={hasPendingSuggestions}
                />
            ) : null}

            <AIReviewModal
                isOpen={isMobile && showAIReviewModal}
                onClose={() => setShowAIReviewModal(false)}
                title="AI Workspace"
            >
                <div className="preview-panel-tabs no-print modal-ai-tabs">
                    <button
                        type="button"
                        className={`panel-tab-btn ${mobileAiView === "review" ? "active" : ""}`}
                        onClick={() => setMobileAiView("review")}
                    >
                        AI Review
                    </button>
                    <button
                        type="button"
                        className={`panel-tab-btn ${mobileAiView === "assistant" ? "active" : ""}`}
                        onClick={() => setMobileAiView("assistant")}
                    >
                        Assistant
                    </button>
                </div>
                {mobileAiView === "review" ? (
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
                        onApplyAll={handleApplyAllSuggestions}
                    />
                ) : (
                    <JobAssistantPanel
                        userId={userId}
                        cvData={cvData}
                        jobDescription={aiReviewState.jobDescription}
                        onJobDescriptionChange={(jobDescription) =>
                            setAiReviewState((prev) => ({
                                ...prev,
                                jobDescription
                            }))
                        }
                        onApplySuggestion={applySuggestionToCv}
                        agentHost={AGENT_BASE_URL}
                    />
                )}
            </AIReviewModal>
        </div>
    );
}

export default App;
