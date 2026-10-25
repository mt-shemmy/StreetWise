/* ==========================================================================
   Streetwise Authentication & Account Management
   Handles Sign up, Sign in, Google OAuth simulation, Sessions, and Passwords
   ========================================================================== */
const STREETWISE_PROGRESS_KEY = "streetwiseProgress";

/* progress storage helpers */
function defaultProgress() {
    return {
        xp: 0,
        lessonsCompleted: 0,
        badges: [],
        streak: {
            current: 0,
            longest: 0,
            lastActiveDate: null
        }
    };
}

function getProgressStore() {
    try {
        return JSON.parse(
            localStorage.getItem(STREETWISE_PROGRESS_KEY)
        ) || {};
    } catch (error) {
        return {};
    }
}

function saveProgressStore(store) {
    localStorage.setItem(
        STREETWISE_PROGRESS_KEY,
        JSON.stringify(store)
    );
}

function saveUserProgress(email, progress) {
    const store = getProgressStore();
    store[email] = progress;
    saveProgressStore(store);
}

/* inline messages */

    function showMessage(elementId, text, type) {

        const element =
            document.getElementById(elementId);

        if (!element) {
            return;
        }

        element.textContent = text;
        element.className = "message-box visible " + (type || "info");

    }


    function clearMessage(elementId) {

        const element =
            document.getElementById(elementId);

        if (!element) {
            return;
        }

        element.textContent = "";
        element.className = "message-box";

    }


    /* start signup */

    function startSignup() {

        signupSelectedLevel = "";

        document
            .querySelectorAll(".signup-level")
            .forEach(function(button) {

                button.classList.remove("selected");

            });

        document.getElementById("signupNickname").value = "";

        clearMessage("signupMessage");
        clearMessage("nicknameSignupMessage");

        goToSignupStep1();

        showPage("signupPage");

    }


    /* start signup with level */

    function startSignupWithLevel(level) {

        signupSelectedLevel = level;

        document
            .querySelectorAll(".signup-level")
            .forEach(function(button) {

                button.classList.remove("selected");

            });

        document.getElementById("signupNickname").value = "";

        clearMessage("signupMessage");
        clearMessage("nicknameSignupMessage");

        goToSignupStep2();

        showPage("signupPage");

    }


    /* signup level */

    let signupSelectedLevel = "";


    function selectSignupLevel(level, button) {

        signupSelectedLevel = level;

        document
            .querySelectorAll(".signup-level")
            .forEach(function(item) {

                item.classList.remove("selected");

            });

        button.classList.add("selected");

        updateSignupContinueButton();

    }


    /* update continue button */

    function updateSignupContinueButton() {

        const continueButton =
            document.getElementById("signupContinueButton");

        if (!continueButton) {
            return;
        }

        if (signupSelectedLevel === "") {

            continueButton.classList.add("disabled");

            continueButton.disabled = true;

        } else {

            continueButton.classList.remove("disabled");

            continueButton.disabled = false;

        }

    }


    /* signup step 1 */

    function goToSignupStep1() {

        signupSelectedLevel = "";

        document
            .querySelectorAll(".signup-level")
            .forEach(function(button) {

                button.classList.remove("selected");

            });

        document.getElementById("signupStep1").classList.add("active");
        document.getElementById("signupStep2").classList.remove("active");
        document.getElementById("signupStep3").classList.remove("active");

        document.getElementById("progressDot1").classList.add("active");
        document.getElementById("progressDot2").classList.remove("active");
        document.getElementById("progressDot3").classList.remove("active");

        updateSignupContinueButton();

    }


    /* signup step 2 */

    function goToSignupStep2() {

        if (signupSelectedLevel === "") {
            return;
        }

        document.getElementById("signupStep1").classList.remove("active");
        document.getElementById("signupStep3").classList.remove("active");
        document.getElementById("signupStep2").classList.add("active");

        document.getElementById("progressDot1").classList.add("active");
        document.getElementById("progressDot2").classList.add("active");
        document.getElementById("progressDot3").classList.remove("active");

        clearMessage("nicknameSignupMessage");

        checkSignupEmailAvailability();
        updatePasswordStrength();

    }


    /* signup step 3 */

    function goToSignupStep3() {

        clearMessage("signupMessage");

        const email =
            normalizeEmail(
                document.getElementById("signupEmail").value
            );

        const password =
            document.getElementById("signupPassword").value;

        const confirmPassword =
            document.getElementById("signupPasswordConfirm").value;


        if (!email || !password || !confirmPassword) {

            showMessage("signupMessage", "Please fill out all fields.", "error");

            return;

        }


        if (password !== confirmPassword) {

            showMessage("signupMessage", "Passwords do not match.", "error");

            return;

        }


        if (password.length < 8) {

            showMessage("signupMessage", "Password must be at least 8 characters.", "error");

            return;

        }


        const accounts = getAccounts();

        if (accounts[email]) {

            showMessage(
                "signupMessage",
                "An account with this email already exists. Please log in.",
                "error"
            );

            return;

        }


        document.getElementById("signupStep2").classList.remove("active");
        document.getElementById("signupStep3").classList.add("active");

        document.getElementById("progressDot3").classList.add("active");

        clearMessage("nicknameSignupMessage");

        document.getElementById("signupNickname").focus();

    }


    /* account storage */


    function getAccounts() {

        try {

            return JSON.parse(
                localStorage.getItem(STREETWISE_ACCOUNTS_KEY)
            ) || {};

        } catch (error) {

            return {};

        }

    }


    function saveAccounts(accounts) {

        localStorage.setItem(
            STREETWISE_ACCOUNTS_KEY,
            JSON.stringify(accounts)
        );

    }


    function normalizeEmail(email) {

        return email.trim().toLowerCase();

    }


    /* live email availability check */

    function checkSignupEmailAvailability() {

        const hint = document.getElementById("signupEmailHint");

        if (!hint) {
            return;
        }

        const rawValue =
            document.getElementById("signupEmail").value.trim();

        if (!rawValue) {

            hint.textContent = "";
            hint.className = "field-hint";

            return;

        }

        const email = normalizeEmail(rawValue);

        const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

        if (!looksLikeEmail) {

            hint.textContent = "";
            hint.className = "field-hint";

            return;

        }

        const accounts = getAccounts();

        if (accounts[email]) {

            hint.textContent = "This email is already registered \u2014 try logging in instead.";
            hint.className = "field-hint field-hint-error";

        } else {

            hint.textContent = "This email is available.";
            hint.className = "field-hint field-hint-success";

        }

    }


    /* live password strength meter */

    function evaluatePasswordStrength(password) {

        if (!password) {
            return { label: "", percent: 0, level: "" };
        }

        if (password.length < 8) {
            return { label: "Too short \u2014 use 8 or more characters", percent: 15, level: "weak" };
        }

        let score = 0;

        if (password.length >= 12) score++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;

        if (score <= 1) {
            return { label: "Weak", percent: 40, level: "weak" };
        }

        if (score === 2) {
            return { label: "Fair", percent: 60, level: "fair" };
        }

        if (score === 3) {
            return { label: "Good", percent: 80, level: "good" };
        }

        return { label: "Strong", percent: 100, level: "strong" };

    }


    function updatePasswordStrength() {

        const password =
            document.getElementById("signupPassword").value;

        const wrap = document.getElementById("passwordStrengthMeter");
        const fill = document.getElementById("passwordStrengthFill");
        const label = document.getElementById("passwordStrengthLabel");

        if (!wrap || !fill || !label) {
            return;
        }

        if (!password) {

            wrap.style.display = "none";

            return;

        }

        wrap.style.display = "block";

        const result = evaluatePasswordStrength(password);

        fill.style.width = result.percent + "%";
        fill.className = "password-strength-fill strength-" + result.level;

        label.textContent = result.label;
        label.className = "password-strength-label strength-" + result.level;

    }


    async function hashPassword(password) {

        const data =
            new TextEncoder().encode(password);

        const hash =
            await crypto.subtle.digest("SHA-256", data);

        return Array.from(
            new Uint8Array(hash)
        )
            .map(function(byte) {

                return byte.toString(16).padStart(2, "0");

            })
            .join("");

    }


    

/* session */

    function setCurrentUser(user) {

        localStorage.setItem(
            STREETWISE_SESSION_KEY,
            JSON.stringify(user)
        );

        updateNavigation();

    }


    function getCurrentUser() {

        try {

            return JSON.parse(
                localStorage.getItem(STREETWISE_SESSION_KEY)
            );

        } catch (error) {

            return null;

        }

    }


    function handleLogoClick() {

        window.location.href = getCurrentUser() ? "dashboard.html" : "index.html";

    }


    function updateNavigation() {

        const currentUser = getCurrentUser();

        const loginButton =
            document.getElementById("loginNavButton");

        const signupButton =
            document.getElementById("signupNavButton");

        const nicknameButton =
            document.getElementById("nicknameNavButton");

        if (!loginButton || !signupButton || !nicknameButton) {
            return;
        }

        if (currentUser) {

            loginButton.style.display = "none";
            signupButton.style.display = "none";
            nicknameButton.style.display = "flex";

            const displayName =
                currentUser.nickname || currentUser.email;

            const label =
                document.getElementById("nicknameLabel");

            if (label) {
                label.textContent = displayName;
            }

        } else {

            loginButton.style.display = "block";
            signupButton.style.display = "block";
            nicknameButton.style.display = "none";

        }

    }


    function logoutUser() {
        localStorage.removeItem(STREETWISE_SESSION_KEY);

        if (typeof applyPreferences === "function" && typeof defaultPreferences === "function") {
            applyPreferences(defaultPreferences());
        }

        if (typeof closePreferences === "function") {
            closePreferences();
        }

        const emailInput = document.getElementById("loginEmail");
        if (emailInput) emailInput.value = "";

        const passInput = document.getElementById("loginPassword");
        if (passInput) passInput.value = "";

        if (typeof clearMessage === "function") {
            clearMessage("loginMessage");
        }

        if (typeof showPage === "function" && document.getElementById("homePage")) {
            showPage("homePage");
            if (typeof updateNavigation === "function") updateNavigation();
        } else {
            window.location.href = "index.html";
        }
    }


    /* finish signup */

    async function finishSignup() {

        clearMessage("nicknameSignupMessage");

        const nickname =
            document.getElementById("signupNickname").value.trim();

        if (!nickname) {

            showMessage("nicknameSignupMessage", "Please choose a nickname.", "error");

            return;

        }

        if (nickname.length > 20) {

            showMessage(
                "nicknameSignupMessage",
                "Nickname must be 20 characters or fewer.",
                "error"
            );

            return;

        }

        if (!signupSelectedLevel) {

            showMessage(
                "nicknameSignupMessage",
                "Please choose your IT experience level.",
                "error"
            );

            return;

        }


        const email =
            normalizeEmail(
                document.getElementById("signupEmail").value
            );

        const password =
            document.getElementById("signupPassword").value;

        const confirmPassword =
            document.getElementById("signupPasswordConfirm").value;


        if (!email || !password || password !== confirmPassword || password.length < 8) {

            showMessage(
                "nicknameSignupMessage",
                "Something about your account details changed. Please check them again.",
                "error"
            );

            goToSignupStep2();

            return;

        }


        const accounts = getAccounts();

        if (accounts[email]) {

            showMessage(
                "nicknameSignupMessage",
                "An account with this email already exists. Please log in.",
                "error"
            );

            return;

        }


        const passwordHash =
            await hashPassword(password);


        accounts[email] = {

            email: email,
            passwordHash: passwordHash,
            level: signupSelectedLevel,
            nickname: nickname,
            createdAt: new Date().toISOString()

        };


        saveAccounts(accounts);

        saveUserPreferences(email, defaultPreferences());
        saveUserProgress(email, defaultProgress());

        setCurrentUser({

            email: email,
            level: signupSelectedLevel,
            nickname: nickname

        });

        applyPreferences(defaultPreferences());

        showMessage(
            "nicknameSignupMessage",
            "Account created! Redirecting you to your dashboard...",
            "success"
        );

        setTimeout(function() {

            window.location.href = "dashboard.html";

        }, 900);

    }


    /* login */

    async function handleLogin(event) {

        event.preventDefault();

        clearMessage("loginMessage");

        const email =
            normalizeEmail(
                document.getElementById("loginEmail").value
            );

        const password =
            document.getElementById("loginPassword").value;


        if (!email || !password) {

            showMessage("loginMessage", "Please enter your email and password.", "error");

            return;

        }


        const accounts = getAccounts();

        const account = accounts[email];


        if (!account) {

            showMessage("loginMessage", "No account was found with that email.", "error");

            return;

        }


        const passwordHash =
            await hashPassword(password);


        if (passwordHash !== account.passwordHash) {

            showMessage("loginMessage", "Incorrect password. Please try again.", "error");

            return;

        }


        const user = {

            email: account.email,
            level: account.level,
            nickname: account.nickname || account.email.split("@")[0]

        };


        setCurrentUser(user);

        applyPreferences(getUserPreferences(user.email));

        showMessage("loginMessage", "Welcome back! Redirecting you to your dashboard...", "success");

        setTimeout(function() {

            window.location.href = "dashboard.html";

        }, 800);

    }


    /* google login */

    function loginWithGoogle() {

        showMessage(
            "loginMessage",
            "Google login needs a real Google OAuth provider and can't be completed by a standalone HTML file. Use email and password below instead.",
            "info"
        );

    }


    /* google signup */

    function signupWithGoogle() {

        showMessage(
            "signupMessage",
            "Google signup needs a real Google OAuth provider. Use the email and password fields below to create a working account now.",
            "info"
        );

    }


    /* forgot password */

    function forgotPassword(event) {

        event.preventDefault();

        clearMessage("loginMessage");

        const email =
            normalizeEmail(
                document.getElementById("loginEmail").value
            );

        if (!email) {

            showMessage(
                "loginMessage",
                "Enter your email first, then click Forgot password.",
                "error"
            );

            return;

        }


        const accounts = getAccounts();

        if (!accounts[email]) {

            showMessage("loginMessage", "No account was found with that email.", "error");

            return;

        }


        showMessage(
            "loginMessage",
            "This demo stores accounts only in this browser. Password recovery requires a real email and authentication server.",
            "info"
        );

    }


    
