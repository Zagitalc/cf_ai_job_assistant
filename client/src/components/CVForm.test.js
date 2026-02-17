import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import CVForm from "./CVForm";
import { getDefaultSectionLayout } from "../utils/sectionLayout";

jest.mock("react-quill", () => {
    return function MockReactQuill({ value, onChange, placeholder }) {
        return (
            <textarea
                data-testid="mock-quill"
                value={value}
                placeholder={placeholder}
                onChange={(event) => onChange(event.target.value)}
            />
        );
    };
});

const baseCvData = {
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
    additionalInfo: "",
    sectionLayout: getDefaultSectionLayout()
};

const templateOptions = [
    { value: "A", label: "Template A (Clean)" },
    { value: "B", label: "Template B (Modern Sidebar)" }
];

const FormHarness = ({ layoutMetrics, onExport = () => {} }) => {
    const [cvData, setCvData] = useState(baseCvData);
    const [exportName, setExportName] = useState("JaneDoe_Resume_TemplateA_2026-02-17");

    return (
        <CVForm
            cvData={cvData}
            setCvData={setCvData}
            sectionLayout={cvData.sectionLayout}
            setSectionLayout={(nextLayout) => setCvData((prev) => ({ ...prev, sectionLayout: nextLayout }))}
            template="A"
            setTemplate={() => {}}
            templateOptions={templateOptions}
            onExport={onExport}
            isExporting={false}
            exportingFormat=""
            exportError={null}
            exportFileBaseName={exportName}
            onExportFileBaseNameChange={setExportName}
            exportFileSuggestions={[
                "JaneDoe_Resume_TemplateA_2026-02-17",
                "JaneDoe_CV_TemplateA_2026-02-17",
                "CV_TemplateA_2026-02-17"
            ]}
            onSave={() => {}}
            onLoad={() => {}}
            layoutMetrics={
                layoutMetrics || {
                    totalPages: 1,
                    sectionHeights: {},
                    pageContentHeight: 1075
                }
            }
            isMobile={false}
        />
    );
};

const getCardBySectionId = (container, sectionId) =>
    container.querySelector(`.card-stack-item[data-section-id="${sectionId}"]`);

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("CVForm", () => {
    let container;
    let root;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.appendChild(container);
        root = createRoot(container);

        act(() => {
            root.render(<FormHarness />);
        });
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
    });

    it("opens and closes simple card sections", () => {
        expect(container.querySelector("#cv-name")).not.toBeNull();

        const personalCard = getCardBySectionId(container, "personal");
        const personalToggle = personalCard.querySelector(".card-action-btn");
        act(() => {
            Simulate.click(personalToggle);
        });

        expect(container.querySelector("#cv-name")).toBeNull();

        const skillsCard = getCardBySectionId(container, "skills");
        const skillsToggle = skillsCard.querySelector(".card-action-btn");
        act(() => {
            Simulate.click(skillsToggle);
        });

        expect(container.querySelector('input[placeholder="e.g. Python, React"]')).not.toBeNull();
    });

    it("adds and removes skill chips using Enter key", () => {
        const skillsCard = getCardBySectionId(container, "skills");
        const skillsToggle = skillsCard.querySelector(".card-action-btn");
        act(() => {
            Simulate.click(skillsToggle);
        });

        const skillInput = container.querySelector('input[placeholder="e.g. Python, React"]');
        expect(skillInput).not.toBeNull();

        act(() => {
            Simulate.change(skillInput, { target: { value: "React" } });
        });

        act(() => {
            Simulate.keyDown(skillInput, { key: "Enter", code: "Enter" });
        });

        const chip = Array.from(container.querySelectorAll(".skill-chip span")).find(
            (node) => node.textContent === "React"
        );
        expect(chip).toBeTruthy();

        const removeButton = Array.from(container.querySelectorAll(".chip-remove-btn"))[0];
        act(() => {
            Simulate.click(removeButton);
        });

        const removedChip = Array.from(container.querySelectorAll(".skill-chip span")).find(
            (node) => node.textContent === "React"
        );
        expect(removedChip).toBeUndefined();
    });

    it("shows live summary word counter", () => {
        const summaryCard = getCardBySectionId(container, "summary");
        const summaryToggle = summaryCard.querySelector(".card-action-btn");
        act(() => {
            Simulate.click(summaryToggle);
        });

        const summaryInput = container.querySelector("#cv-summary");
        expect(summaryInput).not.toBeNull();

        act(() => {
            Simulate.change(summaryInput, { target: { name: "summary", value: "One two three four" } });
        });

        expect(container.textContent).toContain("Words: 4");
    });

    it("shows section overflow warning from layout metrics", () => {
        act(() => {
            root.unmount();
            root = createRoot(container);
            root.render(
                <FormHarness
                    layoutMetrics={{
                        totalPages: 2,
                        sectionHeights: { summary: 900 },
                        pageContentHeight: 1000
                    }}
                />
            );
        });

        const summaryCard = getCardBySectionId(container, "summary");
        const summaryToggle = summaryCard.querySelector(".card-action-btn");
        act(() => {
            Simulate.click(summaryToggle);
        });

        expect(container.textContent).toContain(
            "This section is getting long; consider condensing for a 1-page CV."
        );
    });

    it("opens complex section in dedicated editor overlay", () => {
        const workCard = getCardBySectionId(container, "work");
        const editButton = workCard.querySelector(".card-action-btn");

        act(() => {
            Simulate.click(editButton);
        });

        expect(container.querySelector('[aria-label="Work editor"]')).not.toBeNull();

        const doneButton = Array.from(container.querySelectorAll("button")).find((btn) => btn.textContent === "Done");
        act(() => {
            Simulate.click(doneButton);
        });

        expect(container.querySelector('[aria-label="Work editor"]')).toBeNull();
    });

    it("keeps utility cards non-draggable and shows additional info card", () => {
        const templateCard = getCardBySectionId(container, "template-export");
        const saveLoadCard = getCardBySectionId(container, "save-load");
        const additionalInfoCard = getCardBySectionId(container, "additional-info");

        expect(templateCard.getAttribute("draggable")).toBe("false");
        expect(saveLoadCard.getAttribute("draggable")).toBe("false");
        expect(additionalInfoCard).not.toBeNull();
    });

    it("renders export filename picker in template-export section", () => {
        const templateCard = getCardBySectionId(container, "template-export");
        const toggle = templateCard.querySelector(".card-action-btn");
        act(() => {
            Simulate.click(toggle);
        });

        expect(container.querySelector("#export-filename")).not.toBeNull();
        expect(container.querySelectorAll(".filename-suggestion-chip").length).toBeGreaterThan(0);
    });

    it("passes filename to export action", () => {
        const onExport = jest.fn();

        act(() => {
            root.unmount();
            root = createRoot(container);
            root.render(<FormHarness onExport={onExport} />);
        });

        const templateCard = getCardBySectionId(container, "template-export");
        act(() => {
            Simulate.click(templateCard.querySelector(".card-action-btn"));
        });

        const filenameInput = container.querySelector("#export-filename");
        act(() => {
            Simulate.change(filenameInput, { target: { value: "Custom CV Name" } });
        });

        const pdfBtn = Array.from(container.querySelectorAll("button")).find((btn) => btn.textContent === "Export PDF");
        act(() => {
            Simulate.click(pdfBtn);
        });

        expect(onExport).toHaveBeenCalledWith("pdf", "Custom CV Name");
    });
});
