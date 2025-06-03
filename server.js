const express = require('express');
const puppeteer = require('puppeteer-core');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/get-weight', async (req, res) => {
    const { awb } = req.body;
    if (!awb) return res.status(400).json({ error: 'AWB is required' });

    try {
        const browser = await puppeteer.launch({
            executablePath: process.env.GOOGLE_CHROME_BIN || '/usr/bin/google-chrome',
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        const page = await browser.newPage();
        await page.goto(`https://www.fedex.com/fedextrack/?trknbr=${awb}`, { waitUntil: 'domcontentloaded' });

        await page.waitForTimeout(2000);

        const [detailsLink] = await page.$x("//a[contains(text(), 'View more details')]");
        if (detailsLink) {
            await detailsLink.click();
            await page.waitForTimeout(2000);
        }

        let weight = null;
        try {
            weight = await page.$eval('td[data-label="Package"]', el => el.textContent.trim());
        } catch (err) {
            console.log('Updated weight selector not found.');
        }

        await browser.close();

        if (!weight) return res.status(500).json({ error: 'Could not fetch weight.' });
        res.json({ weight });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Could not fetch weight.' });
    }
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
