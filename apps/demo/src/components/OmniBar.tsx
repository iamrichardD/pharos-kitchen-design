/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Demo / Components
 * File: OmniBar.tsx
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Consumes the shared framework-agnostic <pkd-command-bar> Web Component 
 *          to query the local WASM registry.
 * Traceability: Issue #242, ADR-0006, Option C
 * Last Updated: 2026-06-15
 * ======================================================================== */

import React, { useState, useEffect, useRef } from 'react';
import type { PharosRegistryHandle } from '@pkd/core';
// Import the Custom Element package to guarantee registration
import '@pkd/protocol';

interface OmniBarProps {
    registryHandle: PharosRegistryHandle | null;
    onHoverItem: (itemId: string | null) => void;
    onSelectItem: (itemId: string) => void;
    statusText: string;
    setStatusText: (text: string) => void;
}

const ALLOWED_FIELDS = new Set([
    'name', 'id', 'metadata_id', 'category', 'manufacturer', 'model',
    'pkd_manufacturer', 'pkd_modelnumber', 'pkd_targetmarket', 'pkd_voltage',
    'pkd_phase', 'pkd_wattage', 'pkd_btu', 'pkd_drainconnection',
    'pkd_doclinks', 'pkd_industry', 'pkd_targetregions', 'pkd_assetviews',
    'voltage', 'phase', 'wattage', 'btu', 'drainconnection', 'industry', 'targetregions'
]);

interface SearchResult {
    id: string;
    name: string;
    mfr: string;
}

interface ToonDoc {
    lists?: {
        results?: {
            schema: string[];
            items: string[][];
        };
    };
}

