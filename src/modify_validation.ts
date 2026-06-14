import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

const validationEndpoint = `
app.post("/api/automation/run-validation", checkAuth, async (req: any, res) => {
  req.setTimeout(900000); // 15 minutes timeout
  res.setTimeout(900000);

  try {
    const liveImgPath = path.join(process.cwd(), "live_automation.png");
    if (fs.existsSync(liveImgPath)) {
      fs.unlinkSync(liveImgPath);
    }
  } catch (err: any) {
    console.error("Error deleting live_automation.png:", err.message);
  }

  const { notebookLMCookies, notebookLMUrl, googleEmail, googlePassword } = req.body || {};

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const keepAliveInterval = setInterval(() => {
    try {
      res.write(": keepalive\\n\\n");
    } catch (_) {}
  }, 10000);

  const sendEvent = (data: any) => {
    res.write(\`data: \${JSON.stringify(data)}\\n\\n\`);
  };

  const addLog = (msg: string) => {
    console.log(msg);
    sendEvent({ type: "log", msg });
  };

  const sendProgress = (value: number) => {
    sendEvent({ type: "progress", value: Math.min(Math.round(value), 100) });
  };

  let browser: any = null;
  stopRequested = false;

  try {
    sendProgress(5);
    addLog("[SYSTEM] Iniciando proceso de Validación...");

    addLog("[NOTEBOOK-LM] Iniciando Puppeteer...");
    browser = await puppeteer.launch(getPuppeteerLaunchOptions());
    activeBrowser = browser;

    const nbPage = await browser.newPage();

    await nbPage.evaluateOnNewDocument(\`
      globalThis.__name = (fn) => fn;
      Object.defineProperty(navigator, "webdriver", {
        get: () => undefined,
      });
      Object.defineProperty(navigator, "languages", {
        get: () => ["es-ES", "es", "en-US", "en"],
      });
    \`);

    // NUEVA RESOLUCIÓN REQUERIDA: 1920 x 1080 píxeles
    addLog("[NOTEBOOK-LM] Cambiando dimensiones de pantalla a 1920 × 1080 píxeles...");
    await nbPage.setViewport({ width: 1920, height: 1080 });
    await nbPage.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36");

    addLog("[NOTEBOOK-LM] Inyectando cookies de sesión...");
    if (notebookLMCookies) {
      try {
        const parsedCookies = JSON.parse(notebookLMCookies);
        if (Array.isArray(parsedCookies)) {
          for (const rawCookie of parsedCookies) {
            const normalizedCookie = {
              name: rawCookie.name,
              value: rawCookie.value,
              domain: rawCookie.domain || ".google.com",
              path: rawCookie.path || "/",
              secure: rawCookie.secure !== undefined ? rawCookie.secure : true,
              sameSite: rawCookie.sameSite || "Lax"
            };
            await nbPage.setCookie(normalizedCookie);
          }
          addLog("[NOTEBOOK-LM] Cookies inyectadas con éxito.");
        } else {
          addLog("[WARNING] Formato de cookies incorrecto (debe ser array).");
        }
      } catch (cookErr: any) {
        addLog(\`[WARNING] Error parsing de cookies: \${cookErr.message}\`);
      }
    }

    addLog(\`[NOTEBOOK-LM] Navegando al espacio proporcionado: \${notebookLMUrl}\`);
    await nbPage.goto(notebookLMUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    sendProgress(20);

    // Wait and screenshot
    await new Promise(r => setTimeout(r, 6000));
    captureLiveScreenshot(nbPage).catch(() => {});
    
    addLog("[BOT-VALIDACION] Haciendo scroll hacia abajo en el panel lateral...");
    await nbPage.evaluate(() => {
        const panels = Array.from(document.querySelectorAll('div, aside, section')).filter(e => e.scrollHeight > e.clientHeight);
        for(let p of panels) {
            p.scrollTop = p.scrollHeight;
        }
    });
    await new Promise(r => setTimeout(r, 2000));
    captureLiveScreenshot(nbPage).catch(() => {});

    addLog("[BOT-VALIDACION] Buscando documento de auditoría...");
    const docClicked = await nbPage.evaluate(() => {
        const els = Array.from(document.querySelectorAll('div, span, button, p, a, div[role="button"]'));
        for (let el of els) {
            const txt = (el.textContent || "").toLowerCase();
            if (txt.includes('auditoria aciertos') || txt.includes('auditoría aciertos') || txt.includes('auditoría aciertos y')) {
                const rect = el.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    const hEL = el as HTMLElement;
                    hEL.style.border = "3px solid red";
                    hEL.style.backgroundColor = "rgba(255, 0, 0, 0.2)";
                    hEL.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    const centerX = rect.x + rect.width / 2;
                    const centerY = rect.y + rect.height / 2;
                    
                    // Inject a visible red pointer with coordinates
                    const pointer = document.createElement("div");
                    pointer.innerHTML = \`📍 CLIC AQUÍ (\${Math.round(centerX)}, \${Math.round(centerY)})\`;
                    pointer.style.position = "fixed";
                    pointer.style.left = \`\${centerX}px\`;
                    pointer.style.top = \`\${centerY - 30}px\`;
                    pointer.style.backgroundColor = "red";
                    pointer.style.color = "white";
                    pointer.style.fontWeight = "bold";
                    pointer.style.padding = "4px 8px";
                    pointer.style.borderRadius = "4px";
                    pointer.style.zIndex = "999999";
                    pointer.style.border = "2px solid white";
                    pointer.style.pointerEvents = "none";
                    document.body.appendChild(pointer);

                    setTimeout(() => hEL.click(), 1000);
                    return { found: true, x: Math.round(centerX), y: Math.round(centerY) };
                }
            }
        }
        return { found: false, x: 0, y: 0 };
    });

    if (docClicked.found) {
        addLog(\`[BOT-VALIDACION] Se hará clic en el documento de auditoría en (\${docClicked.x}, \${docClicked.y}). Esperando que cargue...\`);
        captureLiveScreenshot(nbPage).catch(() => {});
        await new Promise(r => setTimeout(r, 4500));
        captureLiveScreenshot(nbPage).catch(() => {});
        addLog(\`[NOTEBOOK-LM] Buscando y haciendo clic en 'Sync con Google Drive'...\`);
        
        const syncClicked = await nbPage.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button, div[role="button"], span, div, a'));
            for (let btn of buttons) {
                const t = (btn.textContent || "").toLowerCase();
                const aria = (btn.getAttribute("aria-label") || "").toLowerCase();
                const tit = (btn.getAttribute("title") || "").toLowerCase();
                if (t.includes('sync') || t.includes('sincronizar') || aria.includes('sync') || tit.includes('sync')) {
                    const rect = btn.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0 && !btn.closest('[disabled]')) {
                        const hBtn = btn as HTMLElement;
                        hBtn.style.border = "3px solid red";
                        hBtn.style.backgroundColor = "rgba(255, 0, 0, 0.2)";
                        
                        const centerX = rect.x + rect.width / 2;
                        const centerY = rect.y + rect.height / 2;
                        
                        const pointer = document.createElement("div");
                        pointer.innerHTML = \`📍 SYNC CLIC (\${Math.round(centerX)}, \${Math.round(centerY)})\`;
                        pointer.style.position = "fixed";
                        pointer.style.left = \`\${centerX}px\`;
                        pointer.style.top = \`\${centerY - 40}px\`;
                        pointer.style.backgroundColor = "red";
                        pointer.style.color = "white";
                        pointer.style.fontWeight = "bold";
                        pointer.style.padding = "4px 8px";
                        pointer.style.borderRadius = "4px";
                        pointer.style.zIndex = "999999";
                        pointer.style.border = "2px solid white";
                        pointer.style.pointerEvents = "none";
                        document.body.appendChild(pointer);

                        setTimeout(() => hBtn.click(), 1000);
                        return { found: true, x: Math.round(centerX), y: Math.round(centerY) };
                    }
                }
            }
            return { found: false, x: 0, y: 0 };
        });
        
        if (syncClicked.found) {
            addLog(\`[BOT-VALIDACION] ¡Clic en Sync en las coordenadas (\${syncClicked.x}, \${syncClicked.y})!\`);
            captureLiveScreenshot(nbPage).catch(() => {});
            await new Promise(r => setTimeout(r, 5000));
            captureLiveScreenshot(nbPage).catch(() => {});
        } else {
            addLog("[BOT-VALIDACION] No se encontró el botón de sincronización.");
        }
    } else {
        addLog(\`[BOT-VALIDACION] No se pudo encontrar el documento 'auditoría aciertos y mejoras' en la interfaz.\`);
    }

    sendProgress(100);
    sendEvent({ type: "success" });
  } catch (err: any) {
    addLog(\`[ERROR-CRITICAL] \${err.message}\`);
    sendEvent({ type: "error", msg: err.message });
  } finally {
    clearInterval(keepAliveInterval);
    if (!stopRequested && browser) {
      addLog("[SYSTEM] Cerrando navegador...");
      await browser.close().catch(() => {});
      activeBrowser = null;
    }
    res.end();
  }
});
`;

if (!content.includes('/api/automation/run-validation')) {
    const splitStr = 'app.post("/api/automation/run-detailed-analysis"';
    const parts = content.split(splitStr);
    content = parts[0] + validationEndpoint + '\n\n' + splitStr + parts[1];
    fs.writeFileSync('server.ts', content);
    console.log('Added /api/automation/run-validation');
} else {
    console.log('Endpoint already exists');
}
