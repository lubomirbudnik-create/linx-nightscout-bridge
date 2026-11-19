
const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "256kb" }));
app.use(express.text({ limit: "256kb", type: "text/*" }));

function describe(body) {
  if (Array.isArray(body)) {
    const first = body[0];
    return {
      type: "array",
      count: body.length,
      fields: first && typeof first === "object"
        ? Object.keys(first) : []
    };
  }

  if (body && typeof body === "object") {
    return {
      type: "object",
      fields: Object.keys(body)
    };
  }

  return { type: typeof body };
}

app.get("/", (req, res) => {
  res.json({ status: "online", service: "LinX diagnostic bridge" });
});

app.all("*", (req, res) => {
  const report = {
    time: new Date().toISOString(),
    method: req.method,
    path: req.path,
    contentType: req.headers["content-type"] || "",
    body: req.body === undefined ? "empty" : describe(req.body)
  };

  console.log("LINX_REQUEST", JSON.stringify(report));

  if (req.method === "POST" || req.method === "PUT") {
    return res.status(200).json([]);
  }

  res.status(200).json({ ok: true });
});

app.listen(PORT, () => {
  console.log("Bridge listening on port " + PORT);
});
