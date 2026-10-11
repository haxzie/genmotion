/**
 * Every screen in the film, drawn once. The job boards borrow the aesthetic of
 * the real ones (palette, layout, button shapes) — no logos, no real
 * companies: every employer here is fictional.
 */
import { Kit, makePage, type Page, type Rect } from "./page";

export const ME = { first: "Alex", last: "Rivera", email: "alex.rivera@mail.com", resume: "Alex_Rivera_Resume_final_v7.pdf" };

/* ---------------------------------------------------------------- helpers */

function para(k: Kit, x: number, y: number, lines: string[], size: number, lh: number, color: string) {
  lines.forEach((l, i) => k.text(l, x, y + i * lh, { size, color }));
}

function iconDot(k: Kit, cx: number, cy: number, r: number, color: string) {
  k.circle(cx, cy, r, "none", color, 2);
}

function check(k: Kit, cx: number, cy: number, s: number, color: string, lw: number) {
  const g = k.g;
  g.beginPath();
  g.moveTo(cx - s, cy);
  g.lineTo(cx - s * 0.3, cy + s * 0.7);
  g.lineTo(cx + s, cy - s * 0.8);
  g.strokeStyle = color;
  g.lineWidth = lw;
  g.lineCap = "round";
  g.lineJoin = "round";
  g.stroke();
}

function avatarSquare(k: Kit, x: number, y: number, s: number, fill: string, letter: string) {
  k.rect(x, y, s, s, fill, 6);
  k.text(letter, x + s / 2, y + s / 2 + 1, { size: s * 0.5, weight: 600, color: "#ffffff", align: "center" });
}

/* --------------------------------------------------------------- LinkedIn */

const LI = { bg: "#f4f2ee", card: "#ffffff", line: "#e0dfdc", blue: "#0a66c2", ink: "#191919", sub: "#666666", tint: "#edf3f8" };

function liChrome(k: Kit) {
  k.rect(0, 0, k.w, k.h, LI.bg);
  k.rect(0, 0, k.w, 62, LI.card);
  k.line(0, 62, k.w, 62, LI.line);
  k.rect(330, 13, 300, 36, LI.tint, 6);
  iconDot(k, 352, 31, 7, LI.sub);
  k.text("Search", 372, 31, { size: 15, color: LI.sub });
  const nav = ["Home", "My Network", "Jobs", "Messaging", "Notifications", "Me"];
  nav.forEach((n, i) => {
    const cx = 1060 + i * 94;
    iconDot(k, cx, 22, 10, n === "Jobs" ? LI.ink : LI.sub);
    k.text(n, cx, 46, { size: 12, color: n === "Jobs" ? LI.ink : LI.sub, align: "center" });
    if (n === "Jobs") k.rect(cx - 36, 59, 72, 3, LI.ink);
  });
}

function liJobList(k: Kit) {
  k.rect(330, 86, 460, 980, LI.card, 8, LI.line);
  k.text("Top job picks for you", 354, 122, { size: 20, weight: 600, color: LI.ink });
  k.text("Based on your profile and search history", 354, 150, { size: 14, color: LI.sub });
  const jobs: [string, string, string, string][] = [
    ["Senior Product Designer", "Northwind Systems", "San Francisco, CA (Remote)", "#2f4f8f"],
    ["Product Designer II", "Halcyon Labs", "Austin, TX (Hybrid)", "#6b4f9e"],
    ["UX Designer", "Meridian", "New York, NY (On-site)", "#1f7a6d"],
    ["Product Designer, Growth", "Vantage", "Remote", "#9e5a2f"],
    ["Design Lead", "Ostra", "Seattle, WA (Hybrid)", "#3f6b2f"],
    ["Senior UX Designer", "Brightline", "Remote", "#8f2f4f"],
    ["Product Designer", "Kestrel", "Denver, CO (Remote)", "#2f6b8f"],
  ];
  jobs.forEach(([t, c, l, col], i) => {
    const y = 180 + i * 122;
    if (i === 0) {
      k.rect(331, y, 458, 122, LI.tint);
      k.rect(331, y, 3, 122, LI.blue);
    }
    k.line(330, y, 790, y, LI.line);
    avatarSquare(k, 354, y + 18, 52, col, c[0]!);
    k.text(t, 424, y + 30, { size: 17, weight: 600, color: LI.blue });
    k.text(c, 424, y + 55, { size: 15, color: LI.ink });
    k.text(l, 424, y + 78, { size: 14, color: LI.sub });
    k.text(i % 2 ? "Promoted · Easy Apply" : "Actively recruiting · Easy Apply", 424, y + 101, { size: 13, color: LI.sub });
  });
}

