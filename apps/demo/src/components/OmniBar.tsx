/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Demo / Components
 * File: OmniBar.tsx
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Command-palette style search input with RFC-2378 validation and schema hints.
 * Traceability: Issue #242, ADR-0006
 * Last Updated: 2026-06-15
 * ======================================================================== */

import React, { useState, useEffect, useRef } from 'react';
import type { PharosRegistryHandle } from '@pkd/core';

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

export const OmniBar: React.FC<OmniBarProps> = ({
    registryHandle,
    onHoverItem,
    onSelectItem,
    statusText,
    setStatusText
}) => {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [isPrefixHidden, setIsPrefixHidden] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [hintMsg, setHintMsg] = useState<string | null>(null);
    
    const inputRef = useRef<HTMLInputElement>(null);

    // Standard CCSO Verbs
    const verbs = [
        { cmd: '/add', desc: 'Place equipment from catalog', isCommand: true },
        { cmd: '/export', desc: 'Generate Revit/CAD files', isCommand: true },
        { cmd: '/help', desc: 'View all commands', isCommand: true }
    ];

    useEffect(() => {
        // Enforce prefix hidden logic if user types their own slash
        if (query.startsWith('/')) {
            setIsPrefixHidden(true);
        } else {
            setIsPrefixHidden(false);
        }

        if (!registryHandle) return;

        // Perform validation and search
        if (query === '') {
            setSuggestions(verbs);
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

        // Build query string
        let ccsoQuery = '';
        if (query.startsWith('/add ')) {
            const term = query.substring(5).trim();
            ccsoQuery = `query name=*${term}*`;
        } else if (query.startsWith('query ') || query.startsWith('ph ')) {
            ccsoQuery = query;
        } else {
            // Default to matching name
            ccsoQuery = `query name=*${query}*`;
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
            const resultsList = (rawResult as any)?.lists?.results;
            if (resultsList && resultsList.items) {
                const schema = resultsList.schema;
                const nameIdx = schema.indexOf('name');
                const mfrIdx = schema.indexOf('manufacturer');
                const idIdx = schema.indexOf('metadata_id');

                const mapped = resultsList.items.map((row: string[]) => ({
                    id: row[idIdx] || row[0],
                    name: row[nameIdx] || row[1] || 'Unknown Product',
                    mfr: row[mfrIdx] || row[2] || 'Unknown Manufacturer',
                    isCommand: false
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

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (suggestions.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const nextIdx = (highlightedIndex + 1) % suggestions.length;
            setHighlightedIndex(nextIdx);
            onHoverItem(suggestions[nextIdx].isCommand ? null : suggestions[nextIdx].id);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prevIdx = (highlightedIndex - 1 + suggestions.length) % suggestions.length;
            setHighlightedIndex(prevIdx);
            onHoverItem(suggestions[prevIdx].isCommand ? null : suggestions[prevIdx].id);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
                const item = suggestions[highlightedIndex];
                if (item.isCommand) {
                    applyVerb(item.cmd);
                } else {
                    selectModel(item.id, item.name);
                }
            } else if (suggestions.length > 0) {
                // Default to first suggestion
                const item = suggestions[0];
                if (item.isCommand) {
                    applyVerb(item.cmd);
                } else {
                    selectModel(item.id, item.name);
                }
            }
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
            setHighlightedIndex(-1);
            onHoverItem(null);
            inputRef.current?.blur();
        }
    };

    const applyVerb = (cmd: string) => {
        setQuery(cmd + ' ');
        setHighlightedIndex(-1);
        inputRef.current?.focus();
    };

    const selectModel = (id: string, name: string) => {
        setQuery(`/add ${name}`);
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        onHoverItem(null);
        onSelectItem(id);
        setStatusText(`[SYS] Linked ${name}. Syncing spatial canvas...`);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
            <div 
                style={{ 
                    backgroundColor: 'rgba(26, 26, 26, 0.95)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(0, 95, 184, 0.3)',
                    borderLeft: '3px solid #ff6b00',
                    borderRadius: '4px',
                    padding: '12px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
                }}
            >
                {!isPrefixHidden && (
                    <span 
                        style={{ 
                            color: '#ff6b00',
                            fontFamily: 'monospace',
                            fontWeight: 600,
                            fontSize: '15px'
                        }}
                    >
                        /
                    </span>
                )}
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                        setShowSuggestions(true);
                        if (query === '') setSuggestions(verbs);
                    }}
                    placeholder="Search catalog or type '/' for commands..."
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#f3f4f6',
                        fontFamily: 'monospace',
                        fontSize: '15px',
                        width: '100%',
                        outline: 'none'
                    }}
                />
            </div>

            {showSuggestions && suggestions.length > 0 && (
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
                            key={item.cmd || item.id}
                            onMouseEnter={() => {
                                setHighlightedIndex(i);
                                onHoverItem(item.isCommand ? null : item.id);
                            }}
                            onClick={() => {
                                if (item.isCommand) {
                                    applyVerb(item.cmd);
                                } else {
                                    selectModel(item.id, item.name);
                                }
                            }}
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
                            <span>
                                {item.isCommand ? (
                                    <strong>{item.cmd}</strong>
                                ) : (
                                    item.name
                                )}
                            </span>
                            <span style={{ opacity: 0.6, fontSize: '11px', fontFamily: 'monospace' }}>
                                {item.isCommand ? item.desc : item.mfr}
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
