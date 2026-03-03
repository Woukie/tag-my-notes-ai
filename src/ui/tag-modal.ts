import { App, ButtonComponent, DropdownComponent, Modal, Notice, Setting, TFile, TFolder } from "obsidian";
import TagMyNotesPlugin from "../main";
import { TagOperation } from "../types";
import { MultiDropdownComponent } from "src/components/multi-dropdown-component";
import { FolderSelectModal } from "./folder-select-modal";

// TODO:
// Make the start button text and behavior reflect dropdown behaviour
// Upon clicking select_folders in the dropdown, a search modal should appear for you to select from a list of all folders in your project, and start button should say Tag ${x}

export class TagModal extends Modal {
    plugin: TagMyNotesPlugin;
    operationsContainer: HTMLElement | undefined;
    startButton: HTMLElement | undefined;
    noteStrategyDropdown: DropdownComponent | undefined;
    tagDropdown: MultiDropdownComponent | undefined;
    operationItemsOpen: Array<string> = [];
    configJSONItemsOpen: Array<string> = [];
    folderSelected: string = '/';
    refreshEventListeners: { element: HTMLDetailsElement, name: string, event: any }[] = [];

    constructor(app: App, plugin: TagMyNotesPlugin) {
        super(app);
        this.plugin = plugin;
        const { contentEl } = this;
        this.setTitle('Tag my notes')

        this.topSection(contentEl);
        this.bottomSection(contentEl);
    }

    onOpen() {
        this.refreshOperations();
        this.plugin.operationProcessor.operationEvents.addEventListener('update', this.refreshOperations);
    }

    onClose(): void {
        this.plugin.operationProcessor.operationEvents.removeEventListener('update', this.refreshOperations);
        this.startButton?.removeEventListener('click', this.onStartClick);
        this.clearRefreshEvents();
    }

    private clearRefreshEvents() {
        this.refreshEventListeners.forEach(e => e.element.removeEventListener(e.name, e.event));
        this.refreshEventListeners = [];
    }

    private topSection(container: HTMLElement) {
        const tagSelectContainer = container.createDiv({ cls: 'tag-select-container' });

        this.tagDropdown = new MultiDropdownComponent(tagSelectContainer)
            .setPlaceholder('Add tags in the settings')
            .setButtonTextBuilder(values => values.map(tag => tag.name).join(', '));
        tagSelectContainer.createDiv({ cls: 'tag-select-container-separator' });

        new ButtonComponent(tagSelectContainer).setButtonText('All').onClick(() => {
            this.tagDropdown?.selectAll();
        })
        tagSelectContainer.createDiv({ cls: 'tag-select-container-separator' });

        new ButtonComponent(tagSelectContainer).setButtonText('None').onClick(() => {
            this.tagDropdown?.clear();
        })
        tagSelectContainer.createDiv({ cls: 'tag-select-container-separator' });

        new ButtonComponent(tagSelectContainer).setIcon('settings').onClick(() => {
            const settings = (this.app as any).setting;
            settings.open();
            settings.openTabById(this.plugin.manifest.id);
        });

        this.plugin.serialized.settings.tagDescriptions.forEach((tag, i) => {
            const value = {
                name: tag.name,
                description: tag.description
            }
            this.tagDropdown?.addOption(value, tag.name);

            if (i == 0) this.tagDropdown?.setValue(value)
        });

        const descriptionContainer = container.createDiv('tag-description-container');

        const updateDescription = (selectedTagObjects: any[]) => {
            if (selectedTagObjects.length == 1) {
                descriptionContainer.setText(selectedTagObjects[0].description);
            } else if (selectedTagObjects.length > 1) {
                descriptionContainer.setText(`Multiple tags selected, the total number requests scales with each tag...`);
            } else {
                descriptionContainer.setText('No tags selected');
            }
        };

        this.tagDropdown.onChange(updateDescription);
        updateDescription(this.tagDropdown.getValue())

        const strategyContainer = container.createDiv({ cls: 'tag-strategy-container' });

        this.noteStrategyDropdown = new DropdownComponent(strategyContainer)
            .addOption('all_notes', "Tag all notes")
            .addOption('select_folder', "Tag folder")
            .addOption('this_note', "Tag active note")
            .setValue('all_notes')
            .onChange(() => {
                if (!this.noteStrategyDropdown) return;
                if (this.noteStrategyDropdown.getValue() === 'select_folder') {
                    selectFolderButton.buttonEl.setAttribute('visible', '')
                } else {
                    selectFolderButton.buttonEl.removeAttribute('visible')
                }

                this.updateStartButton();
            });
        this.noteStrategyDropdown.selectEl.addClass('tag-note-strategy-dropdown');

        const selectFolderButton = new ButtonComponent(strategyContainer)
            .setIcon('folder-search')
            .setTooltip('Select a folder')
            .onClick(() => {
                new FolderSelectModal(this.app, (folder) => {
                    this.folderSelected = folder.path;
                    this.updateStartButton();
                }).open();
            }).setClass('tag-select-folder-button');

        this.startButton = container.createEl('button', { cls: 'tag-start-button' });

        this.updateStartButton();

        this.startButton.addEventListener('click', this.onStartClick);
    }

    private updateStartButton() {
        if (!this.startButton || !this.noteStrategyDropdown) return;
        (this.startButton as any).disabled = false;
        const strategy = this.noteStrategyDropdown.getValue();
        if (strategy == 'all_notes') {
            const allNotes = this.plugin.tagUtils.getAllNotes()
            this.startButton.setText(`Start tagging all ${allNotes.length} notes`)
        } else if (strategy == 'select_folder') {
            const folder = this.app.vault.getAbstractFileByPath(this.folderSelected);
            this.startButton.setText(`Start tagging all notes in selected folder`)
            if (!(folder instanceof TFolder)) return;
            const notes = this.plugin.tagUtils.getAllNotesInFolder(folder);
            if (notes.length == 1) {
                this.startButton.setText(`Start tagging 1 note in '${this.folderSelected}'`)
            } else {
                this.startButton.setText(`Start tagging all ${notes.length} notes in '${this.folderSelected}'`)
            }
        } else {
            const activeFile = this.app.workspace.getActiveFile();
            if (activeFile && activeFile.extension === 'md') {
                this.startButton.setText(`Start tagging '${activeFile.name}'`);
            } else {
                (this.startButton as any).disabled = true;
                this.startButton.setText(`No open file`);
            }
        }
    };

    private onStartClick = async () => {
        if (!this.tagDropdown || !this.startButton) return;
        if (this.plugin.serialized.settings.tagDescriptions.length === 0) {
            new Notice('Please add a tag in the settings first');
            return;
        }

        const selectedTagObjects = this.tagDropdown.getValue();
        if (selectedTagObjects.length === 0) {
            new Notice('Please select a tag');
            return;
        }

        (this.startButton as any).disabled = true;

        try {
            const strategy = this.noteStrategyDropdown?.getValue();
            if (strategy == 'all_notes') {
                const allNotes = this.plugin.tagUtils.getAllNotes();
                const notes = [];
                for (const note of allNotes) {
                    for (const tag of selectedTagObjects) {
                        notes.push({ file: note, tag: tag });
                    }
                }

                await this.plugin.operationProcessor.createOperation(notes);

                new Notice(`Started tagging operation for all notes`);

            } else if (strategy == 'select_folder') {
                const folder = this.app.vault.getAbstractFileByPath(this.folderSelected);
                if (!(folder instanceof TFolder)) {
                    new Notice("Folder is no longer valid")
                    return;
                }
                const files = this.plugin.tagUtils.getAllNotesInFolder(folder);
                const notes = []
                for (const note of files) {
                    for (const tag of selectedTagObjects) {
                        notes.push({ file: note, tag: tag });
                    }
                }

                await this.plugin.operationProcessor.createOperation(notes);

                new Notice(`Started tagging operation for all notes in '${folder.path}'`);
            } else if (strategy == 'this_note') {
                const activeFile = this.app.workspace.getActiveFile();

                if (!activeFile) {
                    new Notice('No file currently open');
                    (this.startButton as any).disabled = false;
                    this.updateStartButton();
                    return;
                }

                if (activeFile.extension !== 'md') {
                    new Notice('Active file is not a markdown note');
                    (this.startButton as any).disabled = false;
                    this.updateStartButton();
                    return;
                }

                const notes = selectedTagObjects.map(tag => ({ file: activeFile, tag: tag }));
                await this.plugin.operationProcessor.createOperation(notes);

                new Notice(`Started tagging operation for ${activeFile.name}`);
            }
        } catch (error) {
            new Notice(`Error creating operations`);
        } finally {
            (this.startButton as any).disabled = false;
            this.updateStartButton();
        }
    }

