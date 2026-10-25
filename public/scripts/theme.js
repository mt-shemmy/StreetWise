/* ==========================================================================
   Streetwise Theme & Preferences System
   Handles Light/Dark Mode, Learning Topics, Nicknames, and Credits
   ========================================================================== */

function defaultPreferences() {
    return {
        theme: "light",
        learningTopics: []
    };
}

function getPreferencesStore() {
    try {
        return JSON.parse(
            localStorage.getItem(STREETWISE_PREFERENCES_KEY)
        ) || {};
    } catch (error) {
        return {};
    }
}

function savePreferencesStore(store) {
    localStorage.setItem(
        STREETWISE_PREFERENCES_KEY,
        JSON.stringify(store)
    );
}

function getUserPreferences(email) {
    const store = getPreferencesStore();
    return Object.assign(
        defaultPreferences(),
        store[email] || {}
    );
}

function saveUserPreferences(email, prefs) {
    const store = getPreferencesStore();
    store[email] = prefs;
    savePreferencesStore(store);
}

function applyPreferences(prefs) {
    document.body.classList.toggle(
        "dark-mode",
        prefs.theme === "dark"
    );
}

function loadPreferencesForCurrentUser() {
    const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
    applyPreferences(
        user ? getUserPreferences(user.email) : defaultPreferences()
    );
}

function openPreferences() {
    const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
    if (!user) {
        return;
    }

    const emailEl = document.getElementById("prefsEmail");
    if (emailEl) emailEl.textContent = user.email;

    const levelEl = document.getElementById("prefsLevel");
    if (levelEl) levelEl.textContent = user.level || "Beginner";

    const input = document.getElementById("prefsNicknameInput");
    if (input) input.value = user.nickname || "";

    const msgId = document.getElementById("prefsNicknameMessage") ? "prefsNicknameMessage" : "prefsNicknameMsg";
    if (typeof clearMessage === "function") clearMessage(msgId);

    const prefs = getUserPreferences(user.email);

    const darkToggle1 = document.getElementById("darkModeToggle");
    if (darkToggle1) darkToggle1.checked = prefs.theme === "dark";

    const darkToggle2 = document.getElementById("prefsDarkModeToggle");
    if (darkToggle2) darkToggle2.checked = prefs.theme === "dark";

    const checkboxes1 = document.querySelectorAll(".topic-checkbox");
    if (checkboxes1.length) {
        checkboxes1.forEach(function(checkbox) {
            checkbox.checked = (prefs.learningTopics || []).includes(checkbox.value);
        });
    }

    const checkboxes2 = document.querySelectorAll("#prefsTopicsList input[type='checkbox']");
    if (checkboxes2.length) {
        checkboxes2.forEach(function(checkbox) {
            checkbox.checked = (prefs.learningTopics || []).includes(checkbox.value);
        });
    }

    const overlay = document.getElementById("preferencesOverlay");
    if (overlay) overlay.classList.add("active");
}

function closePreferences() {
    const overlay = document.getElementById("preferencesOverlay");
    if (overlay) {
        overlay.classList.remove("active");
    }
}

function closePreferencesOnBackdrop(event) {
    if (event.target.id === "preferencesOverlay") {
        closePreferences();
    }
}

function savePrefsNickname() {
    const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
    if (!user) {
        return;
    }

    const msgId = document.getElementById("prefsNicknameMessage") ? "prefsNicknameMessage" : "prefsNicknameMsg";
    if (typeof clearMessage === "function") clearMessage(msgId);

    const input = document.getElementById("prefsNicknameInput");
    const newNickname = input ? input.value.trim() : "";

    if (!newNickname) {
        if (typeof showMessage === "function") showMessage(msgId, "Please enter a nickname.", "error");
        return;
    }

    if (newNickname.length > 20) {
        if (typeof showMessage === "function") showMessage(msgId, "Nickname must be 20 characters or fewer.", "error");
        return;
    }

    const accounts = typeof getAccounts === "function" ? getAccounts() : {};
    const account = accounts[user.email];
    if (account) {
        account.nickname = newNickname;
        if (typeof saveAccounts === "function") saveAccounts(accounts);
    }

    const updatedUser = Object.assign({}, user, { nickname: newNickname });
    if (typeof setCurrentUser === "function") setCurrentUser(updatedUser);

    if (typeof updateNavigation === "function") updateNavigation();

    const greeting = document.getElementById("greetingText");
    if (greeting) {
        greeting.textContent = "Welcome back, " + (updatedUser.nickname || updatedUser.email) + "!";
    }

    if (typeof showMessage === "function") {
        showMessage(msgId, "Nickname updated successfully.", "success");
    }
}

function handleDarkModeToggle(checkbox) {
    const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
    if (!user) {
        return;
    }

    const prefs = getUserPreferences(user.email);
    prefs.theme = checkbox.checked ? "dark" : "light";
    saveUserPreferences(user.email, prefs);
    applyPreferences(prefs);
}

function handleLearningTopicToggle(checkbox) {
    const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
    if (!user) {
        return;
    }

    const prefs = getUserPreferences(user.email);
    const topics = new Set(prefs.learningTopics || []);

    if (checkbox.checked) {
        topics.add(checkbox.value);
    } else {
        topics.delete(checkbox.value);
    }

    prefs.learningTopics = Array.from(topics);
    saveUserPreferences(user.email, prefs);
}

function toggleCredits() {
    const overlay = document.getElementById("creditsOverlay");
    if (overlay) {
        overlay.classList.toggle("active");
    }
}

function closeCredits(event) {
    if (event.target.id === "creditsOverlay") {
        toggleCredits();
    }
}

/* Global Escape Key Listener */
document.addEventListener("keydown", function(event) {
    if (event.key === "Escape") {
        const credits = document.getElementById("creditsOverlay");
        if (credits) credits.classList.remove("active");

        const prefs = document.getElementById("preferencesOverlay");
        if (prefs) prefs.classList.remove("active");

        if (typeof closeBadges === "function") closeBadges();
        if (typeof closeBuddySelection === "function") closeBuddySelection();
    }
});