export function linkedInJob(name = "linkedin-job-page"): Page {
  return makePage(name, 1920, 1080, 1.5, (k) => {
    liChrome(k);
    liJobList(k);
    k.rect(806, 86, 784, 980, LI.card, 8, LI.line);
    avatarSquare(k, 830, 110, 40, "#2f4f8f", "N");
    k.text("Northwind Systems", 882, 130, { size: 15, color: LI.ink });
    k.text("Senior Product Designer", 830, 186, { size: 28, weight: 600, color: LI.ink });
    k.text("San Francisco, CA · Reposted 2 hours ago · Over 100 applicants", 830, 226, { size: 15, color: LI.sub });
    ["Remote", "Full-time", "$140K–$165K/yr"].forEach((p, i, a) => {
      const x = 830 + a.slice(0, i).reduce((s, q) => s + k.measure(q, 14, 600) + 44, 0);
      k.rect(x, 252, k.measure(p, 14, 600) + 28, 30, "#e8f3e8", 4);
      k.text(p, x + 14, 267, { size: 14, weight: 600, color: "#1b5e20" });
    });
    k.button("easy-apply", "Easy Apply", 830, 306, { fill: LI.blue, ink: "#ffffff", size: 18, h: 44, padX: 26 });
    k.button("save", "Save", 830 + k.rects["easy-apply"]!.w + 12, 306, { fill: "#ffffff", ink: LI.blue, size: 18, h: 44, padX: 24, stroke: LI.blue });
    k.line(830, 380, 1566, 380, LI.line);
    k.text("About the job", 830, 418, { size: 20, weight: 600, color: LI.ink });
    para(k, 830, 458, [
      "Northwind Systems is looking for a Senior Product Designer to shape the",
      "future of our platform. You will partner with product and engineering",
      "to define experiences used by millions of people every day.",
      "",
      "What you'll do",
      "• Lead end-to-end design for core workflows",
      "• Run research, prototype quickly, and iterate with intent",
      "• Raise the quality bar across the design system",
      "",
      "What we're looking for",
      "• 5+ years of product design experience",
      "• A portfolio that shows craft and clear thinking",
      "• Comfort working in ambiguity",
      "",
      "Northwind Systems is an equal opportunity employer.",
    ], 16, 30, LI.ink);
  });
}

export function linkedInModal(name = "linkedin-apply-modal"): Page {
  return makePage(name, 1920, 1080, 1.5, (k) => {
    liChrome(k);
    liJobList(k);
    k.rect(806, 86, 784, 980, LI.card, 8, LI.line);
    k.rect(0, 0, k.w, k.h, "rgba(0,0,0,0.62)");
    const x = 588, y = 196, w = 744, h = 688;
    k.rect(x, y, w, h, "#ffffff", 10);
    k.text("Apply to Northwind Systems", x + 24, y + 38, { size: 20, weight: 600, color: LI.ink });
    k.line(x + w - 44, y + 30, x + w - 28, y + 46, LI.sub, 2);
    k.line(x + w - 28, y + 30, x + w - 44, y + 46, LI.sub, 2);
    k.line(x, y + 72, x + w, y + 72, LI.line);
    k.rect(x + 24, y + 96, w - 100, 8, "#e0e0e0", 4);
    k.rect(x + 24, y + 96, w - 100, 8, "#01754f", 4);
    k.text("100%", x + w - 24, y + 100, { size: 14, color: LI.sub, align: "right" });
    k.text("Review your application", x + 24, y + 148, { size: 20, weight: 600, color: LI.ink });
    k.text("The employer will also receive a copy of your profile.", x + 24, y + 178, { size: 15, color: LI.sub });
    k.text("Contact info", x + 24, y + 226, { size: 17, weight: 600, color: LI.ink });
    k.circle(x + 54, y + 280, 28, "#7c5c3c");
    k.text("A", x + 54, y + 281, { size: 24, weight: 600, color: "#ffffff", align: "center" });
    k.text(`${ME.first} ${ME.last}`, x + 96, y + 268, { size: 17, weight: 600, color: LI.ink });
    k.text("Product Designer · San Francisco Bay Area", x + 96, y + 294, { size: 14, color: LI.sub });
    k.text("Email address", x + 24, y + 346, { size: 14, color: LI.sub });
    k.text(ME.email, x + 24, y + 370, { size: 16, color: LI.ink });
    k.text("Resume", x + 24, y + 418, { size: 17, weight: 600, color: LI.ink });
    k.rect(x + 24, y + 440, w - 48, 70, "#ffffff", 8, LI.blue, 2);
    k.rect(x + 40, y + 456, 50, 38, "#c4302b", 4);
    k.text("PDF", x + 65, y + 476, { size: 14, weight: 700, color: "#ffffff", align: "center" });
    k.text(ME.resume, x + 106, y + 464, { size: 16, weight: 600, color: LI.ink });
    k.text("Last used 2 hours ago", x + 106, y + 488, { size: 13, color: LI.sub });
    k.rect(x + 24, y + 540, 20, 20, LI.blue, 3);
    check(k, x + 34, y + 550, 6, "#ffffff", 2.4);
    k.text("Follow Northwind Systems to stay up to date with their page.", x + 56, y + 550, { size: 15, color: LI.ink });
    k.line(x, y + 600, x + w, y + 600, LI.line);
    const sub = k.button("submit", "Submit application", 0, y + 622, { fill: LI.blue, ink: "#ffffff", size: 18, h: 44, padX: 24 });
    // right-align the footer buttons: redraw at the measured position
    k.rect(sub.x, sub.y, sub.w, sub.h, "#ffffff");
    const sx = x + w - 24 - sub.w;
    k.button("submit", "Submit application", sx, y + 622, { fill: LI.blue, ink: "#ffffff", size: 18, h: 44, padX: 24 });
    k.button("back", "Back", sx - 104, y + 622, { fill: "#ffffff", ink: LI.blue, size: 18, h: 44, padX: 22, stroke: LI.blue });
  });
}

