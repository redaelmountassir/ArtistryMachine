//Custom cursor behavior
const cursor = document.getElementById("cursor");
const cursorImg = cursor ? cursor.firstElementChild : null;
let cursorMode = "none";
if (cursor) {
    const cursorXSet = gsap.quickSetter(cursor, "x", "px");
    const cursorYSet = gsap.quickSetter(cursor, "y", "px");
    gsap.set(cursor, { xPercent: -50, yPercent: -50 });
    document.body.classList.add("no-cursor");
    document.addEventListener("pointermove", function (e) {
        cursorXSet(e.clientX);
        cursorYSet(e.clientY);
    });

    //Click effect
    document.addEventListener("pointerdown", function () { setCursorMode("select") });
    document.addEventListener("pointerup", function () { setCursorMode("unselect") });

    //Focus when over links
    const links = document.getElementsByTagName("a");
    for (let i = 0; i < links.length; i++) {
        link = links[i];
        link.addEventListener("pointerover", function () { setCursorMode("focus") });
        link.addEventListener("pointerout", function () { setCursorMode("none") });
    }
}
let lastCursorMode = null;
function setCursorMode(mode) {
    //If no cursor to begin with, quit
    if (!cursor) return;
    //Do events based off of current cursor mode
    switch (cursorMode) {
        case "select":
            if (mode !== "unselect") return lastCursorMode = mode;
            cursor.classList.remove("select");
            break;
        case "unselect":
            cursor.classList.remove("unselect");
            break;
        case "focus":
            gsap.to(cursor, { rotate: 0, duration: .1, ease: "Power2.out" })
            cursor.classList.remove("focus");
            break;
    }
    //Do events based off of new cursor mode
    switch (mode) {
        case "select":
            lastCursorMode = cursorMode;
            cursorMode = "select";
            cursor.classList.add("select");
            break;
        case "unselect":
            cursorMode = "unselect";
            setCursorMode(lastCursorMode === "select" ? "none" : lastCursorMode);
            break;
        case "focus":
            cursorMode = "focus";
            cursor.classList.add("focus");
            gsap.to(cursor, { rotate: 45, duration: .1, ease: "Power2.out" });
            break;
        default:
            cursorMode = "none";
    }
}

//No cursor if screen to small :(
window.matchMedia("(max-width: 50rem)").onchange = function () {
    if (this.matches) {
        cursor.style.display = "none";
        document.body.classList.remove("no-cursor");
    } else {
        cursor.style.display = null;
        document.body.classList.add("no-cursor");
    }
}