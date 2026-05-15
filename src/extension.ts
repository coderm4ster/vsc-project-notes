import * as vscode from 'vscode';
import { NoteStorage } from './storage/noteStorage';
import { NotesWebviewViewProvider } from './providers/notesTreeProvider';
import { NoteEditorPanel } from './views/noteEditorPanel';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    const storage = context.storageUri
        ? new NoteStorage(context.storageUri)
        : undefined;

    if (storage) {
        await storage.ensureDir();
    }

    const initialNotes = storage ? await storage.loadIndex() : [];
    await vscode.commands.executeCommand('setContext', 'projectNotes.empty', initialNotes.length === 0);

    const viewProvider = new NotesWebviewViewProvider(storage, context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('projectNotesView', viewProvider, {
            webviewOptions: { retainContextWhenHidden: true },
        }),
    );

    if (!storage) {
        return;
    }

    NoteEditorPanel.init(context.workspaceState, context.subscriptions);

    const onSaved = () => void viewProvider.refresh();

    context.subscriptions.push(
        vscode.window.registerWebviewPanelSerializer('projectNoteEditor', {
            async deserializeWebviewPanel(panel, state) {
                await NoteEditorPanel.restore(panel, state as { noteId?: string }, storage, onSaved);
            }
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('project-notes.createNote', async () => {
            const title = await vscode.window.showInputBox({
                prompt: 'Note title (optional – press Enter to skip)',
                placeHolder: '(Untitled)',
            });
            if (title === undefined) {
                return;
            }
            const note = await storage.createNote(title.trim());
            await vscode.commands.executeCommand('setContext', 'projectNotes.empty', false);
            await viewProvider.refresh();
            await NoteEditorPanel.createOrShow(note, storage, onSaved);
        }),

        vscode.commands.registerCommand('project-notes.openNote', async (id: string) => {
            const notes = await storage.loadIndex();
            const note = notes.find(n => n.id === id);
            if (!note) { return; }
            await NoteEditorPanel.createOrShow(note, storage, onSaved);
        }),

        vscode.commands.registerCommand('project-notes.renameNote', async (id: string) => {
            const notes = await storage.loadIndex();
            const note = notes.find(n => n.id === id);
            if (!note) { return; }
            const newTitle = await vscode.window.showInputBox({
                prompt: 'New note title',
                value: note.title,
                placeHolder: '(Untitled)',
            });
            if (newTitle === undefined) {
                return;
            }
            await storage.updateNoteTitle(note.id, newTitle.trim());
            NoteEditorPanel.getOpenPanel(note.id)?.updateTitle(newTitle.trim());
            await viewProvider.refresh();
        }),

        vscode.commands.registerCommand('project-notes.deleteNote', async (id: string) => {
            const notes = await storage.loadIndex();
            const note = notes.find(n => n.id === id);
            if (!note) { return; }
            const label = note.title || '(Untitled)';
            const answer = await vscode.window.showWarningMessage(
                `Are you sure you want to delete "${label}"?`,
                { modal: true },
                'Delete',
            );
            if (answer !== 'Delete') {
                return;
            }
            NoteEditorPanel.closePanel(note.id);
            await storage.deleteNote(note.id);
            const remaining = await storage.loadIndex();
            await vscode.commands.executeCommand('setContext', 'projectNotes.empty', remaining.length === 0);
            await viewProvider.refresh();
        }),
    );
}

export function deactivate(): void {}
