import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { getOrderedSectionsForTemplate } from "../utils/sectionLayout";
import "./../templates/templateA.css";
import "./../templates/TemplateB.css";

export const A4_PAGE_WIDTH_PX = 794;
export const A4_PAGE_HEIGHT_PX = 1123;
export const A4_PAGE_PADDING_PX = 24;
export const PAGE_CONTENT_HEIGHT_PX = A4_PAGE_HEIGHT_PX - A4_PAGE_PADDING_PX * 2;

const isRichTextEmpty = (value) => !value || value === "<p><br></p>" || value.trim() === "";

const escapeHtml = (value = "") =>
    String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");

const decodeHtmlEntities = (value = "") =>
    String(value)
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'");

const stripHtmlToText = (html = "") =>
    decodeHtmlEntities(String(html).replace(/<[^>]*>/g, " "))
        .replace(/\s+/g, " ")
        .trim();

const countWords = (text = "") =>
    String(text)
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;

export const normalizeRichHtmlForPreview = (html = "") =>
    String(html)
        .replace(/(\s*<p><br><\/p>\s*){2,}/gi, "<p><br></p>")
        .replace(/(&nbsp;){2,}/gi, " ")
        .replace(/(<br\s*\/?>(\s|&nbsp;)*)+$/gi, "")
        .trim();

export const formatDateShort = (dateString) => {
    if (!dateString) {
        return "";
    }

    const parsedDate = new Date(dateString);
    if (Number.isNaN(parsedDate.getTime())) {
        return String(dateString);
    }

    return parsedDate.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric"
    });
};

export const formatDateRange = (startDate, endDate) => {
    const formattedStart = formatDateShort(startDate);
    const formattedEnd = formatDateShort(endDate);

    if (!formattedStart && !formattedEnd) {
        return "N/A";
    }

    if (formattedStart && formattedEnd) {
        return `${formattedStart} - ${formattedEnd}`;
    }

    if (formattedStart && !formattedEnd) {
        return `${formattedStart} - Present`;
    }

    return formattedEnd || "N/A";
};

export const splitRichHtmlSegments = (html = "") => {
    const normalized = normalizeRichHtmlForPreview(html);
    if (!normalized || isRichTextEmpty(normalized)) {
        return [];
    }

    if (typeof window === "undefined" || typeof window.DOMParser === "undefined") {
        return [normalized];
    }

    const parser = new window.DOMParser();
    const doc = parser.parseFromString(`<div>${normalized}</div>`, "text/html");
    const root = doc.body.firstChild;

    if (!root) {
        return [normalized];
    }

    const segments = [];
    root.childNodes.forEach((node) => {
        if (node.nodeType === window.Node.TEXT_NODE) {
            const text = node.textContent ? node.textContent.trim() : "";
            if (text) {
                segments.push(`<p>${escapeHtml(text)}</p>`);
            }
            return;
        }

        if (node.nodeType !== window.Node.ELEMENT_NODE) {
            return;
        }

        const tag = node.tagName.toLowerCase();

        if (tag === "ul" || tag === "ol") {
            const liNodes = Array.from(node.querySelectorAll("li"));
            liNodes.forEach((liNode) => {
                segments.push(`<${tag}><li>${liNode.innerHTML}</li></${tag}>`);
            });
            return;
        }

        if (tag === "p" || tag === "div") {
            segments.push(node.outerHTML);
            return;
        }

        if (tag === "br") {
            segments.push("<p><br></p>");
            return;
        }

        const fallbackText = node.textContent ? node.textContent.trim() : "";
        if (fallbackText) {
            segments.push(`<p>${escapeHtml(fallbackText)}</p>`);
        }
    });

    return segments.length > 0 ? segments : [normalized];
};

const buildSectionBlocks = (cvData, nextId) => {
    const {
        name,
        email,
        phone,
        linkedin,
        summary,
        workExperience,
        volunteerExperience,
        education,
        skills,
        projects,
        certifications,
        awards
    } = cvData;

    const pushRichSection = (sectionKey, title, entries) => {
        const blocks = [
            {
                id: nextId(`${sectionKey}-heading`),
                sectionKey,
                kind: "heading",
                title,
                keepWithNext: true
            }
        ];

        const validEntries = (entries || [])
            .map((entry) => normalizeRichHtmlForPreview(entry))
            .filter((entry) => !isRichTextEmpty(entry));

        if (validEntries.length === 0) {
            blocks.push({
                id: nextId(`${sectionKey}-empty`),
                sectionKey,
                kind: "empty",
                text: "N/A"
            });
            return blocks;
        }

        validEntries.forEach((entry, entryIndex) => {
            const segments = splitRichHtmlSegments(entry);
            if (segments.length === 0) {
                blocks.push({
                    id: nextId(`${sectionKey}-${entryIndex}-empty`),
                    sectionKey,
                    kind: "empty",
                    text: "N/A"
                });
                return;
            }

            segments.forEach((segment, segmentIndex) => {
                blocks.push({
                    id: nextId(`${sectionKey}-${entryIndex}-${segmentIndex}`),
                    sectionKey,
                    kind: "html",
                    html: segment
                });
            });
        });

        return blocks;
    };

    const sections = {};

    sections.personal = [
        {
            id: nextId("personal-heading"),
            sectionKey: "personal",
            kind: "heading",
            title: "Personal Info",
            keepWithNext: true
        },
        {
            id: nextId("personal-content"),
            sectionKey: "personal",
            kind: "keyValueList",
            rows: [
                { label: "Name", value: name || "N/A" },
                { label: "Email", value: email || "N/A" },
                { label: "Phone", value: phone || "N/A" },
                { label: "LinkedIn", value: linkedin || "N/A" }
            ]
        }
    ];

    const validSkills = (skills || []).filter((skill) => String(skill || "").trim());
    sections.skills = [
        {
            id: nextId("skills-heading"),
            sectionKey: "skills",
            kind: "heading",
            title: "Skills",
            keepWithNext: true
        },
        ...(validSkills.length > 0
            ? [
                  {
                      id: nextId("skills-content"),
                      sectionKey: "skills",
                      kind: "list",
                      items: validSkills
                  }
              ]
            : [
                  {
                      id: nextId("skills-empty"),
                      sectionKey: "skills",
                      kind: "empty",
                      text: "N/A"
                  }
              ])
    ];

    const summaryLines = String(summary || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    sections.summary = [
        {
            id: nextId("summary-heading"),
            sectionKey: "summary",
            kind: "heading",
            title: "Profile Summary",
            keepWithNext: true
        },
        ...(summaryLines.length === 0
            ? [
                  {
                      id: nextId("summary-empty"),
                      sectionKey: "summary",
                      kind: "empty",
                      text: "N/A"
                  }
              ]
            : summaryLines.map((line, index) => ({
                  id: nextId(`summary-content-${index}`),
                  sectionKey: "summary",
                  kind: "text",
                  text: line
              })))
    ];

    sections.work = pushRichSection("work", "Work Experience", workExperience);
    sections.volunteer = pushRichSection("volunteer", "Volunteer Experience", volunteerExperience);

    sections.education = [
        {
            id: nextId("education-heading"),
            sectionKey: "education",
            kind: "heading",
            title: "Education",
            keepWithNext: true
        },
        ...((education || []).length > 0
            ? (education || []).map((edu) => ({
                  id: nextId("education-entry"),
                  sectionKey: "education",
                  kind: "education",
                  education: {
                      school: edu.school || "N/A",
                      degree: edu.degree || "N/A",
                      location: edu.location || "N/A",
                      dateRange: formatDateRange(edu.startDate, edu.endDate),
                      additionalInfo: normalizeRichHtmlForPreview(edu.additionalInfo || "")
                  }
              }))
            : [
                  {
                      id: nextId("education-empty"),
                      sectionKey: "education",
                      kind: "empty",
                      text: "N/A"
                  }
              ])
    ];

    sections.projects = pushRichSection("projects", "Projects", projects);
    sections.certifications = pushRichSection("certifications", "Certifications", certifications);
    sections.awards = pushRichSection("awards", "Awards", awards);

    return sections;
};

export const buildPreviewColumns = (cvData, sectionLayout, template) => {
    let blockId = 0;
    const nextId = (prefix) => `${prefix}-${blockId++}`;
    const sectionBlocks = buildSectionBlocks(cvData, nextId);
    const ordered = getOrderedSectionsForTemplate(sectionLayout, template, cvData);

    const leftBlocks = [];
    const rightBlocks = [];

    ordered.left.forEach((sectionId) => {
        const blocks = sectionBlocks[sectionId] || [];
        leftBlocks.push(...blocks);
    });

    ordered.right.forEach((sectionId) => {
        const blocks = sectionBlocks[sectionId] || [];
        rightBlocks.push(...blocks);
    });

    return { leftBlocks, rightBlocks };
};

export const estimateBlockHeight = (block) => {
    if (!block) {
        return 24;
    }

    if (block.kind === "heading") {
        return 42;
    }

    if (block.kind === "keyValueList") {
        return 18 + (block.rows?.length || 1) * 26;
    }

    if (block.kind === "list") {
        return 18 + (block.items?.length || 1) * 22;
    }

    if (block.kind === "text") {
        return 24 + Math.max(1, countWords(block.text || "")) * 4;
    }

    if (block.kind === "html") {
        const text = stripHtmlToText(block.html || "");
        const words = Math.max(1, countWords(text));
        const listItems = (block.html || "").match(/<li/gi)?.length || 0;
        return 24 + words * 4 + listItems * 16;
    }

    if (block.kind === "education") {
        const edu = block.education || {};
        const words = countWords(
            `${edu.school || ""} ${edu.degree || ""} ${edu.location || ""} ${edu.dateRange || ""} ${stripHtmlToText(edu.additionalInfo || "")}`
        );
        return 90 + Math.max(1, words) * 3;
    }

    return 28;
};

export const paginateColumnBlocks = (blocks, heightMap, pageHeightLimit) => {
    if (!blocks || blocks.length === 0) {
        return [[]];
    }

    const pages = [];
    let currentPage = [];
    let currentHeight = 0;
    let index = 0;

    const getHeight = (block) => heightMap[block.id] || estimateBlockHeight(block);

    while (index < blocks.length) {
        const block = blocks[index];
        const blockHeight = getHeight(block);

        if (block.keepWithNext && index + 1 < blocks.length) {
            const nextBlock = blocks[index + 1];
            const pairHeight = blockHeight + getHeight(nextBlock);

            if (currentHeight + pairHeight <= pageHeightLimit) {
                currentPage.push(block);
                currentHeight += blockHeight;
                index += 1;
                continue;
            }

            if (currentPage.length > 0) {
                pages.push(currentPage);
                currentPage = [];
                currentHeight = 0;
                continue;
            }

            currentPage.push(block);
            currentPage.push(nextBlock);
            currentHeight += pairHeight;
            index += 2;
            continue;
        }

        if (currentHeight + blockHeight > pageHeightLimit && currentPage.length > 0) {
            pages.push(currentPage);
            currentPage = [];
            currentHeight = 0;
            continue;
        }

        currentPage.push(block);
        currentHeight += blockHeight;
        index += 1;
    }

    if (currentPage.length > 0) {
        pages.push(currentPage);
    }

    return pages.length > 0 ? pages : [[]];
};

const renderBlock = (block) => {
    if (block.kind === "heading") {
        return <h3>{block.title}</h3>;
    }

    if (block.kind === "keyValueList") {
        return (
            <div className="preview-personal-block">
                {(block.rows || []).map((row) => (
                    <div key={`${block.id}-${row.label}`}>
                        <span className="preview-label">{row.label}:</span> {row.value || "N/A"}
                    </div>
                ))}
            </div>
        );
    }

    if (block.kind === "list") {
        return (
            <ul className="preview-list">
                {(block.items || []).map((item, idx) => (
                    <li key={`${block.id}-${idx}`}>{item}</li>
                ))}
            </ul>
        );
    }

    if (block.kind === "text") {
        return <div className="preview-text-block">{block.text || "N/A"}</div>;
    }

    if (block.kind === "html") {
        return <div className="preview-rich-entry" dangerouslySetInnerHTML={{ __html: block.html }} />;
    }

    if (block.kind === "education") {
        const edu = block.education || {};
        return (
            <div className="preview-education-entry">
                <div className="preview-education-school">{edu.school || "N/A"}</div>
                <div>{edu.degree || "N/A"}</div>
                <div>{edu.location || "N/A"}</div>
                <div className="preview-education-dates">{edu.dateRange || "N/A"}</div>
                {edu.additionalInfo && !isRichTextEmpty(edu.additionalInfo) ? (
                    <div className="preview-rich-entry" dangerouslySetInnerHTML={{ __html: edu.additionalInfo }} />
                ) : null}
            </div>
        );
    }

    return <div className="preview-empty">{block.text || "N/A"}</div>;
};

const renderBlockList = (blocks) =>
    (blocks || []).map((block) => (
        <div
            key={block.id}
            data-block-id={block.id}
            data-section-key={block.sectionKey}
            className={`preview-block-wrapper ${block.kind === "heading" ? "section-block" : "entry-block"}`}
        >
            {renderBlock(block)}
        </div>
    ));

const CVPreview = ({ cvData, sectionLayout, template, onLayoutMetricsChange }) => {
    const safeTemplate = template === "B" ? "B" : "A";
    const measurementRef = useRef(null);
    const metricsSignatureRef = useRef("");

    const columns = useMemo(
        () => buildPreviewColumns(cvData, sectionLayout, safeTemplate),
        [cvData, sectionLayout, safeTemplate]
    );
    const [pagedColumns, setPagedColumns] = useState([
        {
            left: columns.leftBlocks,
            right: columns.rightBlocks
        }
    ]);

    useLayoutEffect(() => {
        const allBlocks = [...columns.leftBlocks, ...columns.rightBlocks];
        const blockLookup = new Map(allBlocks.map((block) => [block.id, block]));

        const heightMap = {};
        allBlocks.forEach((block) => {
            heightMap[block.id] = estimateBlockHeight(block);
        });

        if (measurementRef.current) {
            const measuredBlocks = measurementRef.current.querySelectorAll("[data-block-id]");
            measuredBlocks.forEach((blockElement) => {
                const blockId = blockElement.getAttribute("data-block-id");
                const measuredHeight = blockElement.offsetHeight;
                if (!blockId) {
                    return;
                }

                if (measuredHeight > 0) {
                    heightMap[blockId] = measuredHeight;
                } else {
                    heightMap[blockId] = estimateBlockHeight(blockLookup.get(blockId));
                }
            });
        }

        const leftPages = paginateColumnBlocks(columns.leftBlocks, heightMap, PAGE_CONTENT_HEIGHT_PX);
        const rightPages = paginateColumnBlocks(columns.rightBlocks, heightMap, PAGE_CONTENT_HEIGHT_PX);
        const totalPages = Math.max(leftPages.length, rightPages.length, 1);

        const nextPagedColumns = Array.from({ length: totalPages }, (_, pageIndex) => ({
            left: leftPages[pageIndex] || [],
            right: rightPages[pageIndex] || []
        }));

        setPagedColumns(nextPagedColumns);

        const sectionHeights = allBlocks.reduce((acc, block) => {
            const blockHeight = heightMap[block.id] || estimateBlockHeight(block);
            acc[block.sectionKey] = (acc[block.sectionKey] || 0) + blockHeight;
            return acc;
        }, {});

        const nextMetrics = {
            totalPages,
            sectionHeights,
            pageContentHeight: PAGE_CONTENT_HEIGHT_PX
        };
        const signature = JSON.stringify(nextMetrics);

        if (onLayoutMetricsChange && signature !== metricsSignatureRef.current) {
            metricsSignatureRef.current = signature;
            onLayoutMetricsChange(nextMetrics);
        }
    }, [columns, safeTemplate, onLayoutMetricsChange]);

    return (
        <div className="preview-root">
            <div className="preview-pages">
                {pagedColumns.map((page, pageIndex) => (
                    <div className="preview-page-shell" key={`preview-page-${pageIndex}`}>
                        <div className="page-break-label">Page {pageIndex + 1}</div>
                        <div className={`preview-container template-${safeTemplate} preview-page cv-preview-paper`}>
                            <div className="left-column">{renderBlockList(page.left)}</div>
                            <div className="right-column">{renderBlockList(page.right)}</div>
                        </div>
                        {pageIndex < pagedColumns.length - 1 ? (
                            <div className="page-break-guide">
                                <span>Page break</span>
                            </div>
                        ) : null}
                    </div>
                ))}
            </div>

            <div className="preview-measure-layer" aria-hidden="true">
                <div ref={measurementRef} className={`preview-container template-${safeTemplate} preview-measure`}>
                    <div className="left-column">{renderBlockList(columns.leftBlocks)}</div>
                    <div className="right-column">{renderBlockList(columns.rightBlocks)}</div>
                </div>
            </div>
        </div>
    );
};

export default CVPreview;
