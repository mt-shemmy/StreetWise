/* ==========================================================================
   Streetwise Landing Page UI & Terminal Animation
   ========================================================================== */

/* Interactive Terminal Typing Animation */
function runTypingAnimation(containerId) {
    const term = document.getElementById(containerId);
    if (!term || term.dataset.typing === "true") return;

    // Lock the terminal so clicks don't interrupt the typing
    term.dataset.typing = "true";
    term.innerHTML = '<span class="cmd">admin@streetwise:~$</span> <span class="type-target"></span><span class="cursor-blink"></span>';

    const target = term.querySelector(".type-target");
    const command = "deploy_lab --env=secure --start";
    let i = 0;

    function typeWriter() {
        if (i < command.length) {
            target.innerHTML += command.charAt(i);
            i++;
            // Randomize typing speed slightly for human realism
            setTimeout(typeWriter, 30 + Math.random() * 50); 
        } else {
            setTimeout(showResults, 400);
        }
    }

    function showResults() {
        term.innerHTML = `
            <span class="cmd">admin@streetwise:~$</span> ${command}<br>
            <span class="success">[OK]</span> Authenticating user session...<br>
            <span class="success">[OK]</span> Provisioning network...<br>
            <span class="output">Target environment is ready for access.</span><br>
            <span class="cmd">admin@streetwise:~$</span> <span class="cursor-blink"></span>
        `;
        term.dataset.typing = "false";
    }

    typeWriter();
}

// Auto-run the animation when the user clicks Login or Signup in the nav bar
const loginNavBtn = document.getElementById("loginNavButton");
if (loginNavBtn) {
    loginNavBtn.addEventListener("click", () => runTypingAnimation('term-login'));
}

const signupNavBtn = document.getElementById("signupNavButton");
if (signupNavBtn) {
    signupNavBtn.addEventListener("click", () => runTypingAnimation('term-signup'));
}

/* page navigation */
function showPage(pageId) {
    const pages = document.querySelectorAll(".page");
    pages.forEach(function(page) {
        page.classList.remove("active");
    });

    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add("active");
    }

    window.scrollTo(0, 0);
}

// Initialize navigation and preferences on landing page
document.addEventListener("DOMContentLoaded", function() {
    if (typeof updateNavigation === "function") updateNavigation();
    if (typeof loadPreferencesForCurrentUser === "function") loadPreferencesForCurrentUser();
});
