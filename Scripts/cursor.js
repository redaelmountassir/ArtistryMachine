//Custom cursor behavior
//Assumes dom has already had the initial state setup
const customCursor = {
    currentStates: [],
    domCursor: document.getElementById("cursor"),
    cursorStates: {},
    damping: .75,
    hideSpeed: .25
}

//Allows for the addition of states to set the cursor to besides the default ones
customCursor.addState = function (name, pathOrElement, priority, settings) {
    /*
        pathOrElement - if string the filepath to the cursor img, or a domElement to be toggled when set to this state
        priority - determines whether a cursor state should take higher precedence over another (default 0)
        overrideUseCursor - not recommended. useCursor stops any actions from taking place if the user uses a mobile device,
        since a mobile device will have some weird behaviour (it won't REALLY be pointermove, more like pointerdown)
        overrideDifference - by default the mix-blend-mode is difference, however for certain elements, this can look bad
    */
    if (typeof settings !== "object") settings = {};
    this.cursorStates[name] = {
        priority: typeof priority === "number" ? priority : 0,
        overrideUseCursor: settings.overrideUseCursor,
        overrideDifference: settings.overrideDifference
    };
    if (typeof pathOrElement === "string") pathOrElement = createImg(`Icons/cursorStates/${pathOrElement}.svg`, name);

    //Hide the element for later use
    this.domCursor.appendChild(pathOrElement);
    pathOrElement.classList.add("cursor-mode");
    return this.cursorStates[name].element = pathOrElement;
}
//Add the default states the cursor will have
customCursor.addState("auto", "cursor", -1);
customCursor.addState("pointer", "pointer");
customCursor.addState("link", "arrow");
customCursor.addState("click", "click", 1);

//Changes the current state of the cursor
const lastElement = array => { return array[array.length - 1] }
customCursor.setState = function (stateName) {
    //Find new state
    const newState = this.cursorStates[stateName], currentState = lastElement(this.currentStates);

    //Check if the newState actually exists or already is active
    if (newState === undefined || this.currentStates.includes(newState)) return;

    //Check if the state will override useCursor
    if (newState.overrideDifference) this.domCursor.style.mixBlendMode = "unset";

    //If the state is the default, it will add mix-blend

    //If the new states priority is not high enough, add to states, but don't make it current
    if (currentState && newState.priority < currentState.priority) {
        const insertIndex = this.currentStates.findIndex(element => newState.priority >= element.priority) + 1;
        return this.currentStates.splice(insertIndex, 0, newState);
    }

    //Animate to new element with class change
    if (currentState) currentState.element.classList.remove("current");
    newState.element.classList.add("current");

    //Change the state
    this.currentStates.push(newState);
}
customCursor.setState("auto");

//Revert current state
customCursor.removeState = function (stateName) {
    //Find state to remove
    const stateToRemove = this.cursorStates[stateName],
        indexToRemove = stateToRemove ? this.currentStates.indexOf(stateToRemove) : -1;

    //Quit if the state doesnt actually exist or it isnt a current state
    if (indexToRemove === -1) return;

    //Remove it from the array
    stateToRemove.element.classList.remove("current");
    this.currentStates.splice(indexToRemove, 1);

    //Reset the current active
    const newCurrent = lastElement(this.currentStates);
    newCurrent.element.classList.add("current");
    //Remove overrides
    if (stateToRemove.overrideDifference) this.domCursor.style.mixBlendMode = newCurrent.overrideDifference ? "unset" : null;
}

//Move the cursor to follow the mouse
//Start at center
gsap.set(customCursor.domCursor, { xPercent: -50, yPercent: -50, x: window.innerWidth / 2, y: -100 });
let waitToHide;
function cursorMove(e) {
    //Animate to the event point
    gsap.to(customCursor.domCursor, { autoAlpha: 1, x: e.clientX, y: e.clientY, duration: customCursor.damping, ease: "power2.out" });
    //Hide timeout
    if (waitToHide) clearTimeout(waitToHide);
    waitToHide = setTimeout(() => gsap.to(customCursor.domCursor, { autoAlpha: 0, ease: "power2.out" }), 10000);
}
document.addEventListener("pointermove", cursorMove, false);
document.addEventListener("pointerdown", cursorMove, false);
//If the pointer cancelled, the user is most likely trying to do something like select text
document.addEventListener("pointercancel", () => {
    //In that case get the cursor out of the users way
    if (waitToHide) clearTimeout(waitToHide);
    gsap.to(customCursor.domCursor, { autoAlpha: 0, ease: "power2.out" });
}, false);

//Built-in behaviours
window.addEventListener("load", () => {
    //Buttons will change the cursor into a pointer
    gsap.utils.toArray("button").forEach(button => {
        button.addEventListener("pointerover", () => { customCursor.setState("pointer") }, false);
        button.addEventListener("pointerout", () => { customCursor.removeState("pointer") }, false);
    });
    //Links will indicate that they will change your location
    gsap.utils.toArray("a").forEach(link => {
        link.addEventListener("pointerover", () => { customCursor.setState("link") }, false);
        link.addEventListener("pointerout", () => { customCursor.removeState("link") }, false);
    });
}, false);

//When you click, the click cursor will appear
document.addEventListener("pointerdown", () => { customCursor.setState("click") }, false);
document.addEventListener("pointerup", () => { customCursor.removeState("click") }, false);
document.addEventListener("pointercancel", () => { customCursor.removeState("click") }, false);