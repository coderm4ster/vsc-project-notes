import * as vscode from 'vscode';
import { NoteStorage } from '../storage/noteStorage';
import { NOTES_TREE_TEMPLATE } from '../html/notesTreeTemplate';

export class NotesWebviewViewProvider implements vscode.WebviewViewProvider {
    private _view: vscode.WebviewView | undefined;

    constructor(
        private readonly storage: NoteStorage | undefined,
        private readonly extensionUri: vscode.Uri,
    ) {}

    resolveWebviewView(
        view: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ): void {
        this._view = view;
        view.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'media')],
        };
        view.webview.html = this._buildHtml(view.webview);
        view.webview.onDidReceiveMessage(message => {
            switch (message.type as string) {
                case 'openNote':
                    void vscode.commands.executeCommand('project-notes.openNote', message.id as string);
                    break;
                case 'renameNote':
                    void vscode.commands.executeCommand('project-notes.renameNote', message.id as string);
                    break;
                case 'deleteNote':
                    void vscode.commands.executeCommand('project-notes.deleteNote', message.id as string);
                    break;
                case 'createNote':
                    void vscode.commands.executeCommand('project-notes.createNote');
                    break;
                case 'openFolder':
                    void vscode.commands.executeCommand('workbench.action.files.openFolder');
                    break;
                case 'ready':
                    void this.refresh();
                    break;
            }
        });
    }

    async refresh(): Promise<void> {
        if (!this._view) { return; }
        if (!this.storage) {
            void this._view.webview.postMessage({ type: 'noWorkspace' });
            return;
        }
        const notes = await this.storage.loadIndex();
        const sorted = notes.sort(
            (a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime(),
        );
        void this._view.webview.postMessage({ type: 'refresh', notes: sorted });
    }

    private _buildHtml(webview: vscode.Webview): string {
        const nonce = getNonce();
        const csp = [
            `default-src 'none'`,
            `style-src 'unsafe-inline'`,
            `script-src 'nonce-${nonce}'`,
        ].join('; ');

        return NOTES_TREE_TEMPLATE
            .replace('{{CSP}}', csp)
            .replace('{{NONCE}}', nonce);
    }
}

function getNonce(): string {
    let text = '';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return text;
}
