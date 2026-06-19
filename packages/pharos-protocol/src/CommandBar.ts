/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Protocol / UI / CommandBar
 * File: packages/pharos-protocol/src/CommandBar.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Framework-agnostic Custom Web Component for RFC-2378 query input.
 * Traceability: Issue #242, SOLID Design (Option C)
 * Last Updated: 2026-06-15
 * ======================================================================== */


export class PkdCommandBar extends HTMLElement {
    private inputField: HTMLInputElement | null = null;
    private helperDropdown: HTMLDivElement | null = null;
    private pillsContainer: HTMLDivElement | null = null;

    static get observedAttributes() {
        return ['placeholder', 'value', 'pills', 'type'];
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (oldValue === newValue) return;

        if (name === 'placeholder' && this.inputField) {
            this.inputField.placeholder = newValue;
        } else if (name === 'value' && this.inputField) {
            this.inputField.value = newValue;
        } else if (name === 'pills') {
            this.renderPills();
        } else if (name === 'type') {
            this.renderDropdownContent();
        }
    }

    private render() {
        const placeholder = this.getAttribute('placeholder') || 'Filter by keywords or key=value...';
        const value = this.getAttribute('value') || '';

        const template = document.createElement('template');
        template.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    font-family: 'Inter', system-ui, -apple-system, sans-serif;
                }
                .container {
                    position: relative;
                    margin-bottom: 16px;
                }
                .glow-bg {
                    position: absolute;
                    top: -4px;
                    left: -4px;
                    right: -4px;
                    bottom: -4px;
                    background: linear-gradient(90deg, rgba(var(--ph-orange, 255, 107, 0), 0.15) 0%, rgba(var(--ph-blue, 0, 95, 184), 0.05) 100%);
                    border-radius: 12px;
                    filter: blur(8px);
                    opacity: 0.3;
                    transition: opacity 0.3s;
                }
                .container:focus-within .glow-bg {
                    opacity: 1;
                }
                .wrapper {
                    position: relative;
                    background-color: rgba(var(--bg-base, 26, 26, 26), 0.95);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(var(--border-blueprint, 0, 95, 184), var(--border-opacity, 0.3));
                    border-left: 3px solid rgb(var(--ph-orange, 255, 107, 0));
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    padding: 8px 12px;
                    gap: 12px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
                }
                .prefix {
                    padding: 4px 8px;
                    background-color: rgba(var(--border-blueprint, 0, 95, 184), 0.1);
                    border: 1px solid rgba(var(--border-blueprint, 0, 95, 184), 0.2);
                    border-radius: 4px;
                    flex-shrink: 0;
                }
                .prefix-text {
                    color: rgb(var(--text-muted, 156, 163, 175));
                    font-family: monospace;
                    font-size: 11px;
                }
                .input-field {
                    background: transparent;
                    border: none;
                    color: rgb(var(--text-base, 243, 244, 246));
                    font-family: monospace;
                    font-size: 14px;
                    flex-grow: 1;
                    outline: none;
                    min-width: 100px;
                }
                .input-field::placeholder {
                    color: rgba(var(--text-muted, 156, 163, 175), 0.5);
                }
                .pills {
                    display: flex;
                    gap: 6px;
                    flex-shrink: 0;
                }
                .pill {
                    padding: 4px 10px;
                    background-color: rgba(var(--ph-orange, 255, 107, 0), 0.05);
                    border: 1px solid rgba(var(--ph-orange, 255, 107, 0), 0.2);
                    color: rgb(var(--text-muted, 156, 163, 175));
                    font-family: monospace;
                    font-size: 10px;
                    text-transform: uppercase;
                    cursor: pointer;
                    border-radius: 4px;
                    transition: all 0.2s;
                }
                .pill:hover {
                    color: rgb(var(--ph-orange, 255, 107, 0));
                    border-color: rgb(var(--ph-orange, 255, 107, 0));
                    background-color: rgba(var(--ph-orange, 255, 107, 0), 0.1);
                }
                .dropdown {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    margin-top: 8px;
                    padding: 20px;
                    background-color: rgba(var(--bg-base, 26, 26, 26), 0.95);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(var(--border-blueprint, 0, 95, 184), var(--border-opacity, 0.3));
                    border-radius: 8px;
                    box-shadow: 0 15px 40px rgba(0,0,0,0.5);
                    z-index: 100;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    opacity: 0;
                    transform: translateY(10px);
                    pointer-events: none;
                    transition: all 0.25s ease-out;
                }
                .dropdown.active {
                    opacity: 1;
                    transform: translateY(0);
                    pointer-events: auto;
                }
                .grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 24px;
                }
                @media (min-width: 640px) {
                    .grid {
                        grid-template-columns: 1fr 1fr;
                    }
                }
                .section-title {
                    font-size: 10px;
                    font-family: monospace;
                    color: rgb(var(--ph-orange, 255, 107, 0));
                    text-transform: uppercase;
                    letter-spacing: 0.15em;
                    margin: 0 0 12px 0;
                }
                .list {
                    list-style-type: none;
                    padding: 0;
                    margin: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 11px;
                }
                .code {
                    font-size: 11px;
                    font-family: monospace;
                    color: rgb(var(--text-base, 243, 244, 246));
                    background-color: rgba(var(--ph-orange, 255, 107, 0), 0.1);
                    padding: 2px 6px;
                    border-radius: 4px;
                }
                .desc {
                    color: rgb(var(--text-muted, 156, 163, 175));
                    text-transform: uppercase;
                }
                .expand-toggle {
                    background: transparent;
                    border: 1px dashed rgba(var(--ph-orange, 255, 107, 0), 0.4);
                    color: rgb(var(--ph-orange, 255, 107, 0));
                    font-family: monospace;
                    font-size: 10px;
                    padding: 4px 8px;
                    cursor: pointer;
                    border-radius: 4px;
                    text-transform: uppercase;
                    transition: all 0.2s;
                    margin-top: 12px;
                    align-self: flex-start;
                    display: inline-block;
                }
                .expand-toggle:hover {
                    background-color: rgba(var(--ph-orange, 255, 107, 0), 0.1);
                    border-color: rgb(var(--ph-orange, 255, 107, 0));
                }
                .expanded-section {
                    display: none;
                    border-top: 1px dashed rgba(var(--text-base, 243, 244, 246), 0.05);
                    padding-top: 12px;
                    margin-top: 12px;
                }
                .expanded-section.active {
                    display: block;
                }
                .expanded-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 16px;
                }
                @media (min-width: 640px) {
                    .expanded-grid {
                        grid-template-columns: 1fr 1fr;
                    }
                }
                .footer {
                    display: flex;
                    justify-content: space-between;
                    border-top: 1px solid rgba(var(--text-base, 243, 244, 246), 0.05);
                    padding-top: 10px;
                    font-size: 9px;
                    color: rgb(var(--text-muted, 156, 163, 175));
                    font-family: monospace;
                }
                .footer-right {
                    display: flex;
                    gap: 10px;
                }
            </style>
            <div class="container">
                <div class="glow-bg"></div>
                <div class="wrapper">
                    <div class="prefix">
                        <span class="prefix-text">pkd query &gt;</span>
                    </div>
                    <input
                        type="text"
                        id="input-field"
                        class="input-field"
                        placeholder="${placeholder}"
                        value="${value}"
                        autocomplete="off"
                        aria-label="Pharos Command Bar"
                    />
                    <div class="pills" id="pills-container"></div>
                </div>
                <div class="dropdown" id="helper-dropdown">
                    <div class="grid">
                        <div id="query-options-container"></div>
                        <div>
                            <h4 class="section-title">Wildcards & Sets</h4>
                            <ul class="list">
                                <li class="item">
                                    <code class="code">*</code>
                                    <span class="desc">Zero or more characters (e.g. dish*)</span>
                                </li>
                                <li class="item">
                                    <code class="code">?</code>
                                    <span class="desc">Exactly one character (e.g. gr?ll)</span>
                                </li>
                                <li class="item">
                                    <code class="code">[ ]</code>
                                    <span class="desc">Character set match (e.g. t[ao]nk)</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                    
                    <button class="expand-toggle" id="expand-help-btn">Show Additional Query Options</button>
                    
                    <div class="expanded-section" id="expanded-section">
                        <h4 class="section-title">Additional Query Options</h4>
                        <div id="expanded-section-content"></div>
                    </div>

                </div>
            </div>
        `;
        this.shadowRoot!.appendChild(template.content.cloneNode(true));
        
        this.inputField = this.shadowRoot!.getElementById('input-field') as HTMLInputElement;
        this.helperDropdown = this.shadowRoot!.getElementById('helper-dropdown') as HTMLDivElement;
        this.pillsContainer = this.shadowRoot!.getElementById('pills-container') as HTMLDivElement;

        this.renderDropdownContent();
        this.renderPills();
    }

    private renderDropdownContent() {
        const queryOptionsContainer = this.shadowRoot!.getElementById('query-options-container');
        const expandedSectionContent = this.shadowRoot!.getElementById('expanded-section-content');
        if (!queryOptionsContainer || !expandedSectionContent) return;

        const type = this.getAttribute('type') || 'app';

        if (type === 'blog') {
            queryOptionsContainer.innerHTML = `
                <h4 class="section-title">Query Options</h4>
                <ul class="list">
                    <li class="item">
                        <code class="code">category=</code>
                        <span class="desc">Filter by category (e.g. engineering)</span>
                    </li>
                    <li class="item">
                        <code class="code">tag=</code>
                        <span class="desc">Filter by tag (e.g. wasm)</span>
                    </li>
                    <li class="item">
                        <code class="code">author=</code>
                        <span class="desc">Filter by author (e.g. PMA)</span>
                    </li>
                </ul>
            `;
            expandedSectionContent.innerHTML = `
                <div class="expanded-grid">
                    <ul class="list">
                        <li class="item">
                            <code class="code">id=</code>
                            <span class="desc">Filter by specific ledger ID</span>
                        </li>
                    </ul>
                </div>
            `;
        } else if (type === 'roadmap') {
            queryOptionsContainer.innerHTML = `
                <h4 class="section-title">Query Options</h4>
                <ul class="list">
                    <li class="item">
                        <code class="code">status=</code>
                        <span class="desc">Filter by status (deployed, progress, blueprint)</span>
                    </li>
                    <li class="item">
                        <code class="code">tag=</code>
                        <span class="desc">Filter by engineering tag (core, bridge, etc)</span>
                    </li>
                    <li class="item">
                        <code class="code">stream=</code>
                        <span class="desc">Filter by roadmap phase (e.g. phase_1)</span>
                    </li>
                </ul>
            `;
            expandedSectionContent.innerHTML = `
                <div class="expanded-grid">
                    <ul class="list">
                        <li class="item">
                            <code class="code">sprint=</code>
                            <span class="desc">Filter by sprint name (e.g. Sprint 5.03)</span>
                        </li>
                    </ul>
                </div>
            `;
        } else {
            // Default 'app' view
            queryOptionsContainer.innerHTML = `
                <h4 class="section-title">Query Options</h4>
                <ul class="list">
                    <li class="item">
                        <code class="code">manufacturer=</code>
                        <span class="desc">Filter by manufacturer</span>
                    </li>
                    <li class="item">
                        <code class="code">voltage=</code>
                        <span class="desc">Filter by voltage (e.g. 240V)</span>
                    </li>
                    <li class="item">
                        <code class="code">category=</code>
                        <span class="desc">Filter by category (e.g. Specialty*)</span>
                    </li>
                </ul>
            `;
            expandedSectionContent.innerHTML = `
                <div class="expanded-grid">
                    <ul class="list">
                        <li class="item">
                            <code class="code">phase=</code>
                            <span class="desc">Electrical phase count (e.g. 3)</span>
                        </li>
                        <li class="item">
                            <code class="code">wattage=</code>
                            <span class="desc">Power usage (e.g. 4500W)</span>
                        </li>
                        <li class="item">
                            <code class="code">btu=</code>
                            <span class="desc">Gas heating capacity (e.g. 120000)</span>
                        </li>
                    </ul>
                    <ul class="list">
                        <li class="item">
                            <code class="code">drainconnection=</code>
                            <span class="desc">Plumbing sizing (e.g. 2" NPT)</span>
                        </li>
                        <li class="item">
                            <code class="code">width=</code> / <code class="code">depth=</code> / <code class="code">height=</code>
                            <span class="desc">Equipment dimensions in inches</span>
                        </li>
                    </ul>
                </div>
            `;
        }
    }

    private renderPills() {
        if (!this.pillsContainer) return;
        this.pillsContainer.innerHTML = '';

        const pillsAttr = this.getAttribute('pills');
        if (!pillsAttr) return;

        try {
            const pillsList = JSON.parse(pillsAttr);
            if (Array.isArray(pillsList)) {
                pillsList.forEach((pill: { label: string; value: string }) => {
                    const btn = document.createElement('button');
                    btn.className = 'pill';
                    btn.innerText = pill.label;
                    btn.dataset.value = pill.value;
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.setValue(pill.value);
                    });
                    this.pillsContainer!.appendChild(btn);
                });
            }
        } catch (e) {
            console.error("Failed to parse pills attribute:", e);
        }
    }

    private setupEventListeners() {
        if (!this.inputField) return;

        this.inputField.addEventListener('input', (e) => {
            const target = e.target as HTMLInputElement;
            this.dispatchEvent(new CustomEvent('pkd-query', {
                detail: { value: target.value },
                bubbles: true,
                composed: true
            }));
            this.updateDropdownState();
        });

        this.inputField.addEventListener('focus', () => {
            this.updateDropdownState();
        });
        this.inputField.addEventListener('blur', () => {
            setTimeout(() => {
                this.updateDropdownState();
            }, 150);
        });

        // Prevent the input from blurring when clicking inside the dropdown
        this.helperDropdown?.addEventListener('mousedown', (e) => {
            e.preventDefault();
        });

        // Use document-level click to handle clicks outside the custom element
        document.addEventListener('click', this.handleOutsideClick);
        const expandBtn = this.shadowRoot!.getElementById('expand-help-btn');
        const expandedSec = this.shadowRoot!.getElementById('expanded-section');
        if (expandBtn && expandedSec) {
            expandBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                expandedSec.classList.toggle('active');
                if (expandedSec.classList.contains('active')) {
                    expandBtn.innerText = "Hide Additional Query Options";
                } else {
                    expandBtn.innerText = "Show Additional Query Options";
                }
            });
        }

        // Hotkeys support
        window.addEventListener('keydown', this.handleWindowKeydown);
    }

    private handleOutsideClick = (e: MouseEvent) => {
        const path = e.composedPath();
        if (!path.includes(this)) {
            this.hideDropdown();
        }
    };

    private handleWindowKeydown = (e: KeyboardEvent) => {
        if (e.key === '/') {
            const active = document.activeElement;
            if (active) {
                const tagName = active.tagName.toUpperCase();
                const contentEditable = active.getAttribute('contenteditable');
                if (tagName === 'INPUT' || tagName === 'TEXTAREA' || contentEditable === 'true' || contentEditable === '') {
                    return;
                }
            }
            if (document.activeElement !== this && !this.shadowRoot!.activeElement) {
                e.preventDefault();
                this.inputField?.focus();
                this.updateDropdownState();
            }
        }
        if (e.key === 'Escape' && (document.activeElement === this || this.shadowRoot!.activeElement === this.inputField)) {
            this.inputField?.blur();
            this.hideDropdown();
        }
    };

    private updateDropdownState() {
        if (!this.inputField || !this.helperDropdown) return;
        
        const isFocused = this.shadowRoot!.activeElement === this.inputField;
        const isEmpty = this.inputField.value.length === 0;

        if (isFocused && isEmpty) {
            this.helperDropdown.classList.add('active');
        } else {
            this.helperDropdown.classList.remove('active');
        }
    }

    private hideDropdown() {
        this.helperDropdown?.classList.remove('active');
    }

    private setValue(val: string) {
        if (!this.inputField) return;
        this.inputField.value = val;
        this.inputField.focus();
        this.dispatchEvent(new CustomEvent('pkd-query', {
            detail: { value: val },
            bubbles: true,
            composed: true
        }));
        this.updateDropdownState();
    }

    disconnectedCallback() {
        document.removeEventListener('click', this.handleOutsideClick);
        window.removeEventListener('keydown', this.handleWindowKeydown);
    }
}

if (typeof window !== 'undefined' && !window.customElements.get('pkd-command-bar')) {
    window.customElements.define('pkd-command-bar', PkdCommandBar);
}
