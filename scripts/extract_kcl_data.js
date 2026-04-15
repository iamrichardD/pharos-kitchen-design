const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://app.kclcad.com/www';
const ASSET_URL = 'https://app.kclcad.com/kustomdrawing';
const IMAGE_URL = 'https://app.kclcad.com/kustomimage';
const DATA_DIR = path.join(__dirname, '../apps/marketing/public/assets/kcl-catalog/metadata');
const ASSET_DIR = path.join(__dirname, '../apps/marketing/public/assets/kcl-catalog/media');

// Ensure the metadata and media directories exist
[DATA_DIR, ASSET_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/**
 * Simulates a human delay between actions.
 */
function sleep(min = 1000, max = 3000) {
  const duration = Math.floor(Math.random() * (max - min + 1) + min);
  console.log(`Simulating human delay: ${duration}ms...`);
  return new Promise(resolve => setTimeout(resolve, duration));
}

async function fetchJSON(url) {
  console.log(`Fetching JSON: ${url}`);
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*'
    }
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return await response.json();
}

async function downloadFile(url, filename) {
  console.log(`Downloading Asset: ${url}`);
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    }
  });
  if (!response.ok) {
    console.warn(`Failed to download ${url}: ${response.status}`);
    return;
  }
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(path.join(ASSET_DIR, filename), Buffer.from(buffer));
  console.log(`Saved Asset: ${filename}`);
}

function saveData(filename, data) {
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`Saved Data: ${filename}`);
}

function getExtension(type, descr) {
  if (type === 1) return '.pdf';
  if (type === 0) return '.jpg';
  if (type === 3) return '.rfa';
  if (type === 2) return '.dwg';
  return '.bin';
}

async function extractData() {
  try {
    // 1. Fetch Manufacturer List
    console.log('--- Step 1: Fetching Manufacturer List ---');
    const mfrUrl = `${BASE_URL}/GetMobileList/T/_?filter[filters][0][value]=&Manufacturer=0&Category=0&SortOrder=0&Filter=`;
    const manufacturers = await fetchJSON(mfrUrl);
    saveData('manufacturers.json', manufacturers);

    await sleep(2000, 4000);

    // 2. Models for 3M Purification (ID 45)
    console.log('--- Step 2: Fetching models for 3M Purification (ID 45) ---');
    const mfrId = 45;
    const modelsUrl = `${BASE_URL}/GetMobileList/_/_?filter[filters][0][value]=&PageSize=75&Page=1&Manufacturer=${mfrId}&Category=0&SortOrder=1&Filter=&CatText=null`;
    const models = await fetchJSON(modelsUrl);
    saveData(`models_${mfrId}.json`, models);

    // 3. Detailed data and binary assets for sample models
    if (models && models.Data && models.Data.length > 0) {
      const sampleModels = models.Data.slice(0, 3);
      for (const model of sampleModels) {
        await sleep(2000, 5000);
        const modelId = model.ID;
        const modelDataUrl = `${BASE_URL}/GetModelData/${modelId}/`;
        const modelData = await fetchJSON(modelDataUrl);
        saveData(`model_${modelId}_data.json`, modelData);

        const mfrPath = modelData.MfrPath; // e.g., "CU"
        const modelName = modelData.Model.replace(/\$_0\$/g, ' '); // Clean up name for URL

        // Download assets for this model using the identified UI preview paths
        if (modelData.MediaInfos && modelData.MediaInfos.length > 0) {
          console.log(`--- Downloading assets for Model ${modelId} ---`);
          for (const media of modelData.MediaInfos) {
            await sleep(1000, 3000);
            const ext = getExtension(media.type, media.Descr);
            const fileName = `${modelId}_${media.$id}${ext}`;
            
            let downloadUrl;
            if (media.type === 0) {
              // Image
              downloadUrl = `https://app.kclcad.com/kustomimage/${mfrPath}/Pictures/${media.MediaLocation}`;
            } else if (media.type === 1) {
              // Spec Sheet
              downloadUrl = `https://app.kclcad.com/kustomdrawing/${mfrPath}/SpecSheets/${media.MediaLocation}`;
            } else if (media.type === 3) {
              // Revit - UI uses a complex path, attempting best guess based on patterns
              downloadUrl = `https://app.kclcad.com/kustomdrawing/${mfrPath}/${modelName}/Revit/${media.MediaLocation}/large`;
            } else if (media.type === 2) {
              // DWG
              downloadUrl = `https://app.kclcad.com/kustomdrawing/${mfrPath}/${modelName}/DWG/${media.MediaLocation}/large`;
            }

            if (downloadUrl) {
              await downloadFile(downloadUrl, fileName);
            }
          }
        }
      }
    }

    console.log('Data and Asset extraction completed successfully.');
  } catch (error) {
    console.error('Error during extraction:', error);
  }
}

extractData();
