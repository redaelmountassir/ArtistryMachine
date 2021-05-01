//Image List
const paintingList = document.getElementById("additional-paintings"), scrollDuration = "+=5000";
gsap.fromTo(paintingList, { xPercent: 100 }, {
    xPercent: -100,
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
    snapThresholdLower = .1, snapThresholdUpper = .9;
//State to change cursor to when sliding the slider 
customCursor.addState("slide", "left-right");
for (let i = 0; i < beforeAndAfters.length; i++) {
    //Important variables
    const beforeAndAfter = beforeAndAfters[i],
        after = beforeAndAfter.querySelector(".after"),
        slider = beforeAndAfter.querySelector(".slider");
    let width, left;

    //Moves the slider and changes image width
    function setSlider(x) {
        //Convert to proper css value
        x *= 100;
        const xStr = x + "%";

        slider.style.left = xStr;
        //used clip path instead if its supported (because redraw es muy stinky)
        if ('clipPath' in document.body.style) return after.style.clipPath = `inset(0 ${100 - x}% 0 0)`;
        after.style.width = xStr;
    }
    //Add event listeners
    beforeAndAfter.addEventListener("pointerenter", () => {
        const bounds = beforeAndAfter.getBoundingClientRect();
        left = bounds.left;
        width = bounds.width;
        customCursor.setState("slide");
    });
    beforeAndAfter.addEventListener("pointermove", e => {
        //Calculate the percentage values
        let x = getPosRelativeToElement(e.clientX, left, width);

        //Snap to the ends if a threshold is met
        if (x < snapThresholdLower) x = 0;
        else if (x > snapThresholdUpper) x = 1;

        setSlider(x);
    });
    beforeAndAfter.addEventListener("pointerleave", () => { customCursor.removeState("slide") });
    beforeAndAfter.addEventListener("pointercancel", () => { customCursor.removeState("slide") });
    //Start at default
    setSlider(.5);
}

//Parallax
//The increase variables are the amount to increase a given variable per parallax index
//Ex: startVal + increaseVal * index = endVal
const parallaxTime = 1, parallaxScale = 1, parallaxTimeIncrease = 1.25, parallaxScaleStrength = .1;
gsap.utils.toArray(".parallax-parent").forEach(function (parallaxParent) {
    //Timeline for all parallax no matter the screen
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
        const parallaxIndex = parseInt(parallaxElement.getAttribute("data-parallax-index")),
            scale = parallaxScale + parallaxIndex * parallaxScaleStrength;
        gsap.set(parallaxElement, { scale, zIndex: parallaxIndex })
        parallaxTL.fromTo(parallaxElement, { rotation: -10, y: "50vh", yPercent: 100 }, {
            //Because of the way gsap orders transfroms, I need to overcompensate the yPercent with the scale
            rotation: 0, y: "-50vh", yPercent: scale * -100,
            duration: parallaxTime + (invertVal - parallaxIndex) * parallaxTimeIncrease
        }, "<");
    });
});

//Applies to both width and height, x and y, but I use it for x
//Gets the percentage (0 - 1) pos of a mouse in an element (0 meaning start, 1 meaning end)
function getPosRelativeToElement(clientPos, elementPos, elementSize) {
    return (clientPos - elementPos) / elementSize
};

//3D TIME
//Add renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, canvas: document.getElementsByTagName("canvas")[0] });
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = .75;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const viewport = {
    vw: window.innerWidth
        || document.documentElement.clientWidth
        || document.body.clientWidth,
    vh: window.innerHeight
        || document.documentElement.clientHeight
        || document.body.clientHeight,
    update: function () {
        //Update viewport
        this.vw = window.innerWidth
            || document.documentElement.clientWidth
            || document.body.clientWidth;
        this.vh = window.innerHeight
            || document.documentElement.clientHeight
            || document.body.clientHeight;

        //Update camera
        camera.aspect = viewport.vw / viewport.vh;
        camera.updateProjectionMatrix();

        //Update renderer
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(viewport.vw, viewport.vh, false);
    }
};
//Update on resize
window.addEventListener("resize", viewport.update.bind(viewport), false);

//Set initial values
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(viewport.vw, viewport.vh, false);

//Build scene
const scene = new THREE.Scene();

