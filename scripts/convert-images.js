const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '..', 'assets');
const imagesDir = path.join(assetsDir, 'images');

async function convertSvgToPng(inputFile, outputFile) {
  try {
    const svgBuffer = fs.readFileSync(inputFile);
    await sharp(svgBuffer)
      .resize(1024, 1024)
      .png()
      .toFile(outputFile);
    console.log(`Converted ${inputFile} to ${outputFile}`);
  } catch (error) {
    console.error(`Error converting ${inputFile}:`, error);
  }
}

async function convertAllImages() {
  const files = ['icon.svg', 'adaptive-icon.svg', 'splash.svg'];
  
  for (const file of files) {
    const inputFile = path.join(assetsDir, file);
    const outputFile = path.join(imagesDir, file.replace('.svg', '.png'));
    await convertSvgToPng(inputFile, outputFile);
  }
}

convertAllImages();