import express from "express";
import bodyParser from "body-parser";
import wkhtmltopdf from "wkhtmltopdf";

const app = express();
app.use(bodyParser.text({ limit: "1mb", type: "*/*" }));

app.post("/convert", (req, res) => {
  const html = req.body;
  res.setHeader("Content-Type", "application/pdf");

  wkhtmltopdf(html, {
    pageWidth: "100mm",
    pageHeight: "50mm",
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
    dpi: 300,
    encoding: "utf-8"
  }).pipe(res);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`wkhtmltopdf API running on port ${PORT}`));
