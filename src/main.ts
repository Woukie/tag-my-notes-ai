import { Notice, Plugin, TFile } from 'obsidian';
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

        this.registerEvent(
            this.app.workspace.on('editor-menu', (menu, editor, view) => {
                const file = view.file;
                if (!(file instanceof TFile)) return;
                if (file.extension === 'md') {
                    menu.addItem((item) => {
                        item.setTitle('Apply all tags to note')
                            .setSection('Tag my notes')
                            .setIcon('tag')
                            .onClick(async () => {
                                new Notice(`Started tagging operation for '${file.name}' with all tags`)
                                const notes = this.serialized.settings.tagDescriptions.map(tag => ({ file, tag }));
                                await this.operationProcessor.createOperation(notes);
                            });
                    });
                }
            })
        );

        this.addSettingTab(new SettingsTab(this.app, this));

        this.operationProcessor.watchOperations();
    }

    async loadPersistent() {
        this.serialized = Object.assign({}, { settings: DEFAULT_SETTINGS, operations: [] }, await this.loadData())
    }

    async savePersistent() {
        await this.saveData(this.serialized);
    }
}
