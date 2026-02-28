import { App, FuzzySuggestModal, TFolder } from 'obsidian';

export class FolderSelectModal extends FuzzySuggestModal<TFolder> {
    constructor(
        app: App,
        private onChoose: (folder: TFolder) => void
    ) {
        super(app);
    }

    getItems(): TFolder[] {
        const folders: TFolder[] = [];

        const getAllFolders = (folder: TFolder) => {
            folders.push(folder);

            for (const child of folder.children) {
                if (child instanceof TFolder) {
                    getAllFolders(child);
                }
            }
        };

        const rootFolder = this.app.vault.getRoot();
        getAllFolders(rootFolder);

        return folders;
    }

    getItemText(folder: TFolder): string {
        return folder.path;
    }

    onChooseItem(folder: TFolder, evt: MouseEvent | KeyboardEvent): void {
        this.onChoose(folder);
    }
}