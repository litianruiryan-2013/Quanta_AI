import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// ember-600 in dark theme: rgb(240, 116, 31) from index.css
const EMBER = [240, 116, 31];
const PAGE_W = 595.28;  // A4 points
const PAGE_H = 841.89;
const MARGIN = 48;
const CONTENT_W = PAGE_W - MARGIN * 2;

function stripInline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/~~(.+?)~~/g, "$1");
}

function parseMarkdownSegments(md) {
  const lines = md.split("\n");
  const segs = [];
  let i = 0;

  while (i < lines.length) {
    if (lines[i].trim().startsWith("|")) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i].trim());
        i++;
      }
      const isSep = (l) => /^[\|\s\-:]+$/.test(l);
      const parseRow = (l) =>
        l.split("|").slice(1, -1).map((c) => stripInline(c.trim()));

      if (tableLines.length >= 3) {
        const headers = parseRow(tableLines[0]);
        const dataLines = tableLines.slice(1).filter((l) => !isSep(l));
        const rows = dataLines
          .map(parseRow)
          .filter((r) => r.some((c) => c));

        if (headers.length && rows.length) {
          segs.push({ type: "table", headers, rows });
          continue;
        }
      }
      segs.push({ type: "text", lines: tableLines });
    } else {
      const textLines = [];
      while (i < lines.length && !lines[i].trim().startsWith("|")) {
        textLines.push(lines[i]);
        i++;
      }
      segs.push({ type: "text", lines: textLines });
    }
  }
  return segs;
}

export function downloadPdf(content, modeLabel, title) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  let y = 0;

  const checkY = (needed = 14) => {
    if (y + needed > PAGE_H - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  };

  // ── Header bar ──────────────────────────────────────────────────
  doc.setFillColor(...EMBER);
  doc.rect(0, 0, PAGE_W, 52, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text("QUANTA", MARGIN, 34);

  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(`${modeLabel}  ·  ${dateStr}`, PAGE_W - MARGIN, 34, {
    align: "right",
  });

  // ── Title ────────────────────────────────────────────────────────
  y = 74;
  if (title) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(20, 20, 20);
    const titleLines = doc.splitTextToSize(stripInline(title), CONTENT_W);
    doc.text(titleLines, MARGIN, y);
    y += titleLines.length * 16 + 10;

    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 14;
  }

  // ── Content ──────────────────────────────────────────────────────
  for (const seg of parseMarkdownSegments(content)) {
    if (seg.type === "table") {
      autoTable(doc, {
        startY: y,
        head: [seg.headers],
        body: seg.rows,
        margin: { left: MARGIN, right: MARGIN },
        styles: {
          fontSize: 8,
          cellPadding: 4,
          textColor: [30, 30, 30],
          lineColor: [210, 210, 210],
          lineWidth: 0.4,
        },
        headStyles: {
          fillColor: EMBER,
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        alternateRowStyles: { fillColor: [248, 248, 248] },
      });
      y = (doc.lastAutoTable?.finalY ?? y) + 16;
    } else {
      for (const line of seg.lines) {
        const trimmed = line.trim();

        if (!trimmed) {
          y += 7;
          continue;
        }

        // Horizontal rule
        if (/^[-*]{3,}$/.test(trimmed)) {
          checkY(10);
          doc.setDrawColor(210, 210, 210);
          doc.setLineWidth(0.4);
          doc.line(MARGIN, y, PAGE_W - MARGIN, y);
          y += 10;
          continue;
        }

        // H1 / H2
        const h1 = trimmed.match(/^#\s+(.+)/);
        const h2 = trimmed.match(/^##\s+(.+)/);
        if (h1 || h2) {
          const text = stripInline((h1 ?? h2)[1]);
          const size = h1 ? 13 : 11;
          checkY(size + 14);
          y += 6;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(size);
          doc.setTextColor(20, 20, 20);
          doc.text(text, MARGIN, y);
          y += size + 6;
          continue;
        }

        // H3+
        const h3 = trimmed.match(/^#{3,}\s+(.+)/);
        if (h3) {
          checkY(20);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9.5);
          doc.setTextColor(40, 40, 40);
          doc.text(stripInline(h3[1]), MARGIN, y);
          y += 14;
          continue;
        }

        // Bullet / ordered list
        const bullet = trimmed.match(/^[-*]\s+(.+)/);
        const ordered = trimmed.match(/^(\d+)\.\s+(.+)/);
        if (bullet || ordered) {
          const text = stripInline(bullet ? bullet[1] : ordered[2]);
          const prefix = bullet ? "•  " : `${ordered[1]}.  `;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(40, 40, 40);
          const wrapped = doc.splitTextToSize(
            prefix + text,
            CONTENT_W - 12
          );
          for (const wl of wrapped) {
            checkY(13);
            doc.text(wl, MARGIN + 10, y);
            y += 13;
          }
          continue;
        }

        // Paragraph
        const text = stripInline(trimmed);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(40, 40, 40);
        const wrapped = doc.splitTextToSize(text, CONTENT_W);
        for (const wl of wrapped) {
          checkY(13);
          doc.text(wl, MARGIN, y);
          y += 13;
        }
      }
    }
  }

  // ── Per-page footer ──────────────────────────────────────────────
  const total = doc.internal.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(160, 160, 160);
    doc.text(
      `QUANTA  ·  ${modeLabel}  ·  Page ${p} of ${total}`,
      PAGE_W / 2,
      PAGE_H - 22,
      { align: "center" }
    );
  }

  const slug = modeLabel.replace(/\s+/g, "-");
  const date = new Date().toISOString().split("T")[0];
  doc.save(`QUANTA-${slug}-${date}.pdf`);
}
