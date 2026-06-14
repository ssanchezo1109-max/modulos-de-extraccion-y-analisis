import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add state variables
const stateVars = `
  const [isUpdateAuditRunning, setIsUpdateAuditRunning] = useState(false);
  const [updateAuditLogs, setUpdateAuditLogs] = useState<string[]>([]);
  const [updateAuditProgress, setUpdateAuditProgress] = useState(0);

  // Validation states
  const [isValidationRunning, setIsValidationRunning] = useState(false);
  const [validationLogs, setValidationLogs] = useState<string[]>([]);
  const [validationProgress, setValidationProgress] = useState(0);
`;

content = content.replace(
  `  const [isUpdateAuditRunning, setIsUpdateAuditRunning] = useState(false);
  const [updateAuditLogs, setUpdateAuditLogs] = useState<string[]>([]);
  const [updateAuditProgress, setUpdateAuditProgress] = useState(0);`,
  stateVars
);


// 2. Add handleRunValidation function
const funcToAdd = `
  const handleRunValidation = async () => {
    setIsValidationRunning(true);
    setValidationLogs(['[SYSTEM] Iniciando Proceso de Validación...']);
    setValidationProgress(0);

    isStoppedRef.current = false;
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error("No Google Access Token found. Please Sign In again.");
      }

      localStorage.setItem('notebook_lm_cookies', notebookLMCookies);
      localStorage.setItem('notebook_lm_url', notebookLMUrl);
      localStorage.setItem('google_email', googleEmail);
      localStorage.setItem('google_password', googlePassword);

      abortControllerRef.current = new AbortController();

      const response = await fetch('/api/automation/run-validation', {
        method: 'POST',
        signal: abortControllerRef.current.signal,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${token}\`
        },
        body: JSON.stringify({ 
          notebookLMCookies, 
          notebookLMUrl,
          googleEmail,
          googlePassword
        })
      });

      if (!response.body) throw new Error("No response body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        if (isStoppedRef.current) break;
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              if (data.type === 'log') {
                setValidationLogs(prev => [...prev, data.msg]);
              } else if (data.type === 'progress') {
                setValidationProgress(data.value);
              } else if (data.type === 'error') {
                setValidationLogs(prev => [...prev, \`[ERROR] \${data.msg}\`]);
                alert(\`Error Validation: \${data.msg}\`);
              }
            } catch (e) {
              // ignore
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setValidationLogs(prev => [...prev, '[SYSTEM] Proceso detenido por el usuario.']);
      } else {
        console.error(err);
        setValidationLogs(prev => [...prev, \`[ERROR] \${err.message}\`]);
        alert("Error en validación: " + err.message);
      }
    } finally {
      setIsValidationRunning(false);
      setValidationProgress(100);
    }
  };
`;

if (!content.includes('const handleRunValidation = async () => {')) {
  // Insert before handleRunUpdateAudit
  const target = 'const handleRunUpdateAudit = async () => {';
  content = content.replace(target, funcToAdd + '\n  ' + target);
}


// 3. Update the AllInOne disabled check and logic if necessary (I will just add it to isUpdateAuditRunning checks where appropriate)
content = content.replace(/isDetailedAnalysisRunning \|\| isUpdateAuditRunning/g, 'isDetailedAnalysisRunning || isUpdateAuditRunning || isValidationRunning');
content = content.replace(/isAnalysisRunning \|\| isDetailedAnalysisRunning \|\| isUpdateAuditRunning/g, 'isAnalysisRunning || isDetailedAnalysisRunning || isUpdateAuditRunning || isValidationRunning');

// Specifically update the logs mapping
content = content.replace(
  `                  {(isUpdateAuditRunning ? updateAuditLogs : detailedAnalysisLogs).map((log, index) => {`,
  `                  {(isValidationRunning ? validationLogs : isUpdateAuditRunning ? updateAuditLogs : detailedAnalysisLogs).map((log, index) => {`
);

// Progress and labels
content = content.replace(
  `{isUpdateAuditRunning ? 'ACTUALIZANDO AUDITORÍA (MERCADO, ACCIONES, DRIVE)' : 'PROCESANDO ANÁLISIS DETALLADO (8 TICKERS SECUENCIALES)'}`,
  `{isValidationRunning ? 'VALIDANDO AUDITORÍA EN NOTEBOOKLM Y SINC' : isUpdateAuditRunning ? 'ACTUALIZANDO AUDITORÍA (MERCADO, ACCIONES, DRIVE)' : 'PROCESANDO ANÁLISIS DETALLADO (8 TICKERS SECUENCIALES)'}`
);
content = content.replace(
  `{isUpdateAuditRunning ? updateAuditProgress : detailedAnalysisProgress}%`,
  `{isValidationRunning ? validationProgress : isUpdateAuditRunning ? updateAuditProgress : detailedAnalysisProgress}%`
);
content = content.replace(
  `style={{ width: \`\${isUpdateAuditRunning ? updateAuditProgress : detailedAnalysisProgress}%\` }}`,
  `style={{ width: \`\${isValidationRunning ? validationProgress : isUpdateAuditRunning ? updateAuditProgress : detailedAnalysisProgress}%\` }}`
);

// Modify info text
content = content.replace(
  `{isUpdateAuditRunning 
                    ? 'Por favor, mantén esta ventana abierta. El robot está cambiando la resolución de NotebookLM a 1920x1080, desmarcando todo con "Select All", seleccionando las 8 acciones y "material estudio mercado", expandiendo la carpeta "Trading Strategy" para seleccionar "Resultados", leyendo el tercer prompt de Google Drive, procesando la IA y finalmente actualizando el documento "Auditoría aciertos y posibles mejoras" en Drive.'
                    : 'Por favor, mantén esta ventana abierta. El robot Puppeteer está buscando el bloc "Prompts nootbooklm", extrayendo cada indicador clave, ingresándolos uno a uno en NotebookLM y guardando los resultados consolidados.'
                  }`,
  `{isValidationRunning
                    ? 'Por favor, mantén esta ventana abierta. El robot está ingresando a NotebookLM, buscando el documento de Auditoría aciertos y mejoras, y dando clic en Sincronizar.'
                    : isUpdateAuditRunning 
                    ? 'Por favor, mantén esta ventana abierta. El robot está cambiando la resolución de NotebookLM a 1920x1080, desmarcando todo con "Select All", seleccionando las 8 acciones y "material estudio mercado", expandiendo la carpeta "Trading Strategy" para seleccionar "Resultados", leyendo el tercer prompt de Google Drive, procesando la IA y finalmente actualizando el documento "Auditoría aciertos y posibles mejoras" en Drive.'
                    : 'Por favor, mantén esta ventana abierta. El robot Puppeteer está buscando el bloc "Prompts nootbooklm", extrayendo cada indicador clave, ingresándolos uno a uno en NotebookLM y guardando los resultados consolidados.'
                  }`
);


// 4. Add the button after the RunUpdateAudit button
const runUpdateAuditBtnStr = `                        {isUpdateAuditRunning ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Actualizando Auditoría...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-3.5 h-3.5" />
                            Actualizar Auditoría
                          </>
                        )}
                      </button>`;
                      
const validationBtnStr = `
                      <button
                        type="button"
                        onClick={handleRunValidation}
                        disabled={isAnalysisRunning || isDetailedAnalysisRunning || isUpdateAuditRunning || isValidationRunning || !isAuthenticated || !notebookLMCookies || !notebookLMUrl}
                        className={\`w-full py-2 text-[10px] font-black uppercase tracking-wider transition-all rounded-md cursor-pointer flex items-center justify-center gap-1.5 border \${
                          isValidationRunning
                          ? 'bg-purple-600/20 text-purple-300 border border-purple-500/20 cursor-not-allowed'
                          : (!isAuthenticated || !notebookLMCookies || !notebookLMUrl || isAnalysisRunning || isDetailedAnalysisRunning)
                          ? 'bg-slate-800/40 text-slate-500 border border-slate-800/60 cursor-not-allowed'
                          : 'bg-purple-600 hover:bg-purple-500 text-white border-purple-500/30 shadow-md hover:shadow-[0_0_12px_rgba(168,85,247,0.35)]'
                        }\`}
                      >
                        {isValidationRunning ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Validando...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Validación
                          </>
                        )}
                      </button>`;
                      
if (content.includes('Actualizar Auditoría') && !content.includes('handleRunValidation')) {
    content = content.replace(runUpdateAuditBtnStr, runUpdateAuditBtnStr + validationBtnStr);
}


fs.writeFileSync('src/App.tsx', content);
console.log('App.tsx updated');
