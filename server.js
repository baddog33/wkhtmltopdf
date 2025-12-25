import express from "express";
import bodyParser from "body-parser";
import wkhtmltopdf from "wkhtmltopdf";
import { execFile } from "node:child_process";

const app = express();
app.use(bodyParser.text({ limit: "1mb", type: "*/*" }));

/**
 * Basic liveness check (fast, wakes Render service)
 */
app.get("/health", (req, res) => {
  res.status(200).type("text/plain").send("ok");
});

/**
 * Readiness check (verifies wkhtmltopdf is callable)
 * If you don't want this, you can remove it and only keep /health.
 */
app.get("/ready", (req, res) => {
  execFile("wkhtmltopdf", ["--version"], { timeout: 3000 }, (err, stdout) => {
    if (err) return res.status(503).type("text/plain").send("wkhtmltopdf not ready");
    res.status(200).type("text/plain").send(stdout.trim() || "ready");
  });
});

app.post("/convert", (req, res) => {
  const html = req.body ?? "";

  const pageWidth = req.query.width || "100mm";
  const pageHeight = req.query.height || "50mm";
  const dpi = req.query.dpi || "300";
  const grayscale = req.query.grayscale === "1" || req.query.grayscale === "true";
  const zoom = Number.parseFloat(req.query.zoom) || 1;

  res.setHeader("Content-Type", "application/pdf");

  wkhtmltopdf(html, {
    pageWidth,
    pageHeight,
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
    dpi,
    encoding: "utf-8",
    grayscale,
    disableSmartShrinking: true,
    zoom,
  }).pipe(res);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`wkhtmltopdf API running on port ${PORT}`));
