import { resolveTarget, waitForTarget } from '../../src/_Modules/Guide/GuideTarget';

describe('resolveTarget', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div id="page"><button class="light">Light</button><x-host id="host"></x-host><div id="plain"><span class="in">In</span></div></div>';
        const host = document.getElementById('host')!;
        const shadow = host.attachShadow({ mode: 'open' });
        shadow.innerHTML = '<div class="writer"><x-inner id="inner"></x-inner></div>';
        const inner = shadow.getElementById('inner')!;
        inner.attachShadow({ mode: 'open' }).innerHTML = '<button class="deep">Deep</button>';
    });

    it('finds a plain selector in the page', () => {
        expect(resolveTarget('.light')!.textContent).toBe('Light');
    });

    it('crosses shadow roots with >>>, one level or two', () => {
        expect(resolveTarget('#host >>> .writer')!.className).toBe('writer');
        expect(resolveTarget('#host>>>#inner >>> .deep')!.textContent).toBe('Deep');
    });

    it('does not find shadow content without >>>', () => {
        expect(resolveTarget('.writer')).toBeNull();
    });

    it('steps into the light DOM of an element with no shadow root', () => {
        expect(resolveTarget('#plain >>> .in')!.textContent).toBe('In');
    });

    it('returns null for a missing part or a bad selector', () => {
        expect(resolveTarget('#host >>> .nothing')).toBeNull();
        expect(resolveTarget('#nothing >>> .writer')).toBeNull();
        expect(resolveTarget('[[bad')).toBeNull();
        expect(resolveTarget('  ')).toBeNull();
    });

    it('takes an element (if still in the page) or a function', () => {
        const button = document.querySelector('.light')!;
        expect(resolveTarget(button)).toBe(button);
        expect(resolveTarget(document.createElement('div'))).toBeNull();
        expect(resolveTarget(() => button)).toBe(button);
        expect(resolveTarget(() => null)).toBeNull();
    });
});

describe('waitForTarget', () => {
    it('waits for a target that appears, and gives up on one that does not', async () => {
        setTimeout(() => document.body.insertAdjacentHTML('beforeend', '<p class="late">Late</p>'), 80);
        expect((await waitForTarget('.late', 1000))!.textContent).toBe('Late');
        expect(await waitForTarget('.never', 120)).toBeNull();
        expect(await waitForTarget('.never')).toBeNull();
    });
});
