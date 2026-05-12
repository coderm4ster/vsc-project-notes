import * as vscode from 'vscode';
import { Note } from '../models/note';

const INDEX_FILE = 'index.json';

export class NoteStorage {
    private readonly notesDir: vscode.Uri;

    constructor(storageUri: vscode.Uri) {
        this.notesDir = storageUri;
    }

    async ensureDir(): Promise<void> {
        try {
            await vscode.workspace.fs.createDirectory(this.notesDir);
        } catch {
            // directory already exists
        }
    }

    private get indexUri(): vscode.Uri {
        return vscode.Uri.joinPath(this.notesDir, INDEX_FILE);
    }

    private noteUri(id: string): vscode.Uri {
        return vscode.Uri.joinPath(this.notesDir, `${id}.txt`);
    }

    async loadIndex(): Promise<Note[]> {
        try {
            const raw = await vscode.workspace.fs.readFile(this.indexUri);
            return JSON.parse(Buffer.from(raw).toString('utf-8')) as Note[];
        } catch {
            return [];
        }
    }

    private async saveIndex(notes: Note[]): Promise<void> {
        const raw = Buffer.from(JSON.stringify(notes, null, 2), 'utf-8');
        await vscode.workspace.fs.writeFile(this.indexUri, raw);
    }

    async readNoteContent(id: string): Promise<string> {
        try {
            const raw = await vscode.workspace.fs.readFile(this.noteUri(id));
            return Buffer.from(raw).toString('utf-8');
        } catch {
            return '';
        }
    }

    async writeNoteContent(id: string, content: string): Promise<void> {
        const raw = Buffer.from(content, 'utf-8');
        await vscode.workspace.fs.writeFile(this.noteUri(id), raw);
    }

    async createNote(title: string): Promise<Note> {
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
        const note: Note = {
            id,
            title,
            modifiedAt: new Date().toISOString(),
        };
        const notes = await this.loadIndex();
        notes.push(note);
        await this.saveIndex(notes);
        await this.writeNoteContent(id, '');
        return note;
    }

    async deleteNote(id: string): Promise<void> {
        const notes = await this.loadIndex();
        await this.saveIndex(notes.filter(n => n.id !== id));
        try {
            await vscode.workspace.fs.delete(this.noteUri(id));
        } catch {
            // file may not exist
        }
    }

    async updateNoteTitle(id: string, title: string): Promise<void> {
        const notes = await this.loadIndex();
        const note = notes.find(n => n.id === id);
        if (note) {
            note.title = title;
            note.modifiedAt = new Date().toISOString();
            await this.saveIndex(notes);
        }
    }

    async updateNoteContent(id: string, content: string): Promise<string> {
        await this.writeNoteContent(id, content);
        const notes = await this.loadIndex();
        const note = notes.find(n => n.id === id);
        const modifiedAt = new Date().toISOString();
        if (note) {
            note.modifiedAt = modifiedAt;
            await this.saveIndex(notes);
        }
        return modifiedAt;
    }
}
