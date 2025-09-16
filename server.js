import express from "express";
import bodyParser from "body-parser";
import wkhtmltopdf from "wkhtmltopdf";

const app = express();
app.use(bodyParser.text({ limit: "1mb", type: "*/*" }));

// --- helpers ---
const MM_PER_INCH = 25.4;
const CSS_DPI = 96; // Web/CSS reference pixel density

function parseDimensionToMm(val, fallbackMm) {
  if (!val) return fallbackMm;
  // Accept plain numbers as mm, or strings like "100mm", "4in", "3.5cm"
  const m = String(val).trim().match(/^(\d+(?:\.\d+)?)(mm|cm|in)?$/i);
  if (!m) return fallbackMm;
  const num = parseFloat(m[1]);
  const unit = (m[2] || "mm").toLowerCase();
  if (unit === "mm") return num;
  if (unit === "cm") return num * 10;
  if (unit === "in") return num * MM_PER_INCH;
  return fallbackMm;
}

function mmToPxAt96(mm) {
  return Math.round((mm / MM_PER_INCH) * CSS_DPI);
}

app.post("/convert", (req, res) => {
  // Raw HTML
  let html = req.body || "";

  // --- query params (with sensible defaults) ---
  const widthQ = req.query.width || "100mm";
  const heightQ = req.query.height || "50mm";

  const widthMm = parseDimensionToMm(widthQ, 100);
  const heightMm = parseDimensionToMm(heightQ, 50);

  // Keep width/height as user-facing strings with units
  const pageWidth = /\d$/.test(String(widthQ)) ? `${widthQ}mm` : String(widthQ);
  const pageHeight = /\d$/.test(String(heightQ)) ? `${heightQ}mm` : String(heightQ);

  // IMPORTANT: default to CSS DPI (96). Users can override with ?dpi=...
  const dpi = req.query.dpi ? String(req.query.dpi) : "96";

  // Optional zoom (default 1)
  const zoom = req.query.zoom ? Number(req.query.zoom) : 1;

  // Optional grayscale
  const grayscale =
    req.query.grayscale === "1" || String(req.query.grayscale).toLowerCase() === "true";

  // Viewport: either user-specified (e.g., 378x189) or auto from mm @ 96 DPI
  // Pass ?viewport=off to skip forcing it.
  let viewportSize = undefined;
  if (String(req.query.viewport).toLowerCase() === "off") {
    viewportSize = undefined;
  } else if (req.query.viewport) {
    viewportSize = String(req.query.viewport); // e.g. "1200x600"
  } else {
    const vpW = mmToPxAt96(widthMm);
    const vpH = mmToPxAt96(heightMm);
    viewportSize = `${vpW}x${vpH}`;
  }

  // Inject @page + body sizing so the HTML canvas matches the requested size
  // (Keeps your own CSS, but ensures wkhtml's page box is identical.)
  const pageCss = `
<style>
  @page { size: ${pageWidth} ${pageHeight}; margin: 0; }
  html, body { width: ${pageWidth}; height: ${pageHeight}; margin: 0; padding: 0; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
</style>`;

  if (html.includes("</head>")) {
    html = html.replace("</head>", `${pageCss}\n</head>`);
  } else {
    html = `<!doctype html><html><head>${pageCss}</head><body>${html}</body></html>`;
  }

  res.setHeader("Content-Type", "application/pdf");

  wkhtmltopdf(html, {
    // Page size
    pageWidth,
    pageHeight,

    // Margins
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,

    // Rendering controls
    dpi,                      // default 96; overrides acceptable
    zoom,                     // default 1
    disableSmartShrinking: true,
    printMediaType: true,     // use @media print rules if any
    noOutline: true,          // avoids some outline warnings
    // Keep images consistent too (optional but nice)
    imageDpi: dpi,
    imageQuality: 100,

    // Force a viewport that matches the CSS canvas at 96 DPI (prevents ~80% shrink)
    ...(viewportSize ? { viewportSize } : {}),

    // If you ever embed local assets (e.g., base64 images or file://),
    // you might need this on some hosts:
    enableLocalFileAccess: true,
  }).pipe(res);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`wkhtmltopdf API running on port ${PORT}`));
