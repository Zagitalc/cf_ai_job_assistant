import React, { useState } from "react";
import CVForm from "./components/CVForm";
import CVPreview from "./components/CVPreview";
import "./index.css";

function App() {
    // We'll store everything in a single state object for simplicity
    const [cvData, setCvData] = useState({
        name: "",
        email: "",
        phone: "",
        summary: "",
        workExperience: "",
        education: "",
        skills: "",
        projects: "",
        certifications: "",
        awards: "",
        interests: ""
        // ... Add other fields as needed
    });

    const [template, setTemplate] = useState("A");

    return (
        <div className="container">
            <header className="header">
                <h1>OnClickCV</h1>
            </header>
            <div className="main-content">
                <div className="cv-form-container">
                    <CVForm cvData={cvData} setCvData={setCvData} template={template} setTemplate={setTemplate} />
                </div>
                <div className="cv-preview-container">
                    <CVPreview cvData={cvData} template={template} />
                </div>
            </div>
        </div>
    );
}

export default App;
