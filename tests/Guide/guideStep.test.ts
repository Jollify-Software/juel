import { isSeen, markSeen, resetSeen, toGuideStep } from '../../src/_Modules/Guide/GuideStep';

describe('toGuideStep', () => {
    it("keeps today's steps working: selector is the target, description plain text", () => {
        expect(toGuideStep({ selector: '#a', title: 'A', description: 'Use <b> & go' })).toEqual({
            target: '#a', title: 'A', html: 'Use &lt;b&gt; &amp; go', placement: 'auto', wait: 0,
        });
    });

    it('takes the new fields, and falls back for a bad placement or wait', () => {
        expect(toGuideStep({ target: 'x >>> .y', title: 'B', html: '<b>Bold</b>', placement: 'left', wait: 500 }))
            .toEqual({ target: 'x >>> .y', title: 'B', html: '<b>Bold</b>', placement: 'left', wait: 500 });
        const step = toGuideStep({ target: '#c', placement: 'sideways' as any, wait: -3 });
        expect(step.placement).toBe('auto');
        expect(step.wait).toBe(0);
        expect(step.html).toBe('');
    });
});

describe('seen', () => {
    beforeEach(() => localStorage.clear());

    it('remembers a guide per key, and forgets it on reset', () => {
        expect(isSeen('editor')).toBe(false);
        markSeen('editor');
        expect(isSeen('editor')).toBe(true);
        expect(isSeen('dashboard')).toBe(false);
        resetSeen('editor');
        expect(isSeen('editor')).toBe(false);
    });

    it('ignores an empty key', () => {
        markSeen('');
        expect(isSeen('')).toBe(false);
        expect(localStorage.length).toBe(0);
    });
});
