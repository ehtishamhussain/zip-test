const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const TARGET_URL = "https://www.eurobaustoff.com/de/das-unternehmen/unternehmen/gesellschafter/?location=1";

async function safeGoto(page, url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await page.goto(url, { waitUntil: "networkidle2", timeout: 20000 });
      return;
    } catch (err) {
      console.warn(`⛔ Attempt ${attempt} failed: ${err.message}`);
      if (attempt === retries) throw err;
      await new Promise(res => setTimeout(res, 3000));
    }
  }
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true, // Set to false for debugging
    slowMo: 50,     // Add delay between operations
  });

  const page = await browser.newPage();

  // Set a regular browser-like User-Agent
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
  );

  const results = [];

  for (let zip = 10000; zip <= 10010; zip++) {
    console.log(`🔍 Searching for ZIP: ${zip}`);

    await safeGoto(page, TARGET_URL);

    await page.waitForSelector('input[name="zipcode"]');

    await page.evaluate(() => {
      document.querySelector('input[name="zipcode"]').value = '';
    });

    await page.type('input[name="zipcode"]', zip.toString());
    await page.select('select[name="radius"]', '75');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(3000);

    const dealers = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll(".location__text"));
      return cards.map(el => el.innerText.trim());
    });

    dealers.forEach(dealer => {
      results.push({ zip, dealer });
    });

    if (results.length >= 2000) break;
  }

  const filePath = path.join(__dirname, "eurobaustoff_dealers.csv");
  const csvContent = "ZIP,Dealer\n" + results.map(r => `"${r.zip}","${r.dealer.replace(/\n/g, ", ")}"`).join("\n");
  fs.writeFileSync(filePath, csvContent, "utf8");

  console.log(`✅ Scraping complete. Saved ${results.length} records to eurobaustoff_dealers.csv`);

  await browser.close();
})();