//Add camera
const focusPoint = new THREE.Vector3(0, 1, -13),
    cameraHolder = new THREE.Object3D(),
    camera = new THREE.PerspectiveCamera(75, viewport.vw / viewport.vh, 0.1, 100),
    camDamping = .5,
    camMoveAmount = .5;

cameraHolder.lookAt(focusPoint)
camera.scale.set(-1, 1, -1);
cameraHolder.add(camera);
scene.add(cameraHolder);

//Move cam with mouse
window.addEventListener("pointermove", e => {
    const mouseXNormalized = e.clientX / viewport.vw * -2 - 1;
    gsap.to(camera.position, {
        x: mouseXNormalized * camMoveAmount,
        duration: camDamping,
        ease: "power2.out"
    });
});

//Add terrain
const loadGalleryEvent = new LoadEvent();
new THREE.GLTFLoader().load("3D/art-gallery.glb", function (loaded) {
    //Add gallery
    const artGallery = loaded.scene.children[0];
    artGallery.position.set(-2, -2.5, -13);

    //Gotta add dem shadows and receive them shadows
    artGallery.children[0].traverse(object => object.castShadow = object.isMesh);
    artGallery.children[1].traverse(object => object.receiveShadow = object.isMesh);

    scene.add(artGallery);

    //Only time shadows will need to be updated
    renderer.shadowMap.needsUpdate = true;

    //Extend loading animation
    const title = document.getElementsByTagName("h1")[0];
    LoadingManager.animation.extend = tl => {
        tl.from(artGallery.position, { y: "-=2.5", duration: 1.5 }, "<-.1")
            .from(artGallery.rotation, { y: "+=" + Math.PI * .1, duration: 1.5 }, "<")
            .from(title, { y: "-50vh", duration: 1.5 }, "<.5")
            .from(title.lastElementChild, { y: "100vh", duration: 1.5 }, "<");
    }

    //Animation on scroll
    startRenderLoop();
    new gsap.timeline({
        defaults: { ease: "power2.out" },
        scrollTrigger: {
            trigger: renderer.domElement,
            pin: true,
            scrub: 2,
            pinSpacing: false,
            start: "top top",
            endTrigger: paintingList.parentElement.parentElement,
            end: "bottom bottom",
            onEnter: startRenderLoop,
            onEnterBack: startRenderLoop,
            onLeave: stopRenderLoop
        }
    })
        .to(title, { x: -400, opacity: 0 })
        .to(title.lastElementChild, { x: 800, opacity: 0 }, "<")
        .to(cameraHolder.position, { x: 10, y: 1, z: -12.5 }, "<")
        .to(focusPoint, { x: -9, y: -.5, onUpdate: () => { cameraHolder.lookAt(focusPoint) } }, "<")
        .fromTo(renderer.domElement, { clipPath: "inset(0)" }, { clipPath: "inset(10%)" })
        .from(document.body, { background: "#DCD1D1" }, "<");

    loadGalleryEvent.finish();
});

//Add lights
const ambience = new THREE.AmbientLight(0xFFFFFF, .5);
scene.add(ambience);

const skyLight = new THREE.DirectionalLight(0xFFDED9, 6);
skyLight.position.set(4, 4, -1);
skyLight.castShadow = true;
scene.add(skyLight);

//Set up shadow properties for the light
const shadowRes = 1024 * 2;
skyLight.shadow.mapSize.width = shadowRes;
skyLight.shadow.mapSize.height = shadowRes;
skyLight.shadow.camera.left = 0;
skyLight.shadow.camera.right = 25;
skyLight.shadow.camera.top = 10;
skyLight.shadow.camera.bottom = -15;
skyLight.shadow.camera.near = -5;
skyLight.shadow.camera.far = 15;
skyLight.shadow.camera.updateProjectionMatrix();

//This will make sure shadows are made once (quite laggy per frame so elegant solution)
renderer.shadowMap.autoUpdate = false;

//Main render loop
let frame = null;
function render() {
    renderer.render(scene, camera);
    frame = requestAnimationFrame(render);
}
function startRenderLoop() {
    if (frame) return;
    render();
}
function stopRenderLoop() {
    if (!frame) return;
    cancelAnimationFrame(frame);
    frame = null;
}