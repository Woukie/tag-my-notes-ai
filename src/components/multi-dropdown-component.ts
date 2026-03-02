// TODO:
// - Add a search bar with a setSearchBuilder() similar to the text builder
// - DONE select all, and clear

export class MultiDropdownComponent {
    private container: HTMLElement;
    private dropdownContainer: HTMLElement;
    private button: HTMLElement;
    private buttonText: HTMLElement;
    private options: Map<any, { text: string, description?: string, checkbox: HTMLInputElement, optionEl: HTMLElement }> = new Map();
    private selectedValues: Set<any> = new Set();
    private dropdownVisible: boolean = false;
    private onChangeCallbacks: Array<(values: any[]) => void> = [];
    private disabled: boolean = false;
    private placeholder: string = 'Select options...'
    private buttonTextBuilder = (values: any[]) => `Selected ${values.length} values`

    constructor(parent: HTMLElement) {
        this.container = parent.createDiv();
        this.container.style.position = 'relative';
        this.container.style.flexGrow = '1';

        this.createButton();
        this.createDropdownContainer();

        document.addEventListener('click', this.handleDocumentClick.bind(this));
    }

    private createButton() {
        this.button = this.container.createDiv({ cls: 'dropdown' });
        this.button.style.display = 'grid';

        this.buttonText = this.button.createSpan({ text: 'Select options...' });
        this.buttonText.style.overflow = 'hidden'
        this.buttonText.style.whiteSpace = 'nowrap'
        this.buttonText.style.textOverflow = 'ellipsis'
        this.buttonText.style.alignContent = 'center'

        this.button.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!this.disabled) {
                this.toggleDropdown();
            }
        });
    }

    private createDropdownContainer() {
        this.dropdownContainer = this.container.createDiv();
        this.dropdownContainer.style.position = 'absolute';
        this.dropdownContainer.style.top = '100%';
        this.dropdownContainer.style.left = '0';
        this.dropdownContainer.style.right = '0';
        this.dropdownContainer.style.backgroundColor = 'var(--background-primary)';
        this.dropdownContainer.style.border = '1px solid var(--background-modifier-border)';
        this.dropdownContainer.style.borderRadius = 'var(--input-radius, 4px)';
        this.dropdownContainer.style.maxHeight = '150px';
        this.dropdownContainer.style.overflowY = 'auto';
        this.dropdownContainer.style.zIndex = '1000';
        this.dropdownContainer.style.boxShadow = '0 2px 8px var(--background-modifier-box-shadow)';
        this.dropdownContainer.style.display = 'none';
    }

    private handleDocumentClick(e: MouseEvent) {
        if (!this.dropdownVisible) return;

        if (!this.container.contains(e.target as Node)) {
            this.hideDropdown();
        }
    }

    private toggleDropdown() {
        if (this.dropdownVisible) {
            this.hideDropdown();
        } else {
            this.showDropdown();
        }
    }

    private showDropdown() {
        this.dropdownContainer.style.display = 'block';
        this.dropdownVisible = true;
    }

    private hideDropdown() {
        this.dropdownContainer.style.display = 'none';
        this.dropdownVisible = false;
    }

    private updateButtonText() {
        if (this.selectedValues.size === 0) {
            this.buttonText.setText(this.placeholder);
            this.buttonText.style.color = 'var(--text-muted)';
        } else {
            this.buttonText.setText(this.buttonTextBuilder(this.getValue()));
            this.buttonText.style.color = 'var(--text-normal)';
        }
    }

    private triggerOnChange() {
        const values = Array.from(this.selectedValues);
        this.onChangeCallbacks.forEach(callback => callback(values));
    }

    addOption(value: any, text: string, description?: string): this {
        if (this.options.has(value)) return this;

        const optionContainer = this.dropdownContainer.createDiv({ cls: 'multi-dropdown-option' });
        optionContainer.style.padding = 'var(--input-padding)';
        optionContainer.style.cursor = 'pointer';
        optionContainer.style.display = 'flex';
        optionContainer.style.alignItems = 'center';
        optionContainer.style.gap = '8px';

        const checkbox = optionContainer.createEl('input', {
            type: 'checkbox',
            attr: { id: `option-${Math.random().toString(36).substr(2, 9)}` }
        });
        checkbox.style.cursor = 'pointer';
        checkbox.style.margin = '0';

        const textContainer = optionContainer.createDiv();
        textContainer.style.flexGrow = '1';

        const nameSpan = textContainer.createSpan({ text });

        if (description) {
            textContainer.createEl('br');
            const descSpan = textContainer.createSpan({
                text: description,
                cls: 'multi-dropdown-option-description'
            });
            descSpan.style.fontSize = 'var(--font-small)';
            descSpan.style.color = 'var(--text-muted)';
        }

        this.options.set(value, {
            text,
            description,
            checkbox,
            optionEl: optionContainer
        });

        checkbox.addEventListener('change', (e) => {
            e.stopPropagation();
            if (checkbox.checked) {
                this.selectedValues.add(value);
            } else {
                this.selectedValues.delete(value);
            }
            this.updateButtonText();
            this.triggerOnChange();
        });

        optionContainer.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT') return;

            checkbox.checked = !checkbox.checked;
            if (checkbox.checked) {
                this.selectedValues.add(value);
            } else {
                this.selectedValues.delete(value);
            }
            this.updateButtonText();
            this.triggerOnChange();
        });

        optionContainer.addEventListener('mouseenter', () => {
            optionContainer.style.backgroundColor = 'var(--background-modifier-hover)';
        });

        optionContainer.addEventListener('mouseleave', () => {
            optionContainer.style.backgroundColor = '';
        });

        return this;
    }

    setValue(values: any | any[]): this {
        this.selectedValues.clear();
        this.options.forEach((opt) => {
            opt.checkbox.checked = false;
        });

        const valueArray = Array.isArray(values) ? values : [values];
        valueArray.forEach(value => {
            const opt = this.options.get(value);
            if (opt) {
                opt.checkbox.checked = true;
                this.selectedValues.add(value);
            }
        });

        this.updateButtonText();
        this.triggerOnChange();
        return this;
    }

    getValue(): any[] {
        return Array.from(this.selectedValues);
    }

    onChange(callback: (values: any[]) => void): this {
        this.onChangeCallbacks.push(callback);
        return this;
    }

    setPlaceholder(text: string): this {
        this.placeholder = text;
        this.updateButtonText();
        return this;
    }

    setButtonTextBuilder(callback: (values: any[]) => string) {
        this.buttonTextBuilder = callback;
        this.updateButtonText();
        return this;
    }

    clear() {
        this.setValue([]);
    }

    selectAll(): this {
        const allOptionValues = Array.from(this.options.keys());
        allOptionValues.forEach(value => {
            const opt = this.options.get(value);
            if (opt) {
                opt.checkbox.checked = true;
            }
        });

        this.selectedValues = new Set(allOptionValues);

        this.updateButtonText();
        this.triggerOnChange();

        return this;
    }
    destroy() {
        document.removeEventListener('click', this.handleDocumentClick.bind(this));
        this.container.empty();
    }
}
