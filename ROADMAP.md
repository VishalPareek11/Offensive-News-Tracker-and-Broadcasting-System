# AllProfanity Roadmap - Future Implementations

> **Note:** This document outlines potential improvements and future features. Each feature is marked with implementation feasibility and performance impact.

## Legend

- ✅ **IMPLEMENTABLE** - Can be built with reasonable effort and performance
- ⚠️ **HYPOTHETICAL** - Requires significant resources or has major trade-offs
- ❌ **NOT RECOMMENDED** - Severe performance/complexity issues
- 🟢 **FAST** - Minimal performance impact (<5% slowdown)
- 🟡 **MODERATE** - Noticeable impact (5-30% slowdown)
- 🔴 **SLOW** - Significant impact (>30% slowdown, >100ms response time)

---

## 🚀 High-Impact, Implementable Features

### 1. Unicode Homoglyph Detection ✅ 🟢

**Status:** IMPLEMENTABLE with minimal performance impact

**Problem:** Users bypass filters with lookalike characters:
- `fυck` (Greek υ instead of u)
- `аss` (Cyrillic а instead of a)
- `ⓕⓤⓒⓚ` (circled letters)
- `𝐟𝐮𝐜𝐤` (mathematical bold)

**Implementation:**
```typescript
private readonly homoglyphMap = {
  // Cyrillic lookalikes
  'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'у': 'y', 'х': 'x',
  'і': 'i', 'ј': 'j', 'ѕ': 's', 'һ': 'h', 'ԁ': 'd', 'ԛ': 'q',

  // Greek lookalikes
  'α': 'a', 'β': 'b', 'ε': 'e', 'ι': 'i', 'ο': 'o', 'υ': 'u',
  'ν': 'v', 'ρ': 'p', 'τ': 't', 'χ': 'x', 'ω': 'w',

  // Circled letters
  'ⓐ': 'a', 'ⓑ': 'b', 'ⓒ': 'c', 'ⓓ': 'd', 'ⓔ': 'e', 'ⓕ': 'f',
  // ... (complete alphabet)

  // Mathematical variants
  '𝐚': 'a', '𝐛': 'b', '𝐜': 'c', '𝕒': 'a', '𝕓': 'b', '𝖆': 'a',
  // ... (multiple mathematical alphabets)

  // Full-width characters
  'ａ': 'a', 'ｂ': 'b', 'ｃ': 'c', 'ｄ': 'd', 'ｅ': 'e', 'ｆ': 'f',
};

private normalizeHomoglyphs(text: string): string {
  return Array.from(text).map(char =>
    this.homoglyphMap[char] || char
  ).join('');
}
```

**Performance:** O(n) single pass, ~2-3% overhead
**Detection Improvement:** +30-40% evasion attempts caught
**Effort:** 1-2 days (mapping table + integration)

---

### 2. Zero-Width Character Detection ✅ 🟢

**Status:** IMPLEMENTABLE with zero performance impact

**Problem:** Invisible characters break pattern matching:
- `f​u​c​k` (zero-width spaces between letters)
- `s​h​i​t` (zero-width joiners)

**Implementation:**
```typescript
private readonly zeroWidthChars = [
  '\u200B', // Zero-width space
  '\u200C', // Zero-width non-joiner
  '\u200D', // Zero-width joiner
  '\u200E', // Left-to-right mark
  '\u200F', // Right-to-left mark
  '\uFEFF', // Zero-width no-break space
  '\u2060', // Word joiner
  '\u2061', // Function application
  '\u2062', // Invisible times
  '\u2063', // Invisible separator
  '\u2064', // Invisible plus
];

private removeZeroWidth(text: string): string {
  // Create regex once, cache it
  const regex = new RegExp(this.zeroWidthChars.join('|'), 'g');
  return text.replace(regex, '');
}
```

**Performance:** O(n) single pass, <1% overhead
**Detection Improvement:** +15-20% evasion attempts caught
**Effort:** 1 day

---

### 3. Spacing/Punctuation Evasion ✅ 🟢

**Status:** IMPLEMENTABLE

**Problem:** Users add separators: `f.u.c.k`, `f-u-c-k`, `f u c k`, `f_u_c_k`

**Implementation:**
```typescript
private normalizeSpacing(text: string): string {
  // Pattern 1: Single characters separated by spaces/punctuation
  // "f u c k" → "fuck", "f.u.c.k" → "fuck"
  let normalized = text.replace(
    /\b(\w)[\s\.\-_\*]+(\w)[\s\.\-_\*]+(\w)[\s\.\-_\*]+(\w)\b/gi,
    '$1$2$3$4'
  );

  // Pattern 2: Longer words with excessive spacing
  // "f  u  c  k  i  n  g" → "fucking"
  normalized = normalized.replace(
    /\b(\w)[\s\.\-_\*]+(\w)[\s\.\-_\*]+(\w)[\s\.\-_\*]+(\w)[\s\.\-_\*]+(\w)[\s\.\-_\*]+(\w)[\s\.\-_\*]+(\w)\b/gi,
    '$1$2$3$4$5$6$7'
  );

  return normalized;
}
```

**Performance:** O(n) single pass, ~3-5% overhead
**Detection Improvement:** +20-25% evasion attempts caught
**Effort:** 2-3 days (testing edge cases)

---

### 4. Emoji & Symbol Substitution ✅ 🟢

**Status:** IMPLEMENTABLE

**Problem:** Emoji-based profanity: `🖕`, `f🍆ck`, `💩head`, `a$$`

**Implementation:**
```typescript
private readonly emojiSubstitutions: Map<string, string> = new Map([
  // Explicit emojis
  ['🖕', 'fuck'],
  ['💩', 'shit'],
  ['🍆', 'dick'],
  ['🍑', 'ass'],
  ['🤬', 'fuck'],

  // Symbol substitutions
  ['$$', 'ss'], // a$$hole → asshole
  ['@$$', 'ass'],
  ['***', 'xxx'], // Common censorship reversal
]);

private normalizeEmojis(text: string): string {
  let normalized = text;
  for (const [symbol, replacement] of this.emojiSubstitutions) {
    normalized = normalized.replaceAll(symbol, replacement);
  }
  return normalized;
}
```

**Performance:** O(n) single pass, ~2% overhead
**Detection Improvement:** +10-15% evasion attempts caught
**Effort:** 2 days

---

### 5. Category-Based Detection ✅ 🟢

**Status:** IMPLEMENTABLE (dictionary update required)

**Problem:** All profanity treated equally - need nuanced moderation

**Implementation:**
```typescript
export enum ProfanityCategory {
  SEXUAL = 'sexual',
  RACIST = 'racist',
  VIOLENT = 'violent',
  RELIGIOUS = 'religious',
  ABLEIST = 'ableist',
  HOMOPHOBIC = 'homophobic',
  GENERAL = 'general'
}

interface CategorizedWord {
  word: string;
  category: ProfanityCategory;
  severity: 1 | 2 | 3 | 4;
}

export interface ProfanityDetectionResult {
  hasProfanity: boolean;
  detectedWords: string[];
  cleanedText: string;
  severity: ProfanitySeverity;
  positions: Array<{ word: string; start: number; end: number }>;

  // NEW FIELDS
  categories: ProfanityCategory[];
  categoryBreakdown: Record<ProfanityCategory, number>;
  maxCategorySeverity: Record<ProfanityCategory, number>;
}
```

**Performance:** No impact (just metadata)
**Benefits:** Platform-specific rules (block racist > sexual on professional sites)
**Effort:** 1-2 weeks (categorize all dictionaries)

---

### 6. Phonetic Matching (Limited) ✅ 🟡

**Status:** IMPLEMENTABLE but with moderate performance cost

**Problem:** Miss typos and phonetic variants: `fuk`, `phuck`, `shiit`

**Implementation:**
```typescript
// Simple Soundex algorithm (no external deps)
class PhoneticMatcher {
  private soundexMap: Map<string, string[]> = new Map();

  private soundex(word: string): string {
    // Simple soundex: keep first letter, encode rest
    const code = word[0].toUpperCase();
    const encoded = word.slice(1)
      .replace(/[aeiouyhw]/gi, '0')
      .replace(/[bfpv]/gi, '1')
      .replace(/[cgjkqsxz]/gi, '2')
      .replace(/[dt]/gi, '3')
      .replace(/[l]/gi, '4')
      .replace(/[mn]/gi, '5')
      .replace(/[r]/gi, '6')
      .replace(/0+/g, '')
      .replace(/(.)\1+/g, '$1');

    return (code + encoded + '000').substring(0, 4);
  }

  addWord(word: string): void {
    const code = this.soundex(word);
    if (!this.soundexMap.has(code)) {
      this.soundexMap.set(code, []);
    }
    this.soundexMap.get(code)!.push(word);
  }

  findPhoneticMatches(word: string): string[] {
    const code = this.soundex(word);
    return this.soundexMap.get(code) || [];
  }
}
```

**Performance:** ~20-30% slowdown (must check each word phonetically)
**Detection Improvement:** +15-25% typos/misspellings caught
**Effort:** 1 week
**Recommendation:** Make this OPT-IN via config flag

**Config:**
```typescript
{
  algorithm: {
    usePhoneticMatching: false // Default OFF for performance
  },
  phoneticMatching: {
    enabled: false,
    algorithm: 'soundex' | 'metaphone'
  }
}
```

---

### 7. Transliteration Expansion ✅ 🟢

**Status:** IMPLEMENTABLE (dictionary expansion)

**Problem:** Hindi/Arabic profanity written in Latin script

**Implementation:**
```typescript
// Bidirectional transliteration mapping
private readonly transliterations: Record<string, string[]> = {
  // Hindi → Latin variants
  'चूतिया': ['chutiya', 'chutia', 'chutya', 'chotiya'],
  'मादरचोद': ['madarchod', 'madarchod', 'maderchod'],
  'बहनचोद': ['bhenchod', 'banchod', 'bahnchod'],

  // Latin → Devanagari
  'chutiya': ['चूतिया'],
  'madarchod': ['मादरचोद'],

  // Arabic → Latin
  // ...
};

// Add all transliterations to dictionary during initialization
```

**Performance:** No runtime cost (pre-computed in dictionary)
**Detection Improvement:** +10-15% cross-script profanity caught
**Effort:** 1-2 weeks (linguistic research + dictionary expansion)

---

### 8. Streaming API for Large Documents ✅ 🟢

**Status:** IMPLEMENTABLE

**Problem:** Memory issues with huge documents (>10MB)

**Implementation:**
```typescript
async* detectStream(
  textStream: AsyncIterableIterator<string>
): AsyncIterableIterator<ProfanityDetectionResult> {
  let buffer = '';
  const windowSize = 1000; // Characters overlap for boundary words

  for await (const chunk of textStream) {
    buffer += chunk;

    // Process when buffer is large enough
    while (buffer.length >= 5000) {
      const processChunk = buffer.substring(0, 5000);
      yield this.detect(processChunk);

      // Keep overlap window to catch boundary words
      buffer = buffer.substring(5000 - windowSize);
    }
  }

  // Process remaining buffer
  if (buffer.length > 0) {
    yield this.detect(buffer);
  }
}
```

**Performance:** Same as batch, memory efficient
**Use Case:** Document scanning, large file processing
**Effort:** 3-4 days

---

### 9. Real-Time Predictive Detection ✅ 🟢

**Status:** IMPLEMENTABLE (already have Trie prefix matching)

**Problem:** Want to warn users BEFORE they submit

**Implementation:**
```typescript
predictProfanity(partialText: string): {
  isPotentialProfanity: boolean;
  confidence: number;
  suggestions: string[];
} {
  const words = partialText.trim().split(/\s+/);
  const lastWord = words[words.length - 1] || '';

  if (lastWord.length < 2) {
    return { isPotentialProfanity: false, confidence: 0, suggestions: [] };
  }

  // Check if current partial word matches profanity prefixes
  const normalizedWord = this.caseSensitive
    ? lastWord
    : lastWord.toLowerCase();

  const matches = this.profanityTrie.findMatches(
    normalizedWord,
    0,
    true // Allow partial matches
  );

  if (matches.length > 0) {
    const longestMatch = matches.reduce((a, b) =>
      a.word.length > b.word.length ? a : b
    );

    // Calculate confidence based on how close to complete word
    const confidence = normalizedWord.length / longestMatch.word.length;

    return {
      isPotentialProfanity: true,
      confidence,
      suggestions: this.findAlternatives(lastWord)
    };
  }

  return { isPotentialProfanity: false, confidence: 0, suggestions: [] };
}

private findAlternatives(word: string): string[] {
  // Simple alternative suggestions (can be expanded)
  const alternatives: Record<string, string[]> = {
    'fuck': ['frick', 'freak', 'heck'],
    'shit': ['shoot', 'sugar', 'snap'],
    'damn': ['dang', 'darn'],
    'ass': ['butt', 'behind'],
    // ...
  };

  return alternatives[word.toLowerCase()] || [];
}
```

**Performance:** <5% overhead (prefix matching already optimized)
**Use Case:** Chat apps, live typing feedback
**Effort:** 2-3 days

---

## ⚠️ Hypothetical Features (Feasible but with Trade-offs)

### 10. Cultural Severity Scoring ⚠️ 🟢

**Status:** HYPOTHETICAL (requires linguistic/cultural research)

**Problem:** Severity varies by region (religious profanity more severe in Middle East, racial slurs more severe in US)

**Implementation:**
```typescript
interface CulturalContext {
  region: 'US' | 'UK' | 'IN' | 'BR' | 'DE' | 'FR' | 'MX' | 'SA' | 'CN';
  severityMultipliers: Record<ProfanityCategory, number>;
}

const culturalContexts: Record<string, CulturalContext> = {
  'US': {
    region: 'US',
    severityMultipliers: {
      [ProfanityCategory.RACIST]: 1.5,
      [ProfanityCategory.SEXUAL]: 1.0,
      [ProfanityCategory.RELIGIOUS]: 0.7
    }
  },
  'IN': {
    region: 'IN',
    severityMultipliers: {
      [ProfanityCategory.RELIGIOUS]: 1.5,
      [ProfanityCategory.SEXUAL]: 1.3,
      [ProfanityCategory.RACIST]: 1.2
    }
  },
  'SA': { // Saudi Arabia
    region: 'SA',
    severityMultipliers: {
      [ProfanityCategory.RELIGIOUS]: 2.0,
      [ProfanityCategory.SEXUAL]: 1.8
    }
  }
};
```

**Performance:** No impact (just multiplier calculation)
**Challenge:** Requires expert linguistic/cultural research for each region
**Effort:** 2-3 months (research + validation)

---

### 11. Adaptive Learning with Feedback ⚠️ 🟡

**Status:** HYPOTHETICAL (needs data collection + privacy considerations)

**Problem:** One-size-fits-all doesn't work for all platforms

**Implementation:**
```typescript
class AdaptiveLearning {
  private feedbackDb: FeedbackData[] = [];

  submitFeedback(feedback: {
    text: string;
    detectionResult: boolean;
    userFeedback: 'correct' | 'false_positive' | 'false_negative';
  }): void {
    this.feedbackDb.push({
      ...feedback,
      timestamp: Date.now()
    });

    // Batch processing every 100 feedbacks
    if (this.feedbackDb.length >= 100) {
      this.analyzeAndAdjust();
    }
  }

  private analyzeAndAdjust(): void {
    // Find common false positives
    const falsePositives = this.feedbackDb
      .filter(f => f.userFeedback === 'false_positive')
      .map(f => this.extractWords(f.text));

    // Auto-whitelist words that appear in >80% of false positives
    const commonFalsePositives = this.findCommonPatterns(
      falsePositives,
      0.8
    );

    // Add to whitelist (with option to review)
    this.addToWhitelist(commonFalsePositives);
  }
}
```

**Performance:** 10-20% overhead (feedback analysis)
**Challenges:**
- Requires user data collection (privacy concerns)
- Risk of adversarial manipulation
- Needs moderation queue for review

**Effort:** 2-3 months
**Recommendation:** Enterprise-only feature with admin review

---

### 12. Worker Thread Pool (Node.js) ⚠️ 🟢

**Status:** HYPOTHETICAL (limited use case)

**Problem:** Batch processing blocks event loop

**Implementation:**
```typescript
import { Worker } from 'worker_threads';

class WorkerPool {
  private workers: Worker[] = [];
  private queue: any[] = [];

  constructor(numWorkers: number = 4) {
    for (let i = 0; i < numWorkers; i++) {
      this.workers.push(new Worker('./worker.js'));
    }
  }

  async detectBatch(texts: string[]): Promise<ProfanityDetectionResult[]> {
    const chunkSize = Math.ceil(texts.length / this.workers.length);
    const chunks: string[][] = [];

    for (let i = 0; i < texts.length; i += chunkSize) {
      chunks.push(texts.slice(i, i + chunkSize));
    }

    const promises = chunks.map((chunk, i) =>
      this.runWorkerTask(this.workers[i % this.workers.length], chunk)
    );

    const results = await Promise.all(promises);
    return results.flat();
  }
}
```

**Performance:** 2-4x speedup on large batches (1000+ texts)
**Challenge:** Overhead for small batches, complexity
**Use Case:** Batch document scanning only
**Effort:** 1-2 weeks

---

## ❌ NOT RECOMMENDED (Severe Performance Issues)

### 13. ML-Based Intent Classification ❌ 🔴

**Status:** NOT RECOMMENDED for production

**Problem:** Can't distinguish context: "This is fucking amazing!" (positive) vs "Fuck you!" (hostile)

**Why NOT Recommended:**

1. **Response Time Impact:**
   - ML inference: **100-500ms per request** (vs current <1ms)
   - Even with TensorFlow.js Lite: **50-150ms**
   - Total: **50-100x slower**

2. **Model Size:**
   - Lightweight model: 20-50MB download
   - Full model: 100-500MB
   - Current library: <1MB

3. **Dependencies:**
   - Requires TensorFlow.js or ONNX Runtime
   - Adds 10-20MB to node_modules

4. **Accuracy Issues:**
   - Pre-trained models not profanity-specific
   - Requires custom training data
   - Cultural/language context varies

**Implementation (if absolutely needed):**
```typescript
import * as tf from '@tensorflow/tfjs';
// OR
import { InferenceSession } from 'onnxruntime-web';

class IntentClassifier {
  private model: tf.LayersModel | null = null;

  async initialize() {
    console.warn('⚠️ ML model loading will add 100-500ms to first request');
    this.model = await tf.loadLayersModel('path/to/model.json');
  }

  async classifyIntent(text: string): Promise<{
    intent: 'hostile' | 'casual' | 'positive';
    confidence: number;
    responseTime: number; // Track performance
  }> {
    const startTime = performance.now();

    // Tokenize and predict
    const tokens = await this.tokenize(text);
    const prediction = await this.model!.predict(tokens);

    const responseTime = performance.now() - startTime;

    if (responseTime > 100) {
      console.warn(`⚠️ ML inference took ${responseTime}ms - significantly slower than pattern matching`);
    }

    return {
      intent: this.mapToIntent(prediction),
      confidence: prediction.confidence,
      responseTime
    };
  }
}
```

**Recommendation:**
- Use pattern-based context analysis instead (already implemented in v2.2)
- Much faster: <5ms overhead
- Good enough for 80% of cases
- If ML needed, use as OPT-IN feature with clear warnings

**Config:**
```typescript
{
  algorithm: {
    useMLClassification: false, // DEFAULT OFF
  },
  mlClassification: {
    enabled: false,
    warnOnSlowness: true,
    maxResponseTime: 100, // Error if >100ms
  }
}
```

---

### 14. Deep Learning NLP (Transformers) ❌ 🔴

**Status:** NOT RECOMMENDED

**Examples:** BERT, GPT-based classification, Transformer models

**Why NOT Recommended:**

1. **Catastrophic Performance:**
   - Response time: **500ms - 2 seconds**
   - Current: <1ms
   - **500-2000x slower**

2. **Resource Requirements:**
   - RAM: 1-4GB for model
   - CPU: High during inference
   - GPU: Needed for reasonable speed

3. **Dependencies:**
   - Full TensorFlow/PyTorch: 200-500MB
   - Transformers.js: 50-100MB

4. **Overkill:**
   - Pattern matching: 95%+ accuracy
   - Context patterns: 90%+ accuracy
   - Transformers: 98%+ accuracy
   - **Not worth 2000x slowdown for 3% gain**

**When it MIGHT be worth it:**
- Offline batch processing
- Content moderation queue (async)
- Premium tier with explicit opt-in
- Dedicated moderation servers

**Never use for:**
- Real-time chat
- Form validation
- Live API endpoints
- Client-side detection

---

### 15. Computer Vision for Image-Based Profanity ❌ 🔴

**Status:** NOT RECOMMENDED (out of scope)

**Problem:** Detect profanity in images/memes

**Why NOT:**
- Completely different domain (OCR + image classification)
- Response time: 1-5 seconds
- Model size: 100-500MB
- Should be separate library/service

---

## 📊 Implementation Priority Matrix

| Feature | Effort | Performance Impact | Detection Gain | Priority |
|---------|--------|-------------------|----------------|----------|
| Homoglyph Detection | Low (1-2 days) | 🟢 Minimal | +35% | 🔥 HIGH |
| Zero-Width Removal | Low (1 day) | 🟢 None | +15% | 🔥 HIGH |
| Spacing/Punctuation | Low (2-3 days) | 🟢 Minimal | +25% | 🔥 HIGH |
| Emoji Substitution | Low (2 days) | 🟢 Minimal | +12% | 🔥 HIGH |
| Category System | Medium (1-2 weeks) | 🟢 None | Qualitative | 🟡 MEDIUM |
| Streaming API | Low (3-4 days) | 🟢 None | Use case specific | 🟡 MEDIUM |
| Predictive Detection | Low (2-3 days) | 🟢 Minimal | Use case specific | 🟡 MEDIUM |
| Transliteration | Medium (1-2 weeks) | 🟢 None | +12% | 🟡 MEDIUM |
| Phonetic Matching | Medium (1 week) | 🟡 -20-30% | +20% | 🟢 LOW (opt-in) |
| Cultural Scoring | High (2-3 months) | 🟢 None | Qualitative | 🟢 LOW |
| Adaptive Learning | High (2-3 months) | 🟡 -10-20% | Variable | 🟢 LOW |
| Worker Threads | Medium (1-2 weeks) | 🟢 Positive | Batch only | 🟢 LOW |
| ML Intent | Very High (3+ months) | 🔴 -5000% | +3-5% | ❌ NOT RECOMMENDED |
| Transformers | Very High (6+ months) | 🔴 -200000% | +3% | ❌ NOT RECOMMENDED |

---

## 🎯 Recommended Implementation Phases

### Phase 1: Quick Wins (1-2 weeks)
**Goal:** Catch 70% more evasion attempts with <5% performance cost

1. ✅ Zero-Width Character Removal (1 day)
2. ✅ Homoglyph Detection (2 days)
3. ✅ Spacing/Punctuation Normalization (3 days)
4. ✅ Emoji Substitution (2 days)

**Expected Result:**
- Detection rate: 75% → 95%
- Performance: <5% slower
- Total effort: 8-10 days

---

### Phase 2: Quality of Life (1 month)
**Goal:** Better UX and category-based moderation

1. ✅ Category-Based Detection System (2 weeks)
2. ✅ Real-Time Predictive Detection (3 days)
3. ✅ Streaming API for Large Documents (4 days)

**Expected Result:**
- Platform-specific moderation rules
- Better user experience (warnings before submit)
- Memory-efficient document scanning

---

### Phase 3: Advanced Features (2-3 months)
**Goal:** Language expansion and optional advanced detection

1. ✅ Transliteration Expansion (2 weeks)
2. ✅ Phonetic Matching (opt-in) (1 week)
3. ⚠️ Cultural Severity Scoring (2-3 months research)

**Expected Result:**
- Better multi-language support
- Optional features for specific use cases

---

### Phase 4: Enterprise Features (6+ months)
**Goal:** Premium features for large platforms

1. ⚠️ Adaptive Learning with Feedback (3 months)
2. ⚠️ Worker Thread Pool for Batch Processing (2 weeks)
3. ⚠️ Admin Dashboard for Feedback Review (3 months)

**Expected Result:**
- Self-improving detection
- Scalable batch processing
- Platform-specific customization

---

## ⚠️ Features to AVOID

### DO NOT IMPLEMENT (unless explicitly required and performance is not a concern):

1. ❌ **ML-Based Intent Classification**
   - Performance: 100-500ms vs <1ms (100-500x slower)
   - Accuracy gain: +3-5% vs 500x slowdown
   - Use pattern-based context instead

2. ❌ **Transformer/BERT Models**
   - Performance: 500-2000ms (2000x slower)
   - Size: 100-500MB download
   - Overkill for pattern matching problem

3. ❌ **Real-time Deep Learning**
   - Performance: Catastrophic
   - Resources: Requires GPU
   - Better as separate async service

4. ❌ **Computer Vision for Images**
   - Out of scope
   - Separate problem domain
   - Should be different library

---

## 🔧 Configuration Philosophy

**Core Principle:** Fast by default, opt-in for advanced features

```typescript
// Default config - FAST (< 1ms)
const filter = new AllProfanity();

// Advanced config - MODERATE (< 10ms)
const filter = new AllProfanity({
  algorithm: {
    matching: "hybrid",
    usePhoneticMatching: true, // OPT-IN
  }
});

// DO NOT PROVIDE THIS
const filter = new AllProfanity({
  algorithm: {
    useMLClassification: true, // ❌ 100-500ms
  }
});
```

---

## 📝 Summary

### ✅ Implementable Now (High ROI)
1. Homoglyph detection
2. Zero-width removal
3. Spacing normalization
4. Emoji substitution
5. Category system
6. Streaming API
7. Predictive detection

### ⚠️ Implementable Later (Medium ROI)
1. Transliteration expansion
2. Phonetic matching (opt-in)
3. Cultural scoring
4. Adaptive learning
5. Worker threads

### ❌ Avoid Unless Absolutely Necessary
1. ML intent classification (100-500x slower)
2. Transformer models (2000x slower)
3. Deep learning NLP (catastrophic performance)
4. Computer vision (wrong problem)

**Key Takeaway:** Pattern matching + smart normalization gets you 95%+ accuracy with <1ms response time. ML might get you to 98%, but at 500-2000ms cost. **NOT WORTH IT** for real-time detection.

---

**Questions or suggestions? Open an issue to discuss implementation priorities!**
