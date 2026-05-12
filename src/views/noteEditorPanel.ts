import * as vscode from 'vscode';
import { Note } from '../models/note';
import { NoteStorage } from '../storage/noteStorage';
import { NOTE_EDITOR_TEMPLATE } from '../html/noteEditorTemplate';

export class NoteEditorPanel {
    private static readonly openPanels = new Map<string, NoteEditorPanel>();

    private readonly panel: vscode.WebviewPanel;
    private note: Note;
    private readonly storage: NoteStorage;
    private readonly onDidSave: () => void;
    private readonly disposables: vscode.Disposable[] = [];

    private constructor(
        panel: vscode.WebviewPanel,
        note: Note,
        storage: NoteStorage,
        onDidSave: () => void,
    ) {
        this.panel = panel;
        this.note = note;
        this.storage = storage;
        this.onDidSave = onDidSave;
    }

    static async createOrShow(
        note: Note,
        storage: NoteStorage,
        onDidSave: () => void,
    ): Promise<NoteEditorPanel> {
        const existing = NoteEditorPanel.openPanels.get(note.id);
        if (existing) {
            existing.panel.reveal(vscode.ViewColumn.Beside);
            return existing;
        }

        const panel = vscode.window.createWebviewPanel(
            'projectNoteEditor',
            note.title || '(Untitled)',
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
            },
        );

        const instance = new NoteEditorPanel(panel, note, storage, onDidSave);
        NoteEditorPanel.openPanels.set(note.id, instance);

        const content = await storage.readNoteContent(note.id);
        instance.setHtml(content);

        panel.onDidDispose(() => {
            instance.disposables.forEach(d => d.dispose());
            NoteEditorPanel.openPanels.delete(note.id);
        }, null, instance.disposables);

        panel.webview.onDidReceiveMessage(async (msg: { type: string; content: string; title: string }) => {
            if (msg.type !== 'save') {
                return;
            }
            try {
                const modifiedAt = await storage.updateNoteContent(note.id, msg.content);
                if (msg.title !== undefined) {
                    await storage.updateNoteTitle(note.id, msg.title);
                    panel.title = msg.title || '(Untitled)';
                    instance.note = { ...instance.note, title: msg.title, modifiedAt };
                }
                instance.onDidSave();
                panel.webview.postMessage({
                    type: 'saved',
                    modifiedAt: new Date(modifiedAt).toLocaleString(),
                });
            } catch {
                // operation was canceled (e.g. VS Code shutting down) – ignore silently
            }
        }, null, instance.disposables);

        return instance;
    }

    updateTitle(title: string): void {
        this.note = { ...this.note, title };
        this.panel.title = title || '(Untitled)';
        this.panel.webview.postMessage({ type: 'updateTitle', title });
    }

    static getOpenPanel(noteId: string): NoteEditorPanel | undefined {
        return NoteEditorPanel.openPanels.get(noteId);
    }

    static closePanel(noteId: string): void {
        NoteEditorPanel.openPanels.get(noteId)?.panel.dispose();
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
            .replace('{{MODIFIED_AT}}', new Date(this.note.modifiedAt).toLocaleString());
    }
}
