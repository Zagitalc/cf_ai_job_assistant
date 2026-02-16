import React, { useEffect, useState } from "react";
import CVForm from "./components/CVForm";
import CVPreview from "./components/CVPreview";
import { TEMPLATE_OPTIONS } from "./constants/templates";
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

function App() {
    const [cvData, setCvData] = useState({
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
        interests: ""
    });

    const [template, setTemplate] = useState("A");
    const [isExporting, setIsExporting] = useState(false);
    const [exportError, setExportError] = useState(null);
    const [theme, setTheme] = useState(getInitialTheme);
    const [showPreviewMobile, setShowPreviewMobile] = useState(false);

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }, [theme]);

    const handleExport = async (format) => {
        setIsExporting(true);
        setExportError(null);

        try {
            const endpoint = `http://localhost:4000/api/export/${format}`;
            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cvData, template })
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
        }
    };

    const handleSaveCV = async (userId) => {
        try {
            const response = await fetch("http://localhost:4000/api/cv/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cvData, userId })
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
            setCvData(data);
            alert("CV loaded!");
        } catch (err) {
            alert(`Error loading CV: ${err.message}`);
        }
    };

    const toggleTheme = () => {
        setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
    };

    const togglePreviewMobile = () => {
        setShowPreviewMobile((prev) => !prev);
    };

    return (
        <div className="app-shell">
            <header className="app-header no-print">
                <div className="my-container app-header-inner">
                    <h1 className="app-title">OnClickCV</h1>
                    <div className="header-actions">
                        <button
                            type="button"
                            onClick={togglePreviewMobile}
                            className="mobile-toggle-btn"
                            aria-pressed={showPreviewMobile}
                            aria-label={showPreviewMobile ? "Show CV form" : "Show CV preview"}
                        >
                            {showPreviewMobile ? "Show Form" : "Show Preview"}
                        </button>
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
                    <div
                        data-testid="form-panel"
                        className={`app-form-panel ${showPreviewMobile ? "mobile-hide" : ""}`}
                    >
                        <CVForm
                            cvData={cvData}
                            setCvData={setCvData}
                            template={template}
                            setTemplate={setTemplate}
                            templateOptions={TEMPLATE_OPTIONS}
                            onExport={handleExport}
                            isExporting={isExporting}
                            exportError={exportError}
                            onSave={handleSaveCV}
                            onLoad={handleLoadCV}
                        />
                    </div>

                    <div
                        data-testid="preview-panel"
                        className={`app-preview-panel ${showPreviewMobile ? "" : "mobile-hide"}`}
                    >
                        <div className="a4-preview cv-preview-paper">
                            <CVPreview cvData={cvData} template={template} />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default App;
