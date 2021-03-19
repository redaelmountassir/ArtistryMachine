//Setup
gsap.registerPlugin(ScrollTrigger);

//Image List
const paintingList = document.getElementById("additional-paintings"),
    moveAmount = 50, scrollDuration = "+=5000";
gsap.fromTo(paintingList, { xPercent: moveAmount }, {
    xPercent: -moveAmount,
    ease: "none",
    scrollTrigger: {
        trigger: paintingList.parentElement,
        end: scrollDuration,
        pin: true,
        scrub: 1,
        anticipatePin: 1
    }
});

//Slider Images
const beforeAndAfters = document.getElementsByClassName("before-after"),
    snapThresholdLower = .05, snapThresholdUpper = .95;
for (let i = 0; i < beforeAndAfters.length; i++) {
    //Important variables
    const beforeAndAfter = beforeAndAfters[i],
        after = beforeAndAfter.querySelector(".after"),
        slider = beforeAndAfter.querySelector(".slider");
    let width, left;

    //Moves the slider and changes image width
    function setSlider(x) {
        //Convert to proper css value
        x = x * 100 + "%";

        slider.style.left = x;
        after.style.width = x;
    }
    //Add event listeners
    beforeAndAfter.addEventListener("pointerenter", () => {
        customCursor.setCursorImg("../Icons/left-right.svg");
        const bounds = beforeAndAfter.getBoundingClientRect();
        left = bounds.left;
        width = bounds.width;
    });
    beforeAndAfter.addEventListener("pointermove", e => {
        //Calculate the percentage values
        let x = getPosRelativeToElement(e.clientX, left, width);

        //Snap to the ends if a threshold is met
        if (x < snapThresholdLower) x = 0;
        else if (x > snapThresholdUpper) x = 1;

        setSlider(x);
    });
    beforeAndAfter.addEventListener("pointerleave", () => {
        customCursor.setCursorImg();
    });
    //Start at default
    setSlider(.5);
}

//Parallax
//The increase variables are the amount to increase a given variable per parallax index
//Ex: startVal + increaseVal * index = endVal
const parallaxTime = 1, parallaxScale = 1, parallaxTimeIncrease = 1.25, parallaxScaleStrength = .1;
gsap.utils.toArray(".parallax-parent").forEach(function (parallaxParent) {
    const parallaxTL = new gsap.timeline({
        defaults: { ease: "power2.out" },
        scrollTrigger: {
            trigger: parallaxParent,
            end: scrollDuration,
            pin: true,
            scrub: 1,
            anticipatePin: 1
        }
    }),
        parallaxElements = gsap.utils.toArray(parallaxParent.querySelectorAll(".parallax-child")),
        invertVal = parallaxElements.length - 1;
    parallaxElements.forEach(function (parallaxElement) {
        const parallaxIndex = parseInt(parallaxElement.getAttribute("data-parallax-index"));
        gsap.set(parallaxElement, { scale: parallaxScale + parallaxIndex * parallaxScaleStrength, zIndex: parallaxIndex })
        parallaxTL.fromTo(parallaxElement, { rotation: -10, y: "50vh", yPercent: 100 }, {
            rotation: 0, y: "-50vh", yPercent: -100,
            duration: parallaxTime + (invertVal - parallaxIndex) * parallaxTimeIncrease
        }, "<");
    })
});

//Other scroll effect
const headings = document.getElementsByTagName("h2");
for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    gsap.from(heading, {
        xPercent: i % 2 === 0 ? 200 : -200,
        ease: "Power2.out",
        scrollTrigger: {
            trigger: heading.parentElement,
            scrub: 1,
            end: "top top"
        }
    });
}

//Applies to both width and height, x and y, but I use it for x
//Gets the percentage (0 - 1) pos of a mouse in an element (0 meaning start, 1 meaning end)
function getPosRelativeToElement(clientPos, elementPos, elementSize) {
    return (clientPos - elementPos) / elementSize
};