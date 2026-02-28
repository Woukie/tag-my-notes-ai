import { App, TFile, TFolder } from 'obsidian';

export class TagUtils {
    constructor(private app: App) { }

    async applyTagToNote(file: TFile, tag: string, apply: boolean): Promise<void> {
        await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
            if (!frontmatter.tags) {
                frontmatter.tags = [];
            }

            if (!Array.isArray(frontmatter.tags)) {
                frontmatter.tags = [frontmatter.tags];
            }

            if (apply) {
                if (!frontmatter.tags.includes(tag)) {
                    frontmatter.tags.push(tag);
                }
            } else {
                frontmatter.tags = frontmatter.tags.filter((t: string) => t !== tag);
            }
        });
    }

    async noteHasTag(file: TFile, tag: string): Promise<boolean> {
        const cache = this.app.metadataCache.getFileCache(file);

        if (cache?.frontmatter?.tags) {
            const frontmatterTags = Array.isArray(cache.frontmatter.tags)
                ? cache.frontmatter.tags
                : [cache.frontmatter.tags];
            if (frontmatterTags.includes(tag)) {
                return true;
            }
        }

        return false;
    }

    public getAllNotes(): TFile[] {
        const files: TFile[] = [];
        const processFolder = (folder: TFolder) => {
            for (const child of folder.children) {
                if (child instanceof TFile && child.extension === 'md') {
                    files.push(child);
                } else if (child instanceof TFolder) {
                    processFolder(child);
                }
            }
        };

        processFolder(this.app.vault.getRoot());
        return files;
    }

    public getAllNotesInFolder(folder: TFolder): TFile[] {
        let files: TFile[] = [];

        for (const child of folder.children) {
            if (child instanceof TFile && child.extension === 'md') {
                files.push(child);
            } else if (child instanceof TFolder) {
                files = files.concat(this.getAllNotesInFolder(child));
            }
        }

        return files;
    }
}