
const express = require("express");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "10mb" }));

const NIGHTSCOUT_URL = (process.env.NIGHTSCOUT_URL || "").replace(/\/+$/, "");
const NIGHTSCOUT_API_SECRET = process.env.NIGHTSCOUT_API_SECRET || "";

app.get("/", (req, res) => {
  res.json({ status: "online", service: "LinX to Nightscout bridge" });
});

app.post("/api/v1/entries", async (req, res) => {
  try {
    if (!NIGHTSCOUT_URL || !NIGHTSCOUT_API_SECRET) {
      return res.status(500).json({ error: "Missing environment variables" });
    }

    if (!Array.isArray(req.body)) {
      return res.status(400).json({ error: "Expected an array" });
    }

    const entries = req.body.map((entry) => ({ ...entry }));

    const hash = crypto
      .createHash("sha1")
      .update(NIGHTSCOUT_API_SECRET)
      .digest("hex");

    const response = await fetch(`${NIGHTSCOUT_URL}/api/v1/entries`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-secret": hash
      },
      body: JSON.stringify(entries)
    });

    const responseText = await response.text();

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      result = responseText;
    }

    const rejected = Array.isArray(result) ? result.length : null;

    console.log("NIGHTSCOUT_RESULT", JSON.stringify({
      httpStatus: response.status,
      sent: entries.length,
      rejected,
      response: result
    }));

    res.status(response.status).json(result);
  } catch (error) {
    console.error("BRIDGE_ERROR:", error.message);
    res.status(502).json({ error: "Forwarding failed" });
  }
});

app.listen(PORT, () => {
  console.log("Bridge listening on port " + PORT);
});
