/* Streetwise buddy artwork and growth rules. No account data is stored here. */
(function () {
    const thresholds = { teen: 100, adult: 300 };
    const definitions = {
        fox: { name: 'Fox', description: 'Curious by nature.' },
        owl: { name: 'Owl', description: 'A thoughtful observer.' },
        raccoon: { name: 'Raccoon', description: 'A resourceful problem solver.' },
        cat: { name: 'Cat', description: 'Independent and observant.' },
        dog: { name: 'Dog', description: 'A steady learning partner.' },
        penguin: { name: 'Penguin', description: 'Calm under pressure.' },
        axolotl: { name: 'Axolotl', description: 'Always ready to adapt.' }
    };

    // Flat, shared linework gives every character the same visual language.
    const faces = {
        fox: '<path fill="var(--buddy-fur)" d="M20 48 17 16 36 28Q48 23 60 28L79 16 76 48 66 65 48 75 30 65Z"/><path fill="var(--buddy-paper)" d="m22 46 26 11 26-11-8 19-18 10-18-10Z"/><path fill="var(--buddy-deep)" d="m23 24 9 8-8 7Zm50 0-9 8 8 7Z"/><path d="m31 45 7 2m20 0 7-2"/><path fill="var(--buddy-ink)" d="m43 57 5 5 5-5Z"/>',
        owl: '<path fill="var(--buddy-fur)" d="M21 34 19 17l18 10q11-5 22 0l18-10-2 17q7 8 7 20c0 17-15 24-34 24S14 71 14 54q0-12 7-20Z"/><path fill="var(--buddy-paper)" d="M48 38c-16-21-37 2-21 22l21 12 21-12c16-20-5-43-21-22Z"/><circle cx="34" cy="46" r="9"/><circle cx="62" cy="46" r="9"/><path fill="var(--buddy-deep)" d="m43 58 5 7 5-7Z"/>',
        raccoon: '<circle fill="var(--buddy-fur)" cx="23" cy="27" r="12"/><circle fill="var(--buddy-fur)" cx="73" cy="27" r="12"/><path fill="var(--buddy-fur)" d="M15 48c0-32 66-32 66 0 0 18-17 29-33 29S15 66 15 48Z"/><path fill="var(--buddy-deep)" d="M18 40q15-9 30 0 15-9 30 0l-4 15-19-3-7-6-7 6-19 3Z"/><path fill="var(--buddy-paper)" d="M31 58q17-8 34 0L48 75Z"/><path fill="var(--buddy-ink)" d="m43 61 5 4 5-4Z"/>',
        cat: '<path fill="var(--buddy-fur)" d="m19 43 1-27 20 14q8-3 16 0l20-14 1 27c11 27-7 35-29 35S8 70 19 43Z"/><path fill="var(--buddy-paper)" d="m25 25 10 10-11 3Zm46 0L61 35l11 3Z"/><path fill="var(--buddy-paper)" d="M35 57q13-9 26 0-2 15-13 15T35 57Z"/><path d="m16 55 16 3m-17 7 17-2m32-5 16-3m-16 8 17 2"/><path fill="var(--buddy-ink)" d="m44 56 4 4 4-4Z"/>',
        dog: '<path fill="var(--buddy-deep)" d="M27 25C10 21 6 38 12 58q8 14 19-5Zm42 0c17-4 21 13 15 33q-8 14-19-5Z"/><path fill="var(--buddy-fur)" d="M24 38c0-29 48-29 48 0v18c0 28-48 28-48 0Z"/><path fill="var(--buddy-paper)" d="M33 53c5-9 25-9 30 0l1 10c-1 16-31 16-32 0Z"/><path fill="var(--buddy-ink)" d="M42 54q6-4 12 0l-2 6h-8Z"/><path d="M48 61v5m-6 0q6 5 12 0"/>',
        penguin: '<path fill="var(--buddy-deep)" d="M20 48c0-43 56-43 56 0v12q0 21-28 21T20 60Z"/><path fill="var(--buddy-paper)" d="M48 36C23 9 17 62 32 71q16 12 32 0c15-9 9-62-16-35Z"/><path fill="var(--buddy-fur)" d="m41 55 7-6 7 6-7 8Z"/>',
        axolotl: '<path d="M23 36 9 27m11 20L5 45m18 13L9 66m64-30 14-9M76 47l15-2M73 58l14 8" stroke="var(--buddy-deep)" stroke-width="5"/><path fill="var(--buddy-fur)" d="M17 49c0-31 62-31 62 0 0 18-15 28-31 28S17 67 17 49Z"/><path d="M38 60q10 7 20 0"/>'
    };
    function safeXP(value) { return Math.max(0, Number(value) || 0); }
    function stageFor(xp) {
        xp = safeXP(xp);
        return xp >= thresholds.adult ? 'adult' : xp >= thresholds.teen ? 'teen' : 'baby';
    }
    function progressFor(xp) {
        xp = safeXP(xp);
        const stage = stageFor(xp);
        const floor = stage === 'baby' ? 0 : thresholds.teen;
        const target = stage === 'baby' ? thresholds.teen : thresholds.adult;
        return {
            current: stage === 'adult' ? target - floor : xp - floor,
            needed: target - floor,
            remaining: stage === 'adult' ? 0 : target - xp,
            target,
            nextStage: stage === 'baby' ? 'Teen' : 'Adult'
        };
    }
    function avatar(id, stage = 'baby') {
        id = Object.hasOwn(definitions, id) ? id : 'fox';
        stage = ['baby', 'teen', 'adult'].includes(stage) ? stage : 'baby';
        const scale = stage === 'baby' ? '.86' : stage === 'teen' ? '.94' : '1';
        const accessory = stage === 'baby' ? '' : stage === 'teen'
            ? '<path fill="var(--buddy-deep)" d="M34 77q14 7 28 0v8q-14 7-28 0Zm24 8 6 13-10-3-3-9Z"/>'
            : '<path fill="var(--buddy-deep)" d="M33 78q15 7 30 0v7q-15 6-30 0Z"/><circle fill="var(--buddy-paper)" cx="48" cy="88" r="7"/><path d="m45 88 2 2 4-4"/>';
        const eyes = id === 'fox' ? '' : '<circle fill="var(--buddy-ink)" stroke="none" cx="34" cy="46" r="2.5"/><circle fill="var(--buddy-ink)" stroke="none" cx="62" cy="46" r="2.5"/>';
        return '<svg class="buddy-portrait" viewBox="0 0 96 112" fill="none" stroke="var(--buddy-ink)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><g transform="translate(48 104) scale(' + scale + ') translate(-48 -104)"><path fill="var(--buddy-fur)" d="M26 102v-9c0-24 44-24 44 0v9Z"/>' + faces[id] + eyes + accessory + '</g></svg>';
    }
    window.StreetwiseBuddies = Object.freeze({ definitions, thresholds, stageFor, progressFor, avatar });
})();
