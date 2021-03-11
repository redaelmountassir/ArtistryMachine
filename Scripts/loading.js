const quotes = [
    { what: "", who: "" },
    { what: "", who: "" },
    { what: "", who: "" },
    { what: "", who: "" },
    { what: "", who: "" },
    { what: "", who: "" },
    { what: "", who: "" },
    { what: "", who: "" },
    { what: "", who: "" },
    { what: "", who: "" },
    { what: "", who: "" },
    { what: "", who: "" },
    { what: "", who: "" },
    { what: "", who: "" },
    { what: "", who: "" },
    { what: "", who: "" },
    { what: "", who: "" },
    { what: "", who: "" },
    { what: "", who: "" },
    { what: "", who: "" }
]

const loadingSection = document.getElementById("loading-section");
const loadingQuote = loadingSection.querySelector("blockquote");
const randomQuote = gsap.utils.random(quotes);
loadingQuote.firstElementChild.textContent = randomQuote.what;
loadingQuote.lastElementChild.textContent = randomQuote.what;
window.onload = function () {
    new gsap.timeline({ defaults: { ease: "Power2.easeOut", duration: 1 } })
        .to(loadingSection, { autoAlpha: 0, yPercent: 100 })
        .to(loadingQuote.children, { yPercent: -100, autoAlpha: 0, stagger: .25, duration: .5 }, "<");
}