export function linkedInSent(name = "linkedin-application-sent"): Page {
  return makePage(name, 1920, 1080, 1.5, (k) => {
    liChrome(k);
    liJobList(k);
    k.rect(806, 86, 784, 980, LI.card, 8, LI.line);
    k.rect(0, 0, k.w, k.h, "rgba(0,0,0,0.62)");
    const x = 640, y = 330, w = 640, h = 420;
    k.rect(x, y, w, h, "#ffffff", 10);
    k.text("Application sent", x + 24, y + 38, { size: 20, weight: 600, color: LI.ink });
    k.line(x, y + 72, x + w, y + 72, LI.line);
    k.circle(x + w / 2, y + 150, 40, "#01754f");
    check(k, x + w / 2, y + 150, 18, "#ffffff", 5);
    k.mark("sent-message", k.text("Your application was sent", x + w / 2, y + 236, { size: 24, weight: 600, color: LI.ink, align: "center" }));
    k.text("to Northwind Systems.", x + w / 2, y + 270, { size: 24, weight: 600, color: LI.ink, align: "center" });
    k.text("You can track it under My Jobs.", x + w / 2, y + 312, { size: 16, color: LI.sub, align: "center" });
    k.button("done", "Done", x + w - 24 - 96, y + h - 66, { fill: LI.blue, ink: "#ffffff", size: 18, h: 44, w: 96 });
  });
}

/* ----------------------------------------------------------------- Indeed */

const IN = { blue: "#2557a7", ink: "#2d2d2d", sub: "#595959", line: "#d4d2d0", bg: "#ffffff", soft: "#f3f2f1" };

function inChrome(k: Kit) {
  k.rect(0, 0, k.w, k.h, IN.bg);
  k.rect(0, 0, k.w, 64, "#ffffff");
  k.line(0, 64, k.w, 64, IN.line);
  ["Home", "Company reviews", "Find salaries"].forEach((t, i) => k.text(t, 300 + i * 150, 32, { size: 15, weight: i ? 400 : 600, color: IN.ink }));
  k.text("Sign in  |  Employers / Post Job", 1620, 32, { size: 15, color: IN.ink, align: "right" });
  k.rect(420, 92, 1080, 58, "#ffffff", 8, IN.line, 1.5);
  k.text("Product designer", 470, 121, { size: 17, color: IN.ink });
  k.line(900, 104, 900, 138, IN.line, 1.5);
  k.text("Remote", 940, 121, { size: 17, color: IN.ink });
  k.rect(1380, 99, 112, 44, IN.blue, 8);
  k.text("Find jobs", 1436, 121, { size: 16, weight: 600, color: "#ffffff", align: "center" });
}

