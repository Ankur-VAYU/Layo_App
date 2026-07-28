"use client";
// NOC PDF generator with QR code – runs entirely in the browser

export interface NOCData {
  nocRef: string;
  empName: string;
  empId: string;
  designation: string;
  department: string;
  flat: string;
  colony: string;
  type: string;
  since: string;
  vacateDate: string;
  reason: string;
  newPosting: string;
  issuedBy: string;
  issuedDate: string;
  dues: string;
}

export async function generateNOCPdf(data: NOCData) {
  // Dynamic imports – only in browser
  const { jsPDF } = await import("jspdf");
  const QRCode = await import("qrcode");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210, H = 297;

  // ── Helpers ──────────────────────────────────────────────────────────
  const center = (text: string, y: number, size = 11, style: "normal"|"bold" = "normal") => {
    doc.setFontSize(size);
    doc.setFont("helvetica", style);
    doc.text(text, W / 2, y, { align: "center" });
  };

  const line = (x1: number, y: number, x2: number) =>
    doc.line(x1, y, x2, y);

  const field = (label: string, value: string, x: number, y: number, labelW = 55) => {
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80, 80, 80);
    doc.text(label + ":", x, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(20, 20, 20);
    doc.text(value, x + labelW, y);
  };

  // ── Header bar ───────────────────────────────────────────────────────
  doc.setFillColor(13, 43, 107);          // dark blue
  doc.rect(0, 0, W, 36, "F");

  // Govt emblem placeholder
  doc.setFillColor(255, 255, 255);
  doc.circle(20, 18, 9, "F");
  doc.setTextColor(13, 43, 107);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("BIHAR", 20, 17, { align: "center" });
  doc.text("SARKAR", 20, 21, { align: "center" });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("GOVERNMENT OF BIHAR", W / 2, 13, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Bihar Building Construction Department – Housing Division", W / 2, 20, { align: "center" });
  doc.setFontSize(8.5);
  doc.text("e-Niwas Portal  |  Patna, Bihar – 800001", W / 2, 27, { align: "center" });

  // ── Title strip ───────────────────────────────────────────────────────
  doc.setFillColor(232, 119, 34);         // saffron
  doc.rect(0, 36, W, 14, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("NO OBJECTION CERTIFICATE (NOC)", W / 2, 46, { align: "center" });

  // ── Ref & date row ────────────────────────────────────────────────────
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Ref No: ${data.nocRef}`, 14, 58);
  doc.text(`Date of Issue: ${data.issuedDate}`, W - 14, 58, { align: "right" });

  line(14, 61, W - 14);

  // ── This is to certify... ────────────────────────────────────────────
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 30, 30);
  const certText = `This is to certify that the Bihar Building Construction Department has no objection to the vacation of the below-mentioned Government residential accommodation by the employee, subject to clearance of all dues.`;
  const lines = doc.splitTextToSize(certText, W - 28);
  doc.text(lines, 14, 68);

  // ── Employee Details box ──────────────────────────────────────────────
  let y = 84;
  doc.setFillColor(240, 244, 255);
  doc.roundedRect(12, y - 5, W - 24, 46, 3, 3, "F");
  doc.setDrawColor(180, 190, 220);
  doc.roundedRect(12, y - 5, W - 24, 46, 3, 3, "S");

  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(13, 43, 107);
  doc.text("EMPLOYEE DETAILS", 16, y + 1);
  line(16, y + 3, W - 16);
  y += 8;

  const col2x = 115;
  field("Employee Name",  data.empName,      16, y);
  field("Employee ID",    data.empId,         col2x, y, 38);
  y += 7;
  field("Designation",    data.designation,   16, y);
  field("Department",     data.department,    col2x, y, 38);
  y += 7;
  field("Reason for NOC", data.reason,        16, y);
  field("New Posting",    data.newPosting || "N/A", col2x, y, 38);
  y += 7;
  field("Outstanding Dues", data.dues,        16, y);

  // ── Property Details box ──────────────────────────────────────────────
  y += 12;
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(12, y - 5, W - 24, 38, 3, 3, "F");
  doc.setDrawColor(180, 220, 195);
  doc.roundedRect(12, y - 5, W - 24, 38, 3, 3, "S");

  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(22, 101, 52);
  doc.text("PROPERTY DETAILS", 16, y + 1);
  line(16, y + 3, W - 16);
  y += 8;

  field("Property Type",   data.type,       16, y);
  field("Flat / Unit",     data.flat,        col2x, y, 38);
  y += 7;
  field("Colony / Address", data.colony,    16, y);
  y += 7;
  field("Date of Allotment", data.since,    16, y);
  field("Vacation Date",  data.vacateDate,  col2x, y, 38);

  // ── Terms ─────────────────────────────────────────────────────────────
  y += 16;
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Terms & Conditions:", 14, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const terms = [
    "1. This NOC is valid only for the employee named above and the property mentioned herein.",
    "2. All pending dues must be cleared within 30 days of issuance of this certificate.",
    "3. Keys must be returned to the Estate Office before the vacation date.",
    "4. This certificate does not affect any disciplinary/legal proceedings, if any.",
    "5. Property must be left in the same condition as allotted; damage charges may apply.",
  ];
  terms.forEach(t => { doc.text(t, 14, y); y += 5; });

  // ── QR Code ───────────────────────────────────────────────────────────
  const qrContent = JSON.stringify({
    nocRef: data.nocRef,
    empId:  data.empId,
    flat:   data.flat,
    issued: data.issuedDate,
    verify: `https://eniwas.bihar.gov.in/verify?noc=${data.nocRef}`,
  });

  const qrDataUrl: string = await QRCode.toDataURL(qrContent, {
    width: 120, margin: 1,
    color: { dark: "#0d2b6b", light: "#ffffff" },
  });

  const qrX = W - 46, qrY = H - 68;
  doc.addImage(qrDataUrl, "PNG", qrX, qrY, 34, 34);
  doc.setFontSize(7);
  doc.setTextColor(80, 80, 80);
  doc.text("Scan to verify", qrX + 17, qrY + 36.5, { align: "center" });
  doc.text("authenticity", qrX + 17, qrY + 40, { align: "center" });

  // ── Signature block ────────────────────────────────────────────────────
  const sigY = H - 50;
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  // Left – issued to
  doc.text("Acknowledged by:", 14, sigY);
  line(14, sigY + 14, 75);
  doc.setFontSize(8.5);
  doc.text(data.empName, 14, sigY + 18);
  doc.text("(Employee Signature)", 14, sigY + 22);

  // Center – stamp area
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(85, sigY - 2, 38, 28, 2, 2, "F");
  doc.setDrawColor(13, 43, 107);
  doc.roundedRect(85, sigY - 2, 38, 28, 2, 2, "S");
  doc.setFontSize(8);
  doc.setTextColor(13, 43, 107);
  doc.setFont("helvetica", "bold");
  doc.text("OFFICIAL SEAL", 104, sigY + 10, { align: "center" });
  doc.text("BCD – Housing Division", 104, sigY + 16, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.text("Bihar Sarkar", 104, sigY + 21, { align: "center" });

  // Right – issuing authority
  line(W - 75, sigY + 14, W - 14);
  doc.setFontSize(8.5);
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "normal");
  doc.text(data.issuedBy, W - 14, sigY + 18, { align: "right" });
  doc.text("Issuing Authority, BCD", W - 14, sigY + 22, { align: "right" });

  // ── Footer bar ────────────────────────────────────────────────────────
  doc.setFillColor(13, 43, 107);
  doc.rect(0, H - 14, W, 14, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text(
    `This is a computer-generated document issued via e-Niwas Portal. Verify at: eniwas.bihar.gov.in/verify  |  Ref: ${data.nocRef}`,
    W / 2, H - 7, { align: "center" }
  );

  // ── Save ─────────────────────────────────────────────────────────────
  doc.save(`NOC_${data.nocRef}_${data.empName.replace(/ /g, "_")}.pdf`);
}
