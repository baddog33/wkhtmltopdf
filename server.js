import express from "express";
import bodyParser from "body-parser";
import wkhtmltopdf from "wkhtmltopdf";

const app = express();
app.use(bodyParser.text({ limit: "1mb", type: "*/*" }));

app.post("/convert", (req, res) => {
  const html = req.body;

  // ✅ Get query parameters with defaults
  const pageWidth = req.query.width || "100mm";
  const pageHeight = req.query.height || "50mm";
  const dpi = req.query.dpi || "300";
  const grayscale = req.query.grayscale === "1" || req.query.grayscale === "true";

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
    disableSmartShrinking: true
  }).pipe(res);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`wkhtmltopdf API running on port ${PORT}`));
