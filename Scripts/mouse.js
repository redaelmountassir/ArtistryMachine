//IMPORTANT! - I used to have pointer events here instead of mouse events but it ends up looking bad so only mouse events will be supported
//Custom cursor behavior
const customCursor = {
    cursor: document.getElementById("cursor"),
    cursorImg: cursor ? cursor.firstElementChild : null,
    cursorMode: "none"
}

//Built-in behaviours
if (customCursor.cursor) {
    customCursor.cursorXSet = gsap.quickSetter(customCursor.cursor, "x", "px");
    customCursor.cursorYSet = gsap.quickSetter(customCursor.cursor, "y", "px");
    gsap.set(customCursor.cursor, { xPercent: -50, yPercent: -50 });
    document.body.classList.add("no-cursor");
    document.addEventListener("mousemove", function (e) {
        customCursor.cursorXSet(e.clientX);
        customCursor.cursorYSet(e.clientY);
    }, false);

    //Click effect
    document.addEventListener("mousedown", function () { customCursor.setCursorMode("select") }, false);
    document.addEventListener("mouseup", function () { customCursor.setCursorMode("unselect") }, false);

    //Focus when over links
    const links = document.querySelectorAll("a, button");
    for (let i = 0; i < links.length; i++) {
        link = links[i];
        link.addEventListener("mouseover", function () { customCursor.setCursorMode("focus") }, false);
        link.addEventListener("mouseout", function () { customCursor.setCursorMode("none") }, false);
    }
}

//Cursor mode selection
let lastCursorMode = null;
customCursor.setCursorMode = function (mode) {
    //If no cursor to begin with, quit
    if (!this.cursor) return;
    //Do events based off of current cursor mode
    switch (this.cursorMode) {
        case "select":
            if (mode !== "unselect") return lastCursorMode = mode;
            this.cursor.classList.remove("select");
            break;
        case "unselect":
            this.cursor.classList.remove("unselect");
            break;
        case "focus":
            gsap.to(this.cursor, { rotate: 0, duration: .1, ease: "Power2.out" })
            this.cursor.classList.remove("focus");
            break;
    }
    //Do events based off of new cursor mode
    switch (mode) {
        case "select":
            lastCursorMode = this.cursorMode;
            this.cursorMode = "select";
            this.cursor.classList.add("select");
            break;
        case "unselect":
            this.cursorMode = "unselect";
            this.setCursorMode(lastCursorMode === "select" ? "none" : lastCursorMode);
            break;
        case "focus":
            this.cursorMode = "focus";
            this.cursor.classList.add("focus");
            gsap.to(this.cursor, { rotate: 45, duration: .1, ease: "Power2.out" });
            break;
        default:
            this.cursorMode = "none";
    }
}
//Change cursor img
if (customCursor.cursorImg) {
    const defaultImg = customCursor.cursorImg.src;
    customCursor.setCursorImg = function (newImg) {
        //Set to default if new img is null, otherwise change the img
        customCursor.cursorImg.src = typeof newImg == "string" ? newImg : defaultImg;
    }
}

//No cursor if screen to small :(
const useCursorQuery = window.matchMedia("(max-width: 50rem)")
function useCursor() {
    if (useCursorQuery.matches) {
        customCursor.cursor.style.display = "none";
        document.body.classList.remove("no-cursor");
    } else {
        customCursor.cursor.style.display = null;
        document.body.classList.add("no-cursor");
    }
}
useCursorQuery.onchange = useCursor;
useCursor();