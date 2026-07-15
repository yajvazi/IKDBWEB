import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ocsCommandCatalog, ocsCommandGroups, type OcsCommandCatalogItem } from "@/lib/ocs/catalog";
import { getCurrentAdmin } from "@/server/auth/admin-auth";

export const dynamic = "force-dynamic";

const ocsDocsBaseUrl = "https://raw.githubusercontent.com/yajvazi/ocs-api/main/doc";
const ocsDocsGithubBaseUrl = "https://github.com/yajvazi/ocs-api/blob/main/doc";

export async function GET(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ success: false, error: { message: "Admin session required." } }, { status: 401 });
  }

  const command = request.nextUrl.searchParams.get("command")?.trim();
  if (command) {
    const catalogItem = ocsCommandCatalog.find((item) => item.command === command);
    if (!catalogItem) {
      return NextResponse.json({ success: false, error: { message: "OCS command was not found." } }, { status: 404 });
    }

    const commandDoc = await loadCommandDoc(catalogItem);
    return NextResponse.json({
      success: true,
      data: commandDoc,
      meta: {
        requestId: randomUUID(),
        timestamp: new Date().toISOString(),
      },
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      groups: ocsCommandGroups,
      commands: ocsCommandCatalog,
      note: "Documented OCS command catalog only. Raw OCS command execution is not exposed.",
    },
    meta: {
      requestId: randomUUID(),
      timestamp: new Date().toISOString(),
    },
  });
}

async function loadCommandDoc(item: OcsCommandCatalogItem) {
  const versions = item.version === "v2" ? ["v2", "v1"] : ["v1", "v2"];

  for (const version of versions) {
    const markdown = await fetchOcsMarkdown(version);
    const section = findCommandSection(markdown, item.command);
    if (!section) continue;

    const examples = extractExamples(section.body);
    return {
      ...item,
      title: section.title,
      source: "github.com/yajvazi/ocs-api",
      sourceUrl: `${ocsDocsGithubBaseUrl}/${version}/API.md#${githubAnchor(section.title)}`,
      description: extractDescription(section.body) || item.description,
      examples,
      note: examples.length > 0
        ? "Examples are parsed from the upstream OCS public API documentation. InternetKudo credentials are still applied only server-side."
        : "No JSON request example was found in the upstream OCS public API documentation for this command.",
    };
  }

  return {
    ...item,
    title: item.command,
    source: "github.com/yajvazi/ocs-api",
    sourceUrl: "https://github.com/yajvazi/ocs-api",
    description: item.description,
    examples: [],
    note: "No matching command section was found in the upstream OCS public API documentation.",
  };
}

async function fetchOcsMarkdown(version: string) {
  const response = await fetch(`${ocsDocsBaseUrl}/${version}/API.md`, {
    next: { revalidate: 3600 },
  });
  if (!response.ok) throw new Error(`Unable to load OCS ${version} API documentation.`);
  return response.text();
}

function findCommandSection(markdown: string, command: string) {
  const headingPattern = new RegExp(`^##\\s+([^\\n]*\\b${escapeRegExp(command)}\\b[^\\n]*)$`, "m");
  const match = markdown.match(headingPattern);
  if (!match || match.index === undefined) return null;

  const sectionStart = match.index;
  const afterHeading = markdown.slice(sectionStart + match[0].length);
  const nextHeadingIndex = afterHeading.search(/^##\s+/m);
  const body = markdown.slice(sectionStart + match[0].length, nextHeadingIndex >= 0 ? sectionStart + match[0].length + nextHeadingIndex : markdown.length);
  return { title: match[1].trim(), body };
}

function extractDescription(section: string) {
  const match = section.match(/### Description\s*([\s\S]*?)(?=\n### |\n## |$)/i);
  if (!match) return "";
  return cleanupMarkdownText(match[1]).slice(0, 900);
}

function extractExamples(section: string) {
  const lines = section.split("\n");
  const examples: Array<{ label: string; request: string; answer: string | null }> = [];
  let currentLabel = "Default";

  for (let index = 0; index < lines.length; index += 1) {
    const heading = lines[index].match(/^(#{3,4})\s+(.+)$/);
    if (heading && !/^Request$/i.test(heading[2].trim()) && !/^Answer$/i.test(heading[2].trim()) && !["Description", "Inputs", "Outputs", "Remark(s)"].includes(heading[2].trim())) {
      currentLabel = heading[2].trim();
    }

    if (!/^#{3,4}\s+Request\s*$/i.test(lines[index])) continue;

    const request = extractNextCodeBlock(lines, index + 1);
    const answerHeadingIndex = findNextHeading(lines, index + 1, "Answer");
    const answer = answerHeadingIndex >= 0 ? extractNextCodeBlock(lines, answerHeadingIndex + 1) : null;

    if (request) {
      examples.push({
        label: currentLabel,
        request,
        answer,
      });
    }
  }

  return examples.slice(0, 12);
}

function findNextHeading(lines: string[], start: number, label: string) {
  for (let index = start; index < lines.length; index += 1) {
    if (new RegExp(`^#{3,4}\\s+${label}\\s*$`, "i").test(lines[index])) return index;
    if (/^##\s+/.test(lines[index])) return -1;
  }
  return -1;
}

function extractNextCodeBlock(lines: string[], start: number) {
  const fenceStart = lines.findIndex((line, index) => index >= start && /^```/.test(line));
  if (fenceStart < 0) return null;
  const fenceEnd = lines.findIndex((line, index) => index > fenceStart && /^```/.test(line));
  if (fenceEnd < 0) return null;
  return lines.slice(fenceStart + 1, fenceEnd).join("\n").trim();
}

function cleanupMarkdownText(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[`*_]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function githubAnchor(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
