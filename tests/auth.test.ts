import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import { createContext, runInContext } from 'node:vm';

// Exercise the shipped scripts with disposable storage, never a browser's saved accounts.
function authPage(storage = new Map<string, string>()) {
  const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  const elements = new Map([...html.matchAll(/\bid="([^"]+)"/g)].map(match => {
    const classes = new Set<string>();
    const element = {
      value: '', textContent: '', className: '', disabled: false, style: { display: '' },
      focus() {},
      classList: {
        add(name: string) { classes.add(name); },
        remove(name: string) { classes.delete(name); },
        contains(name: string) { return classes.has(name); },
        toggle(name: string, enabled: boolean) { enabled ? classes.add(name) : classes.delete(name); },
      },
    };
    return [match[1]!, element] as const;
  }));
  const timers: Array<() => void> = [];
  const window = { location: { href: 'index.html' } };
  const context = createContext({
    TextEncoder, crypto: webcrypto, window,
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
    document: {
      addEventListener() {},
      getElementById: (id: string) => elements.get(id) ?? null,
      querySelectorAll: () => [],
      body: { classList: { toggle() {} } },
    },
    showPage() {},
    setTimeout: (callback: () => void) => timers.push(callback),
  });
  for (const script of ['theme.js', 'auth.js']) {
    runInContext(readFileSync(new URL(`../public/scripts/${script}`, import.meta.url), 'utf8'), context);
  }
  return {
    storage, window, elements,
    run: (code: string) => runInContext(code, context),
    flushRedirects: () => timers.splice(0).forEach(callback => callback()),
  };
}

async function signUp(page: ReturnType<typeof authPage>) {
  page.run('startSignup(); selectSignupLevel("Beginner", document.getElementById("signupContinueButton")); goToSignupStep2();');
  page.elements.get('signupEmail')!.value = ' Learner@Example.invalid ';
  page.elements.get('signupPassword')!.value = 'Disposable-test-123!';
  page.elements.get('signupPasswordConfirm')!.value = 'Disposable-test-123!';
  page.run('goToSignupStep3()');
  expect(page.elements.get('signupStep3')!.classList.contains('active')).toBe(true);
  page.elements.get('signupNickname')!.value = 'Learner';
  await page.run('finishSignup()');
}

describe('Streetwise local account flow', () => {
  it('creates an account, saves preferences and progress, and redirects with a persistent session', async () => {
    const page = authPage();
    await signUp(page);
    const account = JSON.parse(page.storage.get('streetwiseAccounts')!)['learner@example.invalid'];
    expect(account.nickname).toBe('Learner');
    expect(account.passwordHash).toMatch(/^[a-f0-9]{64}$/);
    expect(account).not.toHaveProperty('password');
    expect(JSON.parse(page.storage.get('streetwisePreferences')!)['learner@example.invalid'].theme).toBe('light');
    expect(JSON.parse(page.storage.get('streetwiseProgress')!)['learner@example.invalid'].xp).toBe(0);
    page.flushRedirects();
    expect(page.window.location.href).toBe('dashboard.html');
    const reloaded = authPage(page.storage);
    expect(reloaded.run('getCurrentUser().email')).toBe('learner@example.invalid');
  });

  it('logs out without removing saved data, rejects a wrong password, and allows a later login', async () => {
    const page = authPage();
    await signUp(page);
    page.flushRedirects();
    page.run('logoutUser()');
    expect(page.run('getCurrentUser()')).toBeNull();
    expect(page.storage.has('streetwiseAccounts')).toBe(true);
    expect(page.storage.has('streetwiseProgress')).toBe(true);
    page.elements.get('loginEmail')!.value = 'LEARNER@example.invalid';
    page.elements.get('loginPassword')!.value = 'incorrect-password';
    await page.run('handleLogin({preventDefault(){}})');
    expect(page.run('getCurrentUser()')).toBeNull();
    expect(page.elements.get('loginMessage')!.textContent).toContain('Incorrect password');
    page.elements.get('loginPassword')!.value = 'Disposable-test-123!';
    await page.run('handleLogin({preventDefault(){}})');
    page.flushRedirects();
    expect(page.window.location.href).toBe('dashboard.html');
    expect(page.run('getCurrentUser().nickname')).toBe('Learner');
  });

  it('keeps an existing account and its progress when duplicate signup is attempted', async () => {
    const page = authPage();
    await signUp(page);
    const accounts = page.storage.get('streetwiseAccounts');
    page.storage.set('streetwiseProgress', JSON.stringify({ 'learner@example.invalid': { xp: 75 } }));
    await page.run('finishSignup()');
    expect(page.elements.get('nicknameSignupMessage')!.textContent).toContain('already exists');
    expect(page.storage.get('streetwiseAccounts')).toBe(accounts);
    expect(JSON.parse(page.storage.get('streetwiseProgress')!)['learner@example.invalid'].xp).toBe(75);
  });

  it('saves nickname, theme and topic choices without changing learning progress', async () => {
    const page = authPage();
    await signUp(page);
    const progress = page.storage.get('streetwiseProgress');
    page.elements.get('prefsNicknameInput')!.value = 'Network Learner';
    page.run('savePrefsNickname(); handleDarkModeToggle({checked:true}); handleLearningTopicToggle({checked:true,value:"Networking"});');
    expect(page.run('getCurrentUser().nickname')).toBe('Network Learner');
    const saved = JSON.parse(page.storage.get('streetwisePreferences')!)['learner@example.invalid'];
    expect(saved.theme).toBe('dark');
    expect(saved.learningTopics).toEqual(['Networking']);
    page.run('handleLearningTopicToggle({checked:false,value:"Networking"})');
    expect(page.run('getUserPreferences("learner@example.invalid").learningTopics.length')).toBe(0);
    expect(page.storage.get('streetwiseProgress')).toBe(progress);
  });

});
