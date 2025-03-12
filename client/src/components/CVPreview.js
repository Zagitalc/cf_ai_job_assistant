import React from "react";
import "./../templates/TemplateA.css";
import "./../templates/TemplateB.css";

const CVPreview = ({ cvData, template }) => {
    const { name, email, phone, summary } = cvData;

    return (
        <div className={`preview-container template-${template}`}>
            <div className="left-column">
                <h3>Personal Info</h3>
                <p><strong>Name:</strong> {name}</p>
                <p><strong>Email:</strong> {email}</p>
                <p><strong>Phone:</strong> {phone}</p>
            </div>
            <div className="right-column">
                <h3>Profile Summary</h3>
                <p>{summary}</p>
                {/* Add sections: Skills, Education, Experience, etc. */}
            </div>
        </div>
    );
};

export default CVPreview;
