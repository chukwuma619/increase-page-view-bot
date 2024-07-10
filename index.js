import http from "http";
import fs from "fs";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import randomUseragent from "random-useragent";

puppeteer.use(StealthPlugin());

const searchUrl = `https://sportsbuddy.ng/2024/03/27/video-fiery-exchange-cristiano-ronaldo-unleashes-fury-as-shock-defeat-shatters-portugals-unbeaten-streak/`;

async function createPage(browser, url) {
  const page = await browser.newPage();
  const userAgent = randomUseragent.getRandom();
  await page.setUserAgent(userAgent);
  await page.goto(url, { timeout: 120000 });
  const html = await page.content();

  for (let i = 0; i < 2; i++) {
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });
    await new Promise((r) => setTimeout(r, 2000));
  }

  await page.close();
}

export async function generateViews(url, number) {
  console.log("Started generating views");
  const browser = await puppeteer.launch({ headless: true });
  const maxConcurrency = 10; // Limit concurrency to avoid overwhelming the browser

  const promises = Array(number)
    .fill(null)
    .map(async (_, index) => {
      if (index % maxConcurrency === 0) {
        await new Promise((r) => setTimeout(r, 2000)); // Add delay to stagger page creations
      }
      return createPage(browser, url);
    });

  await Promise.all(promises);

  await browser.close();
  console.log("Finished generating views");
}

// Create HTTP server
const server = http.createServer((req, res) => {
  if (req.url === "/" || req.url === "/index.html") {
    fs.readFile("index.html", (err, data) => {
      if (err) {
        res.writeHead(500, { "Content-Type": "text/html" });
        res.end("<h1>Internal Server Error</h1>");
      } else {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(data);
      }
    });
  } else if (req.method === "POST" && req.url === "/generateViews") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", async () => {
      const formData = new URLSearchParams(body);
      const url = formData.get("url");
      const number = parseInt(formData.get("number"), 10);
      try {
        await generateViews(url, number);
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("Views generated successfully!");
      } catch (error) {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Error generating views: " + error.message);
      }
    });
  } else {
    res.writeHead(404, { "Content-Type": "text/html" });
    res.end("<h1>Not Found</h1>");
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
