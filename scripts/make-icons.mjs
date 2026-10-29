import sharp from 'sharp'
import fs from 'node:fs'
const svg = fs.readFileSync('assets/icon.svg')
await sharp(svg).resize(512, 512).png().toFile('assets/icon.png')
console.log('assets/icon.png создан')