export const OmniBar: React.FC<OmniBarProps> = ({
    registryHandle,
    onHoverItem,
    onSelectItem,
    statusText,
    setStatusText
}) => {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [hintMsg, setHintMsg] = useState<string | null>(null);
    
    const barRef = useRef<HTMLElement>(null);

    // Bind custom event from native Web Component
    useEffect(() => {
        const bar = barRef.current;
        if (!bar) return;

        const handleQueryEvent = (e: any) => {
            setQuery(e.detail.value);
            setShowSuggestions(true);
        };

        bar.addEventListener('pkd-query', handleQueryEvent);
        return () => {
            bar.removeEventListener('pkd-query', handleQueryEvent);
        };
    }, []);

    // Core catalog query execution logic
    useEffect(() => {
        if (!registryHandle) return;

        if (query.trim() === '') {
            setSuggestions([]);
            setErrorMsg(null);
            setHintMsg(null);
            return;
        }

        // Schema field validation hint
        const fieldMatches = query.matchAll(/([a-zA-Z_][a-zA-Z0-9_]*)=/g);
        let unknownField: string | null = null;
        for (const match of fieldMatches) {
            const val = match[1];
            if (val) {
                const fieldName = val.toLowerCase();
                if (!ALLOWED_FIELDS.has(fieldName)) {
                    unknownField = val;
                    break;
                }
            }
        }

        if (unknownField) {
            setHintMsg(`[HINT] Field '${unknownField}' is not defined in the Pharos Schema.`);
        } else {
            setHintMsg(null);
        }

        // Build CCSO query string. Automatically prefix with "query " if omitted.
        let ccsoQuery = '';
        const trimmed = query.trim();
        if (trimmed.toLowerCase().startsWith('query ') || trimmed.toLowerCase().startsWith('ph ')) {
            ccsoQuery = trimmed;
        } else if (trimmed.includes('=')) {
            ccsoQuery = `query ${trimmed}`;
        } else {
            ccsoQuery = `query name=*${trimmed}*`;
        }

        // Pre-sanitize and restrict query pattern for ReDoS protection (G-01)
        if (ccsoQuery.length > 100) {
            console.warn("[ReDoS Warden] Query pattern length exceeds 100 characters limit.");
            setErrorMsg('UNVERIFIED_RAW_DATA: Query execution rejected. Length exceeds 100 characters.');
            setSuggestions([]);
            return;
        }
        const wildcardCount = (ccsoQuery.match(/[*+?\[]/g) || []).length;
        if (wildcardCount > 3) {
            console.warn("[ReDoS Warden] Query pattern contains too many wildcard symbols (max 3).");
            setErrorMsg('UNVERIFIED_RAW_DATA: Query execution rejected. Too many wildcards (max 3).');
            setSuggestions([]);
            return;
        }
        if (/([*+?]{2,})/.test(ccsoQuery)) {
            console.warn("[ReDoS Warden] Query pattern contains pathological contiguous wildcards.");
            setErrorMsg('UNVERIFIED_RAW_DATA: Query execution rejected. Pathological contiguous wildcards.');
            setSuggestions([]);
            return;
        }

        // Execute query with temporal 100ms sentinel check for wildcards
        const hasWildcards = /[*+?]/.test(ccsoQuery);
        const startTime = performance.now();
        
        try {
            const rawResult = registryHandle.query_wasm(ccsoQuery);
            const duration = performance.now() - startTime;
            
            // Temporal sentinel check
            if (hasWildcards && duration > 100) {
                console.error(`[FORENSIC ALERT] Wildcard query exceeded 100ms threshold: ${duration.toFixed(2)}ms`);
                setErrorMsg('UNVERIFIED_RAW_DATA: Query execution exceeded 100ms temporal sentinel.');
                setSuggestions([]);
                return;
            }

            setErrorMsg(null);

            // Parse result (ToonDoc structure)
            const resultsList = (rawResult as unknown as ToonDoc)?.lists?.results;
            if (resultsList && resultsList.items) {
                const schema = resultsList.schema;
                const nameIdx = schema.indexOf('name');
                const mfrIdx = schema.indexOf('manufacturer');
                const idIdx = schema.indexOf('metadata_id');

                const mapped = resultsList.items.map((row: string[]) => ({
                    id: row[idIdx] || row[0] || '',
                    name: row[nameIdx] || row[1] || 'Unknown Product',
                    mfr: row[mfrIdx] || row[2] || 'Unknown Manufacturer'
                }));

                setSuggestions(mapped);
                
                if (mapped.length > 0) {
                    setStatusText(`[HINT] Found ${mapped.length} matches. Use arrow keys to select.`);
                } else {
                    setStatusText(`[SYS] No matches for "${query}".`);
                }
            } else {
                setSuggestions([]);
            }
        } catch (err: any) {
            setErrorMsg(`Syntax Error: ${err.toString()}`);
            setSuggestions([]);
        }
    }, [query, registryHandle]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (suggestions.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const nextIdx = (highlightedIndex + 1) % suggestions.length;
            setHighlightedIndex(nextIdx);
            const nextItem = suggestions[nextIdx];
            if (nextItem) {
                onHoverItem(nextItem.id);
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prevIdx = (highlightedIndex - 1 + suggestions.length) % suggestions.length;
            setHighlightedIndex(prevIdx);
            const prevItem = suggestions[prevIdx];
            if (prevItem) {
                onHoverItem(prevItem.id);
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
                const item = suggestions[highlightedIndex];
                if (item) {
                    selectModel(item.id, item.name);
                }
            } else if (suggestions.length > 0) {
                const item = suggestions[0];
                if (item) {
                    selectModel(item.id, item.name);
                }
            }
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
            setHighlightedIndex(-1);
            onHoverItem(null);
        }
    };

    const selectModel = (id: string, name: string) => {
        setQuery(name);
        // Sync the value back to the Custom Element input field
        const bar = barRef.current;
        if (bar) {
            bar.setAttribute('value', name);
        }
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        onHoverItem(null);
        onSelectItem(id);
        setStatusText(`[SYS] Linked ${name}. Syncing spatial canvas...`);
    };

    // Declarative pills passed to custom element
    const pillsValue = JSON.stringify([
        { label: "Hobart", value: "manufacturer=Hobart" },
        { label: "240V Specs", value: "voltage=240" },
        { label: "All Items", value: "category=*" }
    ]);

    return (
        <div 
            onKeyDown={handleKeyDown}
            style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', position: 'relative' }}
        >
            {/* Native HTML5 Custom Web Component (Option C) */}
            <pkd-command-bar
                ref={barRef as any}
                placeholder="Filter by keywords or key=value search parameters..."
                pills={pillsValue}
                value={query}
            />

            {/* Suggestions list */}
            {showSuggestions && query.trim() !== '' && suggestions.length > 0 && (
                <div 
                    style={{ 
                        backgroundColor: '#1a1a1a',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                        zIndex: 100
                    }}
                >
                    {suggestions.map((item, i) => (
                        <div
                            key={item.id}
                            onMouseEnter={() => {
                                setHighlightedIndex(i);
                                onHoverItem(item.id);
                            }}
                            onClick={() => selectModel(item.id, item.name)}
                            style={{
                                padding: '10px 20px',
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                transition: 'background 0.2s',
                                backgroundColor: i === highlightedIndex ? 'rgba(255, 107, 0, 0.15)' : 'transparent',
                                borderLeft: i === highlightedIndex ? '4px solid #ff6b00' : '4px solid transparent',
                                color: i === highlightedIndex ? '#ff6b00' : '#e5e7eb'
                            }}
                        >
                            <span>{item.name}</span>
                            <span style={{ opacity: 0.6, fontSize: '11px', fontFamily: 'monospace' }}>
                                {item.mfr}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {(errorMsg || hintMsg || statusText) && (
                <div 
                    style={{ 
                        backgroundColor: '#1a1a1a',
                        padding: '10px 18px',
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        borderRadius: '4px',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                    }}
                >
                    {errorMsg && (
                        <div style={{ color: '#ef4444' }}>
                            {errorMsg}
                        </div>
                    )}
                    {hintMsg && (
                        <div style={{ color: '#fbbf24' }}>
                            {hintMsg}
                        </div>
                    )}
                    {statusText && (
                        <div style={{ color: '#9ca3af' }}>
                            {statusText}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Declaring typing interface for TypeScript to recognize Custom Element tags in JSX
declare module 'react' {
    namespace JSX {
        interface IntrinsicElements {
            'pkd-command-bar': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
                placeholder?: string;
                value?: string;
                pills?: string;
            }, HTMLElement>;
        }
    }
}
