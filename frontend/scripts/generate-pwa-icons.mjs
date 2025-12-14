/**
 * Script para gerar ícones PWA em múltiplos tamanhos
 * Execute: node scripts/generate-pwa-icons.mjs
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const SOURCE_ICON = path.join(__dirname, '../public/favicon.svg');
const OUTPUT_DIR = path.join(__dirname, '../public/icons');

// Criar diretório de ícones se não existir
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log('✓ Diretório de ícones criado:', OUTPUT_DIR);
}

// Verificar se o arquivo fonte existe
if (!fs.existsSync(SOURCE_ICON)) {
  console.error('✗ Arquivo fonte não encontrado:', SOURCE_ICON);
  process.exit(1);
}

console.log('\n🎨 Gerando ícones PWA para EDUCA+ Curionópolis\n');
console.log('Fonte:', SOURCE_ICON);
console.log('Destino:', OUTPUT_DIR);
console.log('');

// Criar ícones PNG usando sharp (se disponível) ou criar placeholder
async function generateIcons() {
  try {
    // Tentar usar sharp para converter SVG para PNG
    const sharp = await import('sharp');
    
    for (const size of ICON_SIZES) {
      const outputPath = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`);
      
      await sharp.default(SOURCE_ICON)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`✓ Gerado: icon-${size}x${size}.png`);
    }
    
    console.log('\n✅ Todos os ícones foram gerados com sucesso!\n');
    
  } catch (error) {
    console.log('⚠ Sharp não está instalado. Criando ícones placeholder...');
    console.log('  Para ícones de alta qualidade, instale sharp: npm install sharp\n');
    
    // Criar SVG placeholder para cada tamanho
    for (const size of ICON_SIZES) {
      const outputPath = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`);
      
      // Copiar o favicon.svg como referência temporária
      // Na produção, você deve substituir por PNGs reais
      const svgContent = fs.readFileSync(SOURCE_ICON, 'utf8');
      
      // Criar um arquivo de marcador
      const placeholder = `<!-- Substituir por PNG ${size}x${size} -->\n${svgContent}`;
      fs.writeFileSync(outputPath.replace('.png', '.svg'), placeholder);
      
      console.log(`✓ Placeholder criado: icon-${size}x${size}.svg`);
    }
    
    console.log('\n⚠ Ícones placeholder criados como SVG.');
    console.log('  Para gerar PNGs reais:\n');
    console.log('  1. Instale sharp: npm install sharp');
    console.log('  2. Execute novamente: node scripts/generate-pwa-icons.mjs');
    console.log('  Ou converta manualmente o favicon.svg para os tamanhos necessários.\n');
  }
}

// Criar também apple-touch-icon
async function createAppleTouchIcon() {
  const applePath = path.join(__dirname, '../public/apple-touch-icon.png');
  
  try {
    const sharp = await import('sharp');
    
    await sharp.default(SOURCE_ICON)
      .resize(180, 180)
      .png()
      .toFile(applePath);
    
    console.log('✓ Gerado: apple-touch-icon.png (180x180)');
    
  } catch (error) {
    console.log('⚠ apple-touch-icon não gerado (sharp não disponível)');
  }
}

generateIcons().then(() => createAppleTouchIcon());
