import React, { useCallback, useEffect, useMemo, useState } from "react";
import CVForm from "./components/CVForm";
import CVPreview from "./components/CVPreview";
import PreviewModal from "./components/PreviewModal";
import { TEMPLATE_OPTIONS } from "./constants/templates";
import { getDefaultSectionLayout, normalizeSectionLayout } from "./utils/sectionLayout";
import "./index.css";
import "react-quill/dist/quill.snow.css";

const THEME_STORAGE_KEY = "onclickcv.theme";

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
    interests: "",
    sectionLayout: getDefaultSectionLayout()
});

const isMobileViewport = () => (typeof window !== "undefined" ? window.innerWidth <= 1023 : false);

function App() {
    const [cvData, setCvData] = useState(getInitialCvData);
    const [template, setTemplate] = useState("A");
    const [isExporting, setIsExporting] = useState(false);
    const [exportingFormat, setExportingFormat] = useState("");
    const [exportError, setExportError] = useState(null);
    const [theme, setTheme] = useState(getInitialTheme);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [isMobile, setIsMobile] = useState(isMobileViewport);
    const [layoutMetrics, setLayoutMetrics] = useState({
        totalPages: 1,
        sectionHeights: {},
        pageContentHeight: 1075
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
        }
    }, [isMobile]);

    const normalizedSectionLayout = useMemo(
        () => normalizeSectionLayout(cvData.sectionLayout, cvData),
        [cvData.sectionLayout, cvData]
    );

    const updateSectionLayout = useCallback(
        (nextLayout) => {
            setCvData((prev) => ({
                ...prev,
                sectionLayout: normalizeSectionLayout(nextLayout, prev)
            }));
        },
        [setCvData]
    );

    const handleExport = async (format) => {
        setIsExporting(true);
        setExportingFormat(format);
        setExportError(null);

        try {
            const endpoint = `http://localhost:4000/api/export/${format}`;
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
            link.download = `OnClickCV.${format === "pdf" ? "pdf" : "docx"}`;
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
            const response = await fetch("http://localhost:4000/api/cv/save", {
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
            const response = await fetch(`http://localhost:4000/api/cv/${userId}`);
            if (!response.ok) {
                throw new Error("CV not found");
            }

            const data = await response.json();
            const normalized = normalizeSectionLayout(data.sectionLayout, data);
            setCvData({ ...getInitialCvData(), ...data, sectionLayout: normalized });
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
                            onSave={handleSaveCV}
                            onLoad={handleLoadCV}
                            layoutMetrics={layoutMetrics}
                            isMobile={isMobile}
                        />
                    </div>

                    {!isMobile ? (
                        <div data-testid="preview-panel" className="app-preview-panel">
                            <CVPreview
                                cvData={cvData}
                                sectionLayout={normalizedSectionLayout}
                                template={template}
                                onLayoutMetricsChange={handleLayoutMetricsChange}
                            />
                        </div>
                    ) : null}
                </div>
            </main>

            {isMobile ? (
                <button
                    type="button"
                    className="preview-fab no-print"
                    onClick={() => setShowPreviewModal(true)}
                    aria-label="Open CV preview"
                >
                    Preview
                </button>
            ) : null}

            <PreviewModal
                isOpen={isMobile && showPreviewModal}
                onClose={() => setShowPreviewModal(false)}
                onExport={handleExport}
                isExporting={isExporting}
                exportingFormat={exportingFormat}
            >
                <CVPreview
                    cvData={cvData}
                    sectionLayout={normalizedSectionLayout}
                    template={template}
                    onLayoutMetricsChange={handleLayoutMetricsChange}
                />
            </PreviewModal>
        </div>
    );
}

export default App;
