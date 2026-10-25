import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';

function buddyPage() {
    const storage = new Map<string, string>();
    const nodes = new Map<string, ReturnType<typeof element>>();
    function element() {
        return { innerHTML: '', textContent: '', className: '', style: { width: '' }, children: [] as unknown[],
            attributes: {} as Record<string, string>, appendChild(node: unknown) { this.children.push(node); },
            setAttribute(key: string, value: string) { this.attributes[key] = value; }, classList: { add() {}, remove() {} } };
    }
    const openCourse = vi.fn(), openPractice = vi.fn(), renderDashboard = vi.fn();
    const context = createContext({
        window: {}, openCourse, openPractice, renderDashboard, showToast() {},
        localStorage: {
            getItem: (key: string) => storage.get(key) ?? null,
            setItem: (key: string, value: string) => storage.set(key, value),
        },
        document: { createElement: element, getElementById(id: string) {
            if (!nodes.has(id)) nodes.set(id, element());
            return nodes.get(id);
        } },
    });
    const read = (name: string) => readFileSync(new URL(`../public/scripts/${name}`, import.meta.url), 'utf8');
    runInContext(read('auth.js'), context);
    runInContext(read('buddies.js'), context);
    const dashboard = read('dashboard-ui.js');
    runInContext(dashboard.slice(0, dashboard.indexOf('/* ICONS */')), context);
    runInContext(dashboard.slice(dashboard.indexOf('function renderBuddy('), dashboard.indexOf('/* ACCOUNT BADGE */')), context);
    const run = (code: string) => runInContext(code, context);
    storage.set('streetwiseCurrentUser', JSON.stringify({ email: 'buddy@example.invalid', level: 'Beginner' }));
    return { run, storage, nodes, openCourse, openPractice, renderDashboard };
}

describe('Buddy artwork and progression', () => {
    it.each([[0, 'baby'], [99, 'baby'], [100, 'teen'], [299, 'teen'], [300, 'adult'], [750, 'adult']])(
        'uses the expected growth stage at %i XP', (xp, stage) => {
            expect(buddyPage().run(`getBuddyStage(${xp})`)).toBe(stage);
        }
    );

    it('keeps stage progress and growth badges aligned with the easier thresholds', () => {
        const page = buddyPage();
        expect(page.run('getBuddyProgress(80).remaining')).toBe(20);
        expect(page.run('getBuddyProgress(150).remaining')).toBe(150);
        expect(page.run('getBuddyProgress(900).remaining')).toBe(0);
        expect(page.run('BADGE_DEFINITIONS.find(b => b.id === "buddy-teen").check({xp:100})')).toBe(true);
        expect(page.run('BADGE_DEFINITIONS.find(b => b.id === "buddy-adult").check({xp:299})')).toBe(false);
        expect(page.run('BADGE_DEFINITIONS.find(b => b.id === "buddy-adult").check({xp:300})')).toBe(true);
    });

    it('renders all seven animals with distinct artwork for each growth stage', () => {
        const page = buddyPage();
        const ids = page.run('Object.keys(BUDDIES)') as string[];
        expect(ids).toHaveLength(7);
        for (const id of ids) {
            const stages = ['baby', 'teen', 'adult'].map(stage => page.run(`window.StreetwiseBuddies.avatar('${id}', '${stage}')`) as string);
            expect(new Set(stages).size).toBe(3);
            stages.forEach(svg => expect(svg).toContain('class="buddy-portrait"'));
        }
        page.run('renderBuddy({buddy:"owl",xp:150})');
        expect(page.nodes.get('buddyProgressText')!.textContent).toBe('150 XP to Adult');
        expect(page.nodes.get('buddyProgressTrack')!.attributes['aria-valuenow']).toBe(25);
    });

    it('switches buddies without spending XP, resetting progress or losing earned badges', () => {
        const page = buddyPage();
        const progress = { buddy: 'fox', xp: 180, lessonsCompleted: 4, completedLessons: { one: true }, badges: ['first-lesson'] };
        page.storage.set('streetwiseProgress', JSON.stringify({ 'buddy@example.invalid': progress }));
        page.run('chooseBuddy("owl")');
        const saved = JSON.parse(page.storage.get('streetwiseProgress')!)['buddy@example.invalid'];
        expect(saved).toMatchObject({ ...progress, buddy: 'owl' });
        expect(page.nodes.get('buddyOptions')!.children).toHaveLength(7);
        expect(page.renderDashboard).toHaveBeenCalled();
    });

    it('opens an unfinished lesson, then offers the workshop when all lessons are complete', () => {
        const page = buddyPage();
        page.run('const STREETWISE_COURSES = {basics:{level:"Beginner",lessons:[{id:"one"},{id:"two"}]}}');
        page.storage.set('streetwiseProgress', JSON.stringify({ 'buddy@example.invalid': { completedLessons: { one: true } } }));
        page.run('continueBuddyLearning()');
        expect(page.openCourse).toHaveBeenCalledWith('basics', 'two');
        page.storage.set('streetwiseProgress', JSON.stringify({ 'buddy@example.invalid': { completedLessons: { one: true, two: true } } }));
        page.run('continueBuddyLearning()');
        expect(page.openPractice).toHaveBeenCalledWith('home');
    });
});
