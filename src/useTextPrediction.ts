import { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';

interface PredictionOptions {
  text: string;
  cursorPos: number;
  apiKey: string;
  enabled: boolean;
}

const TRIGGER_SEQUENCE = ',,,';

interface Suggestion {
  text: string;        // The full suggestion text (never starts with whitespace)
  anchorPos: number;   // Cursor position where suggestion is anchored (advances on space)
  matched: number;     // Number of suggestion chars already typed that match
}

export function useTextPrediction({ text, cursorPos, apiKey, enabled }: PredictionOptions) {
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [triggerDetected, setTriggerDetected] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef(false);
  const prevTextRef = useRef(text);
  const prevCursorRef = useRef(cursorPos);
  const pendingTriggerRef = useRef(false);

  const clearSuggestion = useCallback(() => {
    setSuggestion(null);
  }, []);

  const acceptSuggestion = useCallback((): { newText: string; newCursorPos: number } | null => {
    if (!suggestion) return null;
    const remaining = suggestion.text.slice(suggestion.matched);
    if (!remaining) {
      setSuggestion(null);
      return null;
    }
    const insertPos = suggestion.anchorPos + suggestion.matched;
    const before = text.slice(0, insertPos);
    const after = text.slice(insertPos);
    const newText = before + remaining + after;
    const newCursorPos = insertPos + remaining.length;
    setSuggestion(null);
    return { newText, newCursorPos };
  }, [suggestion, text]);

  const fetchPrediction = useCallback(async (contextText: string, pos: number) => {
    if (!apiKey || !enabled) return;
    
    const textBefore = contextText.slice(Math.max(0, pos - 690), pos);
    if (textBefore.trim().length < 3) return;

    setIsLoading(true);
    abortRef.current = false;

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemma-4-26b-a4b-it',
        contents: [
          {
            role: 'user',
            parts: [{ text: `You are an inline text completion engine. Given the text before the cursor, predict the next 1–3 words or a single short phrase that naturally continues the writing. Output ONLY the predicted text, nothing else—no quotes, no explanation. Do NOT start with a space. You may use \\n to indicate a line break if appropriate.\n\nText before cursor:\n${textBefore}` }],
          },
        ],
        config: {
          maxOutputTokens: 30,
          temperature: 0.3,
        },
      });

      if (abortRef.current) return;

      let predictionText = response?.text?.trim();
      if (predictionText && predictionText.length > 0) {
        // Parse literal \n as actual newlines
        predictionText = predictionText.replace(/\\n/g, '\n');
        // Strip any leading whitespace — suggestions always start immediately
        predictionText = predictionText.replace(/^\s+/, '');
        
        if (predictionText.length > 0) {
          setSuggestion({
            text: predictionText,
            anchorPos: pos,
            matched: 0,
          });
        }
      }
    } catch (err) {
      console.error('Prediction error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, enabled]);

  // Detect ,,, trigger sequence
  useEffect(() => {
    if (!enabled || !apiKey) return;
    
    // Check if text before cursor ends with ,,,
    const textBeforeCursor = text.slice(0, cursorPos);
    if (textBeforeCursor.endsWith(TRIGGER_SEQUENCE)) {
      // Signal to component: delete the commas, then we'll fetch
      pendingTriggerRef.current = true;
      setTriggerDetected(true);
      clearSuggestion();
      // Cancel any idle timer
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      return; // Don't run normal logic — component will update text next
    }

    // If we just cleared the trigger commas, fire the prediction immediately
    if (pendingTriggerRef.current) {
      pendingTriggerRef.current = false;
      setTriggerDetected(false);
      fetchPrediction(text, cursorPos);
      return;
    }

    // Normal suggestion tracking logic
    const prevText = prevTextRef.current;
    const prevCursor = prevCursorRef.current;
    prevTextRef.current = text;
    prevCursorRef.current = cursorPos;

    if (suggestion) {
      const charsAdded = text.length - prevText.length;
      const cursorMoved = cursorPos - prevCursor;

      if (charsAdded > 0 && cursorMoved === charsAdded && cursorPos > suggestion.anchorPos) {
        const newChars = text.slice(prevCursor, cursorPos);
        const typedFromAnchor = text.slice(suggestion.anchorPos, cursorPos);
        const suggestionPrefix = suggestion.text.slice(0, typedFromAnchor.length);

        if (suggestionPrefix === typedFromAnchor) {
          // User typed matching characters
          setSuggestion(prev => prev ? { ...prev, matched: typedFromAnchor.length } : null);
          if (typedFromAnchor.length >= suggestion.text.length) {
            clearSuggestion();
          }
        } else if (newChars.trim() === '') {
          // User typed only whitespace — push suggestion forward with cursor
          setSuggestion(prev => prev ? { 
            ...prev, 
            anchorPos: cursorPos,
            matched: 0 
          } : null);
        } else {
          // User diverged
          clearSuggestion();
        }
      } else if (charsAdded < 0 || (cursorMoved !== 0 && cursorMoved !== charsAdded)) {
        // User deleted text or moved cursor non-sequentially
        clearSuggestion();
      }
    }

    // Reset idle timer
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    idleTimerRef.current = setTimeout(() => {
      fetchPrediction(text, cursorPos);
    }, 6900);

    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [text, cursorPos]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current = true;
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, []);

  const visibleSuggestion = suggestion ? suggestion.text.slice(suggestion.matched) : '';
  const suggestionAnchorPos = suggestion ? suggestion.anchorPos + suggestion.matched : -1;

  return {
    suggestion: visibleSuggestion,
    suggestionAnchorPos,
    isLoading,
    acceptSuggestion,
    clearSuggestion,
    hasSuggestion: !!suggestion && visibleSuggestion.length > 0,
    triggerDetected,
  };
}
