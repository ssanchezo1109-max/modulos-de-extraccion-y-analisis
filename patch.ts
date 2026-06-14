import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');

// replace 80, 620 with 80, 630
code = code.replace(/80, 620/g, '80, 630');
code = code.replace(/620px/g, '630px');

// Wait 5 seconds after clicking the document
// First, update doc click timeout from 3000 to 5000 in AUDITORIA
code = code.replace(/addLog\(\`\[BOT-AUDITORIA\] Se hará clic en el documento de auditoría en \(\$\{docClicked\.x\}, \$\{docClicked\.y\}\)\. Esperando que cargue\.\.\.\`\);\n            await new Promise\(r => setTimeout\(r, 3000\)\);/, 
`addLog(\`[BOT-AUDITORIA] Se hará clic en el documento de auditoría en (\${docClicked.x}, \${docClicked.y}). Esperando que cargue...\`);
            await new Promise(r => setTimeout(r, 5000));`);

// Second, update doc click timeout from 3000 to 5000 in VALIDACION
code = code.replace(/addLog\(\`\[BOT-VALIDACION\] Se hará clic en el documento de auditoría en \(\$\{docClicked\.x\}, \$\{docClicked\.y\}\)\. Esperando que cargue\.\.\.\`\);\n        updateLiveScreenshot\(nbPage, "Buscando documento"\)\.catch\(\(\) => \{\}\);\n        await new Promise\(r => setTimeout\(r, 3000\)\);/,
`addLog(\`[BOT-VALIDACION] Se hará clic en el documento de auditoría en (\${docClicked.x}, \${docClicked.y}). Esperando que cargue...\`);
        updateLiveScreenshot(nbPage, "Buscando documento").catch(() => {});
        await new Promise(r => setTimeout(r, 5000));`);

// Update syncClicked matching criteria to include "google drive"
code = code.replace(/if \(t\.includes\('sync'\) \|\| t\.includes\('sincronizar'\) \|\| aria\.includes\('sync'\) \|\| tit\.includes\('sync'\)\) \{/g, 
`if (t.includes('sync') || t.includes('sincronizar') || aria.includes('sync') || tit.includes('sync') || t.includes('google drive') || aria.includes('google drive') || tit.includes('google drive')) {`);

fs.writeFileSync('server.ts', code);
