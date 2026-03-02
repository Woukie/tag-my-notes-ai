import { App, PluginSettingTab, Notice, SettingGroup } from "obsidian";
import TagMyNotesPlugin from "../main";
import { DEFAULT_SETTINGS } from "../constants";

export class SettingsTab extends PluginSettingTab {
    plugin: TagMyNotesPlugin;

    constructor(app: App, plugin: TagMyNotesPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        const providerGroup = new SettingGroup(containerEl);
        providerGroup.setHeading("AI provider");

        providerGroup.addSetting(s => s
            .setName('Provider')
            .setDesc('Choose the AI backend.')
            .addDropdown(dropdown => dropdown
                .addOption('vercel_gateway', 'Vercel AI Gateway')
                .addOption('ollama', 'Ollama')
                .addOption('openai', 'OpenAI')
                .setValue(this.plugin.serialized.settings.aiProvider)
                .onChange(async (value) => {
                    const v = value as 'vercel_gateway' | 'ollama' | 'openai';
                    this.plugin.serialized.settings.aiProvider = v;
                    await this.plugin.savePersistent();
                    this.display();
                }))
        );

        const prov = this.plugin.serialized.settings.aiProvider;

        if (prov === 'vercel_gateway') {
            providerGroup.addSetting(s => s
                .setName('Vercel API key')
                .setDesc('Your Vercel AI Gateway API key.')
                .addText(text => text
                    .setPlaceholder('vercel_...')
                    .setValue(this.plugin.serialized.settings.gatewaySettings.apiKey)
                    .onChange(async (value) => {
                        this.plugin.serialized.settings.gatewaySettings.apiKey = value;
                        await this.plugin.savePersistent();
                    }))
            );
            providerGroup.addSetting(s => s
                .setName('Vercel model ID')
                .setDesc('Model name with provider prefix, e.g., "openai/gpt-4o", "anthropic/claude-3", "google/gemini-pro".')
                .addText(text => text
                    .setPlaceholder('openai/gpt-4o')
                    .setValue(this.plugin.serialized.settings.gatewaySettings.modelId)
                    .onChange(async (value) => {
                        this.plugin.serialized.settings.gatewaySettings.modelId = value;
                        await this.plugin.savePersistent();
                    }))
            );
            providerGroup.addSetting(s => s
                .setName('Vercel base URL')
                .setDesc('Base url for vercel, leave blank for default.')
                .addText(text => text
                    .setPlaceholder('https://ai-gateway.vercel.sh/v3/ai')
                    .setValue(this.plugin.serialized.settings.gatewaySettings.baseUrl)
                    .onChange(async (value) => {
                        this.plugin.serialized.settings.gatewaySettings.baseUrl = value;
                        await this.plugin.savePersistent();
                    }))
            );
        } else if (prov === 'ollama') {
            providerGroup.addSetting(s => s
                .setName('Ollama model name')
                .setDesc('Ollama model name (e.g., llama3, mistral).')
                .addText(text => text
                    .setPlaceholder('llama3')
                    .setValue(this.plugin.serialized.settings.ollamaSettings.modelId)
                    .onChange(async (value) => {
                        this.plugin.serialized.settings.ollamaSettings.modelId = value;
                        await this.plugin.savePersistent();
                    }))
            );
            providerGroup.addSetting(s => s
                .setName('Ollama base URL')
                .setDesc('Base url for Ollama, leave blank for default.')
                .addText(text => text
                    .setPlaceholder('http://localhost:11434')
                    .setValue(this.plugin.serialized.settings.ollamaSettings.baseUrl)
                    .onChange(async (value) => {
                        this.plugin.serialized.settings.ollamaSettings.baseUrl = value;
                        await this.plugin.savePersistent();
                    }))
            );
        } else if (prov === 'openai') {
            providerGroup.addSetting(s => s
                .setName('OpenAI API key')
                .setDesc('Your OpenAI AI Gateway API key.')
                .addText(text => text
                    .setPlaceholder('sk_...')
                    .setValue(this.plugin.serialized.settings.openaiSettings.apiKey)
                    .onChange(async (value) => {
                        this.plugin.serialized.settings.openaiSettings.apiKey = value;
                        await this.plugin.savePersistent();
                    }))
            );
            providerGroup.addSetting(s => s
                .setName('OpenAI model name')
                .setDesc('Model name, e.g., "gpt-4o", "gpt-4o-mini".')
                .addText(text => text
                    .setPlaceholder('gpt-4o')
                    .setValue(this.plugin.serialized.settings.openaiSettings.modelId)
                    .onChange(async (value) => {
                        this.plugin.serialized.settings.openaiSettings.modelId = value;
                        await this.plugin.savePersistent();
                    }))
            );
            providerGroup.addSetting(s => s
                .setName('OpenAI base URL')
                .setDesc('Base url for OpenAI, leave blank for default.')
                .addText(text => text
                    .setPlaceholder('http://localhost:11434')
                    .setValue(this.plugin.serialized.settings.openaiSettings.baseUrl)
                    .onChange(async (value) => {
                        this.plugin.serialized.settings.openaiSettings.baseUrl = value;
                        await this.plugin.savePersistent();
                    }))
            );
        }

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

        paramsGroup.addSetting(s => s
            .setName('Should tag description')
            .setDesc('Define what the \'shouldTag\' parameter means in the decision step.')
            .addTextArea(dropdown => dropdown
                .setValue(this.plugin.serialized.settings.shouldTagDescription)
                .onChange(async (value) => {
                    this.plugin.serialized.settings.shouldTagDescription = value;
                    await this.plugin.savePersistent();
                }))
        );

        paramsGroup.addSetting(s => s
            .setName('Confidence description')
            .setDesc('Define what the \'confidence\' parameter means in the decision step.')
            .addTextArea(dropdown => dropdown
                .setValue(this.plugin.serialized.settings.confidenceDescription)
                .onChange(async (value) => {
                    this.plugin.serialized.settings.confidenceDescription = value;
                    await this.plugin.savePersistent();
                }))
        );

        paramsGroup.addSetting(s => s
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
            paramsGroup.addSetting(s => s
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

            paramsGroup.addSetting(s => s
                .setName('Truncation strategy')
                .setDesc('Which part of the content to keep when truncating.')
                .addDropdown(dropdown => dropdown
                    .addOption('beginning', 'Keep beginning')
                    .addOption('end', 'Keep end')
                    .setValue(this.plugin.serialized.settings.contextClamping.truncationStrategy)
                    .onChange(async (value) => {
                        const v = value as 'beginning' | 'end';
                        this.plugin.serialized.settings.contextClamping.truncationStrategy = v;
                        await this.plugin.savePersistent();
                    }))
            );
        }

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