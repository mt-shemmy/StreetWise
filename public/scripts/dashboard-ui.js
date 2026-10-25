/* ==========================================================================
   Streetwise Dashboard UI, Progression Engine, and Interactive Workshop
   ========================================================================== */

/* PROGRESS */

function defaultProgress(){
    return {
        xp:0,
        lessonsCompleted:0,
        completedLessons:{},
        lastLessonId:null,
        badges:[],
        quizCount:0,
        perfectQuizzes:0,
        testCount:0,
        dailyXP:0,
        dailyXPDate:null,
        dailyGoalDates:{},
        dailyGoalsCompleted:0,
        buddy:"fox",
        streak:{
            current:0,
            longest:0,
            lastActiveDate:null
        }
    };
}

function getProgressStore(){
    try{
        return JSON.parse(
            localStorage.getItem(
                STREETWISE_PROGRESS_KEY
            )
        ) || {};
    }catch(error){
        return {};
    }
}

function saveProgressStore(store){
    localStorage.setItem(
        STREETWISE_PROGRESS_KEY,
        JSON.stringify(store)
    );
}

function getUserProgress(email){

    const stored =
        getProgressStore()[email] || {};

    const base = defaultProgress();

    return Object.assign(
        base,
        stored,
        {
            streak:Object.assign(
                base.streak,
                stored.streak || {}
            ),

            completedLessons:
                stored.completedLessons || {},

            badges:
                Array.isArray(stored.badges)
                    ? stored.badges
                    : [],

            dailyGoalDates:
                stored.dailyGoalDates || {}
        }
    );
}

function saveUserProgress(email,progress){

    const store = getProgressStore();

    store[email] = progress;

    saveProgressStore(store);
}


/* DATES + STREAK */

function getTodayDateString(){

    const now = new Date();

    return (
        now.getFullYear() +
        "-" +
        String(
            now.getMonth() + 1
        ).padStart(2,"0") +
        "-" +
        String(
            now.getDate()
        ).padStart(2,"0")
    );
}

function daysBetweenDateStrings(a,b){

    return Math.round(
        (
            new Date(
                b +
                "T00:00:00"
            ) -
            new Date(
                a +
                "T00:00:00"
            )
        ) / 86400000
    );
}

function getDisplayStreak(progress){

    if(
        !progress.streak.lastActiveDate
    ){
        return 0;
    }

    return daysBetweenDateStrings(
        progress.streak.lastActiveDate,
        getTodayDateString()
    ) > 1
        ? 0
        : progress.streak.current;
}

function recordDailyActivity(progress){

    const today =
        getTodayDateString();

    const last =
        progress.streak.lastActiveDate;

    if(last === today){
        return;
    }

    if(
        last &&
        daysBetweenDateStrings(
            last,
            today
        ) === 1
    ){
        progress.streak.current++;
    }else{
        progress.streak.current = 1;
    }

    progress.streak.lastActiveDate =
        today;

    progress.streak.longest =
        Math.max(
            progress.streak.longest,
            progress.streak.current
        );
}


/* XP */

function calculateVideoXP(seconds){

    return Math.max(
        1,
        Math.ceil(
            seconds / 30
        ) * 5
    );
}

function calculateReadingXP(wordCount){

    return Math.max(
        5,
        Math.ceil(
            wordCount / 50
        )
    );
}

function calculateQuizXP(
    questionCount,
    correctAnswers
){

    const correct =
        Math.max(
            0,
            Math.min(
                questionCount,
                correctAnswers
            )
        );

    return 20 + correct;
}

function calculateTestXP(
    questionCount,
    correctAnswers
){

    const correct =
        Math.max(
            0,
            Math.min(
                questionCount,
                correctAnswers
            )
        );

    return 50 + (
        correct * 2
    );
}

function getUserLevel(xp){

    return Math.floor(
        xp / 100
    ) + 1;
}

function getLevelProgress(xp){

    return xp % 100;
}


/* BUDDIES */

const BUDDIES = window.StreetwiseBuddies.definitions;

function getBuddyStage(xp){
    return window.StreetwiseBuddies.stageFor(xp);
}

function getBuddyStageName(stage){

    if(stage === "adult"){
        return "Adult";
    }

    if(stage === "teen"){
        return "Teen";
    }

    return "Baby";
}

function getBuddyProgress(xp){
    return window.StreetwiseBuddies.progressFor(xp);
}


/* BADGES */

// Fixed vector artwork keeps milestones consistent across platforms.
const BADGE_ICON_PATHS = {
  "account": "<rect x=\"4\" y=\"3\" width=\"16\" height=\"18\" rx=\"3\"/><circle cx=\"12\" cy=\"9\" r=\"2.5\"/><path d=\"M8 17c0-4 8-4 8 0\"/>",
  "book": "<path d=\"M12 5v15M3 4c3-1 6-1 9 1 3-2 6-2 9-1v15c-3-1-6-1-9 1-3-2-6-2-9-1Z\"/>",
  "award": "<circle cx=\"12\" cy=\"9\" r=\"6\"/><path d=\"m8 14-1 7 5-3 5 3-1-7M10 9l1.4 1.4L14 8\"/>",
  "xp": "<path d=\"m13 2-9 12h7l-1 8 10-13h-8Z\"/>",
  "calendar": "<rect x=\"3\" y=\"5\" width=\"18\" height=\"16\" rx=\"3\"/><path d=\"M7 3v4M17 3v4M3 11h18m-13 5 2 2 4-4\"/>",
  "assessment": "<rect x=\"5\" y=\"4\" width=\"14\" height=\"17\" rx=\"2\"/><rect x=\"9\" y=\"2\" width=\"6\" height=\"4\" rx=\"1\"/><path d=\"m8 13 3 3 5-6\"/>",
  "target": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><circle cx=\"12\" cy=\"12\" r=\"5\"/><circle cx=\"12\" cy=\"12\" r=\"1\"/>",
  "growth": "<path d=\"M4 20h16M6 16v-4m6 4V8m6 8V4M4 9l6-5 4 2 6-4\"/>",
  "buddy": "<circle cx=\"9\" cy=\"8\" r=\"3\"/><path d=\"M3 21v-3a6 6 0 0 1 12 0v3m1-16a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v2\"/>"
};
function renderBadgeIcon(name) {
    const paths = BADGE_ICON_PATHS[name];
    return paths ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + '</svg>' : '';
}

const BADGE_DEFINITIONS = [

    {
        id:"account-created",
        icon:"account",
        name:"Welcome to Streetwise",
        description:"Create your Streetwise account.",
        check:()=>true
    },

    {
        id:"first-lesson",
        icon:"book",
        name:"First Steps",
        description:"Complete your first lesson.",
        check:p=>p.lessonsCompleted >= 1
    },

    {
        id:"five-lessons",
        icon:"book",
        name:"Getting Started",
        description:"Complete 5 lessons.",
        check:p=>p.lessonsCompleted >= 5
    },

    {
        id:"ten-lessons",
        icon:"book",
        name:"Dedicated Learner",
        description:"Complete 10 lessons.",
        check:p=>p.lessonsCompleted >= 10
    },

    {
        id:"twenty-five-lessons",
        icon:"book",
        name:"Knowledge Builder",
        description:"Complete 25 lessons.",
        check:p=>p.lessonsCompleted >= 25
    },

    {
        id:"fifty-lessons",
        icon:"award",
        name:"IT Regular",
        description:"Complete 50 lessons.",
        check:p=>p.lessonsCompleted >= 50
    },

    {
        id:"hundred-xp",
        icon:"xp",
        name:"100 XP",
        description:"Earn 100 XP.",
        check:p=>p.xp >= 100
    },

    {
        id:"five-hundred-xp",
        icon:"xp",
        name:"500 XP",
        description:"Earn 500 XP.",
        check:p=>p.xp >= 500
    },

    {
        id:"thousand-xp",
        icon:"xp",
        name:"1,000 XP",
        description:"Earn 1,000 XP.",
        check:p=>p.xp >= 1000
    },

    {
        id:"three-day-streak",
        icon:"calendar",
        name:"Three-Day Streak",
        description:"Learn for 3 days in a row.",
        check:p=>p.streak.current >= 3
    },

    {
        id:"seven-day-streak",
        icon:"calendar",
        name:"Week Strong",
        description:"Learn for 7 days in a row.",
        check:p=>p.streak.current >= 7
    },

    {
        id:"fourteen-day-streak",
        icon:"calendar",
        name:"Two Weeks Strong",
        description:"Maintain a 14-day learning streak.",
        check:p=>p.streak.current >= 14
    },

    {
        id:"thirty-day-streak",
        icon:"calendar",
        name:"Monthly Momentum",
        description:"Maintain a 30-day learning streak.",
        check:p=>p.streak.current >= 30
    },

    {
        id:"ten-day-streak",
        icon:"calendar",
        name:"Streak Builder",
        description:"Reach a 10-day learning streak.",
        check:p=>p.streak.longest >= 10
    },

    {
        id:"quiz-ace",
        icon:"assessment",
        name:"Quiz Ace",
        description:"Complete 5 quizzes.",
        check:p=>(p.quizCount || 0) >= 5
    },

    {
        id:"perfect-quiz",
        icon:"target",
        name:"Perfect Score",
        description:"Get every question correct on a quiz.",
        check:p=>(p.perfectQuizzes || 0) >= 1
    },

    {
        id:"five-perfect-quizzes",
        icon:"target",
        name:"Quiz Master",
        description:"Get a perfect score on 5 quizzes.",
        check:p=>(p.perfectQuizzes || 0) >= 5
    },

    {
        id:"first-test",
        icon:"assessment",
        name:"Test Ready",
        description:"Complete your first test.",
        check:p=>(p.testCount || 0) >= 1
    },

    {
        id:"five-tests",
        icon:"assessment",
        name:"Assessment Pro",
        description:"Complete 5 tests.",
        check:p=>(p.testCount || 0) >= 5
    },

    {
        id:"daily-goals-five",
        icon:"calendar",
        name:"Daily Learner",
        description:"Complete your 30 XP goal 5 times.",
        check:p=>(p.dailyGoalsCompleted || 0) >= 5
    },

    {
        id:"level-five",
        icon:"growth",
        name:"Level 5",
        description:"Reach Streetwise Level 5.",
        check:p=>getUserLevel(p.xp) >= 5
    },

    {
        id:"level-ten",
        icon:"growth",
        name:"Level 10",
        description:"Reach Streetwise Level 10.",
        check:p=>getUserLevel(p.xp) >= 10
    },

    {
        id:"buddy-teen",
        icon:"buddy",
        name:"Growing Together",
        description:"Help your buddy reach the Teen stage.",
        check:p=>p.xp >= window.StreetwiseBuddies.thresholds.teen
    },

    {
        id:"buddy-adult",
        icon:"buddy",
        name:"Fully Grown",
        description:"Help your buddy reach the Adult stage.",
        check:p=>p.xp >= window.StreetwiseBuddies.thresholds.adult
    }

];

function checkAndAwardBadges(progress){

    const newBadges = [];

    BADGE_DEFINITIONS.forEach(
        badge=>{

            if(
                !progress.badges.includes(
                    badge.id
                ) &&
                badge.check(progress)
            ){

                progress.badges.push(
                    badge.id
                );

                newBadges.push(
                    badge
                );
            }

        }
    );

    return newBadges;
}


/* ICONS */

const ICONS = {

    lock:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',

    alertTriangle:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17.5v.01"/></svg>',

    globe:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.8 5.7 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.7-3.8-9s1.3-6.5 3.8-9z"/></svg>',

    monitor:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>',

    eye:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>',

    wifi:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 9c5.5-5 14.5-5 20 0M5.5 13c3.7-3.2 9.3-3.2 13 0M9 17c1.8-1.5 4.2-1.5 6 0M12 20.5v.01"/></svg>',

    share:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="6" cy="12" r="2.3"/><circle cx="17" cy="5.5" r="2.3"/><circle cx="17" cy="18.5" r="2.3"/><path d="M8.1 10.8L15 6.7M8.1 13.2L15 17.3"/></svg>',

    folder:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',

    cloud:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 18h10a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.7-1.6A4 4 0 0 0 7 18z"/></svg>',

    wrench:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.1L3 18l3 3 6.6-6.3a4 4 0 0 0 5.1-5.4l-2.8 2.8-2.6-.6-.6-2.6z"/></svg>',

    hardDrive:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 13h18"/><circle cx="8" cy="17" r="1"/><circle cx="12" cy="17" r="1"/></svg>',

    terminal:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3.5 3L7 15M13 15h4"/></svg>',

    shield:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/></svg>',

    server:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="6" rx="1.5"/><rect x="3" y="14" width="18" height="6" rx="1.5"/><path d="M7 7h.01M7 17h.01"/></svg>',

    box:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4.5 7.5L12 12l7.5-4.5M12 12v9"/></svg>',

    settings:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M4.2 7.2l1.8 1.8M18 15l1.8 1.8M3 12h2.5M18.5 12H21M4.2 16.8L6 15M18 9l1.8-1.8"/></svg>',

    shieldCheck:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/></svg>',

    rocket:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2c3 1 5 4.5 5 8.5 0 2-.5 3.7-1.3 5.2L12 18l-3.7-2.3C7.5 14.2 7 12.5 7 10.5 7 6.5 9 3 12 2z"/><circle cx="12" cy="9.5" r="1.6"/></svg>'

};


/* COURSES */

const LEVEL_TOPICS = {"Beginner":[{"id": "password-security", "title": "Password & Account Security", "description": "Spot scams, protect your passwords, and keep a way to recover your accounts.", "lessons": 6, "icon":ICONS.lock},{"id": "computer-basics", "title": "Understanding Your Computer", "description": "Learn how hardware, apps, files, storage, backups, and connected devices work.", "lessons": 6, "icon":ICONS.monitor}],"Intermediate":[{"id": "networking", "title": "Networking Fundamentals", "description": "Work through IP addresses, subnets, DNS, protocols, and network troubleshooting.", "lessons": 8, "icon":ICONS.share},{"id": "command-line", "title": "Intro to the Command Line", "description": "Read commands, navigate folders, inspect files and processes, and test network problems.", "lessons": 8, "icon":ICONS.terminal}],"Advanced":[{"id": "network-security", "title": "Network Security & Firewalls", "description": "Analyze packet flows, firewall rules, segmentation, VPNs, monitoring, and incident response.", "lessons": 8, "icon":ICONS.shield},{"id": "cybersecurity", "title": "Cybersecurity Fundamentals", "description": "Study risk, threat models, identity, cryptography, application security, data protection, and recovery.", "lessons": 8, "icon":ICONS.shieldCheck}]};

let currentLevel = "Beginner";
let currentSearch = "";


/* COURSE PROGRESS */

function getTopicProgress(
    progress,
    topic
){

    const course = STREETWISE_COURSES[topic.id];
    if(course) return course.lessons.filter(lesson => progress.completedLessons[lesson.id]).length;
    return Object.values(progress.completedLessons || {}).filter(record => record.topicId === topic.id && record.type !== "test").length;
}


function renderCourseGrid(){

    const grid =
        document.getElementById(
            "courseGrid"
        );

    grid.innerHTML = "";

    const user =
        getCurrentUser();

    const progress =
        user
            ? getUserProgress(
                user.email
            )
            : defaultProgress();

    const topics =
        (
            LEVEL_TOPICS[
                currentLevel
            ] || []
        ).filter(topic =>
            topic.title
                .toLowerCase()
                .includes(
                    currentSearch
                )
        );

    if(!topics.length){

        const empty =
            document.createElement(
                "div"
            );

        empty.className =
            "empty-state no-results";

        empty.innerHTML =
            "<strong>No topics found</strong>Try a different search term.";

        grid.appendChild(empty);

        return;
    }

    topics.forEach(topic=>{

        const completed =
            Math.min(
                topic.lessons,
                getTopicProgress(
                    progress,
                    topic
                )
            );

        const percent =
            topic.lessons
                ? (
                    completed /
                    topic.lessons
                ) * 100
                : 0;

        const card =
            document.createElement(
                "button"
            );

        card.type = "button";
        card.className = "course-card";
        card.dataset.complete = String(completed >= topic.lessons);
       
        card.onclick = () => {
            // Route EVERY click into the Streetwise lesson viewer first
            if (STREETWISE_COURSES[topic.id]) {
                openCourse(topic.id);
            } else {
                showComingSoonToast(topic.title);
            }
        };



        const top =
            document.createElement(
                "div"
            );

        top.className =
            "course-card-top";

        const icon =
            document.createElement(
                "div"
            );

        icon.className =
            "course-icon";

        icon.innerHTML =
            topic.icon;

        const badge =
            document.createElement(
                "div"
            );

        badge.className =
            "course-badge";

        badge.textContent =
            completed > 0
                ? completed >= topic.lessons
                    ? "Complete"
                    : "In progress"
                : "Available";

        top.appendChild(icon);
        top.appendChild(badge);

        const body =
            document.createElement(
                "div"
            );

        body.className =
            "course-card-body";

        const title =
            document.createElement(
                "h3"
            );

        title.textContent =
            topic.title;

        const description =
            document.createElement(
                "p"
            );

        description.className =
            "course-description";

        description.textContent =
            topic.description;

        body.appendChild(title);
        body.appendChild(description);

        const progressTrack =
            document.createElement(
                "div"
            );

        progressTrack.className =
            "course-progress-track";

        const fill =
            document.createElement(
                "div"
            );

        fill.className =
            "course-progress-fill";

        fill.style.width =
            percent + "%";

        progressTrack.appendChild(fill);

        const meta =
            document.createElement(
                "div"
            );

        meta.className =
            "course-meta";

        const left =
            document.createElement(
                "span"
            );

        left.textContent =
            completed +
            " / " +
            topic.lessons +
            " lessons";

        const right =
            document.createElement(
                "span"
            );

        right.textContent =
            completed === 0
                ? "Not started"
                : completed >= topic.lessons
                    ? "Complete"
                    : "In progress";

        meta.appendChild(left);
        meta.appendChild(right);

        card.appendChild(top);
        card.appendChild(body);
        card.appendChild(progressTrack);
        card.appendChild(meta);

        grid.appendChild(card);

    });
}


/* LESSON COMPLETION */

function completeLesson(
    lessonId,
    topicTitle,
    xpAmount,
    activityType="lesson",
    topicId=null
){

    const user =
        getCurrentUser();

    if(!user){
        return null;
    }

    const progress =
        getUserProgress(
            user.email
        );

    if(
        progress.completedLessons[
            lessonId
        ]
    ){

        showToast(
            "You already completed this lesson."
        );

        return {
            alreadyCompleted:true,
            progress:progress,
            newBadges:[]
        };
    }

    const safeXP =
        Math.max(
            0,
            Math.round(
                Number(
                    xpAmount
                ) || 0
            )
        );

    const oldXP =
        progress.xp;

    const oldLevel =
        getUserLevel(
            oldXP
        );

    const oldStage =
        getBuddyStage(
            oldXP
        );

    progress.completedLessons[
        lessonId
    ] = {

        title:topicTitle,
        type:activityType,
        topicId:topicId,
        xp:safeXP,
        completedAt:
            new Date().toISOString()

    };

    progress.lastLessonId =
        lessonId;

    if(activityType !== "test") progress.lessonsCompleted++;

    progress.xp += safeXP;

    recordDailyActivity(
        progress
    );

    const today =
        getTodayDateString();

    if(
        progress.dailyXPDate !== today
    ){

        progress.dailyXPDate =
            today;

        progress.dailyXP = 0;

    }

    const wasGoalComplete =
        progress.dailyXP >= 30;

    progress.dailyXP +=
        safeXP;

    if(
        !wasGoalComplete &&
        progress.dailyXP >= 30 &&
        !progress.dailyGoalDates[
            today
        ]
    ){

        progress.dailyGoalDates[
            today
        ] = true;

        progress.dailyGoalsCompleted =
            (
                progress.dailyGoalsCompleted ||
                0
            ) + 1;

    }

    const newBadges =
        checkAndAwardBadges(
            progress
        );

    const newLevel =
        getUserLevel(
            progress.xp
        );

    const newStage =
        getBuddyStage(
            progress.xp
        );

    saveUserProgress(
        user.email,
        progress
    );

    renderDashboard(
        progress
    );

    renderCourseGrid();

    if(
        newLevel > oldLevel
    ){

        setTimeout(
            ()=>{

                showAchievement(
                    "Level up",
                    "⬆️",
                    "Level " +
                    newLevel,
                    "You reached a new Streetwise level."
                );

            },
            200
        );
    }

    newBadges.forEach(
        (
            badge,
            index
        )=>{

            setTimeout(
                ()=>{

                    showAchievement(
                        "Badge earned",
                        badge.icon,
                        badge.name,
                        badge.description
                    );

                },
                (
                    index + 1
                ) * 3000
            );

        }
    );

    if(
        newStage !== oldStage
    ){

        const buddy =
            BUDDIES[
                progress.buddy
            ] || BUDDIES.fox;

        setTimeout(
            ()=>{

                showAchievement(
                    "Your buddy evolved",
                    "buddy:" + (progress.buddy || "fox") + ":" + newStage,
                    buddy.name +
                    " is now " +
                    getBuddyStageName(
                        newStage
                    ),
                    "Keep earning XP to keep growing together."
                );

            },
            (
                newBadges.length + 1
            ) * 3000
        );
    }

    return {
        alreadyCompleted:false,
        progress:progress,
        newBadges:newBadges,
        xpEarned:safeXP
    };
}


/* FUTURE LESSON HELPERS */

function completeVideoLesson(
    lessonId,
    title,
    seconds,
    topicId
){

    return completeLesson(
        lessonId,
        title,
        calculateVideoXP(
            seconds
        ),
        "video",
        topicId
    );
}

function completeReadingLesson(
    lessonId,
    title,
    wordCount,
    topicId
){

    return completeLesson(
        lessonId,
        title,
        calculateReadingXP(
            wordCount
        ),
        "reading",
        topicId
    );
}

function completeQuiz(
    lessonId,
    title,
    questionCount,
    correctAnswers,
    topicId
){

    const user =
        getCurrentUser();

    if(!user){
        return null;
    }

    const progress =
        getUserProgress(
            user.email
        );

    if(
        progress.completedLessons[
            lessonId
        ]
    ){

        showToast(
            "You already completed this quiz."
        );

        return {
            alreadyCompleted:true,
            progress:progress,
            newBadges:[]
        };
    }

    progress.quizCount++;

    if(
        correctAnswers ===
        questionCount
    ){

        progress.perfectQuizzes++;

    }

    saveUserProgress(
        user.email,
        progress
    );

    return completeLesson(
        lessonId,
        title,
        calculateQuizXP(
            questionCount,
            correctAnswers
        ),
        "quiz",
        topicId
    );
}

function completeTest(
    lessonId,
    title,
    questionCount,
    correctAnswers,
    topicId
){

    const user =
        getCurrentUser();

    if(!user){
        return null;
    }

    const progress =
        getUserProgress(
            user.email
        );

    if(
        progress.completedLessons[
            lessonId
        ]
    ){

        showToast(
            "You already completed this test."
        );

        return {
            alreadyCompleted:true,
            progress:progress,
            newBadges:[]
        };
    }

    progress.testCount++;

    saveUserProgress(
        user.email,
        progress
    );

    return completeLesson(
        lessonId,
        title,
        calculateTestXP(
            questionCount,
            correctAnswers
        ),
        "test",
        topicId
    );
}


/* BADGES */

function renderBadges(
    progress
){

    const grid =
        document.getElementById(
            "badgesGrid"
        );

    const count =
        document.getElementById(
            "badgesModalCount"
        );

    grid.innerHTML = "";

    BADGE_DEFINITIONS.forEach(
        badge=>{

            const earned =
                progress.badges.includes(
                    badge.id
                );

            const card =
                document.createElement(
                    "div"
                );

            card.className =
                "badge-card" +
                (
                    earned
                        ? ""
                        : " locked"
                );

            const icon =
                document.createElement(
                    "div"
                );

            icon.className =
                "badge-icon";

            icon.innerHTML = renderBadgeIcon(badge.icon);
            icon.setAttribute("aria-hidden", "true");

            const title =
                document.createElement(
                    "h3"
                );

            title.textContent =
                badge.name;

            const description =
                document.createElement(
                    "p"
                );

            description.textContent =
                badge.description;

            card.appendChild(icon);
            card.appendChild(title);
            card.appendChild(description);

            const status = document.createElement("span");
            status.className = "badge-status" + (earned ? " badge-earned" : "");
            status.textContent = earned ? "Earned" : "Not earned";
            card.appendChild(status);

            grid.appendChild(card);

        }
    );

    count.textContent =
        progress.badges.length +
        " / " +
        BADGE_DEFINITIONS.length +
        " earned";
}

function openBadges(){

    const user =
        getCurrentUser();

    if(!user){
        return;
    }

    renderBadges(
        getUserProgress(
            user.email
        )
    );

    document
        .getElementById(
            "badgesOverlay"
        )
        .classList.add(
            "active"
        );
}

function closeBadges(){

    document
        .getElementById(
            "badgesOverlay"
        )
        .classList.remove(
            "active"
        );
}

function closeBadgesOnBackdrop(
    event
){

    if(
        event.target.id ===
        "badgesOverlay"
    ){

        closeBadges();

    }
}


/* BUDDIES */

function renderBuddy(progress){
    const id = Object.hasOwn(BUDDIES, progress.buddy) ? progress.buddy : 'fox';
    const stage = getBuddyStage(progress.xp);
    const info = getBuddyProgress(progress.xp);
    const display = document.getElementById('buddyDisplay');
    display.innerHTML = window.StreetwiseBuddies.avatar(id, stage);
    display.setAttribute('role', 'img');
    display.setAttribute('aria-label', getBuddyStageName(stage) + ' ' + BUDDIES[id].name);
    document.getElementById('buddyName').textContent = BUDDIES[id].name;
    document.getElementById('buddyStage').textContent = getBuddyStageName(stage);
    const track = document.getElementById('buddyProgressTrack');
    const percent = Math.min(100, info.current / info.needed * 100);
    document.getElementById('buddyProgressFill').style.width = percent + '%';
    track.setAttribute('aria-valuenow', Math.round(percent));
    track.setAttribute('aria-valuetext', stage === 'adult' ? 'Fully grown' : info.remaining + ' XP to ' + info.nextStage);
    document.getElementById('buddyProgressText').textContent = stage === 'adult' ? 'Fully grown. Keep learning together.' : info.remaining + ' XP to ' + info.nextStage;
    document.getElementById('buddyGrowthPath').innerHTML = ['baby', 'teen', 'adult'].map((s, i) => {
        const reached = ['baby', 'teen', 'adult'].indexOf(stage) >= i;
        const label = i === 0 ? 'Baby' : i === 1 ? 'Teen' : 'Adult';
        const xp = i === 0 ? 0 : i === 1 ? window.StreetwiseBuddies.thresholds.teen : window.StreetwiseBuddies.thresholds.adult;
        return '<li class="' + (reached ? 'reached' : '') + '"' + (s === stage ? ' aria-current="step"' : '') + '><span>' + label + '</span><small>' + xp + ' XP</small></li>';
    }).join('');
}

function continueBuddyLearning(){
    const user = getCurrentUser();
    if(!user) return;
    const progress = getUserProgress(user.email);
    const saved = progress.learningState && progress.learningState.current;
    const ids = Object.keys(STREETWISE_COURSES);
    const preferred = ids.filter(id => STREETWISE_COURSES[id].level === user.level);
    const ordered = [...new Set([saved && saved.courseId, ...preferred, ...ids])].filter(id => STREETWISE_COURSES[id]);
    for(const id of ordered){
        const course = STREETWISE_COURSES[id];
        const next = course.lessons.find(lesson => !progress.completedLessons[lesson.id]);
        if(next){ openCourse(id, next.id); return; }
    }
    openPractice('home');
}

function renderBuddyOptions(){

    const user =
        getCurrentUser();

    if(!user){
        return;
    }

    const progress =
        getUserProgress(
            user.email
        );

    const container =
        document.getElementById(
            "buddyOptions"
        );

    container.innerHTML = "";

    Object.keys(
        BUDDIES
    ).forEach(
        id=>{

            const buddy =
                BUDDIES[id];

            const button =
                document.createElement(
                    "button"
                );

            button.type =
                "button";

            button.className =
                "buddy-option" +
                (
                    progress.buddy === id
                        ? " selected"
                        : ""
                );

            button.onclick =
                ()=>chooseBuddy(id);

            const emoji =
                document.createElement(
                    "div"
                );

            emoji.className =
                "buddy-option-emoji";

            emoji.innerHTML = window.StreetwiseBuddies.avatar(id, getBuddyStage(progress.xp));
            emoji.setAttribute("aria-hidden", "true");
            button.setAttribute("aria-pressed", String(progress.buddy === id));

            const name =
                document.createElement(
                    "p"
                );

            name.className =
                "buddy-option-name";

            name.textContent =
                buddy.name;

            const description =
                document.createElement(
                    "p"
                );

            description.className =
                "buddy-option-desc";

            description.textContent =
                buddy.description;

            button.appendChild(
                emoji
            );

            button.appendChild(
                name
            );

            button.appendChild(
                description
            );

            const state = document.createElement('span');
            state.className = 'buddy-option-state';
            state.textContent = progress.buddy === id ? 'Selected' : 'Choose buddy';
            button.appendChild(state);
            container.appendChild(button);

        }
    );
}

function openBuddySelection(){

    renderBuddyOptions();

    document
        .getElementById(
            "buddyOverlay"
        )
        .classList.add(
            "active"
        );
}

function closeBuddySelection(){

    document
        .getElementById(
            "buddyOverlay"
        )
        .classList.remove(
            "active"
        );
}

function closeBuddySelectionOnBackdrop(
    event
){

    if(
        event.target.id ===
        "buddyOverlay"
    ){

        closeBuddySelection();

    }
}

function chooseBuddy(id){

    const user =
        getCurrentUser();

    if(
        !user ||
        !BUDDIES[id]
    ){

        return;

    }

    const progress =
        getUserProgress(
            user.email
        );

    progress.buddy =
        id;

    saveUserProgress(
        user.email,
        progress
    );

    renderDashboard(
        progress
    );

    renderBuddyOptions();

    showToast(
        BUDDIES[id].name +
        " is now your buddy."
    );
}


/* ACCOUNT BADGE */

function initializeNewAccountProgress(
    email
){

    const progress =
        getUserProgress(
            email
        );

    if(
        !progress.badges.includes(
            "account-created"
        )
    ){

        progress.badges.push(
            "account-created"
        );

    }

    saveUserProgress(
        email,
        progress
    );
}

function ensureAccountBadge(){

    const user =
        getCurrentUser();

    if(!user){
        return;
    }

    const progress =
        getUserProgress(
            user.email
        );

    if(
        !progress.badges.includes(
            "account-created"
        )
    ){

        progress.badges.push(
            "account-created"
        );

        saveUserProgress(
            user.email,
            progress
        );

        setTimeout(
            ()=>{

                showAchievement(
                    "Badge earned",
                    "account",
                    "Welcome to Streetwise",
                    "You created your Streetwise account."
                );

            },
            600
        );
    }
}


/* RENDER */

function renderStats(
    progress
){

    const streak =
        getDisplayStreak(
            progress
        );

    document.getElementById(
        "statStreakValue"
    ).textContent =
        streak +
        (
            streak === 1
                ? " day"
                : " days"
        );

    document.getElementById(
        "statLessonsValue"
    ).textContent =
        progress.lessonsCompleted;

    document.getElementById(
        "statBadgesValue"
    ).textContent =
        progress.badges.length;
}

function renderXP(
    progress
){

    const level =
        getUserLevel(
            progress.xp
        );

    const progressInLevel =
        getLevelProgress(
            progress.xp
        );

    document.getElementById(
        "xpNumber"
    ).textContent =
        progress.xp +
        " XP";

    document.getElementById(
        "levelNumber"
    ).textContent =
        level;

    document.getElementById(
        "xpFill"
    ).style.width =
        progressInLevel +
        "%";

    document.getElementById(
        "xpNext"
    ).textContent =
        (
            100 -
            progressInLevel
        ) +
        " XP to Level " +
        (
            level + 1
        );
}

function renderDailyGoal(
    progress
){

    const today =
        getTodayDateString();

    const dailyXP =
        progress.dailyXPDate === today
            ? progress.dailyXP
            : 0;

    document.getElementById(
        "dailyGoalText"
    ).textContent =
        dailyXP >= 30
            ? "30 / 30 XP complete"
            : dailyXP +
                " / 30 XP";
}

function renderDashboard(
    progress
){

    renderStats(
        progress
    );

    renderXP(
        progress
    );

    renderBuddy(
        progress
    );

    renderDailyGoal(
        progress
    );
    renderContinueLearning(progress);
}


/* NAVIGATION */

function updateNavigation(){

    const user =
        getCurrentUser();

    if(user){

        document.getElementById(
            "nicknameLabel"
        ).textContent =
            user.nickname ||
            user.email;

    }
}

function handleLogoClick(){

    window.location.href =
        getCurrentUser()
            ? "dashboard.html"
            : "index.html";
}

function logoutUser(){

    localStorage.removeItem(
        STREETWISE_SESSION_KEY
    );

    applyPreferences(
        defaultPreferences()
    );

    window.location.href =
        "index.html";
}


/* PREFERENCES */

function showMessage(
    id,
    text,
    type
){

    const element =
        document.getElementById(
            id
        );

    element.textContent =
        text;

    element.className =
        "message-box visible " +
        type;
}

function clearMessage(id){

    const element =
        document.getElementById(
            id
        );

    element.textContent =
        "";

    element.className =
        "message-box";
}

function openPreferences(){

    const user =
        getCurrentUser();

    if(!user){
        return;
    }

    document.getElementById(
        "prefsEmail"
    ).textContent =
        user.email;

    document.getElementById(
        "prefsLevel"
    ).textContent =
        user.level ||
        " - ";

    document.getElementById(
        "prefsNicknameInput"
    ).value =
        user.nickname ||
        "";

    clearMessage(
        "prefsNicknameMessage"
    );

    const prefs =
        getUserPreferences(
            user.email
        );

    document.getElementById(
        "darkModeToggle"
    ).checked =
        prefs.theme === "dark";

    document
        .querySelectorAll(
            ".topic-checkbox"
        )
        .forEach(
            checkbox=>{

                checkbox.checked =
                    prefs.learningTopics.includes(
                        checkbox.value
                    );

            }
        );

    document
        .getElementById(
            "preferencesOverlay"
        )
        .classList.add(
            "active"
        );
}

function closePreferences(){

    document
        .getElementById(
            "preferencesOverlay"
        )
        .classList.remove(
            "active"
        );
}

function closePreferencesOnBackdrop(
    event
){

    if(
        event.target.id ===
        "preferencesOverlay"
    ){

        closePreferences();

    }
}

function savePrefsNickname(){

    const user =
        getCurrentUser();

    if(!user){
        return;
    }

    const nickname =
        document
            .getElementById(
                "prefsNicknameInput"
            )
            .value
            .trim();

    if(!nickname){

        showMessage(
            "prefsNicknameMessage",
            "Please enter a nickname.",
            "error"
        );

        return;
    }

    const accounts =
        getAccounts();

    if(
        accounts[
            user.email
        ]
    ){

        accounts[
            user.email
        ].nickname =
            nickname;

        saveAccounts(
            accounts
        );
    }

    setCurrentUser(
        Object.assign(
            {},
            user,
            {
                nickname:nickname
            }
        )
    );

    showMessage(
        "prefsNicknameMessage",
        "Nickname updated.",
        "success"
    );
}

function handleDarkModeToggle(
    checkbox
){

    const user =
        getCurrentUser();

    if(!user){
        return;
    }

    const prefs =
        getUserPreferences(
            user.email
        );

    prefs.theme =
        checkbox.checked
            ? "dark"
            : "light";

    saveUserPreferences(
        user.email,
        prefs
    );

    applyPreferences(
        prefs
    );
}

function handleLearningTopicToggle(
    checkbox
){

    const user =
        getCurrentUser();

    if(!user){
        return;
    }

    const prefs =
        getUserPreferences(
            user.email
        );

    const topics =
        new Set(
            prefs.learningTopics || []
        );

    if(
        checkbox.checked
    ){

        topics.add(
            checkbox.value
        );

    }else{

        topics.delete(
            checkbox.value
        );

    }

    prefs.learningTopics =
        Array.from(topics);

    saveUserPreferences(
        user.email,
        prefs
    );
}


/* CREDITS */

function toggleCredits(){

    document
        .getElementById(
            "creditsOverlay"
        )
        .classList.toggle(
            "active"
        );
}

function closeCredits(
    event
){

    if(
        event.target.id ===
        "creditsOverlay"
    ){

        toggleCredits();

    }
}


/* LEVEL + SEARCH */

function selectLevelTab(
    level,
    button
){

    currentLevel =
        level;

    document
        .querySelectorAll(
            ".level-tab"
        )
        .forEach(
            item=>
                item.classList.remove(
                    "active"
                )
        );

    button.classList.add(
        "active"
    );

    renderCourseGrid();
}

function handleSearchInput(
    value
){

    currentSearch =
        value
            .trim()
            .toLowerCase();

    renderCourseGrid();
}


/* TOAST */

let toastTimeout =
    null;

function showToast(
    message
){

    const toast =
        document.getElementById(
            "toast"
        );

    document.getElementById(
        "toastText"
    ).textContent =
        message;

    toast.classList.add(
        "visible"
    );

    clearTimeout(
        toastTimeout
    );

    toastTimeout =
        setTimeout(
            ()=>{
                toast.classList.remove(
                    "visible"
                );
            },
            2800
        );
}



/* ESC */

document.addEventListener(
    "keydown",
    event=>{

        if(
            event.key !==
            "Escape"
        ){

            return;

        }

        document
            .getElementById(
                "creditsOverlay"
            )
            .classList.remove(
                "active"
            );

        document
            .getElementById(
                "preferencesOverlay"
            )
            .classList.remove(
                "active"
            );

        closeBadges();

        closeBuddySelection();

    }
);


/* START */

function initDashboard(){

    const user =
        getCurrentUser();

    if(!user){

        window.location.href =
            "index.html";

        return;

    }

    document.getElementById(
        "greetingText"
    ).textContent =
        "Welcome back, " +
        (
            user.nickname ||
            user.email
        ) +
        "!";

    ensureAccountBadge();

    const progress =
        getUserProgress(
            user.email
        );

    renderDashboard(
        progress
    );

    const validLevels = [
        "Beginner",
        "Intermediate",
        "Advanced"
    ];

    currentLevel =
        validLevels.includes(
            user.level
        )
            ? user.level
            : "Beginner";

    document
        .querySelectorAll(
            ".level-tab"
        )
        .forEach(
            button=>{

                button.classList.remove(
                    "active"
                );

                if(
                    button.dataset.level ===
                    currentLevel
                ){

                    button.classList.add(
                        "active"
                    );

                }

                if(
                    button.dataset.level ===
                    user.level
                ){

                    const badge =
                        document.createElement(
                            "span"
                        );

                    badge.className =
                        "level-tab-badge";

                    badge.textContent =
                        "You";

                    button.appendChild(
                        badge
                    );

                }

            }
        );

    renderCourseGrid();

    updateNavigation();

    loadPreferencesForCurrentUser();
}

/* Streetwise lesson player. Content and state stay in this dashboard file. */
const COURSE_SOURCES = {
 'password-security': [
  ['CISA: Secure Our World','https://www.cisa.gov/secure-our-world'],
  ['NIST: Phishing guidance','https://www.nist.gov/itl/smallbusinesscyber/guidance-topic/phishing']
 ],
 'networking': [
  ['Microsoft: ipconfig','https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ipconfig'],
  ['Microsoft: ping','https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ping'],
  ['Microsoft: nslookup','https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup'],
  ['Cisco: IOS command modes','https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/fundamentals/configuration/xe-16/fundamentals-xe-16-book/cf-cli-basics.html'],
  ['Cloudflare: Subnets','https://www.cloudflare.com/learning/network-layer/what-is-a-subnet/']
 ],
 'computer-basics': [
  ['Microsoft: System configuration tools','https://support.microsoft.com/en-us/windows/experience/system-configuration-tools-in-windows'],
  ['Microsoft: Storage and files','https://support.microsoft.com/en-us/windows/experience/storage-filemanagement/free-up-drive-space-in-windows'],
  ['Microsoft: Device Manager','https://learn.microsoft.com/en-us/windows-hardware/drivers/install/using-device-manager']
 ],
 'command-line': [
  ['Microsoft: Windows command reference','https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/windows-commands'],
  ['Microsoft: PowerShell pipelines','https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_pipelines'],
  ['Microsoft: Get-ChildItem','https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-childitem'],
  ['Microsoft: Output redirection','https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_redirection']
 ],
 'cybersecurity': [
  ['NIST: Cybersecurity Framework','https://www.nist.gov/cyberframework'],
  ['NIST: Digital authentication','https://pages.nist.gov/800-63-4/sp800-63b.html'],
  ['NIST: Zero trust architecture','https://csrc.nist.gov/pubs/sp/800/207/final'],
  ['NIST: Incident response','https://csrc.nist.gov/pubs/sp/800/61/r3/final'],
  ['OWASP: Application security risks','https://owasp.org/Top10/2025/'],
  ['NIST: Recovery objectives','https://csrc.nist.gov/glossary/term/recovery_point_objective']
 ],
 'network-security': [
  ['NIST: Firewall guidance','https://csrc.nist.gov/pubs/sp/800/41/r1/final'],
  ['NIST: Cybersecurity Framework','https://www.nist.gov/cyberframework'],
  ['NIST: Incident response','https://csrc.nist.gov/pubs/sp/800/61/r3/final'],
  ['NIST: Detection and prevention','https://csrc.nist.gov/pubs/sp/800/94/final'],
  ['NIST: Recovery objectives','https://csrc.nist.gov/glossary/term/recovery_point_objective'],
  ['Cisco: Stateful connection handling','https://www.cisco.com/c/en/us/td/docs/security/asa/asa916/asdm716/firewall/asdm-716-firewall-config/conns-connlimits.html']
 ]
};
let lessonPlayer = {courseId:null, lessonId:null, mode:'reading', answers:[], submitted:false};
const lessonWorkspace = document.getElementById('lessonWorkspace');
const dashboardWorkspace = document.querySelector('.dashboard-main');
let lessonReturnFocus = null;
const lessonRoot = document.getElementById('lessonPlayer');
function escapeLesson(value){
 return String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function lessonProgress(){
 const user=getCurrentUser();
 return user ? getUserProgress(user.email) : defaultProgress();
}
function saveLessonProgress(progress){
 const user=getCurrentUser();
 if(user) saveUserProgress(user.email,progress);
}
function learningState(progress){
 if(!progress.learningState) progress.learningState={lessons:{},current:null};
 if(!progress.learningState.lessons) progress.learningState.lessons={};
 return progress.learningState;
}
function lessonState(progress,id){
 const state=learningState(progress);
 if(!state.lessons[id]) state.lessons[id]={read:[],practiceDone:false,section:0};
 return state.lessons[id];
}
function currentLesson(){
 return STREETWISE_COURSES[lessonPlayer.courseId].lessons.find(l=>l.id===lessonPlayer.lessonId);
}
function canTakeQuiz(progress,lesson){
 const state=lessonState(progress,lesson.id);
 return !!progress.completedLessons[lesson.id] || ((state.readComplete || lesson.sections.every((s,i)=>state.read.includes(i))) && state.practiceDone);
}
function writeLessonRoute(replace=false){
 const url=new URL(window.location.href);
 ['practice','from'].forEach(key=>url.searchParams.delete(key));
 url.searchParams.set('course',lessonPlayer.courseId);
 url.searchParams.set('lesson',lessonPlayer.lessonId);
 if(lessonPlayer.mode==='reading') url.searchParams.delete('view');
 else url.searchParams.set('view',lessonPlayer.mode);
 if(url.href!==window.location.href) history[replace?'replaceState':'pushState']({streetwiseView:'lesson'},'',url);
 document.title=(lessonPlayer.mode==='test'?'Course final test':currentLesson().title)+' | Streetwise';
}
function showLessonWorkspace(){
 if(!document.body.classList.contains('lesson-page')) lessonReturnFocus=document.activeElement;
 dashboardWorkspace.hidden=true;
 practiceWorkspace.hidden=true;
 document.body.classList.remove('practice-page');
 lessonWorkspace.hidden=false;
 document.body.classList.add('lesson-page');
 window.scrollTo(0,0);
}
function openCourse(courseId,requestedLessonId=null,updateRoute=true){
 const course=STREETWISE_COURSES[courseId];
 if(!course || !getCurrentUser()) return;
 const progress=lessonProgress();
 const saved=learningState(progress).current;
 const lesson=course.lessons.find(l=>l.id===requestedLessonId) || (saved && saved.courseId===courseId && course.lessons.find(l=>l.id===saved.lessonId)) || course.lessons.find(l=>!progress.completedLessons[l.id]) || course.lessons[0];
 lessonPlayer.courseId=courseId;
 showLessonWorkspace();
 selectLesson(lesson.id,updateRoute);
}
function selectLesson(lessonId,updateRoute=true){
 const course=STREETWISE_COURSES[lessonPlayer.courseId];
 const lesson=course.lessons.find(l=>l.id===lessonId);
 if(!lesson) return;
 const progress=lessonProgress();
 lessonState(progress,lessonId);
 lessonPlayer={courseId:lessonPlayer.courseId,lessonId,mode:'reading',answers:[],submitted:false};
 learningState(progress).current={courseId:lessonPlayer.courseId,lessonId};
 saveLessonProgress(progress);
 if(updateRoute) writeLessonRoute();
 renderLessonPlayer();
 renderContinueLearning(progress);
 focusLessonTitle();
}
function closeLessonPlayer(updateRoute=true){
 lessonWorkspace.hidden=true;
 dashboardWorkspace.hidden=false;
 document.body.classList.remove('lesson-page');
 document.title='Streetwise - Dashboard';
 if(updateRoute){
  const url=new URL(window.location.href);
  ['course','lesson','view','practice','from'].forEach(key=>url.searchParams.delete(key));
  if(url.href!==window.location.href) history.pushState({streetwiseView:'dashboard'},'',url);
 }
 renderContinueLearning(lessonProgress());
 renderPracticeEntry();
 if(lessonReturnFocus && lessonReturnFocus.isConnected && !lessonWorkspace.contains(lessonReturnFocus) && !practiceWorkspace.contains(lessonReturnFocus)) lessonReturnFocus.focus({preventScroll:true});
 else document.querySelector('#practiceEntry [data-workshop="home"]')?.focus({preventScroll:true});
}
function restoreLessonRoute(){
 if(!getCurrentUser()) return;
 const params=new URLSearchParams(window.location.search);
 if(params.has('practice')){
  const view=PRACTICE_TOOLS[params.get('practice')]?params.get('practice'):'home';
  openPractice(view,false,params.get('from'));
  if(view!==params.get('practice')){const url=new URL(window.location.href);url.searchParams.set('practice',view);history.replaceState({streetwiseView:'practice'},'',url);}
  return;
 }
 const courseId=params.get('course');
 if(!STREETWISE_COURSES[courseId]){
  if(!lessonWorkspace.hidden) closeLessonPlayer(false);
  if(!practiceWorkspace.hidden) closePractice(false);
  return;
 }
 openCourse(courseId,params.get('lesson'),false);
 const mode=params.get('view');
 const progress=lessonProgress();
 if(mode==='quiz' && canTakeQuiz(progress,currentLesson())) lessonPlayer.mode='quiz';
 if(mode==='test' && STREETWISE_COURSES[courseId].lessons.every(l=>progress.completedLessons[l.id])) lessonPlayer.mode='test';
 writeLessonRoute(true);
 renderLessonPlayer();
 focusLessonTitle();
}
window.addEventListener('popstate',restoreLessonRoute);
function getLessonProgress(progress,lesson){
 const state=lessonState(progress,lesson.id),complete=!!progress.completedLessons[lesson.id];
 const steps=[{label:'Reading',done:complete || !!state.readComplete || lesson.sections.every((s,i)=>state.read.includes(i))},{label:'Practice',done:complete || !!state.practiceDone},{label:'Quiz',done:complete}];
 const finished=steps.filter(step=>step.done).length;
 return {steps,finished,percent:Math.round(finished/steps.length*100),current:steps.findIndex(step=>!step.done)};
}
function renderLessonOutline(course,progress,lesson){
 return course.lessons.map((l,i)=>{
  const {percent}=getLessonProgress(progress,l),complete=percent===100;
  return `<li><button type="button" class="lesson-nav-item ${l.id===lesson.id && lessonPlayer.mode!=='test'?'selected':''}" data-action="lesson" data-id="${l.id}" aria-label="Lesson ${i+1}: ${escapeLesson(l.title)}, ${percent}% complete" ${l.id===lesson.id && lessonPlayer.mode!=='test'?'aria-current="true"':''}><span class="lesson-number lesson-progress-number ${complete?'complete':''}" data-progress="${percent}" aria-hidden="true"><svg viewBox="0 0 36 36" focusable="false"><circle class="lesson-ring-track" cx="18" cy="18" r="15"/><circle class="lesson-ring-fill" cx="18" cy="18" r="15" pathLength="100" stroke-dasharray="100 100" stroke-dashoffset="${100-percent}"/></svg><span>${i+1}</span></span><span>${escapeLesson(l.title)}<small class="${complete?'lesson-completed-label':'lesson-progress-label'}">${complete?'✓ Completed · 100%':percent+'% complete'}</small></span></button></li>`;
 }).join('');
}
function renderLessonPlayer(){
 const course=STREETWISE_COURSES[lessonPlayer.courseId];
 const lesson=currentLesson();
 const progress=lessonProgress();
 const completed=course.lessons.filter(l=>progress.completedLessons[l.id]).length;
 const testDone=!!progress.completedLessons[lessonPlayer.courseId+'-final-test'];
 lessonRoot.innerHTML=`
 <header class="lesson-header"><div><p class="lesson-eyebrow">${escapeLesson(course.level)} · ${completed} / ${course.lessons.length} lessons completed</p><h2 id="lessonCourseTitle">${escapeLesson(course.title)}</h2><div class="lesson-course-progress" role="progressbar" aria-label="Course progress" aria-valuemin="0" aria-valuemax="${course.lessons.length}" aria-valuenow="${completed}"><span style="width:${completed/course.lessons.length*100}%"></span></div></div><button type="button" class="lesson-button" data-action="close" aria-label="Return to dashboard"><span class="lesson-back-prefix">Back to </span>Dashboard</button></header>
 <div class="lesson-layout"><nav class="lesson-sidebar" aria-label="Course lessons"><p class="lesson-outline-label">Course outline</p><ol>${renderLessonOutline(course,progress,lesson)}</ol>
 <button type="button" class="lesson-nav-item ${lessonPlayer.mode==='test'?'selected':''}" data-action="test" ${completed!==course.lessons.length?'disabled':''}><span class="lesson-number">${testDone?'✓':'T'}</span><span>Course final test<small>${testDone?'Completed':completed!==course.lessons.length?'Complete all lessons to unlock':'8 questions · Pass with 6 correct'}</small></span></button>
 <details class="lesson-sources"><summary>Further reading</summary>${COURSE_SOURCES[lessonPlayer.courseId].map(([label,url])=>`<a href="${url}" target="_blank" rel="noopener noreferrer">${escapeLesson(label)}</a>`).join('')}</details></nav>
 <section class="lesson-main" id="lessonContent" aria-label="Lesson content"></section></div>`;
 if(lessonPlayer.mode==='test' || lessonPlayer.mode==='quiz') renderAssessment();
 else renderReading();
}
function renderLessonProgress(progress,lesson){
 const {steps,finished,percent,current}=getLessonProgress(progress,lesson);
 return `<div id="lessonProgressPanel" class="lesson-progress-panel"><div class="lesson-progress-heading"><strong>Lesson progress</strong><span>${percent}% complete</span></div><div id="lessonProgress" class="lesson-progress-track" role="progressbar" aria-label="Lesson progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}" aria-valuetext="${finished} of 3 steps complete"><span style="width:${percent}%"></span></div><ol class="lesson-progress-steps">${steps.map((step,i)=>`<li class="${step.done?'done':i===current?'current':'upcoming'}" ${i===current?'aria-current="step"':''}><span class="lesson-step-mark" aria-hidden="true">${step.done?'✓':i+1}</span><span>${step.label}<span class="lesson-step-status">${step.done?'Complete':i===current?'In progress':'Up next'}</span></span></li>`).join('')}</ol></div>`;
}
function renderReading(){
 const lesson=currentLesson(),progress=lessonProgress(),state=lessonState(progress,lesson.id);
 const quizReady=canTakeQuiz(progress,lesson),isDone=!!progress.completedLessons[lesson.id];
 const readDone=isDone || state.readComplete || lesson.sections.every((s,i)=>state.read.includes(i));
 const minutes=Math.max(2,Math.ceil(lesson.sections.reduce((n,s)=>n+s.text.split(/\s+/).length,0)/160));
 const table=lesson.table ? `<div class="lesson-table-wrap"><table class="lesson-table"><caption>Worked reference</caption><thead><tr>${lesson.table.headers.map(h=>`<th scope="col">${escapeLesson(h)}</th>`).join('')}</tr></thead><tbody>${lesson.table.rows.map(row=>`<tr>${row.map(v=>`<td>${escapeLesson(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '';
 
 // Check if the current course has a simulator lab
 const isLabCourse = lessonPlayer.courseId === 'networking' || lessonPlayer.courseId === 'network-security' || lessonPlayer.courseId === 'command-line';

 document.getElementById('lessonContent').innerHTML=`
 <div class="lesson-article-header"><p class="lesson-eyebrow">Lesson ${STREETWISE_COURSES[lessonPlayer.courseId].lessons.indexOf(lesson)+1} · ${minutes} min read${isDone?' · Completed':''}</p>
 <h3 class="lesson-title" tabindex="-1">${escapeLesson(lesson.title)}</h3><p class="lesson-goal">${escapeLesson(lesson.goal)}</p></div>
 <article class="lesson-reading">${lesson.sections.map(section=>`<section class="lesson-topic"><h4>${escapeLesson(section.title)}</h4>${section.text.split(/\n\n/).map(paragraph=>`<p>${escapeLesson(paragraph)}</p>`).join('')}</section>`).join('')}${table}
 ${lesson.takeaway?`<aside class="lesson-takeaway"><strong>Remember this</strong><p>${escapeLesson(lesson.takeaway)}</p></aside>`:''}</article>

 ${isLabCourse ? `
 <div style="padding: 24px; background: var(--accent-tint); border: 1px solid var(--accent); border-radius: 12px; margin: 30px 0; text-align: center; max-width: var(--lesson-content-width);">
    <h4 style="margin: 0 0 10px; color: var(--accent); font-size: 18px;">Interactive Network Simulator</h4>
    <p style="margin: 0 0 20px; color: var(--text-secondary); font-size: 15px;">Launch the sandbox to physically practice the concepts from this module.</p>
    <button type="button" class="lesson-button primary" onclick="window.location.href='/lab/${lessonPlayer.courseId}'">Open Simulator Workspace →</button>
 </div>` : ''}

 <div class="lesson-read-confirm"><span>${readDone?'✓ Reading completed':'Finished reading? Move on to the practice below.'}</span><button type="button" class="lesson-button ${readDone?'':'primary'}" data-action="read" ${readDone?'disabled':''}>${readDone?'Reading complete':'Mark lesson read'}</button></div>
 <section class="lesson-practice"><div class="practice-heading"><span class="practice-tag">Practice</span><span>${state.practiceDone?'✓ Completed':'One real-world decision'}</span></div><h4>${escapeLesson(lesson.activity.prompt)}</h4><div class="lesson-options">${lesson.activity.options.map((o,i)=>`<button type="button" class="lesson-option" data-action="practice" data-index="${i}"><span class="answer-letter">${String.fromCharCode(65+i)}</span><span>${escapeLesson(o)}</span></button>`).join('')}</div><p class="lesson-feedback ${state.practiceDone?'correct':''}" id="practiceFeedback" aria-live="polite">${state.practiceDone?'Activity completed. '+escapeLesson(lesson.activity.explanation):'Choose the best response. You can try again.'}</p></section>
 <div class="lesson-quiz-callout"><div><strong>${isDone?'Keep your skills fresh':'Check your understanding'}</strong><p>3 questions · Pass with 2 correct · ${isDone?'Practice without extra XP':'Earn XP when you pass'}</p>${!quizReady?'<p>Mark the lesson read and complete the activity to unlock the quiz.</p>':''}</div><button type="button" class="lesson-button primary" data-action="quiz" ${!quizReady?'disabled':''}>${isDone?'Review quiz':'Take lesson quiz'}</button></div>`;
}
function completeReadingOnScroll(content){
 if(lessonPlayer.mode!=='reading' || !content || content.id!=='lessonContent' || content.clientHeight<=0 || content.scrollTop<=0) return;
 const reading=content.querySelector('.lesson-reading');
 if(!reading || reading.getBoundingClientRect().height<=0 || reading.getBoundingClientRect().bottom>content.getBoundingClientRect().bottom) return;
 const lesson=currentLesson(),progress=lessonProgress(),state=lessonState(progress,lesson.id);
 if(progress.completedLessons[lesson.id] || state.readComplete || lesson.sections.every((s,i)=>state.read.includes(i))) return;
 state.read=lesson.sections.map((section,index)=>index);
 state.readComplete=true;
 saveLessonProgress(progress);
 content.querySelector('#lessonProgressPanel').outerHTML=renderLessonProgress(progress,lesson);
 const status=content.querySelector('#readingStatus');
 status.textContent='✓ Reading complete';status.classList.add('completed');
 lessonRoot.querySelector('.lesson-sidebar ol').innerHTML=renderLessonOutline(STREETWISE_COURSES[lessonPlayer.courseId],progress,lesson);
 const ready=canTakeQuiz(progress,lesson);
 content.querySelector('[data-action="quiz"]').disabled=!ready;
 const note=content.querySelector('.lesson-unlock-note');
 if(note){if(ready)note.remove();else note.textContent='Answer the practice question to unlock the quiz.';}
}
lessonRoot.addEventListener('scroll',event=>completeReadingOnScroll(event.target),true);
function assessmentQuestions(){
 return lessonPlayer.mode==='test' ? STREETWISE_COURSES[lessonPlayer.courseId].test : currentLesson().quiz;
}
function assessmentKey(){
 return lessonPlayer.mode==='test' ? lessonPlayer.courseId+'-final-test' : lessonPlayer.lessonId;
}
function renderAssessment(){
 const isTest=lessonPlayer.mode==='test',questions=assessmentQuestions();
 const name=isTest?'Course final test':currentLesson().title+' quiz';
 const done=!!lessonProgress().completedLessons[assessmentKey()];
 document.getElementById('lessonContent').innerHTML=`
 <p class="lesson-eyebrow">${isTest?'Course assessment':'Lesson assessment'}${done?' · Completed, practice again without extra XP':''}</p>
 <h3 class="lesson-title" tabindex="-1">${escapeLesson(name)}</h3><p class="lesson-goal">${isTest?'Answer at least 6 of 8 correctly.':'Answer at least 2 of 3 correctly.'} Submit to see your score and explanations.</p>
 ${isTest?'':renderLessonProgress(lessonProgress(),currentLesson())}
 <form id="lessonQuizForm">${questions.map((question,qi)=>`<fieldset class="lesson-question" id="question-${qi}"><legend>${qi+1}. ${escapeLesson(question.prompt)}</legend><div class="lesson-options">${question.options.map((option,oi)=>`<label class="lesson-answer"><input type="radio" name="question-${qi}" value="${oi}" ${lessonPlayer.answers[qi]===oi?'checked':''} ${lessonPlayer.submitted?'disabled':''}><span>${escapeLesson(option)}</span></label>`).join('')}</div><div class="question-feedback" id="feedback-${qi}"></div></fieldset>`).join('')}<p id="quizError" role="alert"></p><div class="lesson-actions"><button type="button" class="lesson-button" data-action="back-reading">Back to reading</button><button type="submit" class="lesson-button primary" id="submitLessonQuiz" ${lessonPlayer.submitted?'disabled':''}>Check answers</button></div></form><div id="quizResult" aria-live="polite"></div>`;
 document.getElementById('lessonQuizForm').addEventListener('submit',submitLessonAssessment);
}
function submitLessonAssessment(event){
 event.preventDefault();
 if(lessonPlayer.submitted) return;
 const form=event.currentTarget,questions=assessmentQuestions();
 const chosen=questions.map((q,i)=>form.querySelector(`input[name="question-${i}"]:checked`));
 const missing=chosen.findIndex(input=>!input);
 if(missing!==-1){
  document.getElementById('quizError').textContent=`Choose an answer for question ${missing+1} before submitting.`;
  form.querySelector(`input[name="question-${missing}"]`).focus();
  return;
 }
 lessonPlayer.answers=chosen.map(input=>Number(input.value));
 const correct=questions.filter((q,i)=>q.answer===lessonPlayer.answers[i]).length;
 const isTest=lessonPlayer.mode==='test',passed=correct>=(isTest?6:2);
 const progress=lessonProgress(),key=assessmentKey();
 const previouslyCompleted=!!progress.completedLessons[key];
 if(isTest && !STREETWISE_COURSES[lessonPlayer.courseId].lessons.every(l=>progress.completedLessons[l.id])) return;
 if(!isTest && !canTakeQuiz(progress,currentLesson())) return;
 let outcome=null;
 if(passed && !previouslyCompleted){
  outcome=isTest ? completeTest(key,STREETWISE_COURSES[lessonPlayer.courseId].title+' final test',questions.length,correct,lessonPlayer.courseId) : completeQuiz(key,currentLesson().title,questions.length,correct,lessonPlayer.courseId);
  const updated=lessonProgress();
  if(updated.completedLessons[key]){
   updated.completedLessons[key].score=correct;
   updated.completedLessons[key].questionCount=questions.length;
   saveLessonProgress(updated);
  }
 }
 recordSkillQuiz(lessonPlayer.courseId,questions,lessonPlayer.answers,isTest);
 lessonPlayer.submitted=true;
 renderLessonPlayer();
 questions.forEach((q,i)=>{
  const match=q.answer===lessonPlayer.answers[i];
  const feedback=document.getElementById(`feedback-${i}`);
  feedback.className='question-feedback '+(match?'correct':'incorrect');
  feedback.innerHTML=`<strong>${match?'Correct':'Not quite'}. Correct answer: ${escapeLesson(q.options[q.answer])}</strong><p>${escapeLesson(q.explanation)}</p>`;
 });
 const awarded=outcome && !outcome.alreadyCompleted;
 const xp=isTest?calculateTestXP(questions.length,correct):calculateQuizXP(questions.length,correct);
 const next=STREETWISE_COURSES[lessonPlayer.courseId].lessons.find(l=>!lessonProgress().completedLessons[l.id]);
 const result=document.getElementById('quizResult');
 result.className='lesson-result '+(passed?'correct':'incorrect');
 result.innerHTML=`<h4>${correct} / ${questions.length} correct · ${passed?'Passed':'Keep practicing'}</h4><p>${passed?(awarded?`Completion saved. +${xp} XP.`:previouslyCompleted?'Already completed. This attempt is practice; your XP stays the same.':'Unable to save completion. Sign in and try again.'):'Review the explanations and try again. No completion or XP has been recorded.'}</p><div class="lesson-actions"><button type="button" class="lesson-button" data-action="retry">Try again</button><button type="button" class="lesson-button" data-workshop="review" data-origin="${lessonPlayer.lessonId}">Practise fresh questions</button>${passed?`<button type="button" class="lesson-button primary" data-action="${isTest?'close':next?'lesson':'test'}" ${next && !isTest?`data-id="${next.id}"`:''}>${isTest?'Return to dashboard':next?'Next lesson':'Take the final test'}</button>`:''}</div>`;
 result.scrollIntoView({block:'nearest',behavior:'smooth'});
 renderContinueLearning(lessonProgress());
}
lessonRoot.addEventListener('click',event=>{
 const button=event.target.closest('button[data-action]');
 if(!button || button.disabled) return;
 const action=button.dataset.action;
 if(action==='close'){closeLessonPlayer();return;}
 if(action==='lesson'){selectLesson(button.dataset.id);focusLessonTitle();return;}
 if(action==='practice'){
  const lesson=currentLesson(),progress=lessonProgress();
  const correct=Number(button.dataset.index)===lesson.activity.answer;
  const feedback=document.getElementById('practiceFeedback');
  if(correct){lessonState(progress,lesson.id).practiceDone=true;saveLessonProgress(progress);renderReading();}
  else{feedback.textContent='Not quite. Try another answer.';feedback.className='lesson-feedback incorrect';}
  return;
 }
 if(action==='quiz'){
  if(!canTakeQuiz(lessonProgress(),currentLesson())) return;
  lessonPlayer.mode='quiz';lessonPlayer.answers=[];lessonPlayer.submitted=false;writeLessonRoute();renderLessonPlayer();focusLessonTitle();return;
 }
 if(action==='test'){
  const course=STREETWISE_COURSES[lessonPlayer.courseId],progress=lessonProgress();
  if(!course.lessons.every(l=>progress.completedLessons[l.id])) return;
  lessonPlayer.mode='test';lessonPlayer.answers=[];lessonPlayer.submitted=false;writeLessonRoute();renderLessonPlayer();focusLessonTitle();return;
 }
 if(action==='back-reading'){lessonPlayer.mode='reading';lessonPlayer.submitted=false;writeLessonRoute();renderLessonPlayer();focusLessonTitle();return;}
 if(action==='retry'){lessonPlayer.answers=[];lessonPlayer.submitted=false;renderAssessment();focusLessonTitle();}
});
function focusLessonTitle(){
 const title=lessonRoot.querySelector('.lesson-title');
 if(title) title.focus({preventScroll:true});
 document.getElementById('lessonContent').scrollTop=0;
}
function renderContinueLearning(progress){
 const container=document.getElementById('continueLearningState');
 const saved=progress.learningState && progress.learningState.current;
 if(!saved || !STREETWISE_COURSES[saved.courseId]) return;
 const course=STREETWISE_COURSES[saved.courseId];
 const selected=course.lessons.find(l=>l.id===saved.lessonId);
 const next=selected && !progress.completedLessons[selected.id] ? selected : course.lessons.find(l=>!progress.completedLessons[l.id]);
 container.classList.add('lesson-resume');
 container.innerHTML=`<div><strong>${escapeLesson(next?next.title:course.title)}</strong><span>${next?escapeLesson(course.level+' · '+course.title):progress.completedLessons[saved.courseId+'-final-test']?'Course complete. Review anytime.':'All lessons complete. Your final test is ready.'}</span></div><button type="button" class="lesson-button primary">${next?'Continue learning':progress.completedLessons[saved.courseId+'-final-test']?'Review course':'<span style="color: white !important; font-weight: bold;">Take final test</span>'}</button>`;
 container.querySelector('button').onclick=()=>{
  openCourse(saved.courseId);
  if(!next && !progress.completedLessons[saved.courseId+'-final-test']) lessonRoot.querySelector('[data-action="test"]').click();
 };
}
// Restore notifications used by the original dashboard's XP and badge functions.
let achievementHideTimer=null;
function showAchievement(label,icon,title,description){
 const banner=document.getElementById('achievementBanner');
 document.getElementById('achievementSmall').textContent=label;
 const artwork=document.getElementById('achievementIcon');
 if(BADGE_ICON_PATHS[icon]) artwork.innerHTML=renderBadgeIcon(icon);
 else if(typeof icon === 'string' && icon.startsWith('buddy:')) {
  const [,id,stage]=icon.split(':');
  artwork.innerHTML=window.StreetwiseBuddies.avatar(id,stage);
 } else artwork.textContent=icon;
 document.getElementById('achievementTitle').textContent=title;
 document.getElementById('achievementDescription').textContent=description;
 banner.setAttribute('role','status');
 banner.classList.add('visible');
 clearTimeout(achievementHideTimer);
 achievementHideTimer=setTimeout(()=>banner.classList.remove('visible'),2800);
}

/* Optional workshop activities use only the existing per-account browser state. */
const practiceWorkspace=document.getElementById('practiceWorkspace');
const practiceRoot=document.getElementById('practicePlayer');
const PRACTICE_TOOLS={
 home:{title:'Practice workshop',tag:'Three activities',description:'Choose one activity. Follow the steps and check your answers as you go.'},
 terminal:{title:'Practice commands',tag:'Intermediate',description:'Follow one step at a time to work with files and check a network connection.'},
 inbox:{title:'Spot a scam',tag:'Beginner',description:'Read a message, check the details, and choose what you would do.'},
 firewall:{title:'Allow or block connections',tag:'Advanced',description:'Choose which computers can connect, then test whether your rules work.'},
 mastery:{title:'Your skill map',tag:'Learning · Proficient · Mastered',description:'See which topics need another look and which you can apply confidently.'},
 review:{title:'Review and strengthen',tag:'Fresh questions · Focused practice',description:'Work on missed topics using new examples. Every answer includes an explanation.'},
 incidents:{title:'Incident investigation',tag:'Advanced · 3 case files',description:'Read the evidence, make response decisions, and see what each choice changes.'},
 glossary:{title:'Plain-language glossary',tag:'44 useful terms',description:'Find a definition and a practical example. Underlined terms in lessons open the same guide.'}
};
const WORKSHOP_MAIN=['inbox','terminal','firewall'];
const WORKSHOP_INBOX_COUNT=4;
let practiceView='home',practiceOrigin=null,practiceReturnFocus=null,glossaryReturnFocus=null;
function workshopState(progress){
 if(!progress.workshop) progress.workshop={};
 const s=progress.workshop;
 if(!s.skills)s.skills={};
 if(!s.inbox)s.inbox={answers:{},inspected:{},index:0};
 if(!s.incidents)s.incidents={cases:{},active:null};
 if(!s.review)s.review={cycle:0,history:{},session:null};
 if(!s.terminal)s.terminal=freshTerminal();
 if(!s.firewall)s.firewall={rules:[],tested:false};
 return s;
}
function editWorkshop(edit){const progress=lessonProgress(),s=workshopState(progress);edit(s,progress);saveLessonProgress(progress);return s;}
function allLessonEntries(){return Object.entries(STREETWISE_COURSES).flatMap(([courseId,course])=>course.lessons.map(lesson=>({courseId,course,lesson})));}
function lessonEntry(id){return allLessonEntries().find(e=>e.lesson.id===id);}
function skillState(progress,id){
 const s=workshopState(progress);
 if(!s.skills[id])s.skills[id]={attempts:0,perfectQuiz:false,needsReview:false,reviewCorrect:[],recoveryCorrect:[],lastScore:null};
 return s.skills[id];
}
function skillLevel(progress,id){
 const s=skillState(progress,id),completed=!!progress.completedLessons[id];
 if(s.perfectQuiz && s.reviewCorrect.length>=2 && !s.needsReview)return 'Mastered';
 if(s.needsReview)return 'Learning';
 if(completed || s.reviewCorrect.length>0)return 'Proficient';
 if(s.attempts>0 || progress.learningState?.lessons?.[id]?.practiceDone)return 'Learning';
 return 'Not started';
}
function recordSkillQuiz(courseId,questions,answers,isTest){
 editWorkshop((w,p)=>{
  const groups={};
  questions.forEach((q,i)=>{
   const entry=isTest?STREETWISE_COURSES[courseId].lessons.find(l=>l.title===q.lesson||l.quiz.some(original=>original.prompt===q.prompt)):currentLesson();
   if(entry)(groups[entry.id]??=[]).push(q.answer===answers[i]);
  });
  Object.entries(groups).forEach(([id,results])=>{
   const s=skillState(p,id);s.attempts++;s.lastScore={correct:results.filter(Boolean).length,total:results.length};s.lastPracticed=Date.now();
   if(!isTest && results.every(Boolean))s.perfectQuiz=true;
   s.needsReview=!results.every(Boolean);s.recoveryCorrect=[];
  });
 });
 renderPracticeEntry();
}
function badgeSkill(level){return `<span class="skill-pill ${level.toLowerCase().replace(/ /g,'-')}">${escapeLesson(level)}</span>`;}
function masteryTotals(progress){return allLessonEntries().reduce((n,e)=>{n[skillLevel(progress,e.lesson.id)]++;return n;},{'Not started':0,Learning:0,Proficient:0,Mastered:0});}
function workshopCompletion(s){
 return {terminal:TERMINAL_TASKS.every(task=>s.terminal.tasks.includes(task.id)),inbox:PRACTICE_DATA.inbox.slice(0,WORKSHOP_INBOX_COUNT).every(m=>s.inbox.answers[m.id]?.correct),firewall:!!s.firewall.passed,incidents:PRACTICE_DATA.incidents.every(c=>s.incidents.cases[c.id]?.complete)};
}
function renderPracticeEntry(){
 const el=document.getElementById('practiceEntry');if(!el)return;
 const s=workshopState(lessonProgress()),complete=workshopCompletion(s),completed=WORKSHOP_MAIN.filter(id=>complete[id]).length;
 el.innerHTML=`<div class="workshop-entry-heading"><span class="workshop-entry-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg></span><h2 class="section-title">Practice workshop</h2></div><p class="workshop-entry-status">${completed} / 3 activities completed</p><div class="workshop-entry-links"><button type="button" class="lesson-button primary" data-workshop="home"><span style="color: white !important;">Open workshop</span></button></div>`;
}
function contextualPractice(courseId,lesson){
 const tool={'password-security':'inbox','computer-basics':'terminal',networking:'terminal','command-line':'terminal','network-security':'firewall',cybersecurity:'incidents'}[courseId];
 const p=lessonProgress(),level=skillLevel(p,lesson.id);
 return `<aside class="lesson-lab-callout"><div><span class="practice-tag">Use what you learned</span><h4>${escapeLesson(PRACTICE_TOOLS[tool].title)}</h4><p>${escapeLesson(PRACTICE_TOOLS[tool].description)}</p></div><button type="button" class="lesson-button" data-workshop="${tool}" data-origin="${lesson.id}">Open practice</button></aside><div class="lesson-skill-strip"><span>This skill ${badgeSkill(level)}</span><button type="button" class="workshop-text-button" data-workshop="review" data-origin="${lesson.id}">Review this topic</button><button type="button" class="workshop-text-button" data-workshop="glossary" data-origin="${lesson.id}">Browse glossary</button></div>`;
}
function openPractice(view='home',updateRoute=true,origin=undefined){
 if(!getCurrentUser())return;
 practiceView=PRACTICE_TOOLS[view]?view:'home';
 if(practiceWorkspace.hidden)practiceReturnFocus=document.activeElement;
 if(origin!==undefined)practiceOrigin=lessonEntry(origin)?origin:null;
 else if(!lessonWorkspace.hidden)practiceOrigin=lessonPlayer.lessonId;
 else if(practiceWorkspace.hidden)practiceOrigin=null;
 if(practiceView==='review'&&practiceOrigin){
  const session=workshopState(lessonProgress()).review.session;
  if(session && (session.scope!=='topic'||session.ids.some(id=>PRACTICE_DATA.reviewBank.find(q=>q.id===id)?.lessonId!==practiceOrigin)))editWorkshop(w=>w.review.session=null);
 }
 dashboardWorkspace.hidden=true;lessonWorkspace.hidden=true;practiceWorkspace.hidden=false;
 document.body.classList.remove('lesson-page');document.body.classList.add('practice-page');
 if(updateRoute){
  const url=new URL(window.location.href);['course','lesson','view'].forEach(k=>url.searchParams.delete(k));url.searchParams.set('practice',practiceView);
  if(practiceOrigin)url.searchParams.set('from',practiceOrigin);else url.searchParams.delete('from');
  if(url.href!==window.location.href)history.pushState({streetwiseView:'practice'},'',url);
 }
 document.title=PRACTICE_TOOLS[practiceView].title+' | Streetwise';
 renderPractice();window.scrollTo(0,0);
 practiceRoot.querySelector('#practiceTitle')?.focus({preventScroll:true});
}
function closePractice(updateRoute=true){
 practiceWorkspace.hidden=true;dashboardWorkspace.hidden=false;lessonWorkspace.hidden=true;
 document.body.classList.remove('practice-page','lesson-page');document.title='Streetwise - Dashboard';
 if(updateRoute){const url=new URL(window.location.href);['practice','from','course','lesson','view'].forEach(k=>url.searchParams.delete(k));if(url.href!==window.location.href)history.pushState({streetwiseView:'dashboard'},'',url);}
 renderPracticeEntry();renderContinueLearning(lessonProgress());
 if(practiceReturnFocus?.isConnected && !practiceWorkspace.contains(practiceReturnFocus) && !lessonWorkspace.contains(practiceReturnFocus))practiceReturnFocus.focus({preventScroll:true});
 else document.querySelector('#practiceEntry [data-workshop="home"]')?.focus({preventScroll:true});
}
function renderPractice(){
 const tool=PRACTICE_TOOLS[practiceView];
 practiceRoot.innerHTML=`<header class="workshop-header"><div><p class="lesson-eyebrow">Streetwise / ${practiceView==='home'?'Practice':`<button type="button" class="workshop-text-button" data-workshop="home">Practice workshop</button>`}</p><h1 id="practiceTitle" tabindex="-1">${escapeLesson(tool.title)}</h1><p>${escapeLesson(tool.description)}</p></div><div class="workshop-header-actions">${practiceOrigin?'<button type="button" class="lesson-button" data-lab-action="return-lesson">Back to lesson</button>':''}<button type="button" class="lesson-button" data-lab-action="dashboard">Dashboard</button></div></header><div class="workshop-content" id="workshopContent"></div>`;
 ({home:renderWorkshopHome,terminal:renderTerminal,inbox:renderInbox,firewall:renderFirewall,mastery:renderMastery,review:renderReview,incidents:renderIncidents,glossary:renderGlossary})[practiceView]();
}
const WORKSHOP_ICONS={terminal:'›_',inbox:'@',firewall:'⇄',incidents:'◎',mastery:'↗',review:'↻',glossary:'Aa'};
function renderWorkshopHome(){
 const s=workshopState(lessonProgress()),complete=workshopCompletion(s),completed=WORKSHOP_MAIN.filter(id=>complete[id]).length;
 const started={inbox:Object.keys(s.inbox.answers).length>0,terminal:s.terminal.tasks.length>0,firewall:s.firewall.rules.length>0};
 document.getElementById('workshopContent').innerHTML=`<div class="lab-progress workshop-overview-progress"><span>${completed} of 3 activities completed</span><div role="progressbar" aria-label="Workshop progress" aria-valuemin="0" aria-valuemax="3" aria-valuenow="${completed}"><span style="width:${completed/3*100}%"></span></div></div><p class="workshop-start-note">New here? Start with <strong>Spot a scam</strong>.</p><div class="workshop-grid workshop-core-grid">${WORKSHOP_MAIN.map((id,i)=>{const t=PRACTICE_TOOLS[id];return `<button type="button" class="workshop-card" data-workshop="${id}"><span class="workshop-card-tag">${i+1}. ${escapeLesson(t.tag)}</span><span class="workshop-icon" aria-hidden="true">${WORKSHOP_ICONS[id]}</span><strong>${escapeLesson(t.title)}</strong><span class="workshop-card-copy">${escapeLesson(t.description)}</span><span class="workshop-card-footer">${complete[id]?'✓ Completed · Try again':started[id]?'Continue':'Start activity'} <span aria-hidden="true">↗</span></span></button>`;}).join('')}</div>`;
}

/* Simulated terminal. These commands never reach the operating system. */
const TERMINAL_TASKS=[
 {id:'list',title:'See what is here',description:'List the files and folders in C:\\Lab.',hint:'PowerShell: Get-ChildItem or ls. Command Prompt: dir.'},
 {id:'read',title:'Read the support note',description:'Move into Documents and read notes.txt.',hint:'cd Documents, then Get-Content notes.txt (PowerShell) or type notes.txt (Command Prompt).'},
 {id:'copy',title:'Keep a separate copy',description:'Create C:\\Lab\\Backup, copy notes.txt there, then read the copy to verify it.',hint:'From Documents: mkdir ..\\Backup, copy notes.txt ..\\Backup\\notes.txt, then type ..\\Backup\\notes.txt. PowerShell also accepts Copy-Item and Get-Content.'},
 {id:'config',title:'Inspect the configuration',description:'Display the address, gateway, and configured DNS server.',hint:'ipconfig /all works in either shell in this lab.'},
 {id:'gateway',title:'Test the local gateway',description:'Check whether 192.168.10.1 replies.',hint:'ping 192.168.10.1'},
 {id:'dns',title:'Compare the resolvers',description:'Look up portal.example using the configured DNS server, then using 192.168.10.54.',hint:'nslookup portal.example, then nslookup portal.example 192.168.10.54'},
 {id:'diagnosis',title:'Explain the evidence',description:'Choose the diagnosis supported by the tests below.',hint:'The gateway replies. The configured resolver times out. A second resolver returns an address.'}
];
function freshTerminal(){return {shell:'powershell',cwd:'C:/Lab',dirs:['C:/Lab','C:/Lab/Documents','C:/Lab/Downloads'],files:{'C:/Lab/Documents/notes.txt':'Support note: portal.example will not open. Save configuration and compare name resolution before changing settings.','C:/Lab/Documents/network.txt':'Address 192.168.10.24/24\nGateway 192.168.10.1\nConfigured DNS 192.168.10.53\nAlternative test resolver 192.168.10.54'},tasks:[],dnsChecks:[],history:[{kind:'system',text:'Streetwise practice terminal\nTry help for supported commands. This is a simulation with practice files and a fixed network.'}]};}
function terminalPath(input,t){
 let v=String(input||'.').replace(/\\/g,'/');
 if(/^[a-z]:/i.test(v))v=v[0].toUpperCase()+v.slice(1);
 else if(v.startsWith('/'))return null;
 else v=t.cwd+'/'+v;
 const parts=[];for(const bit of v.split('/')){if(!bit||bit==='.')continue;if(bit==='..'){if(parts.length<=2)return null;parts.pop();}else parts.push(bit);}
 const path=parts.join('/');if(path.toLowerCase()!=='c:/lab'&&!path.toLowerCase().startsWith('c:/lab/'))return null;
 const known=[...t.dirs,...Object.keys(t.files)],existing=known.find(p=>p.toLowerCase()===path.toLowerCase());if(existing)return existing;
 const parent=path.slice(0,path.lastIndexOf('/')),knownParent=t.dirs.find(p=>p.toLowerCase()===parent.toLowerCase());return knownParent?knownParent+path.slice(parent.length):path;
}
function tokenizeTerminal(input,shell='powershell'){
 const tokens=[];let value='',quote=null,started=false;
 for(const c of input.trim()){if(quote){if(c===quote)quote=null;else value+=c;started=true;}else if(c==='"'||(c==="'"&&shell==='powershell')){quote=c;started=true;}else if(/\s/.test(c)){if(started){tokens.push(value);value='';started=false;}}else{value+=c;started=true;}}
 if(quote)return {error:'Close the quotation mark before running the command.'};if(started)tokens.push(value);return {tokens};
}
function terminalCommand(input,t){
 const parsed=tokenizeTerminal(input,t.shell);if(parsed.error)return parsed.error;
 const [raw,...args]=parsed.tokens;if(!raw)return '';
 const cmd=raw.toLowerCase(),ps=t.shell==='powershell';
 if(/[|;&<>]/.test(input))return 'This lab does not implement pipelines, redirection, or chained commands. Run one supported command at a time.';
 const done=id=>{if(!t.tasks.includes(id))t.tasks.push(id);};
 const failUsage=usage=>'Usage: '+usage;
 if(cmd==='help')return ps?'Get-Location / pwd\nGet-ChildItem / ls / dir [path]\nSet-Location / cd <folder>\nGet-Content / cat / type <file>\nmkdir <folder>\nCopy-Item / copy <source> <destination>\nipconfig [/all]\nping <address>\nnslookup <name> [server]\ntracert <address>\ncls / clear\nOnly these commands are supported. No command changes your real files or network.':'cd [folder]\ndir [path]\ntype <file>\nmkdir <folder>\ncopy <source> <destination>\nipconfig [/all]\nping <address>\nnslookup <name> [server]\ntracert <address>\ncls\nOnly these commands are supported. No command changes your real files or network.';
 if(cmd==='cls'||(ps&&cmd==='clear')){t.history=[];return '';}
 if(ps&&['pwd','get-location'].includes(cmd)){if(args.length)return failUsage(raw);return t.cwd.replace(/\//g,'\\');}
 if(['cd','chdir'].includes(cmd)||(ps&&cmd==='set-location')){
  if(!args.length)return t.cwd.replace(/\//g,'\\');if(args.length!==1)return failUsage('cd <folder>');const path=terminalPath(args[0],t);
  if(!path||!t.dirs.includes(path))return 'Directory not found in this lab. Paths are limited to C:\\Lab.';t.cwd=path;return '';
 }
 if(cmd==='dir'||(ps&&['ls','get-childitem'].includes(cmd))){
  if(args.length>1)return failUsage(raw+' [path]');const path=terminalPath(args[0]||'.',t);
  if(!path||!t.dirs.includes(path))return 'Directory not found.';
  const prefix=path+'/',dirs=t.dirs.filter(p=>p.startsWith(prefix)&&!p.slice(prefix.length).includes('/')),files=Object.keys(t.files).filter(p=>p.startsWith(prefix)&&!p.slice(prefix.length).includes('/'));
  if(path==='C:/Lab')done('list');return 'Directory: '+path.replace(/\//g,'\\')+'\n'+[...dirs.map(p=>'[DIR] '+p.slice(prefix.length)),...files.map(p=>'      '+p.slice(prefix.length))].join('\n');
 }
 if(cmd==='type'||(ps&&['cat','get-content'].includes(cmd))){
  if(args.length!==1)return failUsage(raw+' <file>');const path=terminalPath(args[0],t);if(!path||t.files[path]===undefined)return 'File not found.';
  if(path==='C:/Lab/Documents/notes.txt'&&t.cwd==='C:/Lab/Documents')done('read');
  if(path==='C:/Lab/Backup/notes.txt'&&t.files[path]===t.files['C:/Lab/Documents/notes.txt'])done('copy');return t.files[path];
 }
 if(['mkdir','md'].includes(cmd)){
  if(args.length!==1)return failUsage('mkdir <folder>');const path=terminalPath(args[0],t);if(!path)return 'That path is outside the lab.';
  if(t.dirs.includes(path)||t.files[path]!==undefined)return 'That name already exists.';const parent=path.slice(0,path.lastIndexOf('/'));if(!t.dirs.includes(parent))return 'Parent directory not found.';t.dirs.push(path);return 'Created '+path.replace(/\//g,'\\');
 }
 if(cmd==='copy'||(ps&&cmd==='copy-item')){
  if(args.length!==2)return failUsage(raw+' <source> <destination>');const source=terminalPath(args[0],t);let dest=terminalPath(args[1],t);
  if(!source||t.files[source]===undefined)return 'Source file not found.';if(!dest)return 'Destination is outside the lab.';if(t.dirs.includes(dest))dest+='/'+source.split('/').pop();
  if(t.files[dest]!==undefined)return 'Destination exists. This lab will not overwrite it; choose another file name.';
  if(!t.dirs.includes(dest.slice(0,dest.lastIndexOf('/'))))return 'Destination directory not found.';t.files[dest]=t.files[source];return '1 file copied. Read the destination to verify it.';
 }
 if(cmd==='ipconfig'){
  if(args.length>1||(args.length===1&&args[0].toLowerCase()!=='/all'))return failUsage('ipconfig [/all]');done('config');return 'Ethernet adapter Lab\n  IPv4 Address: 192.168.10.24\n  Subnet Mask: 255.255.255.0\n  Default Gateway: 192.168.10.1\n  DNS Server: 192.168.10.53';
 }
 if(cmd==='ping'){
  if(args.length!==1)return failUsage('ping <address>');if(args[0]==='192.168.10.1'){done('gateway');return 'Reply from 192.168.10.1: bytes=32 time=1ms TTL=64\nPackets: Sent = 4, Received = 4, Lost = 0';}
  if(args[0]==='192.0.2.80')return 'Reply from 192.0.2.80: bytes=32 time=12ms TTL=52\nPackets: Sent = 4, Received = 4, Lost = 0';
  if(args[0]==='portal.example')return 'Ping request could not find host portal.example.';return 'No response in this simulated network. That alone does not prove a service is down.';
 }
 if(cmd==='nslookup'){
  if(args.length<1||args.length>2)return failUsage('nslookup <name> [server]');const server=args[1]||'192.168.10.53';
  if(args[0]!=='portal.example')return 'This lab has a record only for portal.example.';
  if(!['192.168.10.53','192.168.10.54'].includes(server))return 'That DNS server is not part of this lab.';
  if(!t.dnsChecks.includes(server))t.dnsChecks.push(server);if(t.dnsChecks.length===2)done('dns');
  return server==='192.168.10.53'?'Server: 192.168.10.53\nDNS request timed out. No answer received.':'Server: 192.168.10.54\nName: portal.example\nAddress: 192.0.2.80';
 }
 if(cmd==='tracert'){if(args.length!==1)return failUsage('tracert <address>');return args[0]==='192.0.2.80'?'Tracing route to 192.0.2.80\n  1   1 ms   192.168.10.1\n  2   *      Request timed out\n  3  12 ms   192.0.2.80\nTrace complete. A missing hop reply did not prevent reaching the destination.':'Use tracert 192.0.2.80 for the fixed trace in this lab.';}
 return 'Command not supported in this '+(ps?'PowerShell':'Command Prompt')+' lab. Type help to see supported commands.';
}
/* Inbox answers use the message and its visible supporting details. */
function inboxCorrect(message,action){return action===message.answer||(message.answer==='report'&&action==='delete');}
/* First-match IPv4 rules, for new packets. No simulated connection tracking. */
const FIREWALL_TRAFFIC=[
 {id:'guest-web',label:'Guest → public web',source:'10.10.0.24',destination:'198.51.100.20',protocol:'TCP',port:443,expected:'allow',why:'Guests need HTTPS access to this public web service.'},
 {id:'guest-db',label:'Guest → internal database',source:'10.10.0.24',destination:'10.30.0.20',protocol:'TCP',port:5432,expected:'deny',why:'Guests must not reach the database.'},
 {id:'public-web',label:'Internet → DMZ web server',source:'203.0.113.8',destination:'10.20.0.10',protocol:'TCP',port:443,expected:'allow',why:'The published web service needs inbound HTTPS.'},
 {id:'web-db',label:'Web server → database',source:'10.20.0.10',destination:'10.30.0.20',protocol:'TCP',port:5432,expected:'allow',why:'Only the named web server needs this database connection.'},
 {id:'other-dmz',label:'Other DMZ host → database',source:'10.20.0.50',destination:'10.30.0.20',protocol:'TCP',port:5432,expected:'deny',why:'Other DMZ hosts must not inherit the web server’s database access.'},
 {id:'admin-ssh',label:'Admin subnet → web management',source:'10.40.0.8',destination:'10.20.0.10',protocol:'TCP',port:22,expected:'allow',why:'The admin subnet needs SSH management access to the web server.'},
 {id:'guest-ssh',label:'Guest → web management',source:'10.10.0.24',destination:'10.20.0.10',protocol:'TCP',port:22,expected:'deny',why:'Guests must not reach the management service.'},
 {id:'internet-db',label:'Internet → database',source:'203.0.113.8',destination:'10.30.0.20',protocol:'TCP',port:5432,expected:'deny',why:'The database is not a public service.'}
];
function ipv4Number(value){const a=value.split('.');if(a.length!==4||a.some(v=>!/^\d{1,3}$/.test(v)||Number(v)>255))return null;return a.reduce((n,v)=>n*256+Number(v),0);}
function validRuleAddress(value){if(value==='any')return true;const p=value.split('/');return p.length<=2&&ipv4Number(p[0])!==null&&(p.length===1||(/^\d{1,2}$/.test(p[1])&&Number(p[1])<=32));}
function addressMatches(rule,address){if(rule==='any')return true;const [base,bits='32']=rule.split('/'),block=2**(32-Number(bits));return Math.floor(ipv4Number(base)/block)===Math.floor(ipv4Number(address)/block);}
function evaluatePacket(packet,rules){
 const index=rules.findIndex(r=>addressMatches(r.source,packet.source)&&addressMatches(r.destination,packet.destination)&&(r.protocol==='ANY'||r.protocol===packet.protocol)&&(r.port==='any'||(r.protocol==='ICMP'&&packet.protocol==='ICMP')||Number(r.port)===packet.port));
 return {action:index===-1?'deny':rules[index].action,index};
}
function checkFirewallRules(rules){return FIREWALL_TRAFFIC.map(packet=>({...packet,...evaluatePacket(packet,rules),passed:evaluatePacket(packet,rules).action===packet.expected}));}
/* Skills and review are separate from the completion and XP records. */
function renderMastery(){
 const p=lessonProgress(),totals=masteryTotals(p);
 document.getElementById('workshopContent').innerHTML=`<div class="workshop-summary">${['Not started','Learning','Proficient','Mastered'].map(level=>`<div><strong>${totals[level]}</strong><p>${level}</p></div>`).join('')}</div><aside class="lab-note"><strong>How a skill grows</strong><p>Passing a lesson makes it Proficient. A missed answer puts it in Learning until you pass its quiz without mistakes or answer both fresh review questions correctly. Mastered means a perfect lesson quiz plus both fresh review questions answered correctly, with no mistakes still waiting for review. Repeating the same quiz cannot earn Mastered on its own.</p><p>Completed lessons stay completed. Existing course completions begin as Proficient until you practise them again.</p></aside><div class="mastery-toolbar"><label>Show <select id="masteryFilter"><option value="all">All skills</option><option>Learning</option><option>Proficient</option><option>Mastered</option><option>Not started</option></select></label><button type="button" class="lesson-button primary" data-workshop="review">Start review</button></div><div id="skillMap">${Object.entries(STREETWISE_COURSES).map(([id,c])=>`<section class="mastery-course"><div class="lab-section-heading"><div><p class="lesson-eyebrow">${c.level}</p><h2>${escapeLesson(c.title)}</h2></div><span>${c.lessons.filter(l=>skillLevel(p,l.id)==='Mastered').length} / ${c.lessons.length} mastered</span></div><div class="skill-list">${c.lessons.map((l,i)=>`<article class="skill-row" data-skill-level="${skillLevel(p,l.id)}"><span class="skill-number">${i+1}</span><div><strong>${escapeLesson(l.title)}</strong><small>${skillState(p,l.id).lastScore?`${skillState(p,l.id).lastScore.correct} / ${skillState(p,l.id).lastScore.total} on last check`:'No new assessment recorded'} · ${skillState(p,l.id).reviewCorrect.length} / 2 fresh questions correct</small></div>${badgeSkill(skillLevel(p,l.id))}<button type="button" class="workshop-text-button" data-lab-action="open-topic" data-id="${l.id}">Open lesson</button></article>`).join('')}</div></section>`).join('')}</div><p id="skillFilterEmpty" class="lab-muted" hidden>No skills at this level yet.</p>`;
 document.getElementById('masteryFilter').addEventListener('change',e=>{
  const value=e.target.value;practiceRoot.querySelectorAll('.skill-row').forEach(row=>row.hidden=value!=='all'&&row.dataset.skillLevel!==value);
  practiceRoot.querySelectorAll('.mastery-course').forEach(section=>section.hidden=!Array.from(section.querySelectorAll('.skill-row')).some(row=>!row.hidden));
  document.getElementById('skillFilterEmpty').hidden=Array.from(practiceRoot.querySelectorAll('.skill-row')).some(row=>!row.hidden);
 });
}
function startReview(scope='focus'){
 editWorkshop((s,p)=>{
  let entries=allLessonEntries();
  if(scope==='topic'&&practiceOrigin)entries=entries.filter(e=>e.lesson.id===practiceOrigin);
  else if(STREETWISE_COURSES[scope])entries=entries.filter(e=>e.courseId===scope);
  else if(scope==='focus'){
   const active=entries.filter(e=>skillState(p,e.lesson.id).needsReview||p.completedLessons[e.lesson.id]||skillState(p,e.lesson.id).attempts>0);
   const preferred=['Beginner','Intermediate','Advanced'].includes(getCurrentUser().level)?getCurrentUser().level:'Beginner';
   entries=active.length?active:entries.filter(e=>e.course.level===preferred);
  }
  const ids=new Set(entries.map(e=>e.lesson.id)),cycle=s.review.cycle++;
  const questions=PRACTICE_DATA.reviewBank.filter(q=>ids.has(q.lessonId)).sort((a,b)=>{
   const priority=q=>skillState(p,q.lessonId).needsReview?0:skillLevel(p,q.lessonId)==='Mastered'?2:1;
   const ai=PRACTICE_DATA.reviewBank.indexOf(a),bi=PRACTICE_DATA.reviewBank.indexOf(b);
   return priority(a)-priority(b)||(s.review.history[a.id]?.seen||0)-(s.review.history[b.id]?.seen||0)||(cycle%2?-1:1)*((ai%2)-(bi%2))||((ai+cycle*7)%PRACTICE_DATA.reviewBank.length)-((bi+cycle*7)%PRACTICE_DATA.reviewBank.length);
  }).slice(0,5);
  s.review.session={ids:questions.map(q=>q.id),index:0,answers:{},complete:false,scope};
  questions.forEach(q=>{if(!s.review.history[q.id])s.review.history[q.id]={seen:0};s.review.history[q.id].seen++;});
 });renderReview();
}
function renderReview(){
 const p=lessonProgress(),s=workshopState(p),session=s.review.session,missed=allLessonEntries().filter(e=>skillState(p,e.lesson.id).needsReview);
 if(!session){
  document.getElementById('workshopContent').innerHTML=`<section class="review-intro lab-panel"><span class="workshop-icon" aria-hidden="true">↻</span><h2>${missed.length?'Give those tricky topics another try':'Build confidence with a fresh example'}</h2><p>${missed.length?`${missed.length} topic${missed.length===1?' needs':'s need'} review. Your session will put missed topics first.`:'Start with your current level or choose a course. These examples are different from the lesson quizzes.'}</p><form id="reviewStartForm"><label>Review focus<select id="reviewScope"><option value="focus">Missed topics and recent learning</option>${practiceOrigin?`<option value="topic">This lesson: ${escapeLesson(lessonEntry(practiceOrigin).lesson.title)}</option>`:''}${Object.entries(STREETWISE_COURSES).map(([id,c])=>`<option value="${id}">${c.level}: ${escapeLesson(c.title)}</option>`).join('')}</select></label><button type="submit" class="lesson-button primary">Start review</button></form><p class="lab-muted">Up to five questions per session. Two new examples per skill; future sessions rotate through the available questions. Reviews update skills without awarding repeat XP.</p></section>${missed.length?`<section class="lab-panel"><h2>Topics waiting for review</h2>${missed.map(e=>`<div class="review-missed-row"><span>${escapeLesson(e.lesson.title)}</span><button type="button" class="workshop-text-button" data-lab-action="open-topic" data-id="${e.lesson.id}">Read lesson</button></div>`).join('')}</section>`:''}`;
  if(practiceOrigin)document.getElementById('reviewScope').value='topic';
  document.getElementById('reviewStartForm').addEventListener('submit',e=>{e.preventDefault();startReview(document.getElementById('reviewScope').value);});return;
 }
 const questions=session.ids.map(id=>PRACTICE_DATA.reviewBank.find(q=>q.id===id)),correct=questions.filter(q=>session.answers[q.id]?.correct).length;
 if(session.complete){
  document.getElementById('workshopContent').innerHTML=`<section class="review-result lab-panel"><p class="practice-tag">Review complete</p><h2>${correct} / ${questions.length} correct</h2><p>Your skill map is up to date. Revisit a lesson or start another set of examples.</p><div class="lesson-actions"><button type="button" class="lesson-button primary" data-lab-action="review-new">Choose another review</button><button type="button" class="lesson-button" data-workshop="mastery">View skill map</button></div>${questions.map(q=>{const r=session.answers[q.id];return `<article class="review-summary-item"><div><strong>${r.correct?'✓':'↻'} ${escapeLesson(lessonEntry(q.lessonId).lesson.title)}</strong>${badgeSkill(skillLevel(p,q.lessonId))}</div><p>${escapeLesson(q.prompt)}</p><p class="${r.correct?'review-correct-copy':'review-wrong-copy'}">Correct response: ${escapeLesson(q.options[q.answer])}</p><p>${escapeLesson(q.explanation)}</p><button type="button" class="workshop-text-button" data-lab-action="open-topic" data-id="${q.lessonId}">Read this lesson</button></article>`;}).join('')}</section>`;return;
 }
 const q=questions[session.index],result=session.answers[q.id],entry=lessonEntry(q.lessonId);
 document.getElementById('workshopContent').innerHTML=`<div class="lab-progress"><span>${Object.keys(session.answers).length} / ${questions.length} answered</span><div role="progressbar" aria-label="Review progress" aria-valuemin="0" aria-valuemax="${questions.length}" aria-valuenow="${Object.keys(session.answers).length}"><span style="width:${Object.keys(session.answers).length/questions.length*100}%"></span></div></div><section class="lab-panel review-question"><p class="lesson-eyebrow">${entry.course.level} · ${escapeLesson(entry.lesson.title)} · Question ${session.index+1} of ${questions.length}</p><h2>${escapeLesson(q.prompt)}</h2><div class="lesson-options">${q.options.map((o,i)=>`<button type="button" class="lesson-option ${result&&i===q.answer?'practice-correct':result&&result.choice===i?'decision-wrong':''}" data-lab-action="review-answer" data-index="${i}" ${result?'disabled':''}><span class="answer-letter">${result&&i===q.answer?'✓':String.fromCharCode(65+i)}</span><span>${escapeLesson(o)}</span></button>`).join('')}</div>${result?`<p class="lesson-feedback ${result.correct?'correct':'incorrect'}" role="status">${result.correct?'Correct.':'Take another look.'} ${escapeLesson(q.explanation)}</p><div class="lesson-actions"><button type="button" class="workshop-text-button" data-lab-action="open-topic" data-id="${q.lessonId}">Read this lesson</button><button type="button" class="lesson-button primary" data-lab-action="review-next">${session.index===questions.length-1?'See results':'Next question'}</button></div>`:'<p class="lab-muted">Choose one answer to check it.</p>'}</section><button type="button" class="workshop-text-button" data-lab-action="review-new">Choose a different focus</button>`;
}
function answerReview(choice){
 editWorkshop((w,p)=>{
  const session=w.review.session;if(!session||session.complete)return;const q=PRACTICE_DATA.reviewBank.find(q=>q.id===session.ids[session.index]);if(session.answers[q.id])return;
  const correct=choice===q.answer;session.answers[q.id]={choice,correct};const s=skillState(p,q.lessonId);s.attempts++;s.lastPracticed=Date.now();s.lastScore={correct:correct?1:0,total:1};
  if(correct){if(!s.reviewCorrect.includes(q.id))s.reviewCorrect.push(q.id);if(!s.recoveryCorrect.includes(q.id))s.recoveryCorrect.push(q.id);if(s.recoveryCorrect.length>=2)s.needsReview=false;}
  else{s.needsReview=true;s.recoveryCorrect=[];s.reviewCorrect=s.reviewCorrect.filter(id=>id!==q.id);}
 });renderReview();renderPracticeEntry();
}

/* Case choices branch into recovery decisions when a response misses the evidence. */
function incidentState(w,id){if(!w.incidents.cases[id])w.incidents.cases[id]={stage:0,decisions:[],complete:false};return w.incidents.cases[id];}
function renderIncidents(){
 const w=workshopState(lessonProgress()),id=w.incidents.active,c=PRACTICE_DATA.incidents.find(c=>c.id===id);
 if(!c){document.getElementById('workshopContent').innerHTML=`<div class="incident-intro lab-note"><strong>Read the evidence before acting</strong><p>Each case has four decision points. A risky choice opens a consequence branch; revise the response to continue. The debrief keeps your first decisions as well as corrections.</p></div><div class="incident-case-grid">${PRACTICE_DATA.incidents.map((c,i)=>{const state=w.incidents.cases[c.id];return `<button type="button" class="workshop-card" data-lab-action="incident-open" data-id="${c.id}"><span class="case-number">Case ${String(i+1).padStart(2,'0')}</span><strong>${c.title}</strong><span class="workshop-card-copy">${c.summary}</span><span class="workshop-card-footer">${state?.complete?'✓ Case complete · Read debrief':state?.stage?'Continue at decision '+(state.stage+1):'Open evidence file'} <span aria-hidden="true">↗</span></span></button>`;}).join('')}</div>`;return;}
 const s=incidentState(w,c.id);
 if(s.complete){
  const firstCorrect=s.decisions.filter(d=>d.firstCorrect).length;
  document.getElementById('workshopContent').innerHTML=`<section class="lab-panel incident-debrief"><p class="practice-tag">Case resolved</p><h2>${escapeLesson(c.title)}</h2><p>${firstCorrect} / ${c.stages.length} first decisions followed the evidence. All response steps have now been corrected and completed.</p>${c.stages.map((stage,i)=>`<article class="incident-debrief-step"><span class="case-number">Decision ${i+1}</span><h3>${stage.title}</h3><p><strong>Your first choice:</strong> ${escapeLesson(stage.options[s.decisions[i].firstChoice])}</p>${!s.decisions[i].firstCorrect?`<p class="review-wrong-copy"><strong>Consequence:</strong> ${escapeLesson(stage.consequence)}</p>`:''}<p><strong>Response taken:</strong> ${escapeLesson(stage.options[stage.answer])}</p><p>${escapeLesson(stage.explanation)}</p></article>`).join('')}<div class="lesson-actions"><button type="button" class="lesson-button" data-lab-action="incident-list">Other case files</button><button type="button" class="lesson-button primary" data-lab-action="incident-reset" data-id="${c.id}">Practise this case again</button></div></section>`;return;
 }
 const stage=c.stages[s.stage],decision=s.decisions[s.stage],checked=!!decision,correct=decision?.resolved,resolved=s.decisions.filter(d=>d?.resolved).length;
 document.getElementById('workshopContent').innerHTML=`<div class="lab-progress"><span>Case file: ${escapeLesson(c.title)} · ${resolved} / 4 decisions resolved</span><div role="progressbar" aria-label="Case progress" aria-valuemin="0" aria-valuemax="4" aria-valuenow="${resolved}"><span style="width:${resolved/4*100}%"></span></div></div><section class="incident-stage lab-panel"><p class="practice-tag">Decision ${s.stage+1} / 4</p><h2>${stage.title}</h2><p>${escapeLesson(c.summary)}</p><div class="incident-evidence"><div class="lab-section-heading"><h3>${stage.source}</h3><label>Filter evidence<input id="incidentLogFilter" type="search" placeholder="e.g. identity"></label></div><div class="lab-table-wrap"><table class="lab-table"><caption>Practice evidence · UTC timestamps unless noted</caption><thead><tr><th scope="col">Time</th><th scope="col">Source</th><th scope="col">Observation</th></tr></thead><tbody id="incidentLogRows">${stage.rows.map(row=>`<tr>${row.map(text=>`<td>${escapeLesson(text)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p id="incidentFilterEmpty" hidden>No evidence matches that filter.</p></div><h3>${escapeLesson(stage.prompt)}</h3><div class="lesson-options">${stage.options.map((o,i)=>`<button type="button" class="lesson-option ${correct&&i===stage.answer?'practice-correct':checked&&!correct&&decision.lastChoice===i?'decision-wrong':''}" data-lab-action="incident-answer" data-index="${i}" ${correct?'disabled':''}><span class="answer-letter">${correct&&i===stage.answer?'✓':String.fromCharCode(65+i)}</span><span>${escapeLesson(o)}</span></button>`).join('')}</div>${checked?`<aside class="incident-consequence ${correct?'correct':'incorrect'}" role="status"><strong>${correct?'Response supported by the evidence':'Consequence branch'}</strong><p>${escapeLesson(correct?stage.explanation:stage.consequence)}</p>${!correct?'<p>Use the evidence above to revise the response. Your first decision stays in the case debrief.</p>':''}</aside>`:''}${correct?`<button type="button" class="lesson-button primary" data-lab-action="incident-next">${s.stage===3?'Complete case and read debrief':'Continue investigation'}</button>`:''}</section><button type="button" class="workshop-text-button" data-lab-action="incident-list">Back to case files</button>`;
 document.getElementById('incidentLogFilter').addEventListener('input',e=>{const query=e.target.value.toLowerCase();practiceRoot.querySelectorAll('#incidentLogRows tr').forEach(row=>row.hidden=!row.textContent.toLowerCase().includes(query));document.getElementById('incidentFilterEmpty').hidden=Array.from(practiceRoot.querySelectorAll('#incidentLogRows tr')).some(row=>!row.hidden);});
}

/* Shared glossary: readable page and accessible native dialog from lesson terms. */
function renderGlossary(){
 document.getElementById('workshopContent').innerHTML=`<label class="glossary-search">Find a term<input id="glossarySearch" type="search" placeholder="Search a term, definition, or example"></label><p id="glossaryCount" class="lab-muted">${PRACTICE_DATA.glossary.length} terms</p><div class="glossary-grid">${PRACTICE_DATA.glossary.map(t=>`<article class="glossary-entry"><h2>${escapeLesson(t.term)}</h2><p>${escapeLesson(t.definition)}</p><p class="glossary-example"><strong>Example</strong> ${escapeLesson(t.example)}</p></article>`).join('')}</div><p id="glossaryEmpty" class="lab-note" hidden>No terms match. Try a shorter word.</p>`;
 document.getElementById('glossarySearch').addEventListener('input',e=>{
  const query=e.target.value.trim().toLowerCase();let visible=0;practiceRoot.querySelectorAll('.glossary-entry').forEach((entry,i)=>{const aliases=PRACTICE_DATA.glossary[i].aliases.join(' ');entry.hidden=!(entry.textContent+' '+aliases).toLowerCase().includes(query);if(!entry.hidden)visible++;});document.getElementById('glossaryCount').textContent=visible+' term'+(visible===1?'':'s');document.getElementById('glossaryEmpty').hidden=visible!==0;
 });
}
function decorateLessonGlossary(){
 const article=lessonRoot.querySelector('.lesson-reading');if(!article)return;
 const aliases=PRACTICE_DATA.glossary.flatMap(term=>term.aliases.map(alias=>({alias,id:term.id}))).sort((a,b)=>b.alias.length-a.alias.length),used=new Set();
 const escaped=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const pattern=new RegExp('\\b('+aliases.map(a=>escaped(a.alias)).join('|')+')\\b','gi');
 article.querySelectorAll('p,td').forEach(p=>{
  const walker=document.createTreeWalker(p,NodeFilter.SHOW_TEXT),nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  nodes.forEach(node=>{const value=node.nodeValue,fragment=document.createDocumentFragment();let end=0,has=false;pattern.lastIndex=0;let match;
   while((match=pattern.exec(value))){const term=aliases.find(a=>a.alias.toLowerCase()===match[0].toLowerCase());if(!term||used.has(term.id))continue;
    fragment.append(document.createTextNode(value.slice(end,match.index)));const button=document.createElement('button');button.type='button';button.className='glossary-term';button.dataset.glossary=term.id;button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-label',match[0]+': open definition');button.textContent=match[0];fragment.append(button);used.add(term.id);has=true;end=match.index+match[0].length;
   }if(has){fragment.append(document.createTextNode(value.slice(end)));node.replaceWith(fragment);}
  });
 });
}
function openGlossaryTerm(id,trigger){
 const term=PRACTICE_DATA.glossary.find(t=>t.id===id);if(!term)return;
 glossaryReturnFocus=trigger||document.activeElement;const dialog=document.getElementById('glossaryDialog');
 dialog.innerHTML=`<div class="glossary-dialog-header"><p class="practice-tag">Glossary</p><button type="button" class="glossary-close" aria-label="Close definition">×</button></div><h2 id="glossaryDialogTitle">${escapeLesson(term.term)}</h2><p>${escapeLesson(term.definition)}</p><aside class="lab-note"><strong>Example</strong><p>${escapeLesson(term.example)}</p></aside><button type="button" class="workshop-text-button" data-workshop="glossary" data-origin="${lessonPlayer.lessonId||''}">Browse all terms</button>`;
 dialog.showModal();dialog.querySelector('.glossary-close').onclick=()=>dialog.close();
}

practiceRoot.addEventListener('click',event=>{
 const b=event.target.closest('button[data-lab-action]');if(!b||b.disabled)return;
 const action=b.dataset.labAction,index=Number(b.dataset.index);
 if(action==='dashboard'){closePractice();return;}
 if(action==='return-lesson'||action==='open-topic'){
  const entry=lessonEntry(action==='open-topic'?b.dataset.id:practiceOrigin);if(entry)openCourse(entry.courseId,entry.lesson.id);return;
 }
 if(action==='terminal-reset'){editWorkshop(w=>w.terminal=freshTerminal());renderTerminal();return;}
 if(action==='terminal-use-command'){const input=document.getElementById('terminalCommand');input.value=b.dataset.command;input.focus({preventScroll:true});return;}
 if(action==='terminal-diagnosis'){
  const t=workshopState(lessonProgress()).terminal;if(!['config','gateway','dns'].every(id=>t.tasks.includes(id)))return;
  if(index===0){editWorkshop(w=>{if(!w.terminal.tasks.includes('diagnosis'))w.terminal.tasks.push('diagnosis');});renderTerminal();}
  else{const f=document.getElementById('terminalDiagnosisFeedback');f.className='lesson-feedback incorrect';f.textContent='Check the results again. The router replies, and the second DNS server answers. That points to a problem with the first DNS server or the connection to it.';}
  return;
 }
 if(action==='inbox-select'){editWorkshop(w=>w.inbox.index=Math.max(0,Math.min(7,index)));renderInbox();return;}
 if(action==='inbox-inspect'){editWorkshop(w=>{const m=PRACTICE_DATA.inbox[w.inbox.index];if(!w.inbox.inspected[m.id])w.inbox.inspected[m.id]=[];if(!w.inbox.inspected[m.id].includes(b.dataset.part))w.inbox.inspected[m.id].push(b.dataset.part);});renderInbox();return;}
 if(action==='inbox-decide'){editWorkshop(w=>{const m=PRACTICE_DATA.inbox[w.inbox.index];w.inbox.answers[m.id]={action:b.dataset.choice,correct:inboxCorrect(m,b.dataset.choice)};});renderInbox();practiceRoot.querySelector(`[data-lab-action="inbox-decide"][data-choice="${b.dataset.choice}"]`)?.focus({preventScroll:true});return;}
 if(action.startsWith('rule-')){
  const f=workshopState(lessonProgress()).firewall;if(index<0||index>=f.rules.length)return;
  if(action==='rule-edit'){
   const r=f.rules[index],form=document.getElementById('firewallRuleForm');form.dataset.edit=index;
   ['Source','Destination','Protocol','Port','Action'].forEach(key=>document.getElementById('rule'+key).value=r[key.toLowerCase()]);document.getElementById('ruleFormTitle').textContent='Edit rule '+(index+1);document.getElementById('saveFirewallRule').textContent='Save rule';document.getElementById('ruleSource').focus();return;
  }
  editWorkshop(w=>{const r=w.firewall.rules;if(action==='rule-remove')r.splice(index,1);if(action==='rule-up'&&index>0)[r[index-1],r[index]]=[r[index],r[index-1]];if(action==='rule-down'&&index<r.length-1)[r[index],r[index+1]]=[r[index+1],r[index]];w.firewall.tested=false;w.firewall.passed=false;});renderFirewall();return;
 }
 if(action==='firewall-clear'){editWorkshop(w=>w.firewall={rules:[],tested:false});renderFirewall();return;}
 if(action==='firewall-test'){editWorkshop(w=>{w.firewall.tested=true;w.firewall.passed=checkFirewallRules(w.firewall.rules).every(r=>r.passed);});renderFirewall();document.getElementById('firewallResult').scrollIntoView({block:'nearest',behavior:'smooth'});return;}
 if(action==='review-new'){editWorkshop(w=>w.review.session=null);renderReview();return;}
 if(action==='review-answer'){answerReview(index);return;}
 if(action==='review-next'){editWorkshop(w=>{const s=w.review.session;if(!s.answers[s.ids[s.index]])return;if(s.index<s.ids.length-1)s.index++;else s.complete=true;});renderReview();return;}
 if(action==='incident-open'){editWorkshop(w=>{w.incidents.active=b.dataset.id;incidentState(w,b.dataset.id);});renderIncidents();return;}
 if(action==='incident-list'){editWorkshop(w=>w.incidents.active=null);renderIncidents();return;}
 if(action==='incident-reset'){editWorkshop(w=>{delete w.incidents.cases[b.dataset.id];incidentState(w,b.dataset.id);});renderIncidents();return;}
 if(action==='incident-answer'){
  editWorkshop(w=>{const c=PRACTICE_DATA.incidents.find(c=>c.id===w.incidents.active),s=incidentState(w,c.id),stage=c.stages[s.stage];if(s.complete||s.decisions[s.stage]?.resolved)return;
   if(!s.decisions[s.stage])s.decisions[s.stage]={firstChoice:index,firstCorrect:index===stage.answer,attempts:0};const d=s.decisions[s.stage];d.lastChoice=index;d.attempts++;d.resolved=index===stage.answer;
  });renderIncidents();return;
 }
 if(action==='incident-next'){editWorkshop(w=>{const c=PRACTICE_DATA.incidents.find(c=>c.id===w.incidents.active),s=incidentState(w,c.id);if(!s.decisions[s.stage]?.resolved)return;if(s.stage===c.stages.length-1){s.complete=true;s.completedAt=Date.now();}else s.stage++;});renderIncidents();return;}
});
document.addEventListener('click',event=>{
 const term=event.target.closest('button[data-glossary]');if(term){openGlossaryTerm(term.dataset.glossary,term);return;}
 const button=event.target.closest('button[data-workshop]');if(!button||button.disabled)return;
 const dialog=document.getElementById('glossaryDialog');if(dialog.open)dialog.close();openPractice(button.dataset.workshop,true,button.dataset.origin);
});
function initPracticeFeatures(){
 renderPracticeEntry();const dialog=document.getElementById('glossaryDialog');dialog.addEventListener('close',()=>{if(glossaryReturnFocus?.isConnected)glossaryReturnFocus.focus({preventScroll:true});});
 dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
}

/* The workshop presents one task at a time. Its existing engines retain saved results. */
function terminalGuide(t,id){
 const root='C:\\Lab',docs=root+'\\Documents';
 if(id==='list')return t.cwd==='C:/Lab'?['dir','This shows the files and folders here.']:['cd '+root,'Go back to the practice folder first.'];
 if(id==='read')return t.cwd==='C:/Lab/Documents'?['type notes.txt','This shows what is written in the file.']:['cd '+docs,'Move into Documents before reading the file.'];
 if(id==='copy'){
  if(!t.dirs.includes('C:/Lab/Backup'))return ['mkdir '+root+'\\Backup','Make a folder for your backup copy.'];
  if(t.files['C:/Lab/Backup/notes.txt']===undefined)return ['copy '+docs+'\\notes.txt '+root+'\\Backup\\notes.txt','Copy the note into Backup. The original stays where it is.'];
  return ['type '+root+'\\Backup\\notes.txt','Read the copy to check that it worked.'];
 }
 if(id==='config')return ['ipconfig /all','This shows the computer’s network address, router, and DNS server.'];
 if(id==='gateway')return ['ping 192.168.10.1','Check whether the router replies to this computer.'];
 if(id==='dns')return t.dnsChecks.includes('192.168.10.53')?['nslookup portal.example 192.168.10.54','Try a second DNS server and compare the answer.']:['nslookup portal.example','Ask the current DNS server to find this website’s address.'];
 return null;
}
function renderTerminal(){
 const t=workshopState(lessonProgress()).terminal,finished=TERMINAL_TASKS.filter(task=>t.tasks.includes(task.id)).length,percent=Math.round(finished/TERMINAL_TASKS.length*100);
 const task=TERMINAL_TASKS.find(task=>!t.tasks.includes(task.id)),guide=task?terminalGuide(t,task.id):null;
 const titles={list:'Find the folders',read:'Read the note',copy:'Make a backup copy',config:'See the network settings',gateway:'Check the router',dns:'Check the website’s address',diagnosis:'Explain what you found'};
 const diagnosis=(!task||task.id==='diagnosis')?`<section class="lab-panel terminal-diagnosis"><p class="practice-tag">Last step</p><h2>What do these checks tell you?</h2><div class="lesson-options">${['The router replies. The first DNS server did not answer, but the second one did. Check the first DNS server and the connection to it.','The computer has no network connection at all.','Every website must be working because the router replies.'].map((answer,i)=>`<button type="button" class="lesson-option ${t.tasks.includes('diagnosis')&&i===0?'practice-correct':''}" data-lab-action="terminal-diagnosis" data-index="${i}"><span class="answer-letter">${t.tasks.includes('diagnosis')&&i===0?'✓':String.fromCharCode(65+i)}</span><span>${escapeLesson(answer)}</span></button>`).join('')}</div><p id="terminalDiagnosisFeedback" class="lesson-feedback ${t.tasks.includes('diagnosis')?'correct':''}" role="status">${t.tasks.includes('diagnosis')?'Correct. The comparison points to the first DNS server or the connection to it. More checks would be needed to find the exact cause.':'Choose the answer that matches the results in the terminal.'}</p></section>`:'';
 document.getElementById('workshopContent').innerHTML=`<div class="lab-progress"><span>${finished} of ${TERMINAL_TASKS.length} steps complete${!task?' · ✓ Activity complete':''}</span><div role="progressbar" aria-label="Terminal lab progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><span style="width:${percent}%"></span></div></div><div class="terminal-layout terminal-guided-layout"><aside class="terminal-tasks terminal-current-step" aria-label="Current step"><p class="practice-tag">${task?'Step '+(TERMINAL_TASKS.indexOf(task)+1)+' of '+TERMINAL_TASKS.length:'Finished'}</p><h2>${task?titles[task.id]:'You completed the activity'}</h2>${guide?`<p>${escapeLesson(guide[1])}</p><p class="lab-muted">Type this command, then press Run.</p><code class="terminal-suggested-command">${escapeLesson(guide[0])}</code><button type="button" class="lesson-button" data-lab-action="terminal-use-command" data-command="${escapeLesson(guide[0])}">Use this command</button>`:`<p>${task?'You checked the settings, router, and DNS servers. Answer the question below to finish.':'You used commands to work with files and check a network problem.'}</p>${!task?'<button type="button" class="lesson-button" data-workshop="home">Back to workshop</button>':''}`}<details class="terminal-step-list"><summary>See all steps</summary><ol>${TERMINAL_TASKS.map(step=>`<li class="${t.tasks.includes(step.id)?'task-done':''}"><span class="task-check" aria-hidden="true">${t.tasks.includes(step.id)?'✓':'○'}</span><span>${titles[step.id]}</span></li>`).join('')}</ol></details></aside><section class="terminal-panel" aria-label="Practice terminal"><div class="terminal-toolbar"><span><span class="terminal-light" aria-hidden="true"></span> Practice terminal</span><span>Type a command below</span></div><div id="terminalOutput" class="terminal-output" role="log" aria-label="Command output" aria-live="polite">${t.history.map(h=>`<pre class="${h.kind==='command'?'terminal-command':''}">${escapeLesson(h.text)}</pre>`).join('')}</div><form id="terminalForm" class="terminal-form"><label for="terminalCommand" id="terminalPrompt">${t.shell==='powershell'?'PS ':''}${escapeLesson(t.cwd.replace(/\//g,'\\'))}&gt;</label><input id="terminalCommand" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Command"><button type="submit">Run</button></form><p class="terminal-caption">A practice computer with example files. Your real files stay as they are.</p></section></div>${diagnosis}<details class="workshop-extra-settings"><summary>More options</summary><div class="terminal-extra-options"><label>Command language <select id="terminalShell"><option value="powershell" ${t.shell==='powershell'?'selected':''}>PowerShell</option><option value="cmd" ${t.shell==='cmd'?'selected':''}>Command Prompt</option></select></label><p class="lab-muted">The suggested commands work in either option. Type <code>help</code> to see other supported commands.</p><button type="button" class="workshop-text-button" data-lab-action="terminal-reset">Start this activity over</button></div></details>`;
 const output=document.getElementById('terminalOutput');output.scrollTop=output.scrollHeight;
 document.getElementById('terminalForm').addEventListener('submit',e=>{
  e.preventDefault();const input=document.getElementById('terminalCommand').value.trim();if(!input)return;
  editWorkshop(s=>{const t=s.terminal;t.history.push({kind:'command',text:(t.shell==='powershell'?'PS ':'')+t.cwd.replace(/\//g,'\\')+'> '+input});const out=terminalCommand(input,t);if(out)t.history.push({kind:'output',text:out});if(t.history.length>100)t.history=t.history.slice(-100);});
  renderTerminal();document.getElementById('terminalCommand').focus({preventScroll:true});
 });
 document.getElementById('terminalShell').addEventListener('change',e=>{editWorkshop(s=>s.terminal.shell=e.target.value);renderTerminal();document.querySelector('.workshop-extra-settings').open=true;document.getElementById('terminalShell').focus({preventScroll:true});});
}

function renderInbox(){
 const s=workshopState(lessonProgress()).inbox,total=PRACTICE_DATA.inbox.length,index=Math.min(s.index,total-1),m=PRACTICE_DATA.inbox[index],result=s.answers[m.id];
 const extra=index>=WORKSHOP_INBOX_COUNT,start=extra?WORKSHOP_INBOX_COUNT:0,end=extra?total:WORKSHOP_INBOX_COUNT,messages=PRACTICE_DATA.inbox.slice(start,end),count=messages.length;
 const judged=messages.filter(mail=>s.answers[mail.id]).length,correct=messages.filter(mail=>s.answers[mail.id]?.correct).length,selectedAction=result?.action==='delete'?'report':result?.action;
 document.getElementById('workshopContent').innerHTML=`<div class="lab-progress"><span>${judged} of ${count} ${extra?'extra examples':'messages'} checked</span><div role="progressbar" aria-label="Inbox practice progress" aria-valuemin="0" aria-valuemax="${count}" aria-valuenow="${judged}"><span style="width:${judged/count*100}%"></span></div></div><section class="inbox-message inbox-single-message"><p class="lesson-eyebrow">${extra?'Extra example':'Message'} ${index-start+1} of ${count} · ${m.level}</p><h2>${escapeLesson(m.subject)}</h2><p class="inbox-from">From: <strong>${escapeLesson(m.sender)}</strong></p><p class="inbox-body">${escapeLesson(m.body)}</p><span class="inbox-fake-link">${escapeLesson(m.linkLabel)}</span><div class="inbox-visible-details"><h3>Check these details</h3><dl>${[['Sender address',m.address],['Link goes to',m.link],['What you know',m.context]].map(([label,detail])=>`<div><dt>${label}</dt><dd>${escapeLesson(detail)}</dd></div>`).join('')}</dl></div><h3>What would you do?</h3><div class="inbox-decisions inbox-simple-decisions" aria-label="Message decision">${[['trust','Keep it'],['verify','Check first'],['report','Report a scam']].map(([action,label])=>`<button type="button" class="lesson-button ${selectedAction===action?(result.correct?'decision-correct':'decision-wrong'):''}" data-lab-action="inbox-decide" data-choice="${action}">${selectedAction===action?(result.correct?'✓ ':'↻ '):''}${label}</button>`).join('')}</div><p id="inboxFeedback" class="lesson-feedback ${result?(result.correct?'correct':'incorrect'):''}" role="status">${result?`${result.correct?'Good choice.':'Take another look.'} ${escapeLesson(m.explanation)}`:'Choose Keep it if the details check out, Check first if you need more information, or Report a scam if the evidence points to a scam.'}</p><div class="lesson-actions"><button type="button" class="lesson-button" data-lab-action="inbox-select" data-index="${Math.max(start,index-1)}" ${index===start?'disabled':''}>Previous</button>${index<end-1?`<button type="button" class="lesson-button primary" data-lab-action="inbox-select" data-index="${index+1}" ${!result?'disabled':''}>Next message</button>`:'<button type="button" class="lesson-button" data-workshop="home">Back to workshop</button>'}</div>${judged===count?`<aside class="lab-note"><strong>${correct===count?(extra?'✓ Extra examples complete':'✓ Activity complete'):'All messages checked'}</strong><p>${correct} of ${count} decisions were correct. You can return to a message and try again.</p></aside>`:''}<details class="workshop-extra-settings"><summary>More examples</summary><p class="lab-muted">Four everyday messages are the main activity. The extra examples are harder and optional.</p><label>Choose a message<select id="inboxMessageSelect">${PRACTICE_DATA.inbox.map((mail,i)=>`<option value="${i}" ${i===index?'selected':''}>${i+1}. ${escapeLesson(mail.subject)}</option>`).join('')}</select></label></details></section>`;
 document.getElementById('inboxMessageSelect').addEventListener('change',e=>{editWorkshop(w=>w.inbox.index=Number(e.target.value));renderInbox();document.querySelector('.inbox-single-message h2').setAttribute('tabindex','-1');document.querySelector('.inbox-single-message h2').focus({preventScroll:true});});
}

const GUIDED_FIREWALL_SOURCES=[['10.10.0.0/24','Guest computers'],['10.20.0.10','Web server'],['10.20.0.0/24','All DMZ computers'],['10.40.0.0/24','Admin computers'],['any','Any computer']];
const GUIDED_FIREWALL_DESTINATIONS=[['198.51.100.20','Public website'],['10.20.0.10','Web server'],['10.30.0.20','Database'],['any','Any computer']];
const GUIDED_FIREWALL_SERVICES=[['https','Website (HTTPS)','TCP','443'],['database','Database','TCP','5432'],['ssh','Admin login (SSH)','TCP','22'],['any','Any connection','ANY','any']];
function friendlyFirewallAddress(value){return [...GUIDED_FIREWALL_SOURCES,...GUIDED_FIREWALL_DESTINATIONS].find(([address])=>address===value)?.[1]||value;}
function friendlyFirewallService(rule){return GUIDED_FIREWALL_SERVICES.find(service=>service[2]===rule.protocol&&service[3]===String(rule.port))?.[1]||rule.protocol+' '+rule.port;}
function renderFirewall(){
 const f=workshopState(lessonProgress()).firewall,results=f.tested?checkFirewallRules(f.rules):null;
 document.getElementById('workshopContent').innerHTML=`<section class="lab-panel firewall-simple-goal"><p class="practice-tag">Your goal</p><h2>Allow the connections people need</h2><p>Make rules for these four connections. Leave the other connections blocked.</p><ul class="firewall-simple-requirements"><li><strong>Guest computers → Public website</strong><span>Website (HTTPS)</span></li><li><strong>Any computer → Web server</strong><span>Website (HTTPS)</span></li><li><strong>Web server → Database</strong><span>Database</span></li><li><strong>Admin computers → Web server</strong><span>Admin login (SSH)</span></li></ul></section><section class="lab-panel firewall-guided-editor"><h2>Add a connection</h2><p class="lab-muted">Choose where the connection starts, where it goes, and what it is used for.</p><form id="guidedFirewallRuleForm" class="guided-firewall-form"><label>From<select id="guidedRuleSource" required><option value="">Choose computers</option>${GUIDED_FIREWALL_SOURCES.map(([value,label])=>`<option value="${value}">${label}</option>`).join('')}</select></label><label>To<select id="guidedRuleDestination" required><option value="">Choose a destination</option>${GUIDED_FIREWALL_DESTINATIONS.map(([value,label])=>`<option value="${value}">${label}</option>`).join('')}</select></label><label>Connection<select id="guidedRuleService" required><option value="">Choose a connection</option>${GUIDED_FIREWALL_SERVICES.map(([value,label])=>`<option value="${value}">${label}</option>`).join('')}</select></label><button type="submit" class="lesson-button primary">Allow connection</button></form><p id="guidedRuleError" role="alert"></p><h3>Your rules</h3>${f.rules.length?`<ol class="firewall-friendly-rules">${f.rules.map((rule,i)=>`<li><div><strong>${escapeLesson(friendlyFirewallAddress(rule.source))} → ${escapeLesson(friendlyFirewallAddress(rule.destination))}</strong><span>${escapeLesson(friendlyFirewallService(rule))} · ${rule.action==='allow'?'Allowed':'Blocked'}</span></div><button type="button" class="workshop-text-button" data-lab-action="rule-remove" data-index="${i}" aria-label="Remove rule ${i+1}">Remove</button></li>`).join('')}</ol>`:'<p class="lab-muted">Your first rule will appear here.</p>'}<p class="lab-muted">Rules are checked from top to bottom. A connection with no matching rule is blocked.</p><button type="button" class="lesson-button primary" data-lab-action="firewall-test">Test your rules</button></section>${results?`<section class="lab-panel"><h2>What happened?</h2><p id="firewallResult" class="lesson-feedback ${results.every(result=>result.passed)?'correct':'incorrect'}" role="status">${results.filter(result=>result.passed).length} of 8 checks correct.${results.every(result=>result.passed)?' ✓ Activity complete.':' Check the connections marked below.'}</p><div class="packet-grid">${results.map(result=>`<article class="packet-card ${result.passed?'packet-pass':'packet-fail'}"><div><strong>${escapeLesson(result.label)}</strong><span class="packet-badge ${result.action}">${result.action==='allow'?'Allowed':'Blocked'}</span></div><p>${result.passed?'✓ Correct':`↻ This should be ${result.expected==='allow'?'allowed':'blocked'}.`}</p>${!result.passed?`<p>${escapeLesson(result.why)}</p>`:''}<details><summary>Show network details</summary><p><code>${result.source} → ${result.destination}<br>${result.protocol} ${result.port}</code></p><p>${result.index===-1?'No rule matched, so this was blocked.':'Rule '+(result.index+1)+' made this decision.'}</p></details></article>`).join('')}</div></section>`:''}<details class="workshop-extra-settings firewall-advanced-settings" ${f.advancedOpen?'open':''}><summary>Advanced rule settings</summary><section class="lab-panel"><div class="lab-section-heading"><h2>Addresses and rule order</h2><button type="button" class="workshop-text-button" data-lab-action="firewall-clear">Clear rules</button></div><p class="lab-muted">These checks use new IPv4 connections after address translation. The first matching rule decides. The default rule blocks the connection.</p><div class="lab-table-wrap"><table class="lab-table firewall-rule-table"><caption>Rules are checked from top to bottom</caption><thead><tr><th scope="col">#</th><th scope="col">Source</th><th scope="col">Destination</th><th scope="col">Protocol / port</th><th scope="col">Action</th><th scope="col">Edit</th></tr></thead><tbody>${f.rules.map((rule,i)=>`<tr><td>${i+1}</td><td><code>${escapeLesson(rule.source)}</code></td><td><code>${escapeLesson(rule.destination)}</code></td><td>${rule.protocol} / ${rule.port}</td><td>${rule.action==='allow'?'Allow':'Deny'}</td><td class="rule-controls"><button type="button" data-lab-action="rule-up" data-index="${i}" aria-label="Move rule ${i+1} up" ${i===0?'disabled':''}>↑</button><button type="button" data-lab-action="rule-down" data-index="${i}" aria-label="Move rule ${i+1} down" ${i===f.rules.length-1?'disabled':''}>↓</button><button type="button" data-lab-action="rule-edit" data-index="${i}">Edit</button></td></tr>`).join('')}<tr class="default-rule"><td>Last</td><td>any</td><td>any</td><td>ANY / any</td><td>Deny</td><td>Default</td></tr></tbody></table></div><form id="firewallRuleForm"><h3 id="ruleFormTitle">Add a custom rule</h3><div class="firewall-rule-form"><label>Source<input id="ruleSource" required value="any" placeholder="10.10.0.0/24"></label><label>Destination<input id="ruleDestination" required value="any" placeholder="10.20.0.10"></label><label>Protocol<select id="ruleProtocol"><option>TCP</option><option>UDP</option><option>ICMP</option><option>ANY</option></select></label><label>Destination port<input id="rulePort" required value="443" placeholder="443 or any"></label><label>Action<select id="ruleAction"><option value="allow">Allow</option><option value="deny">Deny</option></select></label><button type="submit" class="lesson-button primary" id="saveFirewallRule">Add rule</button></div><p id="ruleError" role="alert"></p><p class="lab-muted">Use an IPv4 address, subnet such as <code>10.10.0.0/24</code>, or <code>any</code>. Ports are 1–65535 or <code>any</code>. ICMP uses <code>any</code> here.</p></form></section></details>`;
 document.getElementById('guidedFirewallRuleForm').addEventListener('submit',e=>{
  e.preventDefault();const source=document.getElementById('guidedRuleSource').value,destination=document.getElementById('guidedRuleDestination').value,service=GUIDED_FIREWALL_SERVICES.find(service=>service[0]===document.getElementById('guidedRuleService').value);
  if(!GUIDED_FIREWALL_SOURCES.some(item=>item[0]===source)||!GUIDED_FIREWALL_DESTINATIONS.some(item=>item[0]===destination)||!service){document.getElementById('guidedRuleError').textContent='Choose From, To, and Connection before adding a rule.';return;}
  editWorkshop(w=>{w.firewall.rules.push({source,destination,protocol:service[2],port:service[3],action:'allow'});w.firewall.tested=false;w.firewall.passed=false;});renderFirewall();document.getElementById('guidedRuleSource').focus({preventScroll:true});
 });
 const advanced=document.querySelector('.firewall-advanced-settings');advanced.addEventListener('toggle',()=>{if(advanced.isConnected)editWorkshop(w=>w.firewall.advancedOpen=advanced.open);});
 const form=document.getElementById('firewallRuleForm');form.addEventListener('submit',e=>{
  e.preventDefault();const source=document.getElementById('ruleSource').value.trim().toLowerCase(),destination=document.getElementById('ruleDestination').value.trim().toLowerCase(),protocol=document.getElementById('ruleProtocol').value,port=document.getElementById('rulePort').value.trim().toLowerCase(),action=document.getElementById('ruleAction').value;
  if(!validRuleAddress(source)||!validRuleAddress(destination)){document.getElementById('ruleError').textContent='Use a valid IPv4 address, prefix from /0 to /32, or any.';return;}
  if(!(port==='any'||(/^\d{1,5}$/.test(port)&&Number(port)>=1&&Number(port)<=65535))||(protocol==='ICMP'&&port!=='any')){document.getElementById('ruleError').textContent='Use a port from 1 to 65535, or any. ICMP uses any here.';return;}
  const rule={source,destination,protocol,port,action},index=form.dataset.edit;
  editWorkshop(w=>{if(index!==undefined)w.firewall.rules[Number(index)]=rule;else w.firewall.rules.push(rule);w.firewall.tested=false;w.firewall.passed=false;w.firewall.advancedOpen=true;});renderFirewall();document.getElementById('ruleSource').focus({preventScroll:true});
 });
}

initDashboard();
initPracticeFeatures();
restoreLessonRoute();


