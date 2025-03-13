// const path = require("path");
const puppeteer = require("puppeteer");
const { Document, Packer, Paragraph, TextRun } = require("docx");

// PDF Export using Puppeteer
exports.exportPDF = async (req, res) => {
    try {
        // Retrieve CV data and template choice from client request
        const { cvData, template } = req.body;
        // Generate HTML string based on cvData
        const htmlContent = generateHTML(cvData, template);

        // Launch Puppeteer to render the HTML and generate a PDF
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: "networkidle0" });
        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true
        });
        await browser.close();

        // Set headers and send PDF back to client
        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": "attachment; filename=OnClickCV.pdf"
        });
        return res.send(pdfBuffer);
    } catch (err) {
        console.error("Error generating PDF:", err);
        return res.status(500).json({ error: "Failed to generate PDF." });
    }
};

// Word Export using the docx library
exports.exportWord = async (req, res) => {
    try {
        const { cvData } = req.body;
        const doc = new Document({
            sections: [
                {
                    children: [
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: `Name: ${cvData.name}`,
                                    bold: true
                                })
                            ]
                        }),
                        new Paragraph({
                            children: [new TextRun(`Email: ${cvData.email}`)]
                        }),
                        new Paragraph({
                            children: [new TextRun(`Phone: ${cvData.phone}`)]
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: "Skills:", bold: true })
                            ]
                        }),
                        // Map over skills array
                        ...cvData.skills.map((skill) =>
                            new Paragraph({ children: [new TextRun(skill)] })
                        ),
                        new Paragraph({
                            children: [
                                new TextRun({ text: "Certifications:", bold: true })
                            ]
                        }),
                        new Paragraph({
                            children: [new TextRun(cvData.certifications || "N/A")]
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: "Awards:", bold: true })
                            ]
                        }),
                        new Paragraph({
                            children: [new TextRun(cvData.awards || "N/A")]
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: "Interests:", bold: true })
                            ]
                        }),
                        new Paragraph({
                            children: [new TextRun(cvData.interests || "N/A")]
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: "Profile Summary:", bold: true })
                            ]
                        }),
                        new Paragraph({
                            children: [new TextRun(cvData.summary || "N/A")]
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: "Work Experience:", bold: true })
                            ]
                        }),
                        new Paragraph({
                            children: [new TextRun(cvData.workExperience || "N/A")]
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: "Education:", bold: true })
                            ]
                        }),
                        // Map over each education entry
                        ...cvData.education.map((edu) =>
                            new Paragraph({
                                children: [
                                    new TextRun(
                                        `Degree: ${edu.degree} | School: ${edu.school} | Location: ${edu.location} | Dates: ${edu.startDate} - ${edu.endDate}`
                                    ),
                                    // Note: For simplicity, we're not parsing the additionalInfo HTML into rich formatting.
                                    // You could choose to strip HTML tags or use a converter.
                                ]
                            })
                        ),
                        new Paragraph({
                            children: [
                                new TextRun({ text: "Projects:", bold: true })
                            ]
                        }),
                        new Paragraph({
                            children: [new TextRun(cvData.projects || "N/A")]
                        })
                    ]
                }
            ]
        });

        const buffer = await Packer.toBuffer(doc);
        res.set({
            "Content-Type":
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "Content-Disposition": "attachment; filename=OnClickCV.docx"
        });
        return res.send(buffer);
    } catch (err) {
        console.error("Error generating Word doc:", err);
        return res.status(500).json({ error: "Failed to generate Word." });
    }
};

// Fixed version of the generateHTML function with the error removed
function generateHTML(cvData, template) {
    const {
        name,
        email,
        phone,
        summary,
        workExperience,
        education,
        skills,
        projects,
        certifications,
        awards,
        interests
    } = cvData;

    // Define style blocks for the two templates
    const styleTemplateA = `
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; }
      .container { display: flex; }
      .left-column { width: 35%; padding-right: 15px; }
      .right-column { width: 65%; }
      .section-title { font-weight: bold; margin-top: 15px; border-bottom: 1px solid #ccc; padding-bottom: 3px; }
      p { margin: 5px 0; }
      ul { margin: 5px 0; padding-left: 20px; }
    </style>
  `;
    const styleTemplateB = `
    <style>
      body { font-family: "Open Sans", sans-serif; margin: 20px; color: #333; }
      .container { display: flex; }
      .left-column { width: 35%; background: #eff6fc; padding: 10px; margin-right: 15px; }
      .right-column { width: 65%; padding: 10px; }
      .section-title { font-weight: bold; color: #007acc; margin-top: 15px; border-bottom: 1px solid #007acc; padding-bottom: 3px; }
      p { margin: 5px 0; }
      ul { margin: 5px 0; padding-left: 20px; }
    </style>
  `;

    const chosenStyle = template === "B" ? styleTemplateB : styleTemplateA;

    // Create HTML for skills as a list
    const skillsHTML =
        skills && skills.length > 0
            ? `<ul>${skills.map((skill) => `<li>${skill}</li>`).join("")}</ul>`
            : `<p>N/A</p>`;

    // Create HTML for education entries
    const educationHTML =
        education && education.length > 0
            ? education
                .map((edu) => {
                    return `
            <div style="margin-bottom:10px;">
              <p><strong>Degree:</strong> ${edu.degree || 'N/A'}</p>
              <p><strong>School:</strong> ${edu.school || 'N/A'}</p>
              <p><strong>Location:</strong> ${edu.location || 'N/A'}</p>
              <p><strong>Dates:</strong> ${edu.startDate || 'N/A'} - ${edu.endDate || 'N/A'}</p>
              ${edu.additionalInfo
                            ? `<div><strong>Details:</strong><div style="margin-top:5px;">${edu.additionalInfo}</div></div>`
                            : ""
                        }
            </div>
            `;
                })
                .join("")
            : `<p>N/A</p>`;

    // Construct the full HTML string - removed the 'r' character that was causing the error
    return `
  <html>
    <head>
      <meta charset="UTF-8" />
      ${chosenStyle}
    </head>
    <body>
      <div class="container">
        <div class="left-column">
          <h3 class="section-title">Personal Info</h3>
          <p><strong>Name:</strong> ${name || 'N/A'}</p>
          <p><strong>Email:</strong> ${email || 'N/A'}</p>
          <p><strong>Phone:</strong> ${phone || 'N/A'}</p>
          <h3 class="section-title">Skills</h3>
          ${skillsHTML}
          <h3 class="section-title">Certifications</h3>
          <p>${certifications || "N/A"}</p>
          <h3 class="section-title">Awards</h3>
          <p>${awards || "N/A"}</p>
          <h3 class="section-title">Interests</h3>
          <p>${interests || "N/A"}</p>
        </div>
        <div class="right-column">
          <h3 class="section-title">Profile Summary</h3>
          <p>${summary || "N/A"}</p>
          <h3 class="section-title">Work Experience</h3>
          <p>${workExperience || "N/A"}</p>
          <h3 class="section-title">Education</h3>
          ${educationHTML}
          <h3 class="section-title">Projects</h3>
          <p>${projects || "N/A"}</p>
        </div>
      </div>
    </body>
  </html>
`;
}

module.exports = {
    exportPDF: exports.exportPDF,
    exportWord: exports.exportWord
};
