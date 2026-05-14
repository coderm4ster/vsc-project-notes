import * as vscode from 'vscode';
import { Note } from '../models/note';
import { NoteStorage } from '../storage/noteStorage';
import { NOTE_EDITOR_TEMPLATE } from '../html/noteEditorTemplate';

export class NoteEditorPanel {
    private static readonly openPanels = new Map<string, NoteEditorPanel>();
    private static _lastColumn: vscode.ViewColumn | undefined;
    private static _workspaceState: vscode.Memento | undefined;
    private static readonly COLUMN_KEY = 'noteEditorLastColumn';

    private readonly disposables: vscode.Disposable[] = [];

    static init(workspaceState: vscode.Memento, disposables: vscode.Disposable[]): void {
        NoteEditorPanel._workspaceState = workspaceState;
        NoteEditorPanel._lastColumn = workspaceState.get<vscode.ViewColumn>(NoteEditorPanel.COLUMN_KEY);

        const isNoteTab = (tab: vscode.Tab): boolean => {
            const vt = (tab.input as Record<string, unknown>)?.viewType;
            return typeof vt === 'string' && (vt === 'projectNoteEditor' || (vt as string).endsWith('-projectNoteEditor'));
        };

        vscode.window.tabGroups.onDidChangeTabs(({ opened, changed, closed }) => {
            for (const tab of [...opened, ...changed, ...closed]) {
                if (isNoteTab(tab)) {
                    NoteEditorPanel._setLastColumn(tab.group.viewColumn);
                }
            }
        }, null, disposables);
    }

    private static _setLastColumn(column: vscode.ViewColumn): void {
        if (column < 1) { return; }
        NoteEditorPanel._lastColumn = column;
        NoteEditorPanel._workspaceState?.update(NoteEditorPanel.COLUMN_KEY, column);
    }

    private constructor(
        private readonly panel: vscode.WebviewPanel,
        private note: Note,
        private readonly storage: NoteStorage,
        private readonly onDidSave: () => void,
    ) {}

    private _wire(): void {
        this.panel.onDidDispose(() => {
            this.disposables.forEach(d => d.dispose());
            NoteEditorPanel.openPanels.delete(this.note.id);
        }, null, this.disposables);

        this.panel.webview.onDidReceiveMessage(async (msg: { type: string; content: string; title: string }) => {
            if (msg.type !== 'save') { return; }
            try {
                const modifiedAt = await this.storage.updateNoteContent(this.note.id, msg.content);
                if (msg.title !== undefined) {
                    await this.storage.updateNoteTitle(this.note.id, msg.title);
                    this.panel.title = `Project Notes - ${msg.title || '(Untitled)'}`;
                    this.note = { ...this.note, title: msg.title, modifiedAt };
                }
                this.onDidSave();
                this.panel.webview.postMessage({
                    type: 'saved',
                    modifiedAt: new Date(modifiedAt).toLocaleString(),
                });
            } catch {
                // operation was canceled (e.g. VS Code shutting down) – ignore silently
            }
        }, null, this.disposables);
    }

    static async createOrShow(
        note: Note,
        storage: NoteStorage,
        onDidSave: () => void,
    ): Promise<NoteEditorPanel> {
        const existing = NoteEditorPanel.openPanels.get(note.id);
        if (existing) {
            existing.panel.reveal(existing.panel.viewColumn ?? vscode.ViewColumn.Beside);
            return existing;
        }

        const panel = vscode.window.createWebviewPanel(
            'projectNoteEditor',
            `Project Notes - ${note.title || '(Untitled)'}`,
            NoteEditorPanel._getOpenColumn() ?? vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
            },
        );

        const instance = new NoteEditorPanel(panel, note, storage, onDidSave);
        if (panel.viewColumn !== undefined) { NoteEditorPanel._setLastColumn(panel.viewColumn); }
        NoteEditorPanel.openPanels.set(note.id, instance);
        instance._wire();

        const content = await storage.readNoteContent(note.id);
        instance.setHtml(content);
        return instance;
    }

    updateTitle(title: string): void {
        this.note = { ...this.note, title };
        this.panel.title = `Project Notes - ${title || '(Untitled)'}`;
        this.panel.webview.postMessage({ type: 'updateTitle', title });
    }

    static getOpenPanel(noteId: string): NoteEditorPanel | undefined {
        return NoteEditorPanel.openPanels.get(noteId);
    }

    static closePanel(noteId: string): void {
        NoteEditorPanel.openPanels.get(noteId)?.panel.dispose();
    }

    private static _getOpenColumn(): vscode.ViewColumn | undefined {
        return NoteEditorPanel.openPanels.values().next().value?.panel.viewColumn
            ?? NoteEditorPanel._lastColumn;
    }

    static async restore(
        panel: vscode.WebviewPanel,
        state: { noteId?: string },
        storage: NoteStorage,
        onDidSave: () => void,
    ): Promise<void> {
        if (!state?.noteId) {
            panel.dispose();
            return;
        }
        let panelDisposed = false;
        const earlyListener = panel.onDidDispose(() => { panelDisposed = true; });
        try {
            const notes = await storage.loadIndex();
            if (panelDisposed) { return; }
            const note = notes.find(n => n.id === state.noteId);
            if (!note) {
                panel.dispose();
                return;
            }
            panel.title = `Project Notes - ${note.title || '(Untitled)'}`;
            const instance = new NoteEditorPanel(panel, note, storage, onDidSave);
            if (panel.viewColumn !== undefined) { NoteEditorPanel._setLastColumn(panel.viewColumn); }
            NoteEditorPanel.openPanels.set(note.id, instance);
            instance._wire();

            const content = await storage.readNoteContent(note.id);
            if (panelDisposed) {
                NoteEditorPanel.openPanels.delete(note.id);
                return;
            }
            instance.setHtml(content);
        } finally {
            earlyListener.dispose();
        }
    }

    private setHtml(content: string): void {
        const esc = (s: string) =>
            s.replace(/&/g, '&amp;')
             .replace(/</g, '&lt;')
             .replace(/>/g, '&gt;')
             .replace(/"/g, '&quot;');

        this.panel.webview.html = NOTE_EDITOR_TEMPLATE
            .replace('{{TITLE}}', esc(this.note.title))
            .replace('{{CONTENT}}', esc(content))
             .replace('{{MODIFIED_AT}}', new Date(this.note.modifiedAt).toLocaleString())
             .replace('{{NOTE_ID}}', this.note.id);
    }
}
