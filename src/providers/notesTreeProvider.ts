import * as vscode from 'vscode';
import { Note } from '../models/note';
import { NoteStorage } from '../storage/noteStorage';

export class NoteTreeItem extends vscode.TreeItem {
    constructor(public readonly note: Note) {
        super(note.title || '(Untitled)', vscode.TreeItemCollapsibleState.None);

        this.description = new Date(note.modifiedAt).toLocaleDateString();
        this.tooltip = note.title ? `${note.title}\n${new Date(note.modifiedAt).toLocaleString()}` : `(Untitled)\n${new Date(note.modifiedAt).toLocaleString()}`;
        this.contextValue = 'note';
        this.command = {
            command: 'project-notes.openNote',
            title: 'Open Note',
            arguments: [this],
        };
    }
}

export class NotesTreeProvider implements vscode.TreeDataProvider<NoteTreeItem> {
    private readonly _onDidChangeTreeData = new vscode.EventEmitter<NoteTreeItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<NoteTreeItem | undefined | void> = this._onDidChangeTreeData.event;

    constructor(private readonly storage: NoteStorage | undefined) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: NoteTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(): Promise<NoteTreeItem[]> {
        if (!this.storage) { return []; }
        const notes = await this.storage.loadIndex();
        return notes
            .sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime())
            .map(note => new NoteTreeItem(note));
    }
}
