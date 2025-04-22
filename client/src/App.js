import React, { useState } from "react";
import CVForm from "./components/CVForm";
import CVPreview from "./components/CVPreview";
import "./index.css";
import 'react-quill/dist/quill.snow.css';

function App() {
    const [cvData, setCvData] = useState({
        name: "",
        email: "",
        phone: "",
        summary: "",
        workExperience: "",
        education: [],
        skills: [],
        projects: "",
        certifications: [],
        awards: [],
        interests: ""
    });

    const [template, setTemplate] = useState("A");
    const [isExporting, setIsExporting] = useState(false);
    const [exportError, setExportError] = useState(null);

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

            if (!response.ok) throw new Error(`${format.toUpperCase()} export failed`);

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `OnClickCV.${format === 'pdf' ? 'pdf' : 'docx'}`;
            link.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error(error);
            setExportError(`Failed to export ${format.toUpperCase()}: ${error.message}`);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="container">
            <header style={{
                width: "100%",
                textAlign: "center",
                marginBottom: "32px",
                padding: "16px 0",
                borderBottom: "1px solid #eee",
                fontFamily: "inherit"
            }}>
                <h1 style={{
                    fontSize: "2rem",
                    fontWeight: 700,
                    margin: 0,
                    letterSpacing: "0.5px"
                }}>
                    OnClickCV
                </h1>
            </header>
            <div className="main-content" style={{
                display: "flex",
                gap: "32px",
                alignItems: "flex-start",
                width: "100%"
            }}>
                <div className="cv-form-container" style={{
                    flex: "1 1 380px",
                    maxWidth: 440,
                    minWidth: 320,
                    background: "#fff",
                    borderRadius: 12,
                    boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
                    padding: 24,
                    marginBottom: 32
                }}>
                    <CVForm
                        cvData={cvData}
                        setCvData={setCvData}
                        template={template}
                        setTemplate={setTemplate}
                        onExport={handleExport}
                        isExporting={isExporting}
                        exportError={exportError}
                    />
                </div>
                <div className="cv-preview-container" style={{
                    flex: "2 1 600px",
                    maxWidth: 900,
                    minWidth: 320,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center"
                }}>
                    <div style={{
                        width: "100%",
                        maxWidth: 794,
                        minHeight: 1123,
                        background: "#fff",
                        border: "1px solid #ddd",
                        borderRadius: 12,
                        boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
                        padding: 24,
                        margin: "0 auto"
                    }}>
                        <CVPreview cvData={cvData} template={template} />
                    </div>
                </div>
            </div>
            <style>{`
                @media (max-width: 900px) {
                    .main-content {
                        flex-direction: column;
                        gap: 0;
                    }
                    .cv-form-container,
                    .cv-preview-container {
                        max-width: 100% !important;
                        min-width: 0 !important;
                        margin-bottom: 24px !important;
                    }
                    .cv-preview-container > div {
                        max-width: 100% !important;
                        min-width: 0 !important;
                    }
                }
            `}</style>
        </div>
    );
}

export default App;