import React, { useState } from "react";

const MobileSpeedDial = ({ onOpenPreview, onOpenAI, aiEnabled }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="mobile-speed-dial no-print">
            {isOpen ? (
                <div className="mobile-speed-options">
                    <button
                        type="button"
                        className="mobile-speed-option"
                        onClick={() => {
                            setIsOpen(false);
                            onOpenPreview && onOpenPreview();
                        }}
                    >
                        Preview
                    </button>
                    {aiEnabled ? (
                        <button
                            type="button"
                            className="mobile-speed-option"
                            onClick={() => {
                                setIsOpen(false);
                                onOpenAI && onOpenAI();
                            }}
                        >
                            AI Review
                        </button>
                    ) : null}
                </div>
            ) : null}
            <button
                type="button"
                className="preview-fab"
                aria-label={isOpen ? "Close quick actions" : "Open quick actions"}
                onClick={() => setIsOpen((current) => !current)}
            >
                {isOpen ? "Close" : "Actions"}
            </button>
        </div>
    );
};

export default MobileSpeedDial;
