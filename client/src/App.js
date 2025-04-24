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
        <div className="min-h-screen bg-gray-50">
            <header className="w-full py-6 border-b bg-white mb-8">
                <h1 className="text-3xl font-bold text-center tracking-tight">OnClickCV</h1>
            </header>
            <main className="container mx-auto px-4">
                <div className="flex flex-col md:flex-row gap-8">
                    <div className="w-full md:w-1/2 bg-white rounded-lg shadow p-6 mb-8 md:mb-0">
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
                    <div className="w-full md:w-1/2 flex items-center justify-center">
                        <div className="w-full max-w-[794px] min-h-[1123px] bg-white border rounded-lg shadow p-6">
                            <CVPreview cvData={cvData} template={template} />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default App;