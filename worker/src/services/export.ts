// @ts-nocheck
import puppeteer from "@cloudflare/puppeteer";
import { Packer } from "docx";
import exportControllerModule from "../../../server/controllers/exportController.js";

const {
  buildWordDocument,
  generateHTML,
} = exportControllerModule as any;

export const generateWordBuffer = async (cvData: unknown, template: string) => {
  const document = buildWordDocument(cvData || {}, template);
  return Packer.toBuffer(document);
};

export const generatePdfBuffer = async (
  env: { BROWSER: Fetcher },
  cvData: unknown,
  template: string
) => {
  if (!env?.BROWSER) {
    throw new Error("Browser Rendering is not configured for this environment.");
  }

  const htmlContent = generateHTML(cvData || {}, template);
  const browser = await puppeteer.launch(env.BROWSER);

  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    return await page.pdf({
      format: "A4",
      printBackground: true,
    });
  } finally {
    await browser.close();
  }
};
