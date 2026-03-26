import React, { useState, useEffect, useRef, useCallback } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { ChevronDown, Settings, Type, Moon, Sun, Copy, Maximize, BookOpen, Edit3, Upload, Clipboard, Smile, PanelLeft, Save, Download, FileJson, Plus, Minus, Eye, EyeOff } from 'lucide-react';
import { useTextPrediction } from './useTextPrediction';

const PASTEL_HUES = [
  { name: 'Red', value: 0 },
  { name: 'Orange', value: 30 },
  { name: 'Yellow', value: 60 },
  { name: 'Lime', value: 90 },
  { name: 'Green', value: 120 },
  { name: 'Seagreen', value: 150 },
  { name: 'Cyan', value: 180 },
  { name: 'Sky', value: 210 },
  { name: 'Blue', value: 240 },
  { name: 'Indigo', value: 270 },
  { name: 'Violet', value: 300 },
  { name: 'Purple', value: 315 },
  { name: 'Fuchsia', value: 330 },
  { name: 'Pink', value: 345 },
  { name: 'Rose', value: 355 },
];

const FONTS = [
  { name: 'Fira Code', value: 'var(--font-fira)' },
  { name: 'Inter', value: 'var(--font-inter)' },
  { name: 'Lora', value: 'var(--font-lora)' },
  { name: 'Space Mono', value: 'var(--font-space)' },
];

