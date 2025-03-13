import React, { useState } from "react";
import CVForm from "./components/CVForm";
import CVPreview from "./components/CVPreview";
import "./index.css";
import 'react-quill/dist/quill.snow.css';

function App() {
    // Fixed initial state with proper data types
    const [cvData, setCvData] = useState({
        name: "",
        email: "",
        phone: "",
        summary: "",
        workExperience: "",
        // Initialize education as an array to prevent errors
        education: [],
        // Initialize skills as an array to be consistent
        skills: [],
        projects: "",
        certifications: "",
        awards: "",
        interests: ""
    });

    const [template, setTemplate] = useState("A");

    // Add loading/error states
    const [isExporting, setIsExporting] = useState(false);
    const [exportError, setExportError] = useState(null);

    // Centralized export handling
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
            <header className="header">
                <h1>OnClickCV</h1>
            </header>
            <div className="main-content">
                <div className="cv-form-container">
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
                <div className="cv-preview-container">
                    <CVPreview cvData={cvData} template={template} />
                </div>
            </div>
        </div>
    );
}

export default App;