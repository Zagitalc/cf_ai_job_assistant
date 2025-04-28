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

    // Save CV to backend
    const handleSaveCV = async (userId) => {
        try {
            const response = await fetch("http://localhost:4000/api/cv/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cvData, userId })
            });
            if (!response.ok) throw new Error("Failed to save CV");
            alert("CV saved!");
        } catch (err) {
            alert("Error saving CV: " + err.message);
        }
    };

    // Load CV from backend
    const handleLoadCV = async (userId) => {
        try {
            const response = await fetch(`http://localhost:4000/api/cv/${userId}`);
            if (!response.ok) throw new Error("CV not found");
            const data = await response.json();
            setCvData(data);
            alert("CV loaded!");
        } catch (err) {
            alert("Error loading CV: " + err.message);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="w-full py-6 border-b bg-white mb-8">
                <h1 className="text-3xl font-bold text-center tracking-tight">OnClickCV</h1>
            </header>
            <main className="my-container">
                <div className="flex flex-col lg:flex-row gap-8 w-full">
                    <div className="w-full lg:w-1/2 bg-white rounded-lg shadow p-6 mb-8 lg:mb-0">
                        <CVForm
                            cvData={cvData}
                            setCvData={setCvData}
                            template={template}
                            setTemplate={setTemplate}
                            onExport={handleExport}
                            isExporting={isExporting}
                            exportError={exportError}
                            onSave={handleSaveCV}
                            onLoad={handleLoadCV}
                        />
                    </div>
                    <div className="w-full lg:w-1/2 flex items-center justify-center">
                        <div className="w-full">
                            <div className="a4-preview">
                                <CVPreview cvData={cvData} template={template} />
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default App;