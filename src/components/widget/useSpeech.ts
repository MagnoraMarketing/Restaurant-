"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Voice-demo i browseren via Web Speech API (da-DK). Den rigtige AIbooking Voice
// kører server-side med telefoni; dette gør det muligt at prøve voice uden opsætning.

/* eslint-disable @typescript-eslint/no-explicit-any */
type Recognition = any;

export function useSpeech(onFinal: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const recRef = useRef<Recognition>(null);
  const cb = useRef(onFinal);
  cb.current = onFinal;

  useEffect(() => {
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;
    setSupported(true);
    const rec: Recognition = new SR();
    rec.lang = "da-DK";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      let text = "";
      let final = false;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
        if (e.results[i].isFinal) final = true;
      }
      setInterim(text);
      if (final) {
        setInterim("");
        cb.current(text.trim());
      }
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    return () => rec.abort();
  }, []);

  const start = useCallback(() => {
    if (!recRef.current) return;
    window.speechSynthesis?.cancel();
    try {
      recRef.current.start();
      setListening(true);
    } catch {
      /* allerede startet */
    }
  }, []);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  const speak = useCallback((text: string, onDone?: () => void) => {
    const synth = window.speechSynthesis;
    if (!synth) return onDone?.();
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/\p{Extended_Pictographic}|\uFE0F|✓/gu, ""));
    u.lang = "da-DK";
    u.rate = 1.05;
    const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith("da"));
    if (voice) u.voice = voice;
    u.onend = () => onDone?.();
    synth.speak(u);
  }, []);

  return { supported, listening, interim, start, stop, speak };
}
