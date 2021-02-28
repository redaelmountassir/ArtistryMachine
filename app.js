//Custom cursor behavior
const cursor = document.getElementById("cursor");
const cursorImg = cursor ? cursor.firstElementChild : null;
let cursorMode = "none";
if (cursor) {
    const cursorXSet = gsap.quickSetter(cursor, "x", "px");
    const cursorYSet = gsap.quickSetter(cursor, "y", "px");
    gsap.set(cursor, { xPercent: -50, yPercent: -50 });
    document.body.classList.add("no-cursor");
    document.addEventListener("mousemove", function (e) {
        cursorXSet(e.clientX);
        cursorYSet(e.clientY);
    });

    //Click effect
    document.addEventListener("mousedown", function () { setCursorMode("select") });
    document.addEventListener("mouseup", function () { setCursorMode("unselect") });

    //Focus when over links
    const links = document.getElementsByTagName("a");
    for (let i = 0; i < links.length; i++) {
        link = links[i];
        link.addEventListener("mouseover", function () { setCursorMode("focus") });
        link.addEventListener("mouseout", function () { setCursorMode("none") });
    }
}
let lastCursorMode = null;
function setCursorMode(mode) {
    if (!cursor) return;
    if (cursorMode === "select" && mode !== "unselect") return lastCursorMode = mode;
    if (cursorMode === "focus") gsap.to(cursor, { rotate: 0, duration: .1, ease: "Power2.out" });
    switch (mode) {
        case "select":
            lastCursorMode = cursorMode;
            cursorMode = "select";
            cursor.className = "select";
            break;
        case "unselect":
            cursorMode = "unselect";
            cursor.className = "";
            setCursorMode(lastCursorMode === "select" ? "none" : lastCursorMode);
            break;
        case "focus":
            cursorMode = "focus";
            cursor.className = "focus";
            gsap.to(cursor, { rotate: 45, duration: .1, ease: "Power2.out" });
            break;
        default:
            cursorMode = "none";
            cursor.className = "";
    }
}

const scrollingText = document.getElementsByClassName("scrolling-text")[0];
const background = document.getElementById("background");
if (scrollingText && background) {
    const time = 25;
    const clonedScrollingText = scrollingText.cloneNode(true);
    scrollingText.parentNode.appendChild(clonedScrollingText);

    //Animate the text to scroll infinitely
    new gsap.timeline({ repeat: -1, defaults: { ease: "none", duration: time } })
        .fromTo(scrollingText, { y: 0 }, { y: "-100%" }, 0)
        .fromTo(clonedScrollingText, { y: "100%" }, { y: 0 }, 0)
        .set(scrollingText, { y: "100%" })
        .to(clonedScrollingText, { y: "-100%" }, time)
        .to(scrollingText, { y: 0 }, time);

    //Make the list items change the page theme
    function applyThemeEffects(elements) {
        for (let i = 0; i < elements.length; i++) {
            const artText = elements[i];
            const src = "../Images/" + artText.getAttribute("data-art") + ".jpg";
            const color = artText.getAttribute("data-base-color");
            artText.onmouseover = function () {
                artText.classList.add("solid");
                setBackground("linear-gradient(" + color + "a9," + color + "a9), url(" + src + ")");
            }
            artText.onmouseout = function () {
                artText.classList.remove("solid");
                setBackground(null);
            }
        }
    }
    applyThemeEffects(scrollingText.children);
    applyThemeEffects(clonedScrollingText.children);

    function setBackground(newBackground) {
        //Move the old background one backwards
        background.firstElementChild.style.backgroundImage = background.lastElementChild.style.backgroundImage;
        background.lastElementChild.style.backgroundImage = newBackground;
        //Switch up the opacities
        gsap.fromTo(background.firstElementChild, { autoAlpha: 1 }, { autoAlpha: 0, ease: "Power2.out", duration: 1 });
        gsap.fromTo(background.lastElementChild, { autoAlpha: 0 }, { autoAlpha: 1, ease: "Power2.out", duration: 1 });
    }

    //Allow the user to edit the direction and speed via scroll wheel
}
