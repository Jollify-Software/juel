// A quiz as data: the JSON island (`<script type="application/json">` inside
// <juel-quiz>) that stands in for the light-DOM lists. The shape mirrors the
// Markdown (`jollify/QUIZ-PLAN.md` §2); texts are inline HTML (Slipway renders a
// data file's inline Markdown before writing the island). See src/Quiz/README.md.
import { QuizType } from './QuizState';

export interface QuizData {
    type?: QuizType;
    question: string;
    /** Choice: the items, the right ones `right: true`. */
    items?: { text: string; right?: boolean }[];
    /** Sort: the groups, each with its members. */
    groups?: { name: string; colour?: string; color?: string; items: string[] }[];
    /** Match: `[left, right]` pairs. */
    pairs?: [string, string][];
    explanation?: string;
}

/** What juel-quiz reads from a quiz as data: the same markup and key the light-DOM form gives. */
export interface QuizSource {
    type: QuizType;
    /** The question, lists and explanation, as light-DOM markup (README "Markup"). */
    html: string;
    /** The `data-answer` key. */
    answer: number[];
}

const isText = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';

/** Check a parsed island and say what's wrong with it, or `null` when it's a quiz. */
export function quizDataError(data: unknown): string | null {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return 'the quiz data is not an object';
    const d = data as Record<string, unknown>;
    const type = d.type ?? 'choice';
    if (type !== 'choice' && type !== 'sort' && type !== 'match') return `"type" is "${String(type)}": use choice, sort or match`;
    if (!isText(d.question)) return 'there is no "question"';
    if (d.explanation != null && typeof d.explanation !== 'string') return '"explanation" is not text';
    if (type === 'choice') {
        if (!Array.isArray(d.items) || d.items.length === 0) return 'a choice quiz needs "items"';
        if (!d.items.every(i => i && typeof i === 'object' && isText((i as Record<string, unknown>).text))) return 'every item needs a "text"';
        if (!d.items.some(i => (i as Record<string, unknown>).right === true)) return 'no item is "right": true';
    } else if (type === 'sort') {
        if (!Array.isArray(d.groups) || d.groups.length === 0) return 'a sort quiz needs "groups"';
        for (const g of d.groups as Record<string, unknown>[]) {
            if (!g || typeof g !== 'object' || !isText(g.name)) return 'every group needs a "name"';
            if (!Array.isArray(g.items) || g.items.length === 0 || !g.items.every(isText)) return `group "${g.name}" needs "items" (texts)`;
        }
    } else {
        if (!Array.isArray(d.pairs) || d.pairs.length === 0) return 'a match quiz needs "pairs"';
        if (!d.pairs.every(p => Array.isArray(p) && p.length === 2 && isText(p[0]) && isText(p[1]))) return 'every pair is ["left", "right"]';
    }
    return null;
}

const escapeAttribute = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const list = (texts: string[], attrs = '', tag = 'ul') => `<${tag}${attrs}>${texts.map(t => `<li>${t}</li>`).join('')}</${tag}>`;

/** Turn valid quiz data (see `quizDataError`) into the markup and key juel-quiz reads. */
export function quizSource(data: QuizData): QuizSource {
    const type = data.type ?? 'choice';
    const question = `<p>${data.question}</p>`;
    const explanation = data.explanation?.trim() ? `<blockquote><p>${data.explanation}</p></blockquote>` : '';
    if (type === 'sort') {
        const groups = data.groups ?? [];
        const heads = groups.map(g => {
            // Not text (a hand-written `"colour": 3`): no colour, as Slipway does.
            const colour = [g.colour, g.color].find(c => typeof c === 'string');
            return `<li${colour ? ` data-colour="${escapeAttribute(colour)}"` : ''}>${g.name}</li>`;
        });
        const items = groups.flatMap(g => g.items);
        const answer = groups.flatMap((g, k) => g.items.map(() => k));
        return { type, answer, html: `${question}<ol data-groups>${heads.join('')}</ol>${list(items)}${explanation}` };
    }
    if (type === 'match') {
        const pairs = data.pairs ?? [];
        return {
            type,
            answer: pairs.map((_, i) => i),
            html: `${question}${list(pairs.map(p => p[0]))}${list(pairs.map(p => p[1]), ' data-partners')}${explanation}`,
        };
    }
    const items = data.items ?? [];
    return {
        type,
        answer: items.flatMap((item, i) => item.right === true ? [i] : []),
        html: `${question}${list(items.map(i => i.text))}${explanation}`,
    };
}

/** Parse an island's text: the quiz source, or what's wrong with it. */
export function readQuizData(text: string): QuizSource | { error: string } {
    let data: unknown;
    try {
        data = JSON.parse(text);
    } catch (e) {
        return { error: `the quiz data is not JSON (${(e as Error).message})` };
    }
    const error = quizDataError(data);
    return error ? { error } : quizSource(data as QuizData);
}