export default function App() {
  const [text, setText] = useState('');
  const [referenceText, setReferenceText] = useState('');
  const [showReference, setShowReference] = useState(false);
  const [isReaderMode, setIsReaderMode] = useState(false);
  const [hue, setHue] = useState(150);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isAmoled, setIsAmoled] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState('var(--font-fira)');
  const [showEmojiButton, setShowEmojiButton] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [splitRatio, setSplitRatio] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [isFullSettingsModalOpen, setIsFullSettingsModalOpen] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [cursorPos, setCursorPos] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const tripleTapRef = useRef<{ count: number; timer: ReturnType<typeof setTimeout> | null }>({ count: 0, timer: null });

  // Click outside to close settings
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
        setIsFullSettingsModalOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load from local storage
  useEffect(() => {
    const savedText = localStorage.getItem('chlor-text');
    const savedRef = localStorage.getItem('chlor-ref');
    const savedShowRef = localStorage.getItem('chlor-show-ref');
    const savedSplit = localStorage.getItem('chlor-split');
    const savedApiKey = localStorage.getItem('chlor-gemini-key');

    if (savedText !== null) setText(savedText);
    if (savedRef !== null) setReferenceText(savedRef);
    if (savedShowRef !== null) setShowReference(savedShowRef === 'true');
    if (savedSplit !== null) setSplitRatio(Number(savedSplit));
    if (savedApiKey !== null) setGeminiApiKey(savedApiKey);
  }, []);

  // Refs for auto-save
  const textRef = useRef(text);
  const refTextRef = useRef(referenceText);
  const showRefRef = useRef(showReference);
  const splitRef = useRef(splitRatio);
  const apiKeyRef = useRef(geminiApiKey);

  useEffect(() => {
    textRef.current = text;
    refTextRef.current = referenceText;
    showRefRef.current = showReference;
    splitRef.current = splitRatio;
    apiKeyRef.current = geminiApiKey;
  }, [text, referenceText, showReference, splitRatio, geminiApiKey]);

  // Auto-save timer
  useEffect(() => {
    const timer = setInterval(() => {
      localStorage.setItem('chlor-text', textRef.current);
      localStorage.setItem('chlor-ref', refTextRef.current);
      localStorage.setItem('chlor-show-ref', showRefRef.current.toString());
      localStorage.setItem('chlor-split', splitRef.current.toString());
      if (apiKeyRef.current) localStorage.setItem('chlor-gemini-key', apiKeyRef.current);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Resize Logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !containerRef.current) return;
      const container = containerRef.current.getBoundingClientRect();
      
      let clientX, clientY;
      if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const isDesktop = window.innerWidth >= 768;
      
      if (isDesktop) {
        const newRatio = ((clientX - container.left) / container.width) * 100;
        setSplitRatio(Math.min(Math.max(newRatio, 10), 90));
      } else {
        const newRatio = ((clientY - container.top) / container.height) * 100;
        setSplitRatio(Math.min(Math.max(newRatio, 10), 90));
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('touchmove', handleMouseMove, { passive: false });
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchend', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchmove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging]);

  // Apply theme changes
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--hue', hue.toString());
    root.style.setProperty('--brightness-filter', `brightness(${brightness / 100})`);
    
    if (isDarkMode) {
      root.classList.add('dark');
      if (isAmoled) {
        root.classList.add('amoled');
      } else {
        root.classList.remove('amoled');
      }
    } else {
      root.classList.remove('dark');
      root.classList.remove('amoled');
    }
  }, [hue, isDarkMode, isAmoled, brightness]);

  // AI Text Prediction
  const prediction = useTextPrediction({
    text,
    cursorPos,
    apiKey: geminiApiKey,
    enabled: !isReaderMode && geminiApiKey.length > 0,
  });

  // Sync ghost overlay scroll with textarea
  const handleEditorScroll = useCallback(() => {
    if (textareaRef.current && ghostRef.current) {
      ghostRef.current.scrollTop = textareaRef.current.scrollTop;
      ghostRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  // Handle Tab key to accept suggestion
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab' && prediction.hasSuggestion) {
      e.preventDefault();
      const result = prediction.acceptSuggestion();
      if (result) {
        setText(result.newText);
        setCursorPos(result.newCursorPos);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = result.newCursorPos;
            textareaRef.current.selectionEnd = result.newCursorPos;
          }
        }, 0);
      }
    }
  }, [prediction]);

  // Triple-tap handler for mobile
  const handleTouchEnd = useCallback(() => {
    if (!prediction.hasSuggestion) return;
    const ref = tripleTapRef.current;
    ref.count++;
    if (ref.timer) clearTimeout(ref.timer);
    if (ref.count >= 3) {
      ref.count = 0;
      const result = prediction.acceptSuggestion();
      if (result) {
        setText(result.newText);
        setCursorPos(result.newCursorPos);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = result.newCursorPos;
            textareaRef.current.selectionEnd = result.newCursorPos;
          }
        }, 0);
      }
    } else {
      ref.timer = setTimeout(() => { ref.count = 0; }, 500);
    }
  }, [prediction]);

  // Track cursor position
  const updateCursorPos = useCallback(() => {
    if (textareaRef.current) {
      setCursorPos(textareaRef.current.selectionStart);
    }
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
  };

  const handleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setText(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleSave = () => {
    localStorage.setItem('chlor-text', text);
    localStorage.setItem('chlor-ref', referenceText);
    localStorage.setItem('chlor-show-ref', showReference.toString());
    localStorage.setItem('chlor-split', splitRatio.toString());
    if (geminiApiKey) localStorage.setItem('chlor-gemini-key', geminiApiKey);
    setSaveStatus('Saved!');
    setTimeout(() => setSaveStatus(''), 2000);
  };

  const handleExport = () => {
    const data = JSON.stringify({ 
      text, 
      referenceText, 
      showReference, 
      splitRatio 
    }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.href = url;
    a.download = `Chlor_${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.text !== undefined) setText(parsed.text);
        if (parsed.referenceText !== undefined) setReferenceText(parsed.referenceText);
        if (parsed.showReference !== undefined) setShowReference(parsed.showReference);
        if (parsed.splitRatio !== undefined) setSplitRatio(parsed.splitRatio);
      } catch (err) {
        console.error("Invalid JSON file");
      }
    };
    reader.readAsText(file);
    if (jsonInputRef.current) jsonInputRef.current.value = '';
  };

  const handlePasteText = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      setText(clipboardText);
    } catch (err) {
      console.error('Failed to read clipboard contents: ', err);
    }
  };

  const onEmojiClick = (emojiObject: any) => {
    if (textareaRef.current) {
      const cursorPosition = textareaRef.current.selectionStart;
      const textBeforeCursorPosition = text.substring(0, cursorPosition);
      const textAfterCursorPosition = text.substring(cursorPosition, text.length);
      setText(textBeforeCursorPosition + emojiObject.emoji + textAfterCursorPosition);
      
      // Reset cursor position after state update
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = cursorPosition + emojiObject.emoji.length;
          textareaRef.current.selectionEnd = cursorPosition + emojiObject.emoji.length;
          textareaRef.current.focus();
        }
      }, 0);
    } else {
      setText(text + emojiObject.emoji);
    }
    setIsEmojiPickerOpen(false);
  };

  return (
    <div className="h-screen w-full flex flex-col relative overflow-hidden">
      {/* Settings Dropdown Button */}
      <div className="fixed top-4 right-4 z-50" ref={settingsRef}>
        <button
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          className="p-2 opacity-20 hover:opacity-100 transition-opacity duration-300 focus:outline-none focus:opacity-100"
        >
          <ChevronDown size={24} className={`transform transition-transform ${isSettingsOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Settings Menu Quick Actions */}
        {isSettingsOpen && !isFullSettingsModalOpen && (
          <div className="absolute top-12 right-0 p-2 rounded-xl shadow-2xl bg-black/90 backdrop-blur-md border border-white/10 flex flex-col space-y-1 z-50">
            <button onClick={() => setShowReference(!showReference)} className="p-3 hover:bg-white/20 rounded-lg transition-colors text-white" title="Toggle Reference"><PanelLeft size={20} /></button>
            <button onClick={handleFullScreen} className="p-3 hover:bg-white/20 rounded-lg transition-colors text-white" title="Fullscreen"><Maximize size={20} /></button>
            <button onClick={() => setShowEmojiButton(!showEmojiButton)} className="p-3 hover:bg-white/20 rounded-lg transition-colors text-white" title="Emoji Key"><Smile size={20} /></button>
            <button onClick={() => setIsReaderMode(!isReaderMode)} className="p-3 hover:bg-white/20 rounded-lg transition-colors text-white" title="Toggle Reader Mode">{isReaderMode ? <Edit3 size={20} /> : <BookOpen size={20} />}</button>
            <button onClick={() => setFontSize(f => f + 2)} className="p-3 hover:bg-white/20 rounded-lg transition-colors text-white" title="Increase Font"><Plus size={20} /></button>
            <button onClick={() => setFontSize(f => Math.max(8, f - 2))} className="p-3 hover:bg-white/20 rounded-lg transition-colors text-white" title="Decrease Font"><Minus size={20} /></button>
            <button onClick={() => { setIsDarkMode(true); setIsAmoled(!isAmoled); }} className="p-3 hover:bg-white/20 rounded-lg transition-colors text-white" title="Toggle AMOLED">
              <Moon size={20} fill={isAmoled ? "white" : "none"} />
            </button>
            <button onClick={() => setIsFullSettingsModalOpen(true)} className="p-3 hover:bg-white/20 rounded-lg transition-colors text-white" title="More Settings"><Settings size={20} /></button>
          </div>
        )}

        {/* Full Settings Menu */}
        {(isSettingsOpen && isFullSettingsModalOpen) && (
          <div 
            className="absolute top-12 right-0 w-72 p-4 rounded-xl shadow-2xl border backdrop-blur-md max-h-[80vh] overflow-y-auto hide-scrollbar z-50"
            style={{ 
              backgroundColor: `hsla(${hue}, 20%, ${isDarkMode ? '15%' : '95%'}, 0.95)`,
              borderColor: `hsla(${hue}, 30%, 50%, 0.2)`
            }}
          >
            <div className="space-y-6">
              <button 
                onClick={() => setIsFullSettingsModalOpen(false)}
                className="w-full text-center p-2 mb-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg font-medium opacity-80"
              >
                ← Back to Quick Menu
              </button>

              {/* Theme Accent */}
              <div>
                <label className="text-sm font-medium mb-2 block opacity-80">Theme Accent</label>
                <div className="grid grid-cols-5 gap-2">
                  {PASTEL_HUES.map((h) => (
                    <button
                      key={h.name}
                      onClick={() => setHue(h.value)}
                      className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${hue === h.value ? 'border-current scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: `hsl(${h.value}, 60%, 60%)` }}
                      title={h.name}
                    />
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium opacity-80">Dark Mode</span>
                <button 
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="p-2 rounded-lg hover:bg-black/10 dark:hover:bg-white/10"
                >
                  {isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
                </button>
              </div>

              {/* Font Controls */}
              <div>
                <label className="text-sm font-medium mb-2 block opacity-80">Font Family</label>
                <select 
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="w-full p-2 rounded bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 outline-none"
                  style={{ fontFamily: 'inherit' }}
                >
                  {FONTS.map(f => (
                    <option key={f.name} value={f.value} style={{ fontFamily: f.value, color: 'black' }}>{f.name}</option>
                  ))}
                </select>
              </div>

              {/* Brightness */}
              <div>
                <label className="text-sm font-medium mb-2 block opacity-80">Brightness ({brightness}%)</label>
                <input 
                  type="range" 
                  min="50" 
                  max="100" 
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="w-full accent-current"
                  style={{ color: `hsl(${hue}, 60%, 60%)` }}
                />
              </div>

              {/* Gemini API Key */}
              <div>
                <label className="text-sm font-medium mb-2 block opacity-80">Gemini API Key</label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    placeholder="Enter API key..."
                    className="w-full p-2 pr-10 rounded bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 outline-none text-sm"
                  />
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 opacity-60 hover:opacity-100"
                  >
                    {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <p className="text-xs opacity-50 mt-1">For AI text suggestions (gemma-3-27b-it)</p>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-black/10 dark:border-white/10">
                <button 
                  onClick={handleSave}
                  className="flex items-center justify-center space-x-2 p-2 rounded hover:bg-black/5 dark:hover:bg-white/5 text-sm"
                  style={{ color: saveStatus ? `hsl(${hue}, 60%, 60%)` : 'inherit' }}
                >
                  <Save size={16} /> <span>{saveStatus || 'Save to Device'}</span>
                </button>
                <button 
                  onClick={handleExport}
                  className="flex items-center justify-center space-x-2 p-2 rounded hover:bg-black/5 dark:hover:bg-white/5 text-sm"
                >
                  <Download size={16} /> <span>Export JSON</span>
                </button>
                <button 
                  onClick={() => jsonInputRef.current?.click()}
                  className="flex items-center justify-center space-x-2 p-2 rounded hover:bg-black/5 dark:hover:bg-white/5 text-sm col-span-2"
                >
                  <FileJson size={16} /> <span>Import JSON</span>
                </button>
                <input 
                  type="file" 
                  ref={jsonInputRef} 
                  onChange={handleImport} 
                  accept=".json" 
                  className="hidden" 
                />
                <button 
                  onClick={handleCopy}
                  className="flex items-center justify-center space-x-2 p-2 rounded hover:bg-black/5 dark:hover:bg-white/5 text-sm"
                >
                  <Copy size={16} /> <span>Copy</span>
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center space-x-2 p-2 rounded hover:bg-black/5 dark:hover:bg-white/5 text-sm"
                >
                  <Upload size={16} /> <span>Browse Files</span>
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".txt,.md" 
                  className="hidden" 
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <main ref={containerRef} className={`flex-1 flex flex-col md:flex-row w-full overflow-hidden relative ${isDragging ? 'select-none' : ''}`}>
        
        {/* Reference Panel */}
        {showReference && (
          <div 
            className="flex flex-col overflow-hidden"
            style={{ flexBasis: `${splitRatio}%` }}
          >
            <textarea
              value={referenceText}
              onChange={(e) => setReferenceText(e.target.value)}
              placeholder="Paste reference text here..."
              className="flex-1 w-full bg-transparent resize-none outline-none hide-scrollbar p-4 sm:p-8 md:p-12 !pb-[50vh] overflow-y-auto"
              style={{ fontFamily, fontSize: `${fontSize}px` }}
              spellCheck={false}
            />
          </div>
        )}

        {/* Resizer */}
        {showReference && (
          <div 
            onMouseDown={(e) => { e.preventDefault(); setIsDragging(true); }}
            onTouchStart={(e) => { setIsDragging(true); }}
            className="flex-none w-full h-2 md:w-2 md:h-full bg-black/5 dark:bg-white/5 hover:bg-black/20 dark:hover:bg-white/20 cursor-row-resize md:cursor-col-resize transition-colors z-10 relative"
            style={{ 
              backgroundColor: isDragging ? `hsla(${hue}, 50%, 50%, 0.5)` : undefined,
              boxShadow: '0 0 24px 16px var(--bg-color)'
            }}
          />
        )}

        {/* Primary Editor/Reader Panel */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {text === '' && !isReaderMode && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-32 h-32 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-current opacity-30 hover:opacity-100 transition-opacity pointer-events-auto cursor-pointer"
                style={{ color: `hsl(${hue}, 50%, 50%)` }}
              >
                <Upload size={32} />
              </button>
            </div>
          )}

          {isReaderMode ? (
            <div 
              className="markdown-body flex-1 w-full p-4 sm:p-8 md:p-12 overflow-y-auto hide-scrollbar !pb-[50vh]"
              style={{ fontFamily, fontSize: `${fontSize}px` }}
            >
              <Markdown remarkPlugins={[remarkGfm]}>{text}</Markdown>
            </div>
          ) : (
            <div className="flex-1 relative overflow-hidden">
              {/* Ghost text overlay */}
              <div
                ref={ghostRef}
                className="ghost-overlay absolute inset-0 p-4 sm:p-8 md:p-12 !pb-[50vh] overflow-y-auto pointer-events-none hide-scrollbar"
                style={{ fontFamily, fontSize: `${fontSize}px` }}
                aria-hidden="true"
              >
                <span className="invisible">{text.slice(0, prediction.suggestionAnchorPos)}</span>
                {prediction.hasSuggestion && (
                  <span 
                    className="ghost-text"
                    style={{ color: `hsl(${hue}, 50%, 50%)` }}
                  >{prediction.suggestion}</span>
                )}
              </div>
              {/* Actual textarea */}
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setTimeout(updateCursorPos, 0);
                }}
                onKeyDown={handleKeyDown}
                onSelect={updateCursorPos}
                onClick={updateCursorPos}
                onTouchEnd={handleTouchEnd}
                onScroll={handleEditorScroll}
                placeholder="Start typing or paste your content..."
                className="absolute inset-0 w-full h-full bg-transparent resize-none outline-none hide-scrollbar p-4 sm:p-8 md:p-12 !pb-[50vh] overflow-y-auto"
                style={{ fontFamily, fontSize: `${fontSize}px`, caretColor: `hsl(${hue}, 60%, 60%)` }}
                spellCheck={false}
              />
            </div>
          )}
        </div>
      </main>

      {/* Emoji Button & Picker */}
      {showEmojiButton && !isReaderMode && (
        <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
          {isEmojiPickerOpen && (
            <div className="mb-4 shadow-2xl rounded-lg overflow-hidden border border-black/10 dark:border-white/10">
              <EmojiPicker 
                onEmojiClick={onEmojiClick}
                theme={isDarkMode ? Theme.DARK : Theme.LIGHT}
                lazyLoadEmojis={true}
              />
            </div>
          )}
          <button
            onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
            className="p-4 rounded-full shadow-lg transition-transform hover:scale-110 focus:outline-none"
            style={{ 
              backgroundColor: `hsl(${hue}, 50%, 50%)`,
              color: 'white'
            }}
          >
            <Smile size={24} />
          </button>
        </div>
      )}
    </div>
  );
}
