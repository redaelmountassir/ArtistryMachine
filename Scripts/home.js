gsap.registerPlugin(ScrollToPlugin);

//Scrolling text effect
const scrollingText = document.getElementsByClassName("scrolling-text")[0];
const clonedScrollingText = scrollingText ? scrollingText.cloneNode(true) : null;
const oldBackground = document.getElementById("old");
const newBackground = document.getElementById("new");
if (scrollingText && oldBackground && newBackground) {
    scrollingText.parentNode.appendChild(clonedScrollingText);

    //Animate the text to scroll infinitely
    const time = 25;
    new gsap.timeline({ defaults: { repeat: -1, ease: "none", duration: time } })
        .fromTo(scrollingText, { yPercent: 0 }, { yPercent: 100 }, "<")
        .fromTo(clonedScrollingText, { yPercent: -100 }, { yPercent: 0 }, "<");

    //Make the list items change the page theme
    function applyThemeEffects(elements) {
        for (let i = 0; i < elements.length; i++) {
            const artText = elements[i];
            const src = "../Images/" + artText.getAttribute("data-art") + ".jpg";
            const color = artText.getAttribute("data-base-color");
            artText.onpointerover = function () {
                artText.classList.add("solid");
                setBackground("linear-gradient(" + color + "a9," + color + "a9), url(" + src + ")");
            }
            artText.onpointerout = function () {
                artText.classList.remove("solid");
                setBackground(null);
            }
        }
    }
    applyThemeEffects(scrollingText.children);
    applyThemeEffects(clonedScrollingText.children);

    function setBackground(newStyle) {
        //Move the old background one backwards
        oldBackground.style.backgroundImage = newBackground.style.backgroundImage;
        newBackground.style.backgroundImage = newStyle;
        //Switch up the opacities
        gsap.fromTo(oldBackground, { autoAlpha: 1 }, { autoAlpha: 0, ease: "Power2.out", duration: 1 });
        gsap.fromTo(newBackground, { autoAlpha: 0 }, { autoAlpha: 1, ease: "Power2.out", duration: 1 });
    }
}

//Scroll to button and basic scroll effect
const scrollTo = document.getElementById("scroll-to");
if (scrollTo) {
    let destination = scrollTo.getAttribute("data-destination-id");
    if (destination) destination = document.getElementById(destination);
    if (destination) {
        scrollTo.onclick = function () { gsap.to(window, { scrollTo: destination, duration: .5, ease: "Power2.out" }) };
        if (scrollingText) {
            const heroText = document.getElementById("hero-text");

            //Home intro animation
            extendIntro = tl => {
                tl.fromTo(".background", { clipPath: "inset(15% 0%)" },
                    { clipPath: "inset(0% 0%)", ease: "power2.in", clearProps: "all" }, ">1");
                if (sizeQuery.matches) tl.from(heroText, { yPercent: -75, scale: 1.25, ease: "power2.out", clearProps: "all" }, "<");
                //Only do the scroll trigger stuff after ^ because if you scroll it'll create errors (x _ x)
                tl.call(() => {
                    //Makes sure inline styles don't contaminate other inline styles when media query updates
                    ScrollTrigger.saveStyles(heroText);
                    ScrollTrigger.matchMedia({
                        //Using match media not because the animations change, but rather for save styles to run on refresh
                        "(max-width: 50rem)": createAnim,
                        "(min-width: 50rem)": createAnim,
                    });
                    function createAnim() {
                        new gsap.timeline({ scrollTrigger: { trigger: destination, scrub: 1 } })
                            .to([scrollingText, clonedScrollingText], { x: "+=100%", autoAlpha: 0, ease: "Power2.out" })
                            .to(scrollTo, { autoAlpha: 0 }, "<")
                            .to([heroText, heroText.firstElementChild], { yPercent: "-=150", autoAlpha: 0 }, "<")
                    }
                })
            }
        }
    }
}

//Other scroll effect
gsap.utils.toArray("section > h2").forEach(heading => {
    heading = wrapInDiv(heading);
    gsap.from(heading.firstElementChild, {
        yPercent: -100,
        duration: .5,
        ease: "power2.out",
        scrollTrigger: {
            trigger: heading,
            toggleActions: "play none none reset"
        }
    });
})
gsap.utils.toArray("section > p").forEach(paragraph => {
    gsap.from(paragraph, {
        xPercent: "random(-100, 100)",
        autoAlpha: 0,
        duration: .5,
        ease: "power2.out",
        scrollTrigger: {
            trigger: paragraph,
            toggleActions: "play none none reset"
        }
    });
})