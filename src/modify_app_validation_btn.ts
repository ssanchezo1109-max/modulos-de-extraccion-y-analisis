import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

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
                          : 'bg-indigo-600 hover:bg-indigo-550 text-white border-indigo-500/30 shadow-md hover:shadow-[0_0_12px_rgba(79,70,229,0.35)]'
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
                      </button>
                    </div>`;
                    
content = content.replace(
  `                            Actualizar Auditoría
                          </>
                        )}
                      </button>
                    </div>`,
  `                            Actualizar Auditoría
                          </>
                        )}
                      </button>
` + validationBtnStr
);

fs.writeFileSync('src/App.tsx', content);
