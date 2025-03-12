import React, { useState } from "react";
import CVForm from "./components/CVForm";
import CVPreview from "./components/CVPreview";

function App() {
    // We'll store everything in a single state object for simplicity
    const [cvData, setCvData] = useState({
        name: "",
        email: "",
        phone: "",
        summary: ""
        // ... Add other fields as needed
    });

    const [template, setTemplate] = useState("A");

    return (
        <div>
            <h1>OnClickCV</h1>
            <div style={{ display: "flex", gap: "20px" }}>
                {/* Left side: Form */}
                <CVForm cvData={cvData} setCvData={setCvData} template={template} setTemplate={setTemplate} />

                {/* Right side: Real-time Preview */}
                <CVPreview cvData={cvData} template={template} />
            </div>
        </div>
    );
}

export default App;
