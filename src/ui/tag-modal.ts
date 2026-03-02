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
    operationItemsOpen: Array<string> = [];
    configJSONItemsOpen: Array<string> = [];
    folderSelected: string = '/';

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
    }

    private topSection(container: HTMLElement) {
        const tagSelectContainer = container.createDiv();
        tagSelectContainer.style.display = 'flex';
        tagSelectContainer.style.marginBottom = 'var(--size-4-2)';

        const tagDropdown = new MultiDropdownComponent(tagSelectContainer)
            .setPlaceholder('Add tags in the settings')
            .setButtonTextBuilder(values => values.map(tag => tag.name).join(', '));
        tagSelectContainer.createDiv().style.marginRight = 'var(--size-4-2)'

        new ButtonComponent(tagSelectContainer).setButtonText('All').onClick(() => {
            tagDropdown.selectAll();
        })
        tagSelectContainer.createDiv().style.marginRight = 'var(--size-4-2)'

        new ButtonComponent(tagSelectContainer).setButtonText('None').onClick(() => {
            tagDropdown.clear();
        })
        tagSelectContainer.createDiv().style.marginRight = 'var(--size-4-2)'

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
            tagDropdown.addOption(value, tag.name);

            if (i == 0) tagDropdown.setValue(value)
        });

        const descriptionContainer = container.createDiv('tag-description-container');
        descriptionContainer.style.fontStyle = 'italic';
        descriptionContainer.style.marginBottom = 'var(--size-4-2)';
        descriptionContainer.style.padding = 'var(--size-4-1)';
        descriptionContainer.style.border = 'var(--border-width) solid var(--background-modifier-border)';
        descriptionContainer.style.background = 'var(--background-primary-alt)'
        descriptionContainer.style.borderRadius = 'var(--radius-s)'

        descriptionContainer.style.lineHeight = 'var(--line-height-normal)em';
        descriptionContainer.style.minHeight = 'calc(var(--line-height-normal) * 3em + 1px)';

        const updateDescription = (selectedTagObjects: any[]) => {
            if (selectedTagObjects.length == 1) {
                descriptionContainer.setText(selectedTagObjects[0].description);
            } else if (selectedTagObjects.length > 1) {
                descriptionContainer.setText(`Multiple tags selected, the total number requests scales with each tag...`);
            } else {
                descriptionContainer.setText('No tags selected');
            }
        };

        tagDropdown.onChange(updateDescription);
        updateDescription(tagDropdown.getValue())

        const strategyContainer = container.createDiv();
        strategyContainer.style.display = 'flex';

        const noteStrategyDropdown = new DropdownComponent(strategyContainer)
            .addOption('all_notes', "Tag all notes")
            .addOption('select_folder', "Tag folder")
            .addOption('this_note', "Tag this note")
            .setValue('all_notes')
            .onChange(() => {
                if (noteStrategyDropdown.getValue() === 'select_folder') {
                    selectFolderButton.buttonEl.style.display = 'flex';
                } else {
                    selectFolderButton.buttonEl.style.display = 'none';
                }

                updateStartButton();
            });
        noteStrategyDropdown.selectEl.style.flexGrow = '1';

        const selectFolderButton = new ButtonComponent(strategyContainer)
            .setIcon('folder-search')
            .setTooltip('Select a folder')
            .onClick(() => {
                new FolderSelectModal(this.app, (folder) => {
                    this.folderSelected = folder.path;
                    updateStartButton();
                }).open();
            });
        selectFolderButton.buttonEl.style.marginLeft = 'var(--size-4-2)';
        selectFolderButton.buttonEl.style.display = 'none';

        const startButton = container.createEl('button');
        startButton.style.marginTop = 'var(--size-4-2)'

        const updateStartButton = () => {
            startButton.disabled = false;
            const strategy = noteStrategyDropdown.getValue();
            if (strategy == 'all_notes') {
                const allNotes = this.plugin.tagUtils.getAllNotes()
                startButton.setText(`Start tagging all ${allNotes.length} notes`)
            } else if (strategy == 'select_folder') {
                const folder = this.app.vault.getAbstractFileByPath(this.folderSelected);
                startButton.setText(`Start tagging all notes in selected folder`)
                if (!(folder instanceof TFolder)) return;
                const notes = this.plugin.tagUtils.getAllNotesInFolder(folder);
                if (notes.length == 1) {
                    startButton.setText(`Start tagging 1 note in '${this.folderSelected}'`)
                } else {
                    startButton.setText(`Start tagging all ${notes.length} notes in '${this.folderSelected}'`)
                }
            } else {
                const activeFile = this.app.workspace.getActiveFile();
                if (activeFile && activeFile.extension === 'md') {
                    startButton.setText(`Start tagging '${activeFile.name}'`);
                } else {
                    startButton.disabled = true;
                    startButton.setText(`No open file`);
                }
            }
        };
        updateStartButton();

        startButton.addEventListener('click', async () => {
            if (this.plugin.serialized.settings.tagDescriptions.length === 0) {
                new Notice('Please add a tag in the settings first');
                return;
            }

            const selectedTagObjects = tagDropdown.getValue();
            if (selectedTagObjects.length === 0) {
                new Notice('Please select a tag');
                return;
            }

            startButton.disabled = true;

            try {
                const strategy = noteStrategyDropdown.getValue();
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
                        startButton.disabled = false;
                        updateStartButton();
                        return;
                    }

                    if (activeFile.extension !== 'md') {
                        new Notice('Active file is not a markdown note');
                        startButton.disabled = false;
                        updateStartButton();
                        return;
                    }

                    const notes = selectedTagObjects.map(tag => ({ file: activeFile, tag: tag }));
                    await this.plugin.operationProcessor.createOperation(notes);

                    new Notice(`Started tagging operation for ${activeFile.name}`);
                }
            } catch (error) {
                new Notice(`Error creating operations`);
            } finally {
                startButton.disabled = false;
                updateStartButton();
            }
        });
    }

    private bottomSection(container: HTMLElement) {
        const details = container.createEl('details');
        details.createEl('summary', { text: `Operations` });
        details.style.marginTop = 'var(--size-4-2)';

        const wrapper = details.createDiv();
        wrapper.style.marginLeft = 'var(--list-indent)';
        this.operationsContainer = wrapper.createDiv();;
    }

    private refreshOperations = () => {
        if (!this.operationsContainer) return;

        const details = this.operationsContainer.querySelectorAll('details');
        details.forEach(detail => {
            if ((detail as any)._toggleHandler) {
                detail.removeEventListener('toggle', (detail as any)._toggleHandler);
                delete (detail as any)._toggleHandler;
            }
        });

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
        const container = this.operationsContainer.createDiv();
        container.style.display = 'flex';
        container.style.marginTop = "var(--list-spacing)";
        const details = container.createEl('details');
        details.style.flexGrow = '1';
        details.style.alignContent = 'center';
        details.open = open;

        const toggleHandler = () => {
            if (details.open) {
                this.operationItemsOpen.push(operation.id);
            } else {
                this.operationItemsOpen.remove(operation.id);
            }
        };
        details.addEventListener('toggle', toggleHandler);
        details.dataset.operationId = operation.id;
        (details as any)._toggleHandler = toggleHandler;

        details.createEl('summary', {
            text: `${operation.id} ${operation.notes.filter(n => n.status !== 'queued').length}/${operation.notes.length}`
        });

        const rightContainer = container.createDiv();
        rightContainer.style.whiteSpace = 'nowrap';
        rightContainer.style.display = 'flex';
        rightContainer.style.alignItems = 'center';
        rightContainer.style.height = 'fit-content';
        rightContainer.createSpan({ text: operation.status.toUpperCase() }).style.marginRight = 'var(--size-4-1)';

        if (operation.status === 'processing' || operation.status === 'queued') {
            new ButtonComponent(rightContainer).setIcon('x').setTooltip('Cancel operation').onClick(async () => {
                await this.plugin.operationProcessor.cancelOperation(operation.id);
            });
        } else {
            new ButtonComponent(rightContainer).setIcon('trash').setTooltip('Remove operation').setWarning().onClick(async () => {
                await this.plugin.operationProcessor.deleteOperation(operation.id);
            });
        }

        const list = details.createEl('ul');
        list.style.marginTop = 'var(--list-spacing)'
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
        jsonDetails.dataset.operationId = operation.id;
        (jsonDetails as any)._toggleHandler = configToggleHandler;

        jsonDetails.createEl('summary', { text: 'JSON Config' });
        jsonDetails.open = configOpen;
        const code = jsonDetails.createEl('code', { text: JSON.stringify(operation.config, null, 2) });
        code.style.width = '100%';
        code.style.whiteSpace = 'pre-wrap';
    }
}
