const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],  // Add these flags
  });
  const page = await browser.newPage();
  const results = [];

  for (let zip = 10000; zip <= 10010; zip++) {
    console.log(`Searching for ZIP: ${zip}`);
    await page.goto("https://www.eurobaustoff.com/de/das-unternehmen/unternehmen/gesellschafter/?location=1", {
      waitUntil: "networkidle2",
    });

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
