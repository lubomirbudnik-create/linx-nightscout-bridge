
const express = require("express");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "10mb" }));

const NIGHTSCOUT_URL = (process.env.NIGHTSCOUT_URL || "").replace(/\/+$/, "");
const NIGHTSCOUT_API_SECRET = process.env.NIGHTSCOUT_API_SECRET || "";

app.get("/", (req, res) => {
  res.json({
    status: "online",
    service: "LinX to Nightscout bridge"
  });
});

app.post("/api/v1/entries", async (req, res) => {
  try {
    if (!NIGHTSCOUT_URL || !NIGHTSCOUT_API_SECRET) {
      return res.status(500).json({
        error: "Nightscout environment variables are missing"
      });
    }

    if (!Array.isArray(req.body)) {
      return res.status(400).json({
        error: "Expected an array of entries"
      });
    }

    const entries = req.body.map((entry) => {
      const item = { ...entry };

      if (!item.date || item.date <= 0) {
        const timestamp =
          Number(item.mills) ||
          Date.parse(item.sysTime || "");

        if (timestamp > 0) {
          item.date = timestamp;
        }
      }

      return item;
    });

    const apiSecretHash = crypto
      .createHash("sha1")
      .update(NIGHTSCOUT_API_SECRET)
      .digest("hex");

    const response = await fetch(
      `${NIGHTSCOUT_URL}/api/v1/entries`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-secret": apiSecretHash
        },
        body: JSON.stringify(entries)
      }
    );

    const responseText = await response.text();

    console.log(
      "NIGHTSCOUT_FORWARD",
      JSON.stringify({
        count: entries.length,
        status: response.status
      })
    );

    res.status(response.status);

    if (response.headers.get("content-type")) {
      res.set("Content-Type", response.headers.get("content-type"));
    }

    res.send(responseText);

  } catch (error) {
    console.error("BRIDGE_ERROR:", error.message);

    res.status(502).json({
      error: "Could not forward data to Nightscout"
    });
  }
});

app.listen(PORT, () => {
  console.log("Bridge listening on port " + PORT);
});
