const path = require("path");
const puppeteer = require("puppeteer");
const { Document, Packer, Paragraph, TextRun } = require("docx");

// PDF Export Logic
exports.exportPDF = async (req, res) => {
    try {
        // 1. Get CV data & template choice from client
        const { cvData, template } = req.body;

        // 2. Convert the data into HTML. 
        //    For a real app, you might load an HTML file (templateA.html/templateB.html),
        //    replace placeholders with user data, then use Puppeteer to create a PDF.

        const htmlContent = generateHTML(cvData, template);

        // 3. Launch Puppeteer to generate PDF
        const browser = await puppeteer.launch({
            headless: "new",
            timeout: 60000, // increases the timeout to 60 seconds
            args: ["--no-sandbox", "--disable-setuid-sandbox"]
        });

        const page = await browser.newPage();

        // Go to a blank page or about:blank
        await page.setContent(htmlContent, { waitUntil: "networkidle0" });

        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true
        });
        await browser.close();

        // 4. Send the PDF file as a response
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

// Word Export Logic
exports.exportWord = async (req, res) => {
    try {
        const { cvData } = req.body;

        // Create a docx file using docx library
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
                            children: [
                                new TextRun(`Email: ${cvData.email}`)
                            ]
                        }),
                        new Paragraph({
                            children: [
                                new TextRun(`Phone: ${cvData.phone}`)
                            ]
                        })
                        // ... Add more paragraphs or sections as needed
                    ]
                }
            ]
        });

        const buffer = await Packer.toBuffer(doc);

        res.set({
            "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "Content-Disposition": "attachment; filename=OnClickCV.docx"
        });
        return res.send(buffer);
    } catch (err) {
        console.error("Error generating Word doc:", err);
        return res.status(500).json({ error: "Failed to generate Word." });
    }
};

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

    const styleTemplateA = `
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .container { display: flex; }
        .left-column { width: 35%; padding-right: 15px; }
        .right-column { width: 65%; }
        .section-title { font-weight: bold; margin-top: 15px; border-bottom: 1px solid #ccc; padding-bottom: 3px; }
        p { margin: 5px 0; }
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
      </style>
    `;

    const chosenStyle = template === "B" ? styleTemplateB : styleTemplateA;

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
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Phone:</strong> ${phone}</p>
              
              <h3 class="section-title">Skills</h3>
              <p>${skills || "N/A"}</p>
              
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
              <p>${education || "N/A"}</p>
              
              <h3 class="section-title">Projects</h3>
              <p>${projects || "N/A"}</p>
            </div>
          </div>
        </body>
      </html>
    `;
}