export function indeedJob(name = "indeed-job-page"): Page {
  return makePage(name, 1920, 1080, 1.5, (k) => {
    inChrome(k);
    const jobs: [string, string, string, string][] = [
      ["Product Designer", "Halcyon Labs", "Austin, TX · Hybrid", "$95,000 – $120,000 a year"],
      ["UX/UI Designer", "Arden Health", "Remote", "$80,000 – $98,000 a year"],
      ["Junior Product Designer", "Pillar", "Chicago, IL", "Full-time"],
      ["Product Designer (Contract)", "Corvid Labs", "Remote", "$55 – $70 an hour"],
      ["Visual Designer", "Lumen & Co", "Boston, MA", "Full-time"],
    ];
    jobs.forEach(([t, c, l, s], i) => {
      const y = 190 + i * 172;
      k.rect(300, y, 560, 156, "#ffffff", 8, i === 0 ? IN.blue : IN.line, i === 0 ? 2.5 : 1.2);
      k.text(t, 324, y + 34, { size: 19, weight: 700, color: IN.ink });
      k.text(c, 324, y + 64, { size: 15, color: IN.ink });
      k.text(l, 324, y + 88, { size: 15, color: IN.ink });
      k.rect(324, y + 108, k.measure(s, 14, 600) + 20, 30, IN.soft, 4);
      k.text(s, 334, y + 123, { size: 14, weight: 600, color: "#4b4b4b" });
    });
    k.rect(880, 190, 740, 870, "#ffffff", 8, IN.line, 1.2);
    k.text("Product Designer", 908, 240, { size: 28, weight: 700, color: IN.ink });
    k.text("Halcyon Labs", 908, 280, { size: 16, color: IN.ink });
    k.line(908, 292, 908 + k.measure("Halcyon Labs", 16), 292, IN.ink, 1);
    k.text("Austin, TX · Hybrid work", 908, 308, { size: 16, color: IN.ink });
    k.text("$95,000 – $120,000 a year  ·  Full-time", 908, 336, { size: 16, color: IN.ink });
    k.button("apply-now", "Apply now", 908, 372, { fill: IN.blue, ink: "#ffffff", size: 18, h: 50, padX: 30, r: 8, weight: 700 });
    const ap = k.rects["apply-now"]!;
    k.rect(ap.x + ap.w + 12, 372, 50, 50, IN.soft, 8);
    iconDot(k, ap.x + ap.w + 37, 397, 9, IN.ink);
    k.line(880, 450, 1620, 450, IN.line);
    k.text("Job details", 908, 488, { size: 22, weight: 700, color: IN.ink });
    para(k, 908, 530, [
      "Pay: $95,000 – $120,000 a year",
      "Job type: Full-time",
      "Benefits: Health insurance, 401(k), Paid time off",
      "",
      "Full job description",
      "Halcyon Labs is hiring a Product Designer to join a small,",
      "senior team. You'll own features from first sketch to launch,",
      "work closely with engineering, and help define how our product",
      "feels. Experience with design systems is a plus.",
      "",
      "Hiring insights: Many applicants · Posted 3 days ago",
    ], 16, 30, IN.ink);
  });
}

export function indeedApply(name = "indeed-review-application"): Page {
  return makePage(name, 1920, 1080, 1.5, (k) => {
    k.rect(0, 0, k.w, k.h, IN.soft);
    k.rect(0, 0, k.w, 8, "#d4d2d0");
    k.rect(0, 0, k.w, 8, IN.blue);
    k.rect(560, 40, 800, 1010, "#ffffff", 10, IN.line, 1.2);
    const x = 600;
    k.text("← Back", x, 84, { size: 16, weight: 600, color: IN.blue });
    k.text("Please review your application", x, 140, { size: 30, weight: 700, color: IN.ink });
    k.text("You will not be able to make changes after you submit.", x, 180, { size: 16, color: IN.sub });
    k.text("Contact information", x, 240, { size: 20, weight: 700, color: IN.ink });
    [["Full name", `${ME.first} ${ME.last}`], ["Email address", ME.email], ["City, State", "San Francisco, CA"], ["Phone number", "+1 415 555 0142"]].forEach(([a, b], i) => {
      k.text(a!, x, 284 + i * 56, { size: 14, color: IN.sub });
      k.text(b!, x, 306 + i * 56, { size: 16, color: IN.ink });
    });
    k.text("Resume", x, 534, { size: 20, weight: 700, color: IN.ink });
    k.rect(x, 556, 720, 74, "#ffffff", 8, IN.line, 1.2);
    k.rect(x + 16, 572, 44, 42, "#c4302b", 4);
    k.text("PDF", x + 38, 593, { size: 13, weight: 700, color: "#ffffff", align: "center" });
    k.text(ME.resume, x + 76, 593, { size: 16, weight: 600, color: IN.ink });
    k.text("Employer questions", x, 676, { size: 20, weight: 700, color: IN.ink });
    para(k, x, 716, [
      "How many years of product design experience do you have?",
    ], 15, 24, IN.sub);
    k.text("6", x, 742, { size: 16, color: IN.ink });
    para(k, x, 784, ["Are you willing to relocate to Austin, TX?"], 15, 24, IN.sub);
    k.text("Yes", x, 810, { size: 16, color: IN.ink });
    para(k, x, 852, ["Desired salary"], 15, 24, IN.sub);
    k.text("Open to discussion", x, 878, { size: 16, color: IN.ink });
    k.button("submit", "Submit your application", x, 940, { fill: IN.blue, ink: "#ffffff", size: 19, h: 56, w: 720, r: 8, weight: 700 });
  });
}

/* ------------------------------------------------- an enterprise ATS portal */

