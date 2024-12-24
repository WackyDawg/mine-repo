const puppeteer = require('puppeteer');
const fs = require('fs').promises;

async function fetchPlugins() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const apiUrlBase = 'https://api.wordpress.org/plugins/info/1.2/?action=query_plugins&page=';

  const firstPageUrl = apiUrlBase + '1';
  const response = await page.goto(firstPageUrl, { waitUntil: 'networkidle2' });
  const firstPageData = await response.json();

  const totalPages = firstPageData.info.pages;
  const plugins = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const apiUrl = apiUrlBase + pageNum;
    console.log(`Fetching data from page ${pageNum} of ${totalPages}`);
    
    const pageResponse = await page.goto(apiUrl, { waitUntil: 'networkidle2' });
    const pageData = await pageResponse.json();

    const filteredPlugins = pageData.plugins.filter(plugin => {
      return plugin.active_installs >= 50 && plugin.active_installs <= 1000;
    }).map(plugin => {
      return {
        name: plugin.name,
        download_link: plugin.download_link,
        active_installs: plugin.active_installs
      };
    });

    plugins.push(...filteredPlugins); 
  }

  const fileName = 'filtered_plugins.json';
  await fs.writeFile(fileName, JSON.stringify(plugins, null, 2));

  console.log(`Filtered plugins saved to ${fileName}`);

  await browser.close();
}

fetchPlugins().catch(console.error);