    private bottomSection(container: HTMLElement) {
        const details = container.createEl('details');
        details.createEl('summary', { text: `Operations`, cls: 'tag-details-summary' });

        const wrapper = details.createDiv();
        this.operationsContainer = wrapper.createDiv();;
    }

    private refreshOperations = () => {
        if (!this.operationsContainer) return;

        this.clearRefreshEvents();
        this.operationsContainer.empty();

        if (!this.plugin.serialized.operations || this.plugin.serialized.operations.length === 0) {
            this.operationsContainer.createEl('span', { text: 'No tagging operations' });
            return;
        }

        this.plugin.serialized.operations.forEach((operation) => {
            this.operationItem(operation);
        });
    }

    private operationItem(operation: TagOperation) {
        const open = this.operationItemsOpen.contains(operation.id);
        const configOpen = this.configJSONItemsOpen.contains(operation.id);
        if (!this.operationsContainer) return;
        const container = this.operationsContainer.createDiv({ cls: 'tag-operation-item-container' });
        const details = container.createEl('details', { cls: 'tag-operation-item-details' });
        details.open = open;

        const toggleHandler = () => {
            if (details.open) {
                this.operationItemsOpen.push(operation.id);
            } else {
                this.operationItemsOpen.remove(operation.id);
            }
        };
        details.addEventListener('toggle', toggleHandler);
        this.refreshEventListeners.push({ element: details, name: 'toggle', event: toggleHandler });

        const tagCount = operation.notes.map(n => n.tag.name + '|' + n.tag.description).unique().length;
        const noteCount = operation.notes.map(n => n.file).unique().length;
        details.createEl('summary', {
            text: `${tagCount} tag${tagCount == 1 ? '' : 's'} for ${noteCount} note${noteCount == 1 ? '' : 's'} | ${operation.notes.filter(n => n.status !== 'queued').length}/${operation.notes.length}`
        });

        const rightContainer = container.createDiv({ cls: 'tag-operation-item-right-container' });
        rightContainer.createSpan({ text: operation.status.toUpperCase(), cls: 'tag-operation-item-status' });

        if (operation.status === 'processing' || operation.status === 'queued') {
            new ButtonComponent(rightContainer).setIcon('x').setTooltip('Cancel operation').onClick(async () => {
                await this.plugin.operationProcessor.cancelOperation(operation.id);
            });
        } else {
            new ButtonComponent(rightContainer).setIcon('trash').setTooltip('Remove operation').setWarning().onClick(async () => {
                await this.plugin.operationProcessor.deleteOperation(operation.id);
            });
        }

        const list = details.createEl('ul', { cls: 'tag-operation-item-details-list' });
        list.createEl('li', { text: `Created: ${new Date(operation.metadata.createdAt).toLocaleString()}` });
        if (operation.metadata.startedAt) list.createEl('li', { text: `Started: ${new Date(operation.metadata.startedAt).toLocaleString()}` });
        if (operation.metadata.completedAt) list.createEl('li', { text: `Completed: ${new Date(operation.metadata.completedAt).toLocaleString()}` });
        list.createEl('li', { text: `Failed: ${operation.notes.filter(n => n.status === 'failed').length}` });
        list.createEl('li', { text: `Skipped: ${operation.notes.filter(n => n.status === 'skipped').length}` });
        list.createEl('li', { text: `No change: ${operation.notes.filter(n => n.status === 'no-change').length}` });
        list.createEl('li', { text: `Applied: ${operation.notes.filter(n => n.status === 'applied-tag').length}` });
        list.createEl('li', { text: `Removed: ${operation.notes.filter(n => n.status === 'removed-tag').length}` });
        const jsonLi = list.createEl('li')
        const jsonDetails = jsonLi.createEl('details');

        const configToggleHandler = () => {
            if (jsonDetails.open) {
                this.configJSONItemsOpen.push(operation.id);
            } else {
                this.configJSONItemsOpen.remove(operation.id);
            }
        };
        jsonDetails.addEventListener('toggle', configToggleHandler);
        this.refreshEventListeners.push({ element: jsonDetails, event: configToggleHandler, name: 'toggle' });

        jsonDetails.createEl('summary', { text: 'JSON Config' });
        jsonDetails.open = configOpen;
        jsonDetails.createEl('code', { text: JSON.stringify(operation.config, null, 2), cls: 'tag-operation-item-code' });
    }
}
