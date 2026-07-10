import React, { useState, useEffect, useRef, useCallback } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { ChevronDown, Settings, Type, Moon, Sun, Copy, Maximize, BookOpen, Edit3, Upload, Clipboard, Smile, PanelLeft, Save, Download, FileJson, Plus, Minus, Eye, EyeOff, Trash2, Bold, Pencil, Check, GripVertical } from 'lucide-react';
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
  { name: 'IBM Plex Mono', value: 'var(--font-ibm)' },
  { name: 'Fira Code', value: 'var(--font-fira)' },
  { name: 'Inter', value: 'var(--font-inter)' },
  { name: 'Lora', value: 'var(--font-lora)' },
  { name: 'Space Mono', value: 'var(--font-space)' },
];

/**
 * Convert markdown bold/italic/strikethrough to Unicode equivalents
 * so it can be pasted into apps that don't support markdown.
 */
function convertToHardFont(input: string): string {
  // Unicode bold mapping (Latin only)
  const boldMap: Record<string, string> = {};
  const italicMap: Record<string, string> = {};
  const boldItalicMap: Record<string, string> = {};

  // Build bold map: A-Z -> 𝗔-𝗭, a-z -> 𝗮-𝘇, 0-9 -> 𝟬-𝟵
  for (let i = 0; i < 26; i++) {
    boldMap[String.fromCharCode(65 + i)] = String.fromCodePoint(0x1D5D4 + i); // 𝗔
    boldMap[String.fromCharCode(97 + i)] = String.fromCodePoint(0x1D5EE + i); // 𝗮
    italicMap[String.fromCharCode(65 + i)] = String.fromCodePoint(0x1D608 + i); // 𝘈
    italicMap[String.fromCharCode(97 + i)] = String.fromCodePoint(0x1D622 + i); // 𝘢
    boldItalicMap[String.fromCharCode(65 + i)] = String.fromCodePoint(0x1D63C + i); // 𝘼
    boldItalicMap[String.fromCharCode(97 + i)] = String.fromCodePoint(0x1D656 + i); // 𝙖
  }
  for (let i = 0; i < 10; i++) {
    boldMap[String.fromCharCode(48 + i)] = String.fromCodePoint(0x1D7EC + i); // 𝟬
  }

  function applyMap(text: string, map: Record<string, string>): string {
    return [...text].map(ch => map[ch] || ch).join('');
  }

  let result = input;

  // Bold+Italic: ***text*** or ___text___
  result = result.replace(/\*{3}(.+?)\*{3}/g, (_, inner) => applyMap(inner, boldItalicMap));
  result = result.replace(/_{3}(.+?)_{3}/g, (_, inner) => applyMap(inner, boldItalicMap));

  // Bold: **text** or __text__
  result = result.replace(/\*{2}(.+?)\*{2}/g, (_, inner) => applyMap(inner, boldMap));
  result = result.replace(/_{2}(.+?)_{2}/g, (_, inner) => applyMap(inner, boldMap));

  // Italic: *text* or _text_
  result = result.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, (_, inner) => applyMap(inner, italicMap));
  result = result.replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, (_, inner) => applyMap(inner, italicMap));

  // Strikethrough: ~~text~~
  result = result.replace(/~~(.+?)~~/g, (_, inner) => {
    return [...inner].map(ch => ch + '\u0336').join('');
  });

  // Single ~text~ strikethrough
  result = result.replace(/(?<!~)~(?!~)(.+?)(?<!~)~(?!~)/g, (_, inner) => {
    return [...inner].map(ch => ch + '\u0336').join('');
  });

  return result;
}

export default function App() {
  const [text, setText] = useState('');
  const [referenceText, setReferenceText] = useState('');
  const [showReference, setShowReference] = useState(false);
  const [isReaderMode, setIsReaderMode] = useState(false);
  const [isRefEditing, setIsRefEditing] = useState(false);
  const [refEditDraft, setRefEditDraft] = useState('');
  const [hue, setHue] = useState(150);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isAmoled, setIsAmoled] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState('var(--font-ibm)');
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
  const [isHardFontMode, setIsHardFontMode] = useState(false);
  const [keyboardShift, setKeyboardShift] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const refPanelRef = useRef<HTMLDivElement>(null);
  const refEditRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const tripleTapRef = useRef<{ count: number; timer: ReturnType<typeof setTimeout> | null }>({ count: 0, timer: null });
  const editorScrollRef = useRef(0);
  const refScrollRef = useRef(0);
  const savedSplitRef = useRef(splitRatio);

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
    const savedHardFont = localStorage.getItem('chlor-hard-font');

    if (savedText !== null) setText(savedText);
    if (savedRef !== null) setReferenceText(savedRef);
    if (savedShowRef !== null) setShowReference(savedShowRef === 'true');
    if (savedSplit !== null) setSplitRatio(Number(savedSplit));
    if (savedApiKey !== null) setGeminiApiKey(savedApiKey);
    if (savedHardFont !== null) setIsHardFontMode(savedHardFont === 'true');

    // Restore scroll positions after a tick
    const savedEditorScroll = localStorage.getItem('chlor-editor-scroll');
    const savedRefScroll = localStorage.getItem('chlor-ref-scroll');
    if (savedEditorScroll !== null) editorScrollRef.current = Number(savedEditorScroll);
    if (savedRefScroll !== null) refScrollRef.current = Number(savedRefScroll);
    setTimeout(() => {
      if (textareaRef.current) textareaRef.current.scrollTop = editorScrollRef.current;
      if (refPanelRef.current) refPanelRef.current.scrollTop = refScrollRef.current;
    }, 100);
  }, []);

  // Refs for auto-save
  const textRef = useRef(text);
  const refTextRef = useRef(referenceText);
  const showRefRef = useRef(showReference);
  const splitRef = useRef(splitRatio);
  const apiKeyRef = useRef(geminiApiKey);
  const hardFontRef = useRef(isHardFontMode);

  useEffect(() => {
    textRef.current = text;
    refTextRef.current = referenceText;
    showRefRef.current = showReference;
    splitRef.current = splitRatio;
    apiKeyRef.current = geminiApiKey;
    hardFontRef.current = isHardFontMode;
  }, [text, referenceText, showReference, splitRatio, geminiApiKey, isHardFontMode]);

  // Auto-save timer
  useEffect(() => {
    const timer = setInterval(() => {
      localStorage.setItem('chlor-text', textRef.current);
      localStorage.setItem('chlor-ref', refTextRef.current);
      localStorage.setItem('chlor-show-ref', showRefRef.current.toString());
      localStorage.setItem('chlor-split', splitRef.current.toString());
      if (apiKeyRef.current) localStorage.setItem('chlor-gemini-key', apiKeyRef.current);
      localStorage.setItem('chlor-hard-font', hardFontRef.current.toString());
      localStorage.setItem('chlor-editor-scroll', editorScrollRef.current.toString());
      localStorage.setItem('chlor-ref-scroll', refScrollRef.current.toString());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Resize Logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !containerRef.current) return;
      e.preventDefault(); // Prevent scroll during drag
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

  // ─── Mobile keyboard detection via visualViewport ───
  // When the on-screen keyboard opens, shift the reference pane up slightly (not full collapse)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const vv = window.visualViewport;

    function handleResize() {
      if (!vv) return;
      const isMobile = window.innerWidth < 768;
      const heightDiff = window.innerHeight - vv.height;
      // Keyboard is considered open if viewport shrank by >100px
      if (isMobile && heightDiff > 100 && showReference) {
        // Shift reference up — reduce its ratio by ~15% of total
        setKeyboardShift(15);
      } else {
        setKeyboardShift(0);
      }
    }

    vv.addEventListener('resize', handleResize);
    return () => vv.removeEventListener('resize', handleResize);
  }, [showReference]);

  // AI Text Prediction
  const prediction = useTextPrediction({
    text,
    cursorPos,
    apiKey: geminiApiKey,
    enabled: !isReaderMode && geminiApiKey.length > 0,
  });

  // Handle ,,, trigger — delete the three commas when detected
  useEffect(() => {
    if (prediction.triggerDetected) {
      // Remove the three commas from text at cursor position
      const before = text.slice(0, cursorPos - 3);
      const after = text.slice(cursorPos);
      const newText = before + after;
      const newCursor = cursorPos - 3;
      setText(newText);
      setCursorPos(newCursor);
      // Also update the textarea cursor
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = newCursor;
          textareaRef.current.selectionEnd = newCursor;
        }
      }, 0);
    }
  }, [prediction.triggerDetected]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync ghost overlay scroll with textarea and track scroll position
  const handleEditorScroll = useCallback(() => {
    if (textareaRef.current) {
      editorScrollRef.current = textareaRef.current.scrollTop;
      if (ghostRef.current) {
        ghostRef.current.scrollTop = textareaRef.current.scrollTop;
        ghostRef.current.scrollLeft = textareaRef.current.scrollLeft;
      }
    }
  }, []);

  const handleRefScroll = useCallback(() => {
    if (refPanelRef.current) {
      refScrollRef.current = refPanelRef.current.scrollTop;
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
    const output = isHardFontMode ? convertToHardFont(text) : text;
    navigator.clipboard.writeText(output);
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
    localStorage.setItem('chlor-hard-font', isHardFontMode.toString());
    localStorage.setItem('chlor-editor-scroll', editorScrollRef.current.toString());
    localStorage.setItem('chlor-ref-scroll', refScrollRef.current.toString());
    setSaveStatus('Saved!');
    setTimeout(() => setSaveStatus(''), 2000);
  };

  const handleExport = () => {
    const data = JSON.stringify({ 
      text, 
      referenceText, 
      showReference, 
      splitRatio,
      editorScroll: editorScrollRef.current,
      refScroll: refScrollRef.current,
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
        if (parsed.editorScroll !== undefined) {
          editorScrollRef.current = parsed.editorScroll;
          setTimeout(() => { if (textareaRef.current) textareaRef.current.scrollTop = parsed.editorScroll; }, 100);
        }
        if (parsed.refScroll !== undefined) {
          refScrollRef.current = parsed.refScroll;
          setTimeout(() => { if (refPanelRef.current) refPanelRef.current.scrollTop = parsed.refScroll; }, 100);
        }
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

  const handlePasteToReference = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      setReferenceText(prev => prev ? prev + '\n' + clipboardText : clipboardText);
    } catch (err) {
      console.error('Failed to read clipboard contents: ', err);
    }
  };

  const handleClearReference = () => {
    setReferenceText('');
    setIsRefEditing(false);
    localStorage.setItem('chlor-ref', '');
  };

  // Enter edit mode for reference
  const handleStartRefEdit = () => {
    setRefEditDraft(referenceText);
    setIsRefEditing(true);
    setIsSettingsOpen(false);
    setTimeout(() => {
      if (refEditRef.current) {
        refEditRef.current.focus();
        refEditRef.current.scrollTop = refScrollRef.current;
      }
    }, 50);
  };

  // Save reference edit and exit edit mode
  const handleSaveRefEdit = () => {
    setReferenceText(refEditDraft);
    setIsRefEditing(false);
    localStorage.setItem('chlor-ref', refEditDraft);
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

  // Compute effective split ratio (accounting for keyboard shift on mobile)
  const effectiveRefRatio = Math.max(10, splitRatio - keyboardShift);

  return (
    <div className="h-screen w-full flex flex-col relative overflow-hidden" style={{ height: '100dvh' }}>
      {/* Settings Dropdown Button */}
      <div className="fixed top-4 right-4 z-50" ref={settingsRef}>
        <button
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          className="p-2 opacity-15 hover:opacity-100 transition-opacity duration-300 focus:outline-none focus:opacity-100 btn-interactive"
        >
          <ChevronDown size={24} className={`transform transition-transform duration-200 ${isSettingsOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Settings Menu Quick Actions */}
        {isSettingsOpen && !isFullSettingsModalOpen && (
          <div className="absolute top-12 right-0 p-2 quick-menu flex flex-col space-y-0.5 z-50">
            <button onClick={() => setShowReference(!showReference)} className="quick-menu-btn" title="Toggle Reference"><PanelLeft size={20} /></button>
            {showReference && (
              <button onClick={handleStartRefEdit} className="quick-menu-btn" title="Edit Reference"><Pencil size={20} /></button>
            )}
            {showReference && referenceText && (
              <button onClick={handleClearReference} className="quick-menu-btn" title="Clear Reference" style={{ color: 'hsl(0, 70%, 65%)' }}><Trash2 size={20} /></button>
            )}
            <button onClick={handleFullScreen} className="quick-menu-btn" title="Fullscreen"><Maximize size={20} /></button>
            <button onClick={() => setShowEmojiButton(!showEmojiButton)} className="quick-menu-btn" title="Emoji Key"><Smile size={20} /></button>
            <button onClick={() => setIsReaderMode(!isReaderMode)} className="quick-menu-btn" title="Toggle Reader Mode">{isReaderMode ? <Edit3 size={20} /> : <BookOpen size={20} />}</button>
            <button onClick={() => setFontSize(f => f + 2)} className="quick-menu-btn" title="Increase Font"><Plus size={20} /></button>
            <button onClick={() => setFontSize(f => Math.max(8, f - 2))} className="quick-menu-btn" title="Decrease Font"><Minus size={20} /></button>
            <button onClick={() => { setIsDarkMode(true); setIsAmoled(!isAmoled); }} className="quick-menu-btn" title="Toggle AMOLED">
              <Moon size={20} fill={isAmoled ? "white" : "none"} />
            </button>
            <button 
              onClick={() => setIsHardFontMode(!isHardFontMode)} 
              className="quick-menu-btn" 
              title="Hard Font Mode"
            >
              <Bold size={20} fill={isHardFontMode ? "white" : "none"} />
            </button>
            <button onClick={() => setIsFullSettingsModalOpen(true)} className="quick-menu-btn" title="More Settings"><Settings size={20} /></button>
          </div>
        )}

        {/* Full Settings Menu */}
        {(isSettingsOpen && isFullSettingsModalOpen) && (
          <div 
            className="absolute top-12 right-0 w-72 p-4 settings-modal max-h-[80vh] overflow-y-auto hide-scrollbar z-50 border"
            style={{ 
              backgroundColor: `hsla(${hue}, 20%, ${isDarkMode ? '15%' : '95%'}, 0.95)`,
              borderColor: `hsla(${hue}, 30%, 50%, 0.15)`
            }}
          >
            <div className="space-y-6">
              <button 
                onClick={() => setIsFullSettingsModalOpen(false)}
                className="w-full text-center p-2 mb-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg font-medium opacity-80 btn-interactive"
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
                      className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 btn-interactive ${hue === h.value ? 'border-current scale-110' : 'border-transparent'}`}
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
                  className="p-2 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 btn-interactive"
                >
                  {isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
                </button>
              </div>

              {/* Hard Font Mode */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium opacity-80">Hard Font Mode</span>
                  <p className="text-xs opacity-50">Copy converts *bold* ~strike~ to Unicode</p>
                </div>
                <button 
                  onClick={() => setIsHardFontMode(!isHardFontMode)}
                  className="p-2 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 btn-interactive"
                >
                  <Bold size={18} fill={isHardFontMode ? "currentColor" : "none"} />
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
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 opacity-60 hover:opacity-100 btn-interactive"
                  >
                    {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <p className="text-xs opacity-50 mt-1">For AI text suggestions (gemma-4-26b-a4b-it)</p>
              </div>

              {/* Clear Reference */}
              <div className="pt-2 border-t border-black/10 dark:border-white/10">
                <button 
                  onClick={handleClearReference}
                  className="flex items-center justify-center space-x-2 p-2 rounded hover:bg-red-500/10 text-sm w-full btn-interactive"
                  style={{ color: referenceText ? `hsl(0, 60%, 60%)` : 'inherit', opacity: referenceText ? 1 : 0.4 }}
                >
                  <Trash2 size={16} /> <span>Clear Reference</span>
                </button>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-black/10 dark:border-white/10">
                <button 
                  onClick={handleSave}
                  className="flex items-center justify-center space-x-2 p-2 rounded hover:bg-black/5 dark:hover:bg-white/5 text-sm btn-interactive"
                  style={{ color: saveStatus ? `hsl(${hue}, 60%, 60%)` : 'inherit' }}
                >
                  <Save size={16} /> <span>{saveStatus || 'Save to Device'}</span>
                </button>
                <button 
                  onClick={handleExport}
                  className="flex items-center justify-center space-x-2 p-2 rounded hover:bg-black/5 dark:hover:bg-white/5 text-sm btn-interactive"
                >
                  <Download size={16} /> <span>Export JSON</span>
                </button>
                <button 
                  onClick={() => jsonInputRef.current?.click()}
                  className="flex items-center justify-center space-x-2 p-2 rounded hover:bg-black/5 dark:hover:bg-white/5 text-sm col-span-2 btn-interactive"
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
                  className="flex items-center justify-center space-x-2 p-2 rounded hover:bg-black/5 dark:hover:bg-white/5 text-sm btn-interactive"
                >
                  <Copy size={16} /> <span>{isHardFontMode ? 'Copy (Hard)' : 'Copy'}</span>
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center space-x-2 p-2 rounded hover:bg-black/5 dark:hover:bg-white/5 text-sm btn-interactive"
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

      {/* Hard Font Mode Indicator */}
      {isHardFontMode && (
        <div 
          className="fixed top-4 left-4 z-40 hard-font-badge"
          style={{ 
            backgroundColor: `hsla(${hue}, 50%, 50%, 0.12)`,
            color: `hsl(${hue}, 60%, 60%)`
          }}
        >
          HARD FONT
        </div>
      )}

      {/* Main Content Area */}
      <main ref={containerRef} className={`flex-1 flex flex-col md:flex-row w-full overflow-hidden relative ${isDragging ? 'select-none' : ''}`}>
        
        {/* Reference Panel */}
        {showReference && (
          <div 
            className="pane-wrapper flex flex-col"
            style={{ flexBasis: `${effectiveRefRatio}%`, transition: keyboardShift ? 'flex-basis 300ms ease' : 'none' }}
          >
            {isRefEditing ? (
              /* ─── Edit Mode: textarea + floating save ─── */
              <div className="flex-1 flex flex-col relative overflow-hidden">
                <textarea
                  ref={refEditRef}
                  value={refEditDraft}
                  onChange={(e) => setRefEditDraft(e.target.value)}
                  className="reference-edit-textarea flex-1 w-full bg-transparent resize-none outline-none hide-scrollbar p-4 sm:p-8 md:p-12 overflow-y-auto"
                  style={{ fontFamily, fontSize: `${fontSize}px` }}
                  placeholder="Type or paste reference content..."
                  spellCheck={false}
                />
                {/* Floating Save Button */}
                <div className="sticky bottom-4 flex justify-center pb-2 pointer-events-none">
                  <button
                    onClick={handleSaveRefEdit}
                    className="floating-save-btn pointer-events-auto"
                  >
                    <Check size={16} />
                    Save Reference
                  </button>
                </div>
              </div>
            ) : (
              /* ─── Read-only Mode: rendered markdown ─── */
              <>
                <div
                  ref={refPanelRef}
                  onScroll={handleRefScroll}
                  className="pane-scroll flex-1 w-full hide-scrollbar p-4 sm:p-8 md:p-12"
                  style={{ fontFamily, fontSize: `${fontSize}px` }}
                >
                  {referenceText ? (
                    <div className="ref-markdown" style={{ color: 'var(--ref-text-color)' }}>
                      <Markdown remarkPlugins={[remarkGfm]}>{referenceText}</Markdown>
                    </div>
                  ) : (
                    <span style={{ opacity: 0.3, color: 'var(--ref-text-color)' }}>
                      Reference text appears here. Paste via the button below or use the edit icon in the menu.
                    </span>
                  )}
                  {/* Blank space at the end for extra scroll room */}
                  <div style={{ height: '50vh' }} />
                </div>
                {/* Paste-to-reference button at bottom of panel */}
                <button
                  onClick={handlePasteToReference}
                  className="flex items-center justify-center space-x-2 p-2 opacity-25 hover:opacity-80 transition-opacity text-xs btn-interactive"
                  style={{ color: `hsl(${(hue + 30) % 360}, 55%, 55%)` }}
                  title="Paste clipboard to reference"
                >
                  <Clipboard size={14} /> <span>Paste to Reference</span>
                </button>
              </>
            )}
          </div>
        )}

        {/* Resizer / Divider */}
        {showReference && (
          <div 
            onMouseDown={(e) => { e.preventDefault(); setIsDragging(true); }}
            onTouchStart={(e) => { setIsDragging(true); }}
            className="split-divider"
            style={{ 
              backgroundColor: isDragging 
                ? `hsla(${hue}, 50%, 50%, 0.5)` 
                : `hsla(${hue}, 20%, 50%, 0.08)`,
              color: `hsl(${hue}, 40%, 50%)`,
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
                className="w-32 h-32 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-current opacity-25 hover:opacity-100 transition-opacity pointer-events-auto cursor-pointer btn-interactive"
                style={{ color: `hsl(${hue}, 50%, 50%)` }}
              >
                <Upload size={32} />
              </button>
            </div>
          )}

          {isReaderMode ? (
            <div 
              className="markdown-body pane-scroll flex-1 w-full p-4 sm:p-8 md:p-12 hide-scrollbar"
              style={{ fontFamily, fontSize: `${fontSize}px` }}
            >
              <Markdown remarkPlugins={[remarkGfm]}>{text}</Markdown>
              {/* Blank space at end for extra scroll room */}
              <div style={{ height: '50vh' }} />
            </div>
          ) : (
            <div className="flex-1 relative overflow-hidden">
              {/* Ghost text overlay — renders ALL visible text */}
              <div
                ref={ghostRef}
                className="ghost-overlay absolute inset-0 p-4 sm:p-8 md:p-12 overflow-y-auto pointer-events-none hide-scrollbar"
                style={{ fontFamily, fontSize: `${fontSize}px` }}
                aria-hidden="true"
              >
                {prediction.hasSuggestion ? (
                  <>
                    {text.slice(0, prediction.suggestionAnchorPos)}
                    <span 
                      className="ghost-text"
                      style={{ color: `hsl(${hue}, 50%, 50%)` }}
                    >{prediction.suggestion}</span>
                    {text.slice(prediction.suggestionAnchorPos)}
                  </>
                ) : (
                  text || '\u00A0'
                )}
                {/* Blank space at end for extra scroll room */}
                <div style={{ height: '50vh' }} />
              </div>
              {/* Actual textarea — text is transparent, caret visible */}
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
                className="ghost-editor absolute inset-0 w-full h-full bg-transparent resize-none outline-none hide-scrollbar p-4 sm:p-8 md:p-12 !pb-[50vh] overflow-y-auto"
                style={{ fontFamily, fontSize: `${fontSize}px`, color: 'transparent', caretColor: `hsl(${hue}, 60%, 60%)` }}
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
            className="p-4 rounded-full shadow-lg transition-transform hover:scale-110 focus:outline-none btn-interactive"
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
