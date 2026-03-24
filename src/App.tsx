import React, { useState, useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { ChevronDown, Settings, Type, Moon, Sun, Copy, Maximize, BookOpen, Edit3, Upload, Clipboard, Smile, PanelLeft, Save, Download, FileJson } from 'lucide-react';

const PASTEL_HUES = [
  { name: 'Red', value: 0 },
  { name: 'Orange', value: 30 },
  { name: 'Yellow', value: 60 },
  { name: 'Lime', value: 90 },
  { name: 'Green', value: 120 },
  { name: 'Teal', value: 150 },
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
  const [hue, setHue] = useState(240);
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

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  // Click outside to close settings
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load from local storage
  useEffect(() => {
    const savedText = localStorage.getItem('chlor-text');
    const savedRef = localStorage.getItem('chlor-ref');
    if (savedText !== null) setText(savedText);
    if (savedRef !== null) setReferenceText(savedRef);
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
    setSaveStatus('Saved!');
    setTimeout(() => setSaveStatus(''), 2000);
  };

  const handleExport = () => {
    const data = JSON.stringify({ text, referenceText }, null, 2);
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

        {/* Settings Menu */}
        {isSettingsOpen && (
          <div 
            className="absolute top-12 right-0 w-72 p-4 rounded-xl shadow-2xl border backdrop-blur-md max-h-[80vh] overflow-y-auto hide-scrollbar"
            style={{ 
              backgroundColor: `hsla(${hue}, 20%, ${isDarkMode ? '15%' : '95%'}, 0.95)`,
              borderColor: `hsla(${hue}, 30%, 50%, 0.2)`
            }}
          >
            <div className="space-y-6">
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

              {isDarkMode && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium opacity-80">AMOLED Black</span>
                  <button 
                    onClick={() => setIsAmoled(!isAmoled)}
                    className={`w-10 h-5 rounded-full relative transition-colors ${isAmoled ? 'bg-current' : 'bg-gray-400/30'}`}
                    style={{ color: `hsl(${hue}, 60%, 60%)` }}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${isAmoled ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
              )}

              {/* Font Controls */}
              <div>
                <label className="text-sm font-medium mb-2 block opacity-80">Font Size</label>
                <div className="flex items-center space-x-4">
                  <button 
                    onClick={() => setFontSize(f => Math.max(8, f - 2))}
                    className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
                  >-</button>
                  <span className="text-sm">{fontSize}px</span>
                  <button 
                    onClick={() => setFontSize(f => f + 2)}
                    className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
                  >+</button>
                </div>
              </div>

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

              {/* Emoji Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium opacity-80">Emoji Button</span>
                <button 
                  onClick={() => setShowEmojiButton(!showEmojiButton)}
                  className={`w-10 h-5 rounded-full relative transition-colors ${showEmojiButton ? 'bg-current' : 'bg-gray-400/30'}`}
                  style={{ color: `hsl(${hue}, 60%, 60%)` }}
                >
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${showEmojiButton ? 'translate-x-5' : ''}`} />
                </button>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-black/10 dark:border-white/10">
                <button 
                  onClick={() => setShowReference(!showReference)}
                  className="flex items-center justify-center space-x-2 p-2 rounded hover:bg-black/5 dark:hover:bg-white/5 text-sm col-span-2"
                  style={{ color: showReference ? `hsl(${hue}, 60%, 60%)` : 'inherit' }}
                >
                  <PanelLeft size={16} /> <span>{showReference ? 'Hide Reference' : 'Show Reference'}</span>
                </button>
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
                  onClick={handleFullScreen}
                  className="flex items-center justify-center space-x-2 p-2 rounded hover:bg-black/5 dark:hover:bg-white/5 text-sm"
                >
                  <Maximize size={16} /> <span>Fullscreen</span>
                </button>
                <button 
                  onClick={() => setIsReaderMode(!isReaderMode)}
                  className="flex items-center justify-center space-x-2 p-2 rounded hover:bg-black/5 dark:hover:bg-white/5 text-sm col-span-2"
                  style={{ color: isReaderMode ? `hsl(${hue}, 60%, 60%)` : 'inherit' }}
                >
                  {isReaderMode ? <Edit3 size={16} /> : <BookOpen size={16} />} 
                  <span>{isReaderMode ? 'Editor Mode' : 'Reader Mode'}</span>
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center space-x-2 p-2 rounded hover:bg-black/5 dark:hover:bg-white/5 text-sm col-span-2"
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
              className="flex-1 w-full bg-transparent resize-none outline-none hide-scrollbar p-4 sm:p-8 md:p-12 overflow-y-auto"
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
            className="flex-none w-full h-2 md:w-2 md:h-full bg-black/5 dark:bg-white/5 hover:bg-black/20 dark:hover:bg-white/20 cursor-row-resize md:cursor-col-resize transition-colors z-10"
            style={{ backgroundColor: isDragging ? `hsla(${hue}, 50%, 50%, 0.5)` : undefined }}
          />
        )}

        {/* Primary Editor/Reader Panel */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {text === '' && !isReaderMode && (
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 opacity-50 pointer-events-none z-10">
              <button 
                onClick={handlePasteText}
                className="flex items-center space-x-2 px-6 py-3 rounded-full border border-current hover:bg-current hover:text-white transition-colors pointer-events-auto"
                style={{ color: `hsl(${hue}, 50%, 50%)` }}
              >
                <Clipboard size={20} />
                <span>Paste text</span>
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center space-x-2 px-6 py-3 rounded-full border border-current hover:bg-current hover:text-white transition-colors pointer-events-auto"
                style={{ color: `hsl(${hue}, 50%, 50%)` }}
              >
                <Upload size={20} />
                <span>Paste/upload file</span>
              </button>
            </div>
          )}

          {isReaderMode ? (
            <div 
              className="markdown-body flex-1 w-full p-4 sm:p-8 md:p-12 overflow-y-auto hide-scrollbar pb-32"
              style={{ fontFamily, fontSize: `${fontSize}px` }}
            >
              <Markdown remarkPlugins={[remarkGfm]}>{text}</Markdown>
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder=""
              className="flex-1 w-full bg-transparent resize-none outline-none hide-scrollbar p-4 sm:p-8 md:p-12 overflow-y-auto pb-32"
              style={{ fontFamily, fontSize: `${fontSize}px` }}
              spellCheck={false}
            />
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
