//Elements needed
const navbar = document.getElementsByTagName("nav")[0],
    appearElements = document.getElementsByClassName("nav-link"),
    navBurger = document.getElementById("nav-burger");

//Only applies to vertical nav
let navOpen = false;

//Set the nav to the write type
function updateNavType() { sizeQuery.matches ? setNavHorizontal() : setNavVertical() };
updateNavType();
sizeQuery.addEventListener("change", updateNavType);
navbar.style.visibility = "visible";

function setNavVertical() {
    //Switch the class
    navbar.classList.remove("horizontal");
    navbar.classList.add("vertical");
    //Show nav burger in vertical mode
    navBurger.style.display = null;
    gsap.set(appearElements, { clearProps: "all", overwrite: true });
    //An transition will play when adding vertical - this prevents that
    preventTransition(navbar);

    //Toggle open on click of burger
    if (!navBurger) return;
    navBurger.onclick = function () { (navOpen = !navOpen) ? openNav() : closeNav() }
}
function setNavHorizontal() {
    if (navOpen) navbar.classList.remove("open");
    //Remove all of the remains from vertical navs
    navbar.classList.remove("vertical");
    navbar.classList.add("horizontal");
    navBurger.style.display = "none";
    gsap.set(appearElements, { clearProps: "all", overwrite: true });
    //An transition will play on children of the nav when adding horizontal - this prevents that
    preventTransition(navbar);
}

function openNav() {
    navbar.classList.add("open");
    gsap.fromTo(appearElements, { yPercent: -100 }, { yPercent: 0, stagger: .1, delay: .5, duration: .5, ease: "power2.out", overwrite: true });
}
function closeNav() {
    navbar.classList.remove("open");
    gsap.fromTo(appearElements, { yPercent: 0 }, { yPercent: 100, stagger: { each: .1, from: "end" }, duration: .5, ease: "power2.out", overwrite: true });
}