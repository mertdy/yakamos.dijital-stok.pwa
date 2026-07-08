import fs from 'fs';
import path from 'path';

const iconMap = {
  'edit': 'Edit',
  'delete': 'Trash2',
  'inventory': 'Package',
  'arrow-upward': 'ArrowUp',
  'arrow-downward': 'ArrowDown',
  'close': 'X',
  'barcode-scanner': 'ScanBarcode',
  'search': 'Search',
  'image': 'Image',
  'add': 'Plus',
  'shopping-cart': 'ShoppingCart',
  'delete-sweep': 'Trash2',
  'shopping-basket': 'ShoppingBasket',
  'remove': 'Minus',
  'payments': 'Banknote',
  'inventory-2': 'Package',
  'search-off': 'SearchX',
  'wifi-off': 'WifiOff',
  'sync': 'RefreshCw',
  'cloud-upload': 'CloudUpload',
  'cloud-done': 'Cloud',
  'store': 'Store',
  'point-of-sale': 'MonitorCheck'
};

const srcDir = path.join(process.cwd(), 'src');

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            // Handle testing files mock
            if (content.includes("vi.mock('@iconify/react'")) {
                 content = content.replace(/vi\.mock\('@iconify\/react'.+?\}\)\);/s, "vi.mock('lucide-react', () => new Proxy({}, { get: () => () => <div data-testid=\"icon\" /> }));");
                 modified = true;
            }

            // Find all Icon usages
            const iconUsageRegex = /<Icon\s+icon="material-symbols-rounded:([^"]+)"([^>]*)>/g;
            const usedIconsInFile = new Set();
            
            content = content.replace(iconUsageRegex, (match, iconName, rest) => {
                const lucideName = iconMap[iconName];
                if (!lucideName) {
                    console.warn(`MISSING MAPPING FOR ${iconName} in ${file}`);
                    return match;
                }
                usedIconsInFile.add(lucideName);
                
                // For MainLayout, the icons are strings in the object. We will handle that below.
                return `<${lucideName}${rest}>`;
            });

            // Find object strings in MainLayout
            const stringIconRegex = /icon:\s*'material-symbols-rounded:([^']+)'/g;
            content = content.replace(stringIconRegex, (match, iconName) => {
                const lucideName = iconMap[iconName];
                if (lucideName) usedIconsInFile.add(lucideName);
                return `icon: ${lucideName}`; // Remove quotes to pass component reference
            });

            if (usedIconsInFile.size > 0 || modified) {
                // Remove Iconify import
                content = content.replace(/import\s+{\s*Icon\s*}\s+from\s+'@iconify\/react';?\n?/, '');
                
                // Add Lucide import
                if (usedIconsInFile.size > 0) {
                    const importStatement = `import { ${Array.from(usedIconsInFile).join(', ')} } from 'lucide-react';\n`;
                    // Insert after other imports
                    const lastImportIdx = content.lastIndexOf('import ');
                    const endOfLastImport = content.indexOf('\n', lastImportIdx) + 1;
                    content = content.slice(0, endOfLastImport) + importStatement + content.slice(endOfLastImport);
                }
                
                fs.writeFileSync(fullPath, content);
                console.log(`Updated ${file}`);
            }
        }
    }
}

walk(srcDir);
console.log('Migration complete');
