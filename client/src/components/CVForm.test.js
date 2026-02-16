import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import CVForm from "./CVForm";

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
    awards: []
};

const templateOptions = [
    { value: "A", label: "Template A (Clean)" },
    { value: "B", label: "Template B (Modern Sidebar)" }
];

const FormHarness = () => {
    const [cvData, setCvData] = useState(baseCvData);

    return (
        <CVForm
            cvData={cvData}
            setCvData={setCvData}
            template="A"
            setTemplate={() => {}}
            templateOptions={templateOptions}
            onExport={() => {}}
            isExporting={false}
            exportError={null}
            onSave={() => {}}
            onLoad={() => {}}
        />
    );
};

const getButtonByText = (container, textPattern) =>
    Array.from(container.querySelectorAll("button")).find((button) => textPattern.test(button.textContent));

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

    it("opens and closes accordion sections", () => {
        expect(container.querySelector("#cv-name")).not.toBeNull();

        const personalToggle = getButtonByText(container, /personal info/i);
        act(() => {
            Simulate.click(personalToggle);
        });

        expect(container.querySelector("#cv-name")).toBeNull();

        const skillsToggle = getButtonByText(container, /skills/i);
        act(() => {
            Simulate.click(skillsToggle);
        });

        expect(container.querySelector('input[placeholder="e.g. Python, React"]')).not.toBeNull();
        expect(container.querySelector("#cv-name")).toBeNull();
    });

    it("adds and removes skill chips using Enter key", () => {
        const skillsToggle = getButtonByText(container, /skills/i);
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

        const removeButton = container.querySelector('button[aria-label="Remove React"]');
        act(() => {
            Simulate.click(removeButton);
        });

        const removedChip = Array.from(container.querySelectorAll(".skill-chip span")).find(
            (node) => node.textContent === "React"
        );
        expect(removedChip).toBeUndefined();
    });
});
