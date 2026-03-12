import { Notice, Plugin, TFile, TFolder } from 'obsidian';
import { Serialized } from './types';
import { DEFAULT_SETTINGS } from './constants';
import { TagModal } from './ui/tag-modal';
import { SettingsTab } from './ui/settings-tab';
import { TagUtils } from './utils/tag-utils';
import { OperationProcessor } from './operation-processor';

export default class TagMyNotesPlugin extends Plugin {
    serialized: Serialized = { settings: DEFAULT_SETTINGS, operations: [] };
    tagUtils: TagUtils = new TagUtils(this.app);
    operationProcessor: OperationProcessor = new OperationProcessor(this);

    async onload() {
        await this.loadPersistent();

        this.addRibbonIcon('tag', 'Tag My Notes', () => {
            new TagModal(this.app, this).open();
        });

        this.registerQuickButtons();
        this.registerQuickCommands();

        this.addSettingTab(new SettingsTab(this.app, this));

        this.operationProcessor.watchOperations();
    }

    async loadPersistent() {
        const loaded = await this.loadData();

        this.serialized = {
            settings: {
                ...DEFAULT_SETTINGS,
                ...(loaded?.settings ?? {})
            },
            operations: loaded?.operations ?? []
        };
    }


    async savePersistent() {
        await this.saveData(this.serialized);
    }

    private registerQuickCommands() {
        this.addCommand({
            id: 'tag-active-note',
            name: 'Quick-tag active note',
            callback: async () => {
                const file = this.app.workspace.getActiveFile();
                if (!file) return;

                const notes = [{ file }];
                const tags = this.serialized.settings.tagDescriptions;

                new Notice(`Started tagging operation for '${file.name}' with all tags`);
                await this.operationProcessor.createOperation(notes, tags);
            }
        });

        this.addCommand({
            id: 'open-tagging-menu',
            name: 'Open \'Tag My Notes\' menu',
            callback: () => {
                new TagModal(this.app, this).open();
            }
        });
    }

    private registerQuickButtons() {
        // Quick tag active note
        this.registerEvent(
            this.app.workspace.on('editor-menu', (menu, editor, view) => {
                const file = view.file;
                if (!(file instanceof TFile)) return;
                if (file.extension === 'md') {
                    menu.addItem((item) => {
                        item.setTitle('Quick-tag this note')
                            .setSection('Tag my notes')
                            .setIcon('tag')
                            .onClick(async () => {
                                new Notice(`Started tagging operation for '${file.name}' with all tags`);

                                const notes = [{ file }];
                                const tags = this.serialized.settings.tagDescriptions;

                                await this.operationProcessor.createOperation(notes, tags);
                            });
                    });

                }
            })
        );

        // Quick tag active note (file menu)
        this.registerEvent(
            this.app.workspace.on('file-menu', (menu, file, source) => {
                if (source !== "file-explorer-context-menu" || !(file instanceof TFile)) return;
                if (file.extension === 'md') {
                    menu.addItem((item) => {
                        item.setTitle('Quick-tag this note')
                            .setSection('Tag my notes')
                            .setIcon('tag')
                            .onClick(async () => {
                                new Notice(`Started tagging operation for '${file.name}' with all tags`);

                                const notes = [{ file }];
                                const tags = this.serialized.settings.tagDescriptions;

                                await this.operationProcessor.createOperation(notes, tags);
                            });
                    });
                }
            })
        );

        // Quick tag folder
        this.registerEvent(
            this.app.workspace.on('file-menu', (menu, file, source) => {
                if (source !== "file-explorer-context-menu" || !(file instanceof TFile)) return;
                if (file.extension !== 'md') return;

                const parentFolder = file.parent;
                if (!(parentFolder instanceof TFolder)) return;

                menu.addItem((item) => {
                    item.setTitle(`Quick-tag notes in '${parentFolder.name || '/'}'`)
                        .setSection('Tag my notes')
                        .setIcon('tags')
                        .onClick(async () => {
                            const files = this.tagUtils.getAllNotesInFolder(parentFolder);
                            new Notice(`Started tagging operation for folder '${parentFolder.name}' with all tags`);

                            const notes = files.map(file => ({ file }));
                            const tags = this.serialized.settings.tagDescriptions;

                            await this.operationProcessor.createOperation(notes, tags);
                        });
                });
            })
        );
    }
}
