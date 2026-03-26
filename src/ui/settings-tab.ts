import { App, PluginSettingTab, Notice, SettingGroup } from "obsidian";
import TagMyNotesPlugin from "../main";
import { DEFAULT_SETTINGS } from "../constants";

export class SettingsTab extends PluginSettingTab {
    plugin: TagMyNotesPlugin;

    constructor(app: App, plugin: TagMyNotesPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    private redraw(): void {
        const previousScrollTop = this.containerEl.scrollTop;

        this.display();

        window.requestAnimationFrame(() => {
            this.containerEl.scrollTop = previousScrollTop;
            window.setTimeout(() => {
                this.containerEl.scrollTop = previousScrollTop;
            }, 0);
        });
    }

    display(): void {
        const { containerEl } = this;
        const settings = this.plugin.serialized.settings;
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
                .addOption('open_router', 'OpenRouter')
                .addOption('mistral', 'Mistral')
                .setValue(settings.aiProvider)
                .onChange(async (value) => {
                    const v = value as 'vercel_gateway' | 'ollama' | 'openai' | 'open_router' | 'mistral';
                    settings.aiProvider = v;
                    await this.plugin.savePersistent();
                    this.redraw();
                }))
        );

        const prov = settings.aiProvider;

        switch (prov) {
            case 'vercel_gateway':
                providerGroup.addSetting(s => s
                    .setName('Vercel API key')
                    .setDesc('Your Vercel AI Gateway API key.')
                    .addText(text => text
                        .setPlaceholder('vck_...')
                        .setValue(settings.gatewaySettings.apiKey)
                        .onChange(async (value) => {
                            settings.gatewaySettings.apiKey = value;
                            await this.plugin.savePersistent();
                        }))
                );
                providerGroup.addSetting(s => s
                    .setName('Vercel model ID')
                    .setDesc('Model name with provider prefix, e.g., "openai/gpt-4o", "anthropic/claude-3", "google/gemini-pro".')
                    .addText(text => text
                        .setPlaceholder('openai/gpt-4o')
                        .setValue(settings.gatewaySettings.modelId)
                        .onChange(async (value) => {
                            settings.gatewaySettings.modelId = value;
                            await this.plugin.savePersistent();
                        }))
                );
                providerGroup.addSetting(s => s
                    .setName('Vercel base URL')
                    .setDesc('Base url for Vercel, leave blank for default.')
                    .addText(text => text
                        .setPlaceholder('https://ai-gateway.vercel.sh/v3/ai')
                        .setValue(settings.gatewaySettings.baseUrl)
                        .onChange(async (value) => {
                            settings.gatewaySettings.baseUrl = value;
                            await this.plugin.savePersistent();
                        }))
                );
                break;
            case 'ollama':
                providerGroup.addSetting(s => s
                    .setName('Ollama model name')
                    .setDesc('Ollama model name (e.g., llama3, mistral).')
                    .addText(text => text
                        .setPlaceholder('llama3')
                        .setValue(settings.ollamaSettings.modelId)
                        .onChange(async (value) => {
                            settings.ollamaSettings.modelId = value;
                            await this.plugin.savePersistent();
                        }))
                );
                providerGroup.addSetting(s => s
                    .setName('Ollama base URL')
                    .setDesc('Base url for Ollama, leave blank for default.')
                    .addText(text => text
                        .setPlaceholder('http://localhost:11434')
                        .setValue(settings.ollamaSettings.baseUrl)
                        .onChange(async (value) => {
                            settings.ollamaSettings.baseUrl = value;
                            await this.plugin.savePersistent();
                        }))
                );
                break;
            case 'openai':
                providerGroup.addSetting(s => s
                    .setName('OpenAI API key')
                    .setDesc('Your OpenAI AI API key.')
                    .addText(text => text
                        .setPlaceholder('sk-...')
                        .setValue(settings.openaiSettings.apiKey)
                        .onChange(async (value) => {
                            settings.openaiSettings.apiKey = value;
                            await this.plugin.savePersistent();
                        }))
                );
                providerGroup.addSetting(s => s
                    .setName('OpenAI model name')
                    .setDesc('Model name, e.g., "gpt-4o".')
                    .addText(text => text
                        .setPlaceholder('gpt-4o')
                        .setValue(settings.openaiSettings.modelId)
                        .onChange(async (value) => {
                            settings.openaiSettings.modelId = value;
                            await this.plugin.savePersistent();
                        }))
                );
                providerGroup.addSetting(s => s
                    .setName('OpenAI base URL')
                    .setDesc('Base url for OpenAI, leave blank for default.')
                    .addText(text => text
                        .setPlaceholder('http://localhost:11434')
                        .setValue(settings.openaiSettings.baseUrl)
                        .onChange(async (value) => {
                            settings.openaiSettings.baseUrl = value;
                            await this.plugin.savePersistent();
                        }))
                );
                break;
            case 'open_router':
                providerGroup.addSetting(s => s
                    .setName('OpenRouter API key')
                    .setDesc('Your OpenRouter API key.')
                    .addText(text => text
                        .setPlaceholder('sk-...')
                        .setValue(settings.openRouterSettings.apiKey)
                        .onChange(async (value) => {
                            settings.openRouterSettings.apiKey = value;
                            await this.plugin.savePersistent();
                        }))
                );
                providerGroup.addSetting(s => s
                    .setName('OpenRouter model ID')
                    .setDesc('Model name with provider prefix, e.g., "openai/gpt-4o", "anthropic/claude-3", "google/gemini-pro".')
                    .addText(text => text
                        .setPlaceholder('openai/gpt-4o-mini')
                        .setValue(settings.openRouterSettings.modelId)
                        .onChange(async (value) => {
                            settings.openRouterSettings.modelId = value;
                            await this.plugin.savePersistent();
                        }))
                );
                providerGroup.addSetting(s => s
                    .setName('OpenRouter base URL')
                    .setDesc('Base url for OpenRouter, leave blank for default.')
                    .addText(text => text
                        .setPlaceholder('http://localhost:11434')
                        .setValue(settings.openRouterSettings.baseUrl)
                        .onChange(async (value) => {
                            settings.openRouterSettings.baseUrl = value;
                            await this.plugin.savePersistent();
                        }))
                );
                break;
            case 'mistral':
                providerGroup.addSetting(s => s
                    .setName('Mistral API key')
                    .setDesc('Your Mistral API key.')
                    .addText(text => text
                        .setPlaceholder('...')
                        .setValue(settings.mistralSettings.apiKey)
                        .onChange(async (value) => {
                            settings.mistralSettings.apiKey = value;
                            await this.plugin.savePersistent();
                        }))
                );
                providerGroup.addSetting(s => s
                    .setName('Mistral model name')
                    .setDesc('Model name, e.g., "mistral-large-latest", "mistral-small-2506".')
                    .addText(text => text
                        .setPlaceholder('mistral-large-latest')
                        .setValue(settings.mistralSettings.modelId)
                        .onChange(async (value) => {
                            settings.mistralSettings.modelId = value;
                            await this.plugin.savePersistent();
                        }))
                );
                providerGroup.addSetting(s => s
                    .setName('Mistral base URL')
                    .setDesc('Base url for Mistral, leave blank for default.')
                    .addText(text => text
                        .setPlaceholder('http://localhost:11434')
                        .setValue(settings.mistralSettings.baseUrl)
                        .onChange(async (value) => {
                            settings.mistralSettings.baseUrl = value;
                            await this.plugin.savePersistent();
                        }))
                );
                break;
            default:
                break;
        }

