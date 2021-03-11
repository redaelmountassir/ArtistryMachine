//Elements needed
const navbar = document.getElementsByTagName("nav")[0],
    navList = navbar.querySelector("ul"),
    mainArea = document.getElementsByTagName("main")[0],
    navBurger = document.getElementById("nav-burger"),
    burgerTop = navBurger.children[0],
    burgerMiddle = navBurger.children[1],
    burgerBottom = navBurger.children[2],
    navbarType = navbar.getAttribute("data-nav-type");

//Only applies to vertical nav
let navOpen = false;

//Do things based on a specified type
switch (navbarType) {
    case "horizontal":
        setNavHorizontal();
        break;
    case "vertical":
        setNavVertical();
        break;
    //By default toggles between horizontal and vertical based on media query
    default:
        const mediaQuery = window.matchMedia("(min-width: 50rem)");
        mediaQuery.onchange = function () { mediaQuery.matches ? setNavHorizontal() : setNavVertical() }
        mediaQuery.onchange();
        break;
}

function setNavVertical() {
    //Switch the class
    navbar.classList.remove("horizontal");
    navbar.classList.add("vertical");
    //Show nav burger in vertical mode
    navBurger.style.display = null;
    //An transition will play when adding vertical - this prevents that
    preventTransition(navbar)

    //Toggle open on click of burger
    if (!navBurger) return;
    navBurger.onclick = function () { (navOpen = !navOpen) ? openNav() : closeNav() }
}
function setNavHorizontal() {
    if (navOpen) closeNav();
    //Remove all of the remains from vertical navs
    navbar.classList.remove("vertical");
    navbar.classList.add("horizontal");
    navBurger.style.display = "none";
    //An transition will play on children of the nav when adding horizontal - this prevents that
    preventTransition(navbar);
}

function openNav() {
    navbar.classList.add("open");
    mainArea.classList.add("darken");
    gsap.from(navList.children, { autoAlpha: 0, yPercent: -100, stagger: .1, delay: .5, duration: .5, ease: "power2.out", overwrite: true, clearProps: "all" }, "<.5");
}
function closeNav() {
    navbar.classList.remove("open");
    mainArea.classList.remove("darken");
}

function preventTransition(element) {
    element.classList.add("no-anim");
    //Forces the window to redraw
    element.clientLeft;
    element.classList.remove("no-anim");
}