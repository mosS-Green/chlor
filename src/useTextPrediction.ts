import { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';

interface PredictionOptions {
  text: string;
  cursorPos: number;
  apiKey: string;
  enabled: boolean;
}

interface Suggestion {
  text: string;        // The full suggestion text
  anchorPos: number;   // Cursor position where suggestion was generated
  matched: number;     // Number of chars already typed that match
}

export function useTextPrediction({ text, cursorPos, apiKey, enabled }: PredictionOptions) {
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef(false);
  const prevTextRef = useRef(text);
  const prevCursorRef = useRef(cursorPos);

  // Clear suggestion helper
  const clearSuggestion = useCallback(() => {
    setSuggestion(null);
  }, []);

  // Accept suggestion helper
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

  // Fetch prediction from Gemini
  const fetchPrediction = useCallback(async (contextText: string, pos: number) => {
    if (!apiKey || !enabled) return;
    
    const textBefore = contextText.slice(Math.max(0, pos - 690), pos);
    if (textBefore.trim().length < 3) return; // Need some context

    setIsLoading(true);
    abortRef.current = false;

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemma-3-27b-it',
        contents: [
          {
            role: 'user',
            parts: [{ text: `You are an inline text completion engine. Given the text before the cursor, predict the next 1–3 words or a single short phrase that naturally continues the writing. Output ONLY the predicted text, nothing else—no quotes, no explanation, no leading space unless grammatically needed.\n\nText before cursor:\n${textBefore}` }],
          },
        ],
        config: {
          maxOutputTokens: 30,
          temperature: 0.3,
        },
      });

      if (abortRef.current) return;

      const predictionText = response?.text?.trim();
      if (predictionText && predictionText.length > 0) {
        // Check if the text immediately before cursor ends with a space or is empty
        const needsSpace = textBefore.length > 0 && !textBefore.endsWith(' ') && !textBefore.endsWith('\n') && !predictionText.startsWith(' ');
        const finalPrediction = needsSpace ? ' ' + predictionText : predictionText;
        
        setSuggestion({
          text: finalPrediction,
          anchorPos: pos,
          matched: 0,
        });
      }
    } catch (err) {
      console.error('Prediction error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, enabled]);

  // Handle text/cursor changes for partial matching and idle timer
  useEffect(() => {
    const prevText = prevTextRef.current;
    const prevCursor = prevCursorRef.current;
    prevTextRef.current = text;
    prevCursorRef.current = cursorPos;

    // If not enabled or no API key, do nothing
    if (!enabled || !apiKey) {
      if (suggestion) clearSuggestion();
      return;
    }

    // Check if we have an active suggestion and user is typing forward
    if (suggestion) {
      const charsAdded = text.length - prevText.length;
      const cursorMoved = cursorPos - prevCursor;

      // User typed forward at the suggestion anchor point
      if (charsAdded > 0 && cursorMoved === charsAdded && cursorPos > suggestion.anchorPos) {
        const typedSoFar = text.slice(suggestion.anchorPos, cursorPos);
        const suggestionPrefix = suggestion.text.slice(0, typedSoFar.length);

        if (suggestionPrefix === typedSoFar) {
          // User is typing matching characters
          setSuggestion(prev => prev ? { ...prev, matched: typedSoFar.length } : null);
          
          // If fully matched, clear
          if (typedSoFar.length >= suggestion.text.length) {
            clearSuggestion();
          }
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
      // Only fetch if no active suggestion
      if (!suggestion || suggestion.matched > 0) {
        fetchPrediction(text, cursorPos);
      }
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

  // Get the visible (remaining) suggestion text
  const visibleSuggestion = suggestion ? suggestion.text.slice(suggestion.matched) : '';
  const suggestionAnchorPos = suggestion ? suggestion.anchorPos + suggestion.matched : -1;

  return {
    suggestion: visibleSuggestion,
    suggestionAnchorPos,
    isLoading,
    acceptSuggestion,
    clearSuggestion,
    hasSuggestion: !!suggestion && visibleSuggestion.length > 0,
  };
}
