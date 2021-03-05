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