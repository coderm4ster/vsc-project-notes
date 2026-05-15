export const NOTES_TREE_TEMPLATE = /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="{{CSP}}">
  <style>
    * { box-sizing: border-box; user-select: none; }
    body {
      margin: 0; padding: 0;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: transparent;
    }
    ul { list-style: none; margin: 0; padding: 0; }
    .note-item {
      padding: 5px 12px 6px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .note-item:hover { background: var(--vscode-list-hoverBackground); }
    .note-row {
      display: flex;
      align-items: center;
      gap: 4px;
      min-width: 0;
    }
    .note-title {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .note-actions {
      display: flex;
      gap: 1px;
      opacity: 0;
      transition: opacity 0.1s;
      flex-shrink: 0;
    }
    .note-item:hover .note-actions { opacity: 1; }
    .note-item:focus { outline: none; }
    .note-item.selected,
    .note-item.selected:hover {
      background: var(--vscode-list-activeSelectionBackground);
      color: var(--vscode-list-activeSelectionForeground);
    }
    .note-item.selected .note-date {
      color: var(--vscode-list-activeSelectionForeground);
    }
    .note-item.selected .note-actions { opacity: 1; }
    .note-item.selected .action-btn {
      color: var(--vscode-list-activeSelectionForeground);
    }
    .action-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 2px 3px;
      color: var(--vscode-icon-foreground);
      display: flex;
      align-items: center;
      border-radius: 3px;
    }
    .action-btn:hover { background: var(--vscode-toolbar-hoverBackground); }
    .action-btn svg { width: 18px; height: 18px; display: block; fill: currentColor; }
    .note-date {
      font-size: 0.85em;
      color: var(--vscode-descriptionForeground);
    }
    .welcome {
      padding: 12px 20px;
    }
    .welcome p {
      margin: 0 0 10px;
      color: var(--vscode-descriptionForeground);
      font-size: 13px;
      line-height: 1.4;
    }
    .welcome-btn {
      display: block;
      width: 70%;
      margin: 6px auto;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 6px 0;
      font-size: 13px;
      cursor: pointer;
      border-radius: 3px;
      font-family: inherit;
      text-align: center;
    }
    .welcome-btn:hover { background: var(--vscode-button-hoverBackground); }
    #ctx-menu {
      position: fixed;
      background: var(--vscode-menu-background);
      border: 1px solid var(--vscode-menu-border, var(--vscode-contrastBorder, transparent));
      border-radius: 5px;
      box-shadow: 0 2px 8px var(--vscode-widget-shadow);
      padding: 4px 0;
      z-index: 9999;
      display: none;
      min-width: 160px;
    }
    .ctx-item {
      padding: 0 12px;
      line-height: 22px;
      cursor: default;
      font-size: 13px;
      color: var(--vscode-menu-foreground);
      white-space: nowrap;
    }
    .ctx-item:hover {
      background: var(--vscode-list-hoverBackground);
      color: var(--vscode-menu-foreground);
      border-radius: 3px;
      margin: 0 4px;
      padding: 0 8px;
    }
    .ctx-sep {
      height: 1px;
      background: var(--vscode-menu-separatorBackground);
      margin: 4px 0;
    }
  </style>
</head>
<body>
  <ul id="list"></ul>
  <div id="msg" style="display:none"></div>
  <div id="ctx-menu">
    <div class="ctx-item" id="ctx-open">Open Note</div>
    <div class="ctx-item" id="ctx-rename">Rename Note</div>
    <div class="ctx-sep"></div>
    <div class="ctx-item" id="ctx-delete">Delete Note</div>
  </div>
  <script nonce="{{NONCE}}">
    const vscode = acquireVsCodeApi();
    const listEl = document.getElementById('list');
    const msgEl = document.getElementById('msg');

    const PENCIL = '<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M14.236 1.76386C13.2123 0.740172 11.5525 0.740171 10.5289 1.76386L2.65722 9.63549C2.28304 10.0097 2.01623 10.4775 1.88467 10.99L1.01571 14.3755C0.971767 14.5467 1.02148 14.7284 1.14646 14.8534C1.27144 14.9783 1.45312 15.028 1.62432 14.9841L5.00978 14.1151C5.52234 13.9836 5.99015 13.7168 6.36433 13.3426L14.236 5.47097C15.2596 4.44728 15.2596 2.78755 14.236 1.76386ZM11.236 2.47097C11.8691 1.8378 12.8957 1.8378 13.5288 2.47097C14.162 3.10413 14.162 4.1307 13.5288 4.76386L12.75 5.54269L10.4571 3.24979L11.236 2.47097ZM9.75002 3.9569L12.0429 6.24979L5.65722 12.6355C5.40969 12.883 5.10023 13.0595 4.76117 13.1465L2.19447 13.8053L2.85327 11.2386C2.9403 10.8996 3.1168 10.5901 3.36433 10.3426L9.75002 3.9569Z"/></svg>';
    const TRASH  = '<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M14 2H10C10 0.897 9.103 0 8 0C6.897 0 6 0.897 6 2H2C1.724 2 1.5 2.224 1.5 2.5C1.5 2.776 1.724 3 2 3H2.54L3.349 12.708C3.456 13.994 4.55 15 5.84 15H10.159C11.449 15 12.543 13.993 12.65 12.708L13.459 3H13.999C14.275 3 14.499 2.776 14.499 2.5C14.499 2.224 14.275 2 13.999 2H14ZM8 1C8.551 1 9 1.449 9 2H7C7 1.449 7.449 1 8 1ZM11.655 12.625C11.591 13.396 10.934 14 10.16 14H5.841C5.067 14 4.41 13.396 4.346 12.625L3.544 3H12.458L11.656 12.625H11.655ZM7 5.5V11.5C7 11.776 6.776 12 6.5 12C6.224 12 6 11.776 6 11.5V5.5C6 5.224 6.224 5 6.5 5C6.776 5 7 5.224 7 5.5ZM10 5.5V11.5C10 11.776 9.776 12 9.5 12C9.224 12 9 11.776 9 11.5V5.5C9 5.224 9.224 5 9.5 5C9.776 5 10 5.224 10 5.5Z"/></svg>';

    function showNoWorkspace() {
      listEl.style.display = 'none';
      msgEl.style.display = '';
      msgEl.innerHTML = '<div class="welcome"><p>No folder opened. Open a folder to use Project Notes.</p><button class="welcome-btn" id="btn-open-folder">Open Folder</button></div>';
      document.getElementById('btn-open-folder').addEventListener('click', () =>
        vscode.postMessage({ type: 'openFolder' })
      );
    }

    function showEmpty() {
      listEl.style.display = 'none';
      msgEl.style.display = '';
      msgEl.innerHTML = '<div class="welcome"><p>No notes yet. Create a note to get started.</p><button class="welcome-btn" id="btn-create-note">New Note</button></div>';
      document.getElementById('btn-create-note').addEventListener('click', () =>
        vscode.postMessage({ type: 'createNote' })
      );
    }

    function render(notes) {
      if (!notes.length) {
        showEmpty();
        return;
      }
      msgEl.style.display = 'none';
      listEl.style.display = '';
      listEl.innerHTML = '';
      notes.forEach(note => {
        const li = document.createElement('li');
        li.className = 'note-item';
        li.dataset.id = note.id;
        li.tabIndex = 0;

        const row = document.createElement('div');
        row.className = 'note-row';

        const titleEl = document.createElement('span');
        titleEl.className = 'note-title';
        titleEl.textContent = note.title || '(Untitled)';

        const actions = document.createElement('span');
        actions.className = 'note-actions';

        const renameBtn = document.createElement('button');
        renameBtn.className = 'action-btn';
        renameBtn.title = 'Rename';
        renameBtn.innerHTML = PENCIL;
        renameBtn.addEventListener('click', e => {
          e.stopPropagation();
          vscode.postMessage({ type: 'renameNote', id: note.id });
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'action-btn';
        deleteBtn.title = 'Delete';
        deleteBtn.innerHTML = TRASH;
        deleteBtn.addEventListener('click', e => {
          e.stopPropagation();
          vscode.postMessage({ type: 'deleteNote', id: note.id });
        });

        actions.appendChild(renameBtn);
        actions.appendChild(deleteBtn);
        row.appendChild(titleEl);
        row.appendChild(actions);

        const dateEl = document.createElement('div');
        dateEl.className = 'note-date';
        dateEl.textContent = new Date(note.modifiedAt).toLocaleString();

        li.appendChild(row);
        li.appendChild(dateEl);
        li.addEventListener('mousedown', e => {
          if (e.button === 0 || e.button === 2) { selectNote(note.id); }
        });
        li.addEventListener('click', () =>
          vscode.postMessage({ type: 'openNote', id: note.id })
        );
        li.addEventListener('contextmenu', e => {
          e.preventDefault();
          e.stopPropagation();
          selectNote(note.id);
          openCtx(e.clientX, e.clientY, note.id);
        });
        listEl.appendChild(li);
      });
      if (selectedId) {
        const sel = listEl.querySelector('[data-id="' + selectedId + '"]');
        if (sel) sel.classList.add('selected');
        else selectedId = null;
      }
    }

    const ctxMenu = document.getElementById('ctx-menu');
    let ctxId = null;
    let selectedId = null;

    function selectNote(id) {
      listEl.querySelectorAll('.note-item').forEach(el => el.classList.remove('selected'));
      selectedId = id;
      const el = listEl.querySelector('[data-id="' + id + '"]');
      if (el) { el.classList.add('selected'); el.focus(); }
    }

    function deselectAll() {
      listEl.querySelectorAll('.note-item').forEach(el => el.classList.remove('selected'));
      selectedId = null;
    }

    function openCtx(x, y, noteId) {
      ctxId = noteId;
      ctxMenu.style.left = x + 'px';
      ctxMenu.style.top  = y + 'px';
      ctxMenu.style.display = 'block';
      const r = ctxMenu.getBoundingClientRect();
      if (r.right  > window.innerWidth)  ctxMenu.style.left = (x - r.width)  + 'px';
      if (r.bottom > window.innerHeight) ctxMenu.style.top  = (y - r.height) + 'px';
    }

    function closeCtx() { ctxMenu.style.display = 'none'; }

    document.addEventListener('mousedown', e => {
      if (!e.target.closest('.note-item') && !e.target.closest('#ctx-menu')) { deselectAll(); }
    });
    document.addEventListener('click', () => closeCtx());
    document.addEventListener('contextmenu', e => { e.preventDefault(); closeCtx(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCtx(); });

    document.getElementById('ctx-open').addEventListener('click', e => {
      e.stopPropagation(); closeCtx();
      vscode.postMessage({ type: 'openNote', id: ctxId });
    });
    document.getElementById('ctx-rename').addEventListener('click', e => {
      e.stopPropagation(); closeCtx();
      vscode.postMessage({ type: 'renameNote', id: ctxId });
    });
    document.getElementById('ctx-delete').addEventListener('click', e => {
      e.stopPropagation(); closeCtx();
      vscode.postMessage({ type: 'deleteNote', id: ctxId });
    });

    window.addEventListener('message', e => {
      const m = e.data;
      if (m.type === 'refresh') {
        render(m.notes);
      } else if (m.type === 'noWorkspace') {
        showNoWorkspace();
      }
    });
    vscode.postMessage({ type: 'ready' });
  </script>
</body>
</html>`;
