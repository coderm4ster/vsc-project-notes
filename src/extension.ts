import * as vscode from 'vscode';
import { NoteStorage } from './storage/noteStorage';
import { NotesTreeProvider, NoteTreeItem } from './providers/notesTreeProvider';
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
    const treeProvider = new NotesTreeProvider(storage);

    const treeView = vscode.window.createTreeView('projectNotesView', {
        treeDataProvider: treeProvider,
        showCollapseAll: false,
    });
    context.subscriptions.push(treeView);

    if (!storage) {
        return;
    }

    const onSaved = () => treeProvider.refresh();

    context.subscriptions.push(
        vscode.commands.registerCommand('project-notes.createNote', async () => {
            const title = await vscode.window.showInputBox({
                prompt: 'Note title (optional – press Enter to skip)',
                placeHolder: '(Untitled)',
            });
            if (title === undefined) {
                return; // user pressed Escape
            }
            const note = await storage.createNote(title.trim());
            await vscode.commands.executeCommand('setContext', 'projectNotes.empty', false);
            treeProvider.refresh();
            await NoteEditorPanel.createOrShow(note, storage, onSaved);
        }),

        vscode.commands.registerCommand('project-notes.openNote', async (item: NoteTreeItem) => {
            await NoteEditorPanel.createOrShow(item.note, storage, onSaved);
        }),

        vscode.commands.registerCommand('project-notes.renameNote', async (item: NoteTreeItem) => {
            const newTitle = await vscode.window.showInputBox({
                prompt: 'New note title',
                value: item.note.title,
                placeHolder: '(Untitled)',
            });
            if (newTitle === undefined) {
                return;
            }
            await storage.updateNoteTitle(item.note.id, newTitle.trim());
            NoteEditorPanel.getOpenPanel(item.note.id)?.updateTitle(newTitle.trim());
            treeProvider.refresh();
        }),

        vscode.commands.registerCommand('project-notes.deleteNote', async (item: NoteTreeItem) => {
            const label = item.note.title || '(Untitled)';
            const answer = await vscode.window.showWarningMessage(
                `Are you sure you want to delete "${label}"?`,
                { modal: true },
                'Delete',
            );
            if (answer !== 'Delete') {
                return;
            }
            NoteEditorPanel.closePanel(item.note.id);
            await storage.deleteNote(item.note.id);
            const remaining = await storage.loadIndex();
            await vscode.commands.executeCommand('setContext', 'projectNotes.empty', remaining.length === 0);
            treeProvider.refresh();
        }),
    );
}

export function deactivate(): void {}
