import { App, PluginSettingTab, Notice, SettingGroup } from "obsidian";
import TagMyNotesPlugin from "../main";
import { DEFAULT_SETTINGS, OPENAI_MODELS } from "../constants";

export class SettingsTab extends PluginSettingTab {
    plugin: TagMyNotesPlugin;

    constructor(app: App, plugin: TagMyNotesPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        const aiGroup = new SettingGroup(containerEl);
        aiGroup.setHeading("AI model");

        aiGroup.addSetting(s => s
            .setName('OpenAI API key')
            .setDesc('The API key used to make requests.')
            .addText(text => text
                .setPlaceholder('sk-...')
                .setValue(this.plugin.serialized.settings.openAIApiKey)
                .onChange(async (value) => {
                    this.plugin.serialized.settings.openAIApiKey = value;
                    await this.plugin.savePersistent();
                }))
        );

        aiGroup.addSetting(s => s
            .setName('OpenAI model')
            .setDesc('Which AI model is used by the plugin.')
            .addDropdown(dropdown => {
                Object.entries(OPENAI_MODELS).forEach(([value, label]) => {
                    dropdown.addOption(value, label);
                });

                dropdown.setValue(this.plugin.serialized.settings.openAIModel)
                    .onChange(async (value) => {
                        this.plugin.serialized.settings.openAIModel = value;
                        await this.plugin.savePersistent();
                    });
            })
        );

        const paramsGroup = new SettingGroup(containerEl);
        paramsGroup.setHeading("Model parameters");

        paramsGroup.addSetting(s => s
            .setName('Temperature')
            .setDesc('Controls randomness (0 = deterministic, 1 = creative).')
            .addSlider(slider => slider
                .setLimits(0, 1, 0.1)
                .setValue(this.plugin.serialized.settings.temperature)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.serialized.settings.temperature = value;
                    await this.plugin.savePersistent();
                }))
        );

        paramsGroup.addSetting(s => s
            .setName('Max tokens')
            .setDesc('Maximum tokens in the response.')
            .addText(text => text
                .setPlaceholder('200')
                .setValue(String(this.plugin.serialized.settings.maxTokens))
                .onChange(async (value) => {
                    const numValue = parseInt(value);
                    if (!isNaN(numValue) && numValue > 0) {
                        this.plugin.serialized.settings.maxTokens = numValue;
                        await this.plugin.savePersistent();
                    }
                }))
        );

        paramsGroup.addSetting(s => s
            .setName('Confidence threshold')
            .setDesc('Minimum confidence score to apply tags (0.0 - 1.0).')
            .addSlider(slider => slider
                .setLimits(0, 1, 0.05)
                .setValue(this.plugin.serialized.settings.confidenceThreshold)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.serialized.settings.confidenceThreshold = value;
                    await this.plugin.savePersistent();
                }))
        );

        const contextGroup = new SettingGroup(containerEl);
        contextGroup.setHeading("Context clamping");

        contextGroup.addSetting(s => s
            .setName('Enable context clamping')
            .setDesc('Limit the amount of context sent to the AI.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.serialized.settings.contextClamping.enabled)
                .onChange(async (value) => {
                    this.plugin.serialized.settings.contextClamping.enabled = value;
                    await this.plugin.savePersistent();
                    this.display();
                }))
        );

        if (this.plugin.serialized.settings.contextClamping.enabled) {
            contextGroup.addSetting(s => s
                .setName('Max content length')
                .setDesc('Maximum number of characters to send to the AI.')
                .addText(text => text
                    .setPlaceholder('3000')
                    .setValue(String(this.plugin.serialized.settings.contextClamping.maxContentLength))
                    .onChange(async (value) => {
                        const numValue = parseInt(value);
                        if (!isNaN(numValue) && numValue > 0) {
                            this.plugin.serialized.settings.contextClamping.maxContentLength = numValue;
                            await this.plugin.savePersistent();
                        }
                    }))
            );

            contextGroup.addSetting(s => s
                .setName('Truncation strategy')
                .setDesc('Which part of the content to keep when truncating.')
                .addDropdown(dropdown => dropdown
                    .addOption('beginning', 'Keep beginning')
                    .addOption('end', 'Keep end')
                    .setValue(this.plugin.serialized.settings.contextClamping.truncationStrategy)
                    .onChange(async (value: 'beginning' | 'end') => {
                        this.plugin.serialized.settings.contextClamping.truncationStrategy = value;
                        await this.plugin.savePersistent();
                    }))
            );
        }

        const responseGroup = new SettingGroup(containerEl);
        responseGroup.setHeading("Response format");

        responseGroup.addSetting(s => s
            .setName('Response format')
            .setDesc('Choose how the AI should structure its responses.')
            .addDropdown(dropdown => dropdown
                .addOption('function_calling', 'Function calling')
                .addOption('structured_outputs', 'Structured outputs')
                .setValue(this.plugin.serialized.settings.responseFormat)
                .onChange(async (value: 'function_calling' | 'structured_outputs') => {
                    this.plugin.serialized.settings.responseFormat = value;
                    this.display();
                    await this.plugin.savePersistent();
                }))
        );

        if (this.plugin.serialized.settings.responseFormat === 'function_calling') {
            responseGroup.addSetting(s => s
                .setName('Function description')
                .setDesc('Describes the purpose of the function used in the final response with function calling. Does not apply to structured responses.')
                .addTextArea(dropdown => dropdown
                    .setValue(this.plugin.serialized.settings.functionDescription)
                    .onChange(async (value) => {
                        this.plugin.serialized.settings.functionDescription = value;
                        await this.plugin.savePersistent();
                    }))
            );
        }

        responseGroup.addSetting(s => s
            .setName('Should tag description')
            .setDesc('Define what the \'shouldTag\' parameter means in the decision step.')
            .addTextArea(dropdown => dropdown
                .setValue(this.plugin.serialized.settings.shouldTagDescription)
                .onChange(async (value) => {
                    this.plugin.serialized.settings.shouldTagDescription = value;
                    await this.plugin.savePersistent();
                }))
        );

        responseGroup.addSetting(s => s
            .setName('Confidence description')
            .setDesc('Define what the \'confidence\' parameter means in the decision step.')
            .addTextArea(dropdown => dropdown
                .setValue(this.plugin.serialized.settings.confidenceDescription)
                .onChange(async (value) => {
                    this.plugin.serialized.settings.confidenceDescription = value;
                    await this.plugin.savePersistent();
                }))
        );

        const tagGroup = new SettingGroup(containerEl);
        tagGroup.setHeading("Tag descriptions");

        tagGroup.addSetting(s => s
            .setName('Add new tag')
            .setDesc('Create a new tag description.')
            .addButton(button => button
                .setButtonText('Add tag')
                .setCta()
                .onClick(() => {
                    let maxNumber = 0;
                    this.plugin.serialized.settings.tagDescriptions.forEach((tag) => {
                        if (tag.name.startsWith('new_tag_')) {
                            const num = parseInt(tag.name.split('_')[2]);
                            if (!isNaN(num) && num > maxNumber) maxNumber = num;
                        }
                    });
                    const name = `new_tag_${maxNumber + 1}`;
                    this.plugin.serialized.settings.tagDescriptions.push({ name, description: '' });
                    this.plugin.savePersistent();
                    this.display();
                }))
        );

        this.plugin.serialized.settings.tagDescriptions.forEach((tag, id) => {
            tagGroup.addSetting(s => {
                s.setName(tag.name)
                    .addTextArea(c => c
                        .setValue(tag.description)
                        .onChange(async (value) => {
                            const newDescription = value.trim();
                            tag.description = newDescription;
                            await this.plugin.savePersistent();
                        })
                    )
                    .addButton(c => c
                        .setIcon('trash')
                        .setTooltip('Delete')
                        .setWarning()
                        .onClick(async () => {
                            this.plugin.serialized.settings.tagDescriptions.splice(id, 1);
                            await this.plugin.savePersistent();
                            this.display();
                        })
                    );

                s.nameEl.empty()

                const nameInput = s.nameEl.createEl('input', {
                    type: 'text',
                    value: tag.name,
                    placeholder: 'Tag name'
                });

                nameInput.addEventListener('change', async () => {
                    const newName = nameInput.value.trim();
                    tag.name = newName;
                    await this.plugin.savePersistent();
                });

                return s;
            }
            )
        });

        const reasoningGroup = new SettingGroup(containerEl);
        reasoningGroup.setHeading("Reasoning steps");

        reasoningGroup.addSetting(s => s
            .setName('Add reasoning step')
            .setDesc('Add a new step to the reasoning process.')
            .addButton(button => button
                .setButtonText('Add step')
                .setCta()
                .onClick(() => {
                    this.plugin.serialized.settings.reasoningSteps.push({ prompt: '' });
                    this.plugin.savePersistent();
                    this.display();
                }))
        );

        this.plugin.serialized.settings.reasoningSteps.forEach((step, index) => {
            reasoningGroup.addSetting(s => {
                const finalStep = index === this.plugin.serialized.settings.reasoningSteps.length - 1;
                const firstStep = index === 0;
                const name = finalStep ? 'Decision step' : firstStep ? 'Context step' : `Step ${index + 1}`
                const desc = finalStep ? 'The reponse to this step will be the decision as a JSON object containing values for \'shouldTag\' and \'confidence\'.' : firstStep ? 'The first question of the reasoning chain, placeholders {tag} and {description} will be substituted. The note is attached separately.' : `Intermediary reasoning step.`
                s.setName(name)
                    .setDesc(desc)
                    .addTextArea(textarea => textarea
                        .setValue(step.prompt)
                        .setPlaceholder('Enter reasoning step prompt...')
                        .onChange(async (value) => {
                            step.prompt = value;
                            await this.plugin.savePersistent();
                        })
                    )
                    .addButton(button => button
                        .setIcon('arrow-up')
                        .setTooltip('Move up')
                        .onClick(async () => {
                            if (index > 0) {
                                const steps = this.plugin.serialized.settings.reasoningSteps;
                                [steps[index - 1], steps[index]] = [steps[index], steps[index - 1]];
                                await this.plugin.savePersistent();
                                this.display();
                            }
                        })
                        .setDisabled(index === 0)
                    )
                    .addButton(button => button
                        .setIcon('arrow-down')
                        .setTooltip('Move down')
                        .onClick(async () => {
                            if (index < this.plugin.serialized.settings.reasoningSteps.length - 1) {
                                const steps = this.plugin.serialized.settings.reasoningSteps;
                                [steps[index], steps[index + 1]] = [steps[index + 1], steps[index]];
                                await this.plugin.savePersistent();
                                this.display();
                            }
                        })
                        .setDisabled(index === this.plugin.serialized.settings.reasoningSteps.length - 1)
                    )
                    .addButton(button => button
                        .setIcon('trash')
                        .setTooltip('Delete')
                        .setWarning()
                        .onClick(async () => {
                            this.plugin.serialized.settings.reasoningSteps.splice(index, 1);
                            await this.plugin.savePersistent();
                            this.display();
                        })
                    );

                return s;
            });
        });

        const resetGroup = new SettingGroup(containerEl);
        resetGroup.setHeading("Reset settings");

        resetGroup.addSetting(s => s
            .setName('Reset settings')
            .setDesc('Restore all settings to their default values.')
            .addButton(button => button
                .setButtonText('Reset to defaults')
                .setWarning()
                .onClick(async () => {
                    this.plugin.serialized.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
                    await this.plugin.savePersistent();
                    this.display();
                    new Notice('Settings reset to defaults.');
                }))
        );
    }
}