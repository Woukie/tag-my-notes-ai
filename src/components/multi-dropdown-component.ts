// TODO:
// - Add a search bar with a setSearchBuilder() similar to the text builder
// - DONE select all, and clear

export class MultiDropdownComponent {
    private wrapper: HTMLElement;
    private dropdownContainer: HTMLElement;
    private button: HTMLElement | undefined;
    private buttonText: HTMLElement | undefined;
    private options: Map<any, { text: string, description?: string, checkbox: HTMLInputElement, optionEl: HTMLElement }> = new Map();
    private selectedValues: Set<any> = new Set();
    private dropdownVisible: boolean = false;
    private onChangeCallbacks: Array<(values: any[]) => void> = [];
    private disabled: boolean = false;
    private placeholder: string = 'Select options...'
    private buttonTextBuilder = (values: any[]) => `Selected ${values.length} values`

    constructor(parent: HTMLElement) {
        this.wrapper = parent.createDiv({ cls: 'multidropdown-wrapper' });

        this.createButton();
        this.dropdownContainer = this.wrapper.createDiv({ cls: 'multidropdown-container' });

        document.addEventListener('click', this.handleDocumentClick.bind(this));
    }

    private createButton() {
        this.button = this.wrapper.createDiv({ cls: 'dropdown multidropdown-button' });

        this.buttonText = this.button.createSpan({ cls: 'multidropdown-text', text: 'Select options...' });

        this.button.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!this.disabled) {
                this.toggleDropdown();
            }
        });
    }

    private handleDocumentClick(e: MouseEvent) {
        if (!this.dropdownVisible) return;

        if (!this.wrapper.contains(e.target as Node)) {
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
        this.dropdownContainer.setAttribute("open", "");
        this.dropdownVisible = true;
    }

    private hideDropdown() {
        this.dropdownContainer.removeAttribute("open")
        this.dropdownVisible = false;
    }

    private updateButtonText() {
        if (this.selectedValues.size === 0) {
            this.buttonText?.setText(this.placeholder);
            this.buttonText?.setAttribute('empty', '')
        } else {
            this.buttonText?.setText(this.buttonTextBuilder(this.getValue()));
            this.buttonText?.removeAttribute('empty')
        }
    }

    private triggerOnChange() {
        const values = Array.from(this.selectedValues);
        this.onChangeCallbacks.forEach(callback => callback(values));
    }

    addOption(value: any, text: string, description?: string): this {
        if (this.options.has(value)) return this;

        const optionContainer = this.dropdownContainer.createDiv({ cls: 'multidropdown-option' });

        const checkbox = optionContainer.createEl('input', {
            type: 'checkbox',
            cls: 'multidropdown-option-checkbox',
            attr: { id: `option-${Math.random().toString(36).substr(2, 9)}` }
        });

        const textContainer = optionContainer.createDiv({ cls: 'multidropdown-option-text' });
        textContainer.createSpan({ text });

        if (description) {
            textContainer.createEl('br');
            textContainer.createSpan({
                text: description,
                cls: 'multidropdown-option-description'
            });
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
        this.wrapper.empty();
    }
}