export function atsReview(name = "careers-portal-review"): Page {
  return makePage(name, 1920, 1080, 1.5, (k) => {
    k.rect(0, 0, k.w, k.h, "#f6f7f8");
    k.rect(0, 0, k.w, 70, "#0b2a4a");
    k.text("Vantage", 120, 35, { size: 22, weight: 700, color: "#ffffff" });
    k.text("Careers", 228, 35, { size: 18, color: "#b9c6d6" });
    k.text("Alex Rivera", 1800, 35, { size: 15, color: "#ffffff", align: "right" });
    k.text("Product Designer — Application", 120, 126, { size: 26, weight: 600, color: "#1d2733" });
    const steps = ["My Information", "My Experience", "Application Questions", "Voluntary Disclosures", "Self Identify", "Review"];
    steps.forEach((s, i) => {
      const cx = 220 + i * 296;
      if (i < steps.length - 1) k.line(cx, 190, cx + 296, 190, "#0875e1", 3);
      k.circle(cx, 190, 14, i === steps.length - 1 ? "#ffffff" : "#0875e1", "#0875e1", 3);
      if (i < steps.length - 1) check(k, cx, 190, 6, "#ffffff", 2.4);
      k.text(s, cx, 228, { size: 14, weight: i === steps.length - 1 ? 700 : 400, color: "#3b4652", align: "center" });
    });
    k.text("Review", 120, 300, { size: 30, weight: 600, color: "#1d2733" });
    const card = (x: number, y: number, title: string, rows: [string, string][]) => {
      k.rect(x, y, 820, 60 + rows.length * 58, "#ffffff", 8, "#dfe3e8", 1.2);
      k.text(title, x + 24, y + 34, { size: 18, weight: 700, color: "#1d2733" });
      rows.forEach(([a, b], i) => {
        k.text(a, x + 24, y + 74 + i * 58, { size: 14, color: "#5b6672" });
        k.text(b, x + 24, y + 96 + i * 58, { size: 16, color: "#1d2733" });
      });
    };
    card(120, 340, "My Information", [["Legal name", `${ME.first} ${ME.last}`], ["Email", ME.email], ["Phone", "+1 415 555 0142"], ["How did you hear about us?", "Job board"]]);
    card(980, 340, "My Experience", [["Resume", ME.resume], ["Most recent title", "Product Designer"], ["Years of experience", "6"], ["Website", "alexrivera.design"]]);
    card(120, 680, "Application Questions", [["Are you legally authorized to work in the US?", "Yes"], ["Will you require sponsorship?", "No"]]);
    card(980, 680, "Voluntary Disclosures", [["I certify the information provided is accurate.", "Agreed"], ["Terms and conditions", "Accepted"]]);
    k.rect(0, 960, k.w, 120, "#ffffff");
    k.line(0, 960, k.w, 960, "#dfe3e8");
    const s = k.button("submit", "Submit", 0, 990, { fill: "#0875e1", ink: "#ffffff", size: 19, h: 52, padX: 40, r: 26, weight: 600 });
    k.rect(s.x, s.y, s.w, s.h, "#ffffff");
    k.button("submit", "Submit", 1800 - s.w, 990, { fill: "#0875e1", ink: "#ffffff", size: 19, h: 52, padX: 40, r: 26, weight: 600 });
    k.button("back", "Back", 1800 - s.w - 130, 990, { fill: "#ffffff", ink: "#1d2733", size: 19, h: 52, padX: 30, r: 26, stroke: "#8a96a3" });
  });
}

/* ------------------------------------------- a minimal hosted job form */

export function hostedForm(name = "job-form-meridian"): Page {
  return makePage(name, 1920, 1080, 1.5, (k) => {
    k.rect(0, 0, k.w, k.h, "#ffffff");
    const x = 560;
    k.text("Meridian", x, 70, { size: 26, weight: 700, color: "#111111" });
    k.text("Product Designer", x, 140, { size: 34, weight: 600, color: "#111111" });
    k.text("Remote — United States", x, 182, { size: 17, color: "#6b6b6b" });
    k.line(x, 214, x + 800, 214, "#e6e6e6");
    k.text("Submit your application", x, 254, { size: 22, weight: 600, color: "#111111" });
    const field = (label: string, value: string, y: number, h = 50) => {
      k.text(label, x, y, { size: 15, weight: 600, color: "#333333" });
      k.rect(x, y + 16, 800, h, "#ffffff", 6, "#cfcfcf", 1.2);
      k.text(value, x + 16, y + 16 + 25, { size: 16, color: "#111111" });
    };
    field("First Name *", ME.first, 300);
    field("Last Name *", ME.last, 390);
    field("Email *", ME.email, 480);
    k.text("Resume/CV *", x, 570, { size: 15, weight: 600, color: "#333333" });
    check(k, x + 8, 600, 6, "#1f7a4d", 2.4);
    k.text(ME.resume, x + 26, 600, { size: 16, color: "#1f7a4d" });
    field("Why do you want to work at Meridian? *", "I have admired Meridian's work for years, and I think", 640, 110);
    k.text("I could bring care and rigor to the team.", x + 16, 726, { size: 16, color: "#111111" });
    field("LinkedIn Profile", "linkedin.com/in/alexrivera", 790);
    k.button("submit", "Submit Application", x, 900, { fill: "#127c73", ink: "#ffffff", size: 18, h: 52, padX: 30, r: 6, weight: 600 });
  });
}

/* ------------------------------------------------------------------ Gmail */

const GM = { bg: "#f6f8fc", ink: "#1f1f1f", sub: "#5e5e5e", line: "#eceff1", blue: "#0b57d0", pill: "#d3e3fd", compose: "#c2e7ff", read: "#f2f6fc" };

export const INBOX: [string, string, string, string, boolean][] = [
  ["Halcyon Labs Recruiting", "Update on your application", "Thank you for your interest in the Product Designer position at Halcyon…", "9:41 AM", true],
  ["Northwind Systems", "Thank you for applying to Northwind Systems", "Hi Alex, we've received your application for Senior Product Designer…", "Oct 8", false],
  ["Job Alerts", "37 new jobs for \"Product Designer\"", "Remote · Full-time · Apply in one click to roles that match your…", "Oct 8", false],
  ["Meridian Careers", "Your application to Meridian", "We appreciate your interest. Our team will review your application…", "Oct 7", false],
  ["Vantage Talent", "Application received – Product Designer", "This is an automated confirmation. Please do not reply to this…", "Oct 6", false],
  ["Ostra Recruiting", "An update on your candidacy", "Hi Alex, thank you for taking the time to speak with us over the…", "Oct 3", false],
  ["Brightline", "Your application status has changed", "Log in to your candidate portal to view the latest update on…", "Oct 1", false],
  ["Kestrel", "Thank you for your interest", "After reviewing your background and experience, we…", "Sep 29", false],
  ["Lumen & Co", "We received your application", "Thanks for applying! We'll be in touch if your profile is a…", "Sep 27", false],
  ["Halcyon Labs Recruiting", "Next steps: meet the design team", "Great news, Alex — we'd love to invite you to a final round…", "Sep 24", false],
  ["Job Alerts", "52 new jobs for \"Product Designer\"", "Be an early applicant. New roles posted in the last 24 hours…", "Sep 22", false],
  ["Arden Health", "Application received", "Thank you for applying. If your qualifications match our…", "Sep 20", false],
  ["Pillar", "Thank you for applying", "We have received your application and will review it shortly…", "Sep 18", false],
  ["Job Alerts", "You're one of the first 25 applicants", "Apply now to stand out. These roles are getting attention…", "Sep 15", false],
  ["Corvid Labs", "Update regarding your application", "Thank you for your patience while we reviewed applications for…", "Sep 12", false],
  ["Meridian Careers", "Thanks for applying to Meridian", "Your application has been received and is under review…", "Sep 10", false],
  ["Job Alerts", "Product Designer roles you might like", "Based on your recent searches: 14 new positions…", "Sep 8", false],
];

export function gmailInbox(name = "gmail-inbox"): Page {
  return makePage(name, 1920, 1080, 1.5, (k) => {
    k.rect(0, 0, k.w, k.h, GM.bg);
    [22, 30, 38].forEach((y) => k.rect(26, y, 22, 2.5, "#444746", 1));
    k.rect(250, 10, 720, 48, "#e9eef6", 24);
    iconDot(k, 282, 34, 8, "#444746");
    k.text("Search mail", 312, 34, { size: 18, color: "#444746" });
    [1700, 1748, 1796].forEach((x) => iconDot(k, x, 34, 9, "#444746"));
    k.circle(1858, 34, 18, "#7b1fa2");
    k.text("A", 1858, 35, { size: 17, weight: 600, color: "#ffffff", align: "center" });
    k.rect(10, 76, 150, 56, GM.compose, 16);
    k.line(34, 112, 48, 96, GM.ink, 2.4);
    k.text("Compose", 62, 104, { size: 15, weight: 600, color: GM.ink });
    const nav: [string, string][] = [["Inbox", "1"], ["Starred", ""], ["Snoozed", ""], ["Sent", ""], ["Drafts", "3"], ["Spam", ""], ["More", ""]];
    nav.forEach(([n, c], i) => {
      const y = 156 + i * 34;
      if (i === 0) k.rect(0, y - 16, 248, 32, GM.pill, 16);
      iconDot(k, 36, y, 7, "#444746");
      k.text(n, 66, y, { size: 15, weight: i === 0 ? 700 : 400, color: GM.ink });
      if (c) k.text(c, 232, y, { size: 13, weight: i === 0 ? 700 : 400, color: GM.ink, align: "right" });
    });
    // main panel
    k.rect(256, 66, 1650, 1014, "#ffffff", 16);
    k.rect(282, 92, 18, 18, "none", 2, "#747775", 1.6);
    iconDot(k, 336, 101, 8, "#444746");
    k.text("1–50 of 2,184", 1790, 101, { size: 13, color: GM.sub, align: "right" });
    const tabs = ["Primary", "Promotions", "Social", "Updates"];
    tabs.forEach((t, i) => {
      const x = 256 + i * 260;
      iconDot(k, x + 34, 150, 8, i === 0 ? GM.blue : "#444746");
      k.text(t, x + 58, 150, { size: 15, weight: i === 0 ? 600 : 400, color: i === 0 ? GM.blue : "#444746" });
      if (i === 0) k.rect(x + 8, 172, 244, 3, GM.blue, 1);
    });
    k.line(256, 175, 1906, 175, GM.line);
    INBOX.forEach(([from, subj, snip, date, unread], i) => {
      const y = 176 + i * 52;
      if (!unread) k.rect(256, y, 1650, 52, GM.read);
      k.line(256, y + 52, 1906, y + 52, GM.line);
      k.rect(282, y + 17, 18, 18, "none", 2, "#9aa0a6", 1.5);
      iconDot(k, 330, y + 26, 8, "#9aa0a6");
      const w = unread ? 700 : 400;
      k.text(from, 370, y + 27, { size: 16, weight: w, color: GM.ink });
      const sw = k.measure(subj, 16, w);
      k.text(subj, 620, y + 27, { size: 16, weight: w, color: GM.ink });
      k.text(` – ${snip}`, 620 + sw, y + 27, { size: 16, color: GM.sub });
      k.text(date, 1880, y + 27, { size: 14, weight: w, color: GM.ink, align: "right" });
      if (i === 0) k.mark("row-1", { x: 256, y, w: 1650, h: 52 });
    });
  });
}

/* ------------------------------------------------------------- the emails */

export type MailStyle = "gmail" | "outlook" | "plain" | "dark";

export interface Mail {
  style: MailStyle;
  company: string;
  sender: string;
  address: string;
  subject: string;
  greeting: string;
  before: string[];
  lead: string;
  punch: string;
  after: string[];
  avatar: string;
}

export const MAILS: Mail[] = [
  {
    style: "gmail", company: "Halcyon Labs", sender: "Halcyon Labs Recruiting", address: "no-reply@halcyonlabs.io", avatar: "#6b4f9e",
    subject: "Update on your application", greeting: "Hi Alex,",
    before: ["Thank you for your interest in the Product Designer", "position at Halcyon Labs, and for the time you invested", "in our interview process."],
    lead: "After careful consideration,", punch: "we have decided to move forward with another candidate.",
    after: ["This was not an easy decision. We were impressed by", "your background and will keep your resume on file", "for future openings.", "", "We wish you the best in your search.", "", "Warm regards,", "The Halcyon Labs Talent Team"],
  },
  {
    style: "outlook", company: "Northwind Systems", sender: "Northwind Systems Careers", address: "careers@northwind.example", avatar: "#2f4f8f",
    subject: "Your application to Northwind Systems", greeting: "Dear Alex,",
    before: ["Thank you for applying for the Senior Product Designer", "role. We received a very large number of applications."],
    lead: "After reviewing your profile,", punch: "we will not be moving forward with your application.",
    after: ["We wish you every success in your job search.", "", "Kind regards,", "Northwind Systems Talent Acquisition"],
  },
  {
    style: "plain", company: "Meridian", sender: "Meridian Recruiting", address: "do-not-reply@meridian.example", avatar: "#1f7a6d",
    subject: "Your application to Meridian", greeting: "Hi Alex,",
    before: ["Thanks for your interest in Meridian and for applying", "to the Product Designer position."],
    lead: "We reviewed your application carefully, and", punch: "we have decided to pursue other candidates.",
    after: ["This decision is final. Please do not reply to this", "email, as this mailbox is not monitored.", "", "The Meridian Recruiting Team"],
  },
  {
    style: "dark", company: "Vantage", sender: "Vantage Talent", address: "talent@vantage.example", avatar: "#9e5a2f",
    subject: "Application status: Product Designer", greeting: "Hello Alex,",
    before: ["Thank you for your recent application to Vantage."],
    lead: "We are writing to let you know that", punch: "the position has been filled.",
    after: ["We will retain your information for 12 months.", "", "Best,", "Vantage Talent"],
  },
  {
    style: "gmail", company: "Ostra", sender: "Ostra Recruiting", address: "jobs@ostra.example", avatar: "#3f6b2f",
    subject: "An update on your candidacy", greeting: "Hi Alex,",
    before: ["Thank you for taking the time to speak with our", "team over the past few weeks."],
    lead: "After much deliberation,", punch: "we regret to inform you that you were not selected.",
    after: ["We truly appreciated getting to know you.", "", "Warmly,", "Ostra Recruiting"],
  },
  {
    style: "outlook", company: "Brightline", sender: "Brightline Talent Acquisition", address: "noreply@brightline.example", avatar: "#8f2f4f",
    subject: "Your application status has changed", greeting: "Dear Candidate,",
    before: ["Thank you for your interest in Brightline."],
    lead: "Upon review,", punch: "your experience does not align with our current needs.",
    after: ["We encourage you to explore other roles on our", "careers site.", "", "Brightline Talent Acquisition"],
  },
  {
    style: "plain", company: "Kestrel", sender: "Kestrel Hiring", address: "hiring@kestrel.example", avatar: "#2f6b8f",
    subject: "Thank you for your interest", greeting: "Hi Alex,",
    before: ["We appreciate you applying for the Product Designer", "role at Kestrel."],
    lead: "Unfortunately,", punch: "we have chosen to proceed with other applicants.",
    after: ["Due to the volume of applications, we are unable", "to provide individual feedback.", "", "Kestrel Hiring Team"],
  },
  {
    style: "dark", company: "Lumen & Co", sender: "Lumen & Co People Team", address: "people@lumen.example", avatar: "#7a6a2f",
    subject: "Regarding your application", greeting: "Dear Alex,",
    before: ["Thank you for applying to the Visual Designer role."],
    lead: "While this role was not a match,", punch: "we encourage you to apply for future openings.",
    after: ["We will be in touch if a suitable role opens.", "", "Kind regards,", "Lumen & Co"],
  },
];

export const BODY = { size: 26, lh: 46, x: 140, y: 330 };
export const MAIL_W = 1500;
export const MAIL_H = 1340;

export interface MailPage extends Page {
  punchRect: Rect;
  leadRect: Rect;
  paraRect: Rect;
  ink: string;
  mail: Mail;
}

export function mailPage(i: number, scale = 1.5): MailPage {
  const m = MAILS[i]!;
  const dark = m.style === "dark";
  const ink = dark ? "#e3e3e3" : "#1f1f1f";
  const sub = dark ? "#a8a8a8" : "#5e5e5e";
  let punchRect: Rect = { x: 0, y: 0, w: 1, h: 1 };
  let leadRect: Rect = punchRect;
  const page = makePage(`email-${m.company.toLowerCase().replace(/[^a-z]+/g, "-")}`, MAIL_W, MAIL_H, scale, (k) => {
    const bg = dark ? "#1f1f1f" : "#ffffff";
    k.rect(0, 0, k.w, k.h, bg);
    let top = 0;
    if (m.style === "outlook") {
      k.rect(0, 0, k.w, 56, "#0f6cbd");
      k.rect(420, 12, 660, 32, "#e8f1fa", 4);
      k.text("Search", 440, 28, { size: 15, color: "#43546b" });
      k.rect(0, 56, k.w, 52, "#f5f5f5");
      ["Reply", "Reply all", "Forward", "Delete", "Archive"].forEach((t, j) => k.text(t, 140 + j * 130, 82, { size: 15, color: "#242424" }));
      top = 108;
    } else if (m.style === "plain") {
      k.rect(0, 0, k.w, k.h, "#eef0f2");
      k.rect(100, 40, k.w - 200, k.h - 80, "#ffffff", 4, "#dde1e6");
      k.rect(100, 40, k.w - 200, 8, m.avatar);
      top = 40;
    } else {
      k.text("←", 40, 32, { size: 22, color: sub, align: "center" });
      [1, 2, 3, 4, 5].forEach((j) => iconDot(k, 40 + j * 56, 30, 8, sub));
      top = 56;
    }
    k.text(m.subject, BODY.x, top + 74, { size: 30, weight: m.style === "outlook" ? 600 : 400, color: ink });
    const sw = k.measure(m.subject, 30, m.style === "outlook" ? 600 : 400);
    if (m.style !== "plain") {
      k.rect(BODY.x + sw + 18, top + 62, 64, 26, dark ? "#3c3c3c" : "#e8e8e8", 4);
      k.text("Inbox", BODY.x + sw + 50, top + 75, { size: 14, color: sub, align: "center" });
    }
    const ay = top + 150;
    k.circle(BODY.x - 52, ay, 24, m.avatar);
    k.text(m.company[0]!, BODY.x - 52, ay + 1, { size: 22, weight: 600, color: "#ffffff", align: "center" });
    k.text(m.sender, BODY.x, ay - 12, { size: 18, weight: 700, color: ink });
    k.text(`<${m.address}>`, BODY.x + k.measure(m.sender, 18, 700) + 10, ay - 12, { size: 15, color: sub });
    k.text("to me", BODY.x, ay + 16, { size: 15, color: sub });
    k.text("9:41 AM (1 minute ago)", MAIL_W - 140, ay - 12, { size: 15, color: sub, align: "right" });

    let y = ay + 110;
    const L = (s: string, color = ink) => {
      const r = s ? k.text(s, BODY.x, y, { size: BODY.size, color }) : { x: BODY.x, y: y - BODY.size * 0.6, w: 0, h: BODY.size * 1.2 };
      y += BODY.lh;
      return r;
    };
    L(m.greeting);
    y += BODY.lh * 0.4;
    m.before.forEach((s) => L(s));
    y += BODY.lh * 0.4;
    leadRect = L(m.lead);
    punchRect = L(m.punch);
    y += BODY.lh * 0.4;
    m.after.forEach((s) => L(s));
    y += BODY.lh * 0.6;
    k.line(BODY.x, y, MAIL_W - 140, y, dark ? "#3c3c3c" : "#e3e3e3");
    k.text("This is an automated message. Please do not reply.", BODY.x, y + 40, { size: 17, color: sub });
  });
  const paraRect = { x: leadRect.x, y: leadRect.y, w: Math.max(leadRect.w, punchRect.w), h: punchRect.y + punchRect.h - leadRect.y };
  return Object.assign(page, { punchRect, leadRect, paraRect, ink, mail: m });
}
