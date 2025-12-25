const http = require("http");
const https = require("https");
const { URL } = require("url");

const BASE = process.env.BACKEND_URL || "http://localhost:4000";
const endpoint = new URL("/api/orders", BASE);
const payload = {
  customerName: "Demo customer",
  gameUid: "demo-order-01",
  source: "cli-demo-order",
  paymentMethod: "note",
  status: "created",
  items: [
    { id: "p5", name: "Netflix Premium (1 Month)", qty: 1, lineTotal: 1299 },
    { id: "p8", name: "Premium - 6 Months", qty: 1, lineTotal: 8200 }
  ],
  totalNpr: 1299 + 8200,
  extraNote: "Running the demo order script"
};

const client = endpoint.protocol === "https:" ? https : http;
const req = client.request(
  {
    hostname: endpoint.hostname,
    port: endpoint.port,
    path: endpoint.pathname,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(JSON.stringify(payload))
    },
  },
  (res) => {
    const chunks = [];
    res.on("data", (chunk) => chunks.push(chunk));
    res.on("end", () => {
      const body = Buffer.concat(chunks).toString();
      console.log("Response:", res.statusCode, body);
    });
  }
);

req.on("error", (err) => {
  console.error("Demo order failed:", err.message);
});

req.write(JSON.stringify(payload));
req.end();