        const paramsGroup = new SettingGroup(containerEl);
        paramsGroup.setHeading("Model parameters");

        paramsGroup.addSetting(s => s
            .setName('Temperature')
            .setDesc('Controls randomness (0 = deterministic, 1 = creative).')
            .addSlider(slider => slider
                .setLimits(0, 1, 0.1)
                .setValue(settings.temperature)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    settings.temperature = value;
                    await this.plugin.savePersistent();
                }))
        );

        paramsGroup.addSetting(s => s
            .setName('Max tokens')
            .setDesc('Maximum tokens in the response.')
            .addText(text => text
                .setPlaceholder('200')
                .setValue(String(settings.maxTokens))
                .onChange(async (value) => {
                    const numValue = parseInt(value);
                    if (!isNaN(numValue) && numValue > 0) {
                        settings.maxTokens = numValue;
                        await this.plugin.savePersistent();
                    }
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
                    settings.tagDescriptions.forEach((tag) => {
                        if (tag.name.startsWith('new_tag_')) {
                            const num = parseInt(tag.name.split('_')[2]);
                            if (!isNaN(num) && num > maxNumber) maxNumber = num;
                        }
                    });
                    const name = `new_tag_${maxNumber + 1}`;
                    settings.tagDescriptions.push({ name, description: '' });
                    this.plugin.savePersistent();
                    this.redraw();
                }))
        );

        settings.tagDescriptions.forEach((tag, id) => {
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
                            settings.tagDescriptions.splice(id, 1);
                            await this.plugin.savePersistent();
                            this.redraw();
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

        reasoningGroup.addSetting(s => {
            s.setName('Information')
            s.descEl.createEl('p', { text: 'To decide whether a given tag applies to a note, the AI answers series of reasoning steps defined by you.' })
            const li = s.descEl.createEl('ul')
            li.createEl('li', { text: "The response to the final step will be structured, containing the parameters 'shouldTag' and 'confidence', the definitions of which are defined in advanced." })
            li.createEl('li', { text: "The conversation is preceeded by a context message containing the file name, file content and a list of tag names and descriptions." })
            li.createEl('li', { text: "If 'Number of tags per request' is set to 1, then the placeholders {tag} and {description} will also be made available." })
        })

        reasoningGroup.addSetting(s => s
            .setName('Add reasoning step')
            .setDesc('Add a new step to the reasoning process.')
            .addButton(button => button
                .setButtonText('Add step')
                .setCta()
                .onClick(() => {
                    settings.reasoningSteps.push({ prompt: '' });
                    this.plugin.savePersistent();
                    this.redraw();
                }))
        );

        settings.reasoningSteps.forEach((step, index) => {
            reasoningGroup.addSetting(s => {
                const finalStep = index === settings.reasoningSteps.length - 1;
                const firstStep = index === 0;
                const name = finalStep ? 'Decision step' : firstStep ? 'Context step' : `Step ${index + 1}`
                var desc = finalStep ? 'The reponse to this step is a structured object containing the values of \'shouldTag\' and \'confidence\'.' : firstStep ? 'The first question of the reasoning chain.' : `Intermediary reasoning step.`
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
                                const steps = settings.reasoningSteps;
                                [steps[index - 1], steps[index]] = [steps[index], steps[index - 1]];
                                await this.plugin.savePersistent();
                                this.redraw();
                            }
                        })
                        .setDisabled(index === 0)
                    )
                    .addButton(button => button
                        .setIcon('arrow-down')
                        .setTooltip('Move down')
                        .onClick(async () => {
                            if (index < settings.reasoningSteps.length - 1) {
                                const steps = settings.reasoningSteps;
                                [steps[index], steps[index + 1]] = [steps[index + 1], steps[index]];
                                await this.plugin.savePersistent();
                                this.redraw();
                            }
                        })
                        .setDisabled(index === settings.reasoningSteps.length - 1)
                    )
                    .addButton(button => button
                        .setIcon('trash')
                        .setTooltip('Delete')
                        .setWarning()
                        .onClick(async () => {
                            settings.reasoningSteps.splice(index, 1);
                            await this.plugin.savePersistent();
                            this.redraw();
                        })
                    );

                return s;
            });
        });

        const advancedPrompt = new SettingGroup(containerEl);
        advancedPrompt.setHeading("Advanced model parameters")

        advancedPrompt.addSetting(s => s
            .setName('Enable context clamping')
            .setDesc('Limit the amount of context sent to the AI about a note. Can save tokens.')
            .addToggle(toggle => toggle
                .setValue(settings.contextClamping.enabled)
                .onChange(async (value) => {
                    settings.contextClamping.enabled = value;
                    await this.plugin.savePersistent();
                    this.redraw();
                }))
        );

        if (settings.contextClamping.enabled) {
            advancedPrompt.addSetting(s => s
                .setName('Max content length')
                .setDesc('Maximum number of characters to send to the AI as part of note context.')
                .addText(text => text
                    .setPlaceholder('3000')
                    .setValue(String(settings.contextClamping.maxContentLength))
                    .onChange(async (value) => {
                        const numValue = parseInt(value);
                        if (!isNaN(numValue) && numValue > 0) {
                            settings.contextClamping.maxContentLength = numValue;
                            await this.plugin.savePersistent();
                        }
                    }))
            );

            advancedPrompt.addSetting(s => s
                .setName('Truncation strategy')
                .setDesc('Which part of the note to keep when clamping context.')
                .addDropdown(dropdown => dropdown
                    .addOption('beginning', 'Keep beginning')
                    .addOption('end', 'Keep end')
                    .setValue(settings.contextClamping.truncationStrategy)
                    .onChange(async (value) => {
                        const v = value as 'beginning' | 'end';
                        settings.contextClamping.truncationStrategy = v;
                        await this.plugin.savePersistent();
                    }))
            );
        }

        advancedPrompt.addSetting(s => s
            .setName('Number of tags per request')
            .setDesc('Process multiple tags per request. Removes the {tag} and {description} placeholders in the reasoning steps when not \'1\'. \'0\' processes every tag in one request.')
            .addText(text => text
                .setValue(settings.tagsPerRequest.toString())
                .onChange(async value => {
                    settings.tagsPerRequest = Number.parseInt(value);
                    await this.plugin.savePersistent();
                })
            )
        );

        advancedPrompt.addSetting(s => s
            .setName('Description of output parameter \'shouldTag\'')
            .setDesc('Internal parameter definition used by the AI in the decision step.')
            .addTextArea(dropdown => dropdown
                .setValue(settings.shouldTagDescription)
                .onChange(async (value) => {
                    settings.shouldTagDescription = value;
                    await this.plugin.savePersistent();
                }))
        );

        advancedPrompt.addSetting(s => s
            .setName('Description of output parameter \'confidence\'')
            .setDesc('Internal parameter definition used by the AI in the decision step.')
            .addTextArea(dropdown => dropdown
                .setValue(settings.confidenceDescription)
                .onChange(async (value) => {
                    settings.confidenceDescription = value;
                    await this.plugin.savePersistent();
                }))
        );

        advancedPrompt.addSetting(s => s
            .setName('Confidence threshold')
            .setDesc('Minimum confidence score given by the final response required to apply or remove a tag (0.0 - 1.0).')
            .addSlider(slider => slider
                .setLimits(0, 1, 0.05)
                .setValue(settings.confidenceThreshold)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    settings.confidenceThreshold = value;
                    await this.plugin.savePersistent();
                }))
        );

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
                    this.redraw();
                    new Notice('Settings reset to defaults.');
                }))
        );
    }
}