export const NOTE_EDITOR_TEMPLATE = /* html */ `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';" />
  <title>Note</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }
    #header {
      padding: 10px 14px 6px;
      border-bottom: 1px solid var(--vscode-panel-border, rgba(128,128,128,0.35));
      flex-shrink: 0;
    }
    #titleInput {
      display: block;
      width: 100%;
      background: transparent;
      border: none;
      border-bottom: 1px solid transparent;
      color: var(--vscode-editor-foreground);
      font-size: 1.05em;
      font-weight: 600;
      font-family: inherit;
      outline: none;
      padding: 2px 0 4px;
      transition: border-color 0.15s;
    }
    #titleInput:focus {
      border-bottom-color: var(--vscode-focusBorder);
    }
    #titleInput::placeholder {
      color: var(--vscode-input-placeholderForeground);
      font-weight: normal;
    }
    #meta {
      margin-top: 4px;
      font-size: 0.78em;
      color: var(--vscode-descriptionForeground);
    }
    #contentArea {
      flex: 1;
      width: 100%;
      background: transparent;
      border: none;
      color: var(--vscode-editor-foreground);
      font-family: var(--vscode-editor-font-family, 'Consolas', monospace);
      font-size: var(--vscode-editor-font-size, 13px);
      line-height: 1.6;
      padding: 12px 14px;
      resize: none;
      outline: none;
    }
  </style>
</head>
<body>
  <div id="header">
    <input id="titleInput" type="text" placeholder="(Untitled)" value="{{TITLE}}" />
    <div id="meta">Modified: <span id="modDate">{{MODIFIED_AT}}</span></div>
  </div>
  <textarea id="contentArea" spellcheck="false">{{CONTENT}}</textarea>
  <script>
    const vscode = acquireVsCodeApi();
    let saveTimer = null;
    let lastSavedContent = document.getElementById('contentArea').value;
    let lastSavedTitle = document.getElementById('titleInput').value;

    function scheduleAutoSave() {
      if (saveTimer) { clearTimeout(saveTimer); }
      saveTimer = setTimeout(doSave, 500);
    }

    function doSave() {
      const content = document.getElementById('contentArea').value;
      const title = document.getElementById('titleInput').value;
      if (content === lastSavedContent && title === lastSavedTitle) { return; }
      lastSavedContent = content;
      lastSavedTitle = title;
      vscode.postMessage({ type: 'save', content, title });
    }

    document.getElementById('contentArea').addEventListener('input', scheduleAutoSave);
    document.getElementById('titleInput').addEventListener('input', scheduleAutoSave);

    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (msg.type === 'saved') {
        document.getElementById('modDate').textContent = msg.modifiedAt;
      } else if (msg.type === 'updateTitle') {
        const title = msg.title || '';
        document.getElementById('titleInput').value = title;
        lastSavedTitle = title;
      }
    });
  </script>
</body>
</html>`;
