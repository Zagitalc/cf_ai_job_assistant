import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import PreviewModal from "./PreviewModal";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("PreviewModal", () => {
    let container;
    let root;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
    });

    it("renders filename picker and uses selected name on export", () => {
        const onExport = jest.fn();
        const onChangeName = jest.fn();

        act(() => {
            root.render(
                <PreviewModal
                    isOpen={true}
                    onClose={() => {}}
                    onExport={onExport}
                    isExporting={false}
                    exportingFormat=""
                    exportFileBaseName="JaneDoe_Resume_TemplateA_2026-02-17"
                    onExportFileBaseNameChange={onChangeName}
                    exportFileSuggestions={[
                        "JaneDoe_Resume_TemplateA_2026-02-17",
                        "JaneDoe_CV_TemplateA_2026-02-17",
                        "CV_TemplateA_2026-02-17"
                    ]}
                >
                    <div>Preview body</div>
                </PreviewModal>
            );
        });

        expect(container.querySelector("#preview-export-filename")).not.toBeNull();

        const suggestion = Array.from(container.querySelectorAll(".filename-suggestion-chip")).find((chip) =>
            chip.textContent.includes("CV_TemplateA")
        );
        act(() => {
            Simulate.click(suggestion);
        });
        expect(onChangeName).toHaveBeenCalled();

        const pdfBtn = Array.from(container.querySelectorAll("button")).find((btn) => btn.textContent === "PDF");
        act(() => {
            Simulate.click(pdfBtn);
        });
        expect(onExport).toHaveBeenCalledWith("pdf", "JaneDoe_Resume_TemplateA_2026-02-17");
    });
});

