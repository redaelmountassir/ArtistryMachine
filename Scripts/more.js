//Setup
gsap.registerPlugin(ScrollTrigger);

//Image List
const paintingList = document.getElementById("additional-paintings"),
    moveAmount = 100, scrollDuration = "+=5000";
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
        opacity: 0,
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

//3D TIME
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}, camDamping = .5, camMoveAmount = .1;
let mouseXNormalized = 0;

//Move cam with mouse
window.addEventListener("mousemove", e => {
    mouseXNormalized = e.clientX / sizes.width * 2 - 1;
    gsap.to(camera.position, {
        x: mouseXNormalized * camMoveAmount,
        duration: camDamping,
        ease: "power2.out"
    })
});
//Update on resize
window.addEventListener("resize", () => {
    //Update sizes
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;

    //Update camera
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();

    //Update renderer
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

//Add renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, canvas: document.getElementsByTagName("canvas")[0] });
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = .75;
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

//Build scene
const scene = new THREE.Scene();

//Add camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100);
camera.position.z = 1;
scene.add(camera);

//Add terrain
const terrainLoad = new LoadEvent(), gltfLoader = new THREE.GLTFLoader();
let terrain;
gltfLoader.load("../3D/terrain.glb", function (loaded) {
    //Single out the brush from the loaded scene and add to the main scene
    terrain = loaded.scene.children[0];
    terrain.position.y = -10;
    terrain.position.z = -20;
    scene.add(terrain);

    complete(terrainLoad);

    gsap.to(terrain.position, {
        y: -3,
        scrollTrigger: {
            trigger: renderer.domElement,
            scrub: 1,
            start: "top top"
        }
    });
});


//Add lights
const redLight = new THREE.PointLight(0xFB3640, 45, 10, 2);
redLight.position.set(-5, 5, -5);
scene.add(redLight);

const blueLight = new THREE.PointLight(0x500FF, 45, 15, 2);
blueLight.position.set(5, -5, -5);
scene.add(blueLight);

const whiteLight = new THREE.PointLight(0xFFFFFF, 45, 100, 2);
whiteLight.position.set(0, 0, -100);
scene.add(whiteLight);

//Main render loop
const clock = new THREE.Clock(), spinSpeed = .25;
function render() {
    renderer.render(scene, camera);
    window.requestAnimationFrame(render);
}
render();
