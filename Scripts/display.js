//General setup
gsap.registerPlugin(ScrollToPlugin);
gsap.registerPlugin(ScrollTrigger);
gsap.set(document.body, { scrollTo: 0 });

//Define some variables early so it can be used
let renderer, background, camController, scene, mat, pointMat, frame, stand, painting, panelElement, textures = [], eras;
//Define all things nescessary for loading
const textureLoader = new THREE.TextureLoader(), gltfLoader = new THREE.GLTFLoader(), rgbeLoader = new THREE.RGBELoader(),
    loadJsonEvent = new LoadEvent("json"), loadModelsEvent = new LoadEvent("models"),
    loadTexturesEvent = new LoadEvent("textures"), loadHDRIEvent = new LoadEvent("hdri");

//Displays the information about a given period
const infoPanel = {
    panelElement: document.getElementById("info-panel"),
    _mobileMode: null,
    get mobileMode() { return this._mobileMode },
    set mobileMode(value) {
        if (this._mobileMode === value) return;
        this._mobileMode = value;
        //Change positional classes based on screen size
        if (this.mobileMode) {
            this.panelElement.classList.add("bottom", "docked");
            this.panelElement.classList.remove("right");
        } else {
            this.panelElement.classList.add("right");
            this.panelElement.classList.remove("bottom", "docked");
        }
        this.show();
        preventTransition(this.panelElement);
        preventTransition(this.eraList);
    },
    currentIndex: -1,
    visible: true,
    set(index) {
        if (this.currentIndex === index) return;
        this.currentIndex = index;
        this.currentPeriod = eras[this.currentIndex];
        this.period.textContent = this.currentPeriod.title;
        this.times.textContent = this.currentPeriod.time;
        this.info.innerHTML = this.currentPeriod.text;
        painting.material.map = textures[this.currentIndex];
    },
    show(hideEras) {
        this.visible = true;
        this.panelElement.classList.remove("unexpand");
        gsap.to(this.panelElement, { scrollTo: 0, delay: 1, duration: .5, ease: "power2.out" });
        if (!this.mobileMode) gsap.from(this.panelElement.children, { opacity: 0, y: -100, stagger: .25, ease: "power2.out", clearProps: "all" });
        if (hideEras) return this.eraList.classList.add("unexpand");
        this.eraList.classList.add("unexpand");
    },
    hide(hideEras) {
        this.visible = false;
        this.panelElement.classList.add("unexpand");
        if (hideEras) return this.eraList.classList.add("unexpand");
        this.eraList.classList.remove("unexpand");
    },
    updateReferences() {
        this.eraList = document.getElementById("era-list");
        this.eraListUl = this.eraList.firstElementChild;
        this.panelElement = document.getElementById("info-panel");
        this.infoButton = this.panelElement.children[0];
        this.period = this.panelElement.children[1].firstElementChild;
        this.times = this.panelElement.children[2];
        this.info = this.panelElement.children[3];
    },
    init() {
        this.updateReferences();

        this.set(0);
        this.mobileMode = !sizeQuery.matches;
        //Open panel on click
        this.infoButton.onclick = function () { this.visible ? this.hide(true) : this.show(true) }.bind(this);

        //Drag panel events
        function dragPanel(e) {
            //User must click on the container. Not the paragraphs, the buttons, etc.
            if (!e.target.contains(panelElement)) return;
            e.preventDefault();

            //Only drag in mobile mode
            if (!this.mobileMode) return;
            //Define important vars
            const panelBounds = panelElement.getBoundingClientRect(),
                threshold = window.innerHeight * .5,
                maxY = panelBounds.height - convertRemToPixels(5),
                startTransform = getComputedStyle(panelElement).transform,
                startY = e.clientY;
            let deltaY = 0;

            //Makes sure scroll doesn't interfere
            this.panelElement.style.touchAction = "none";

            //Drag events
            const draggingPanel = (e => {
                //Gives the amount the mouse moved by in a 0-1 range
                deltaY = startY - e.clientY;
                deltaY = this.visible ? gsap.utils.clamp(-maxY, 0, deltaY) : gsap.utils.clamp(0, maxY, deltaY);
                //Sets the new transform (without interfering with the original transform if there was one)
                this.panelElement.style.transform = startTransform != "none" ?
                    startTransform + ` translateY(${-deltaY}px)` :
                    `translateY(${-deltaY}px)`;
            }).bind(this);
            const stopDraggingPanel = (() => {
                //Remove inline styles
                this.panelElement.style.transform = null;
                this.panelElement.style.touchAction = null;

                //Snap to the swipe end
                this.visible ?
                    -deltaY > threshold ? this.hide(true) : this.show(true) :
                    deltaY > threshold ? this.show(true) : this.hide(true);

                //Remove events
                document.removeEventListener("pointermove", draggingPanel);
                document.removeEventListener("pointerup", stopDraggingPanel);
                allowTransition(panelElement);
            }).bind(this);

            //This prevents panel element from transitioning during forced transformations
            blockTransition(panelElement);
            //Assign events to correct actions
            document.addEventListener("pointermove", draggingPanel);
            document.addEventListener("pointerup", stopDraggingPanel);
        };

        dragPanel = dragPanel.bind(this);
        //Open panel on drag
        this.panelElement.addEventListener("pointerdown", dragPanel);

        //Adjust stand
        adjustStand();
    }
}

//Tooltip that provides info about the painting if the painting is hovered over
const paintingTooltip = {
    domElement: document.getElementById("tooltip"),
    visible: false,
    raycaster: new THREE.Raycaster(),
    show: function (paintingObj) {
        //Show the tooltip if not visible
        if (!this.visible) customCursor.setState("painting info");
        //Set content if the content changed
        if (paintingObj.name != this.name.textContent) {
            this.name.textContent = paintingObj.name;
            this.artist.textContent = paintingObj.artist;
            this.painted.textContent = paintingObj.painted;
            this.from.textContent = paintingObj.from;
        }

        this.visible = true;
    },
    hide: function () {
        if (this.visible) customCursor.removeState("painting info");
        this.visible = false;
    },
    init: function () {
        //Add to cursor (I override useCursor because some of this info is NEEDED for mobile users)
        this.domElement = customCursor.addState("painting info", this.domElement, 2, {
            overrideUseCursor: true, overrideDifference: true
        });

        //Textcontents for changing content
        this.name = this.domElement.children[0].firstElementChild;
        this.artist = this.domElement.children[1];
        this.painted = this.domElement.children[2];
        this.from = this.domElement.children[3];
    }
};
paintingTooltip.init();

//Holds the dimensions of the viewport for other calculations
const viewport = {
    vw: window.innerWidth
        || document.documentElement.clientWidth
        || document.body.clientWidth,
    vh: window.innerHeight
        || document.documentElement.clientHeight
        || document.body.clientHeight,
    update() {
        //Update viewport dimensions
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
        renderer.setSize(this.vw, this.vh, false);

        //Update stand
        adjustStand();
    },
    init() {
        window.addEventListener("resize", viewport.update.bind(this), false);
    }
};
//Move cam with mouse on anything not mobile
const mouse = {
    normalizedPos: new THREE.Vector2(0, 0),
    pos: new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2),
    lastTarget: null,
    moveEvent(e) {
        //Caches the last target hovered over
        this.lastTarget = e.target;

        //Update mouse pos and make sure its normalized (-1 to 1 range)
        this.pos.x = e.clientX;
        this.pos.y = e.clientY;
        this.normalizedPos.x = mouse.pos.x / viewport.vw * 2 - 1;
        this.normalizedPos.y = mouse.pos.y / viewport.vh * -2 + 1;
        //Do NOT use the mouse if the gyro should be used
        if (gyro.use) return;
        camController.setCamRotWithPos(this.normalizedPos);
    },
    init() {
        //You gotta do both cuz pointermove works very... unusually...
        document.addEventListener("pointermove", mouse.moveEvent.bind(this), false);
        document.addEventListener("pointerdown", mouse.moveEvent.bind(this), false);
    }
};
const gyro = {
    //Add orientation support as landscape messes up some things
    orientation: window.matchMedia("(orientation: portrait)"),
    pos: new THREE.Vector2(0, 0),
    supported: window.DeviceOrientationEvent !== undefined,
    _use: false,
    get use() { return this._use },
    set use(value) {
        camController.setCamRotWithPos(new THREE.Vector2(0, 0));
        this._use = value && this.supported;
    },
    changeEvent(e) {
        const gamma = e.gamma / -90,
            beta = e.beta / 180;
        if (this.orientation.matches) {
            this.pos.x = gamma;
            this.pos.y = beta;
        } else {
            this.pos.x = beta;
            this.pos.y = gamma;
        }
        camController.setCamRotWithPos(this.pos);
    },
    init() {
        //This variable tracks whether you selected the painting (applies only on devices that use gyro)
        gyro.use = !sizeQuery.matches;
        sizeQuery.addEventListener("change", () => gyro.use = !sizeQuery.matches, false);
        window.addEventListener("deviceorientation", gyro.changeEvent.bind(this), false);
    }
};

LoadingManager.animation.extend = tl => {
    tl
        .from("aside", { opacity: 0, yPercent: "+=100", clearProps: "all" })
        .from(stand.scale, { x: 0, y: 0, z: 0, duration: 1.5, ease: "back.out(1.7)" })
        .from(stand.rotation, { y: Math.PI / -2, duration: 2.5, ease: "power2.out" }, "<");
}

setupRenderer();
createScene();
createCamera();
createLights();
viewport.init();
mouse.init();
gyro.init();

//Request the json file
readJsonFile("info.json", loaded => {
    loadJsonEvent.finish();
    eras = loaded;
    loadTextures();
    //Assign the start display as the final step
    LoadingManager.onComplete = () => display();
});

//Places the frame in a good location not blocked by the info panel
function adjustStand() {
    if (!stand || !panelElement) return;

    //Total screen space taken by panel element
    const spaceTaken = panelElement.clientWidth / viewport.vw;
    //If on mobile or theres enough screen space, don't worry about it
    if (!sizeQuery.matches || spaceTaken < .3) return stand.position.x = 0;
    //If there is not enough space, move the frame left on the screen by the needed amount
    stand.position.x = -spaceTaken * 3;
}
function setupRenderer() {
    //Add renderer to dom
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    background = document.getElementById("display-background");

    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.5;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.physicallyCorrectLights = true;

    //Set initial values
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(viewport.vw, viewport.vh, false);

    background.appendChild(renderer.domElement);
}
function createCamera() {
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 100);
    camera.position.z = 3;
    camera.position.y = 2;
    scene.add(camera);

    camController = new CameraController(camera);
}
function createScene() {
    //Make main scene
    scene = new THREE.Scene();

    //Materials
    mat = new THREE.MeshBasicMaterial({ color: 0x525251 });
    pointMat = new THREE.PointsMaterial({ color: 0x111111, size: .25 });

    //Create background shapes with staggered anims
    const shapesGroup = new THREE.Group();
    const sphere = new THREE.SphereBufferGeometry(5, 30, 30);

    const sphere1 = new THREE.Mesh(sphere, mat);
    sphere1.position.set(-20, -5, -25);
    shapesGroup.add(sphere1);
    const sphere2 = new THREE.Mesh(sphere, mat);
    sphere2.position.set(75, 30, -65);
    sphere2.scale.set(5, 5, 5);
    shapesGroup.add(sphere2);
    const sphere3 = new THREE.Points(sphere, pointMat);
    gsap.to(sphere3.rotation, { y: Math.PI * 2, x: Math.PI * 2, repeat: -1, duration: 10, ease: "none" });
    sphere3.position.set(-40, 20, -15);
    sphere3.scale.set(2.5, 2.5, 2.5);
    shapesGroup.add(sphere3);
    const sphere4 = new THREE.Points(sphere, pointMat);
    gsap.to(sphere4.rotation, { y: Math.PI * -2, repeat: -1, duration: 10, ease: "none" });
    sphere4.position.set(30, -20, -50);
    shapesGroup.add(sphere4);
    const sphere5 = new THREE.Mesh(sphere, mat);
    sphere5.position.set(0, 70, -60);
    shapesGroup.add(sphere5);

    scene.add(shapesGroup);

    //Animate with random stagger
    const raiseAmount = "+=5", raiseTime = 1;
    gsap.to(shapesGroup.children.map(child => child.position), {
        y: raiseAmount, ease: "power2.inOut", duration: raiseTime,
        stagger: {
            from: "random",
            yoyoEase: "power2.inOut",
            repeat: -1,
            amount: 1
        }
    });

    //Add stand as well
    loadStand();
}
function createLights() {
    //Falls downwards on the stand and painting
    const spotLight = new THREE.SpotLight(0xFFA3A0, 5);
    spotLight.position.set(0, 4, 0);
    gsap.to(spotLight.position, { y: "+=1", repeat: -1, yoyo: true, duration: 5, ease: "power2.inOut" });
    spotLight.decay = 2;
    spotLight.angle = .6;
    spotLight.penumbra = 1;
    spotLight.intensity = 75;

    const shadowRes = 1024;
    spotLight.castShadow = true;
    spotLight.shadow.bias = -0.0001;
    spotLight.shadow.mapSize.width = shadowRes;
    spotLight.shadow.mapSize.height = shadowRes;
    scene.add(spotLight);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    rgbeLoader.setDataType(THREE.UnsignedByteType)
        .load("3D/hdri.hdr", texture => {
            //Build a cube map from a equirectangular one
            pmremGenerator.compileEquirectangularShader();
            scene.environment = pmremGenerator.fromEquirectangular(texture).texture;

            //To save on memory, dispose the unesscessary
            texture.dispose();
            pmremGenerator.dispose();

            loadHDRIEvent.finish();
        });
}
function render() {
    camController.updateCam();

    //Raycast to the painting every render loop for the tooltip
    //Only if a period is defined and the canvas is the currently hovered element
    if (mouse.lastTarget && renderer.domElement.contains(mouse.lastTarget)) {
        //Send cast
        paintingTooltip.raycaster.setFromCamera(mouse.normalizedPos, camera);
        //If it hits something show the tooltip, otherwise hide it
        paintingTooltip.raycaster.intersectObject(frame, true).length ?
            paintingTooltip.show(infoPanel.currentPeriod.painting) :
            paintingTooltip.hide();
    }
    else
        paintingTooltip.hide();

    renderer.render(scene, camera);
    requestAnimationFrame(render);
};
function loadTextures() {
    let loaded = 1;
    eras.forEach(era => {
        textureLoader.load(`Images/${era.painting.fileName}.jpg`, texture => {
            textures.push(texture);
            if (loaded++ === eras.length) loadTexturesEvent.finish();
        });
    });
}
function loadStand() {
    gltfLoader.load("3D/stand.glb", loaded => {
        loaded = loaded.scene;

        //Add stand
        stand = loaded.children[0];
        stand.castShadow = stand.receiveShadow = true;

        //Set frame
        frame = stand.children[0].children[0];
        gsap.to(frame.position, { y: "+=.2", repeat: -1, yoyo: true, duration: 5, ease: "sine.inOut" });
        frame.castShadow = true;

        //Set painting
        painting = stand.children[0].children[2];

        //Finish up
        scene.add(stand);
        loadModelsEvent.finish();
    });
}
function display() {
    //Cache number of eras once (and len minus one is also used several times)
    const len = eras.length, lenMin1 = len - 1;

    //The time data object properly watches the users scrolled "time" and sets it accordingly
    const timeElement = document.getElementsByTagName("time")[0],
        timeData = {
            _current: 0,
            thisYear: new Date().getFullYear(),
            get current() { return this._current },
            set current(value) {
                this._current = value;
                let year = Math.floor(this._current);
                //Make the text Current if you want it to reference today
                if (year != this.thisYear) {
                    //Check if negative, if so add BC later as to not intefere with add zeroes
                    let appendBC = false;
                    if (year < 0) { year = Math.abs(year); appendBC = true };
                    //Add zeroes to the beginning of the year for better formatting i.e. 1 -> 0001
                    year = year.toString();
                    year = (year.length < 4) ? ("0".repeat(4 - year.length)) + year : year;
                    //Add bc
                    if (appendBC) year += "BC";
                }
                else
                    year = "Now";

                //Set all the elements that show time
                if (timeElement.firstElementChild) timeElement.firstElementChild.textContent = year;
                if (timeElement.lastElementChild) timeElement.lastElementChild.textContent = infoPanel.currentPeriod.title;
            }
        }

    //Initialize panel
    infoPanel.init();

    //Change mode on media query
    sizeQuery.addEventListener("change", () => infoPanel.mobileMode = !sizeQuery.matches, false);

    //The scroll drives the animation
    let scrollingCheck;
    const startingPeriod = eras[0];

    //Go through each time period and add it to the animation (Yes, the first one must be written out seperately)
    //Build the base timeline object driven by scrolling
    const tl = new gsap.timeline({
        scrollTrigger: {
            trigger: "#display",
            end: () => innerHeight * lenMin1,
            pin: true,
            scrub: 1,
            snap: {
                snapTo: "labels",
                duration: { min: .1, max: .5 }
            }
        },
        onUpdate: () => {
            const progress = tl.totalProgress();
            infoPanel.eraListUl.style.transform = `translateY(${progress * -50}%)`;

            //Updates whether to show infoPanel on scroll
            if (scrollingCheck) scrollingCheck.kill();
            infoPanel.hide();
            scrollingCheck = gsap.delayedCall(1, infoPanel.show.bind(infoPanel));

            //Updates info panel contents
            infoPanel.set(Math.round(progress * lenMin1));
        }
    });

    //Create a list fragment to append the many era label 
    const listFragment = new DocumentFragment(),
        eraLabelTemplate = document.createElement("li"),
        eraScrollButton = document.createElement("button"),
        labelText = document.createElement("h3");
    //Set up the first era label that will be used as a template for the rest
    labelText.textContent = startingPeriod.title;
    eraScrollButton.classList.add("no-flex");
    eraScrollButton.onpointerdown = () => gsap.to(window, { scrollTo: 0, ease: "power2.out", duration: .5 });
    eraScrollButton.appendChild(labelText);
    eraLabelTemplate.appendChild(eraScrollButton);
    listFragment.appendChild(eraLabelTemplate);

    //Add the initial state (Must be done seperately)
    const startingRGB = gsap.utils.splitColor(startingPeriod.associatedColor).map(val => val / 255);
    tl.addLabel("0")
        .set(timeData, { current: startingPeriod.timeStart })
        .set(background, { background: startingPeriod.associatedColor })
        .set([frame.material.color, stand.material.color, mat.color, pointMat.color], { r: startingRGB[0], g: startingRGB[1], b: startingRGB[2] });

    eras.forEach((era, index) => {
        //Skip the initial one because it has already been done above ^
        if (!index) return;

        //Duplicate the era label and add it to the fragment list
        const eraLabel = eraLabelTemplate.cloneNode(true);
        eraLabel.firstElementChild.firstElementChild.textContent = era.title;
        eraLabel.firstElementChild.onpointerdown = () => { gsap.to(window, { scrollTo: index * innerHeight, ease: "power2.out", duration: .5 }) };
        listFragment.appendChild(eraLabel);

        //It is important for labels to be the index so that the correct period is accessed when snapping
        const rgb = gsap.utils.splitColor(era.associatedColor).map(val => val / 255);
        tl
            .to(timeData, { current: era.timeStart === "Current" ? timeData.thisYear : era.timeStart })
            .from(eraLabel, { opacity: .5, scale: .5 }, "<")
            .to(eraLabel.previousSibling, { scale: .5, opacity: .25 }, "<")
            .fromTo(stand.rotation, { y: 0 }, { y: Math.PI * 2, ease: "none" }, "<")
            .to(background, { background: era.associatedColor }, "<")
            .to([frame.material.color, stand.material.color, mat.color, pointMat.color], { r: rgb[0], g: rgb[1], b: rgb[2] }, "<")
            .addLabel(index);
    });

    //Add fragment to the actual DOM
    infoPanel.eraList.firstElementChild.appendChild(listFragment);

    render();
}
function CameraController(camera) {
    //Smoothly sets the camera with a normalized position
    this.sensitivity = .2;
    this.rot = new THREE.Vector2(0, 0);
    this.parallaxElement = document.getElementsByClassName("watermark")[0];
    this.parallaxPos = new THREE.Vector2(0, 0);
    this.parallaxSensitivity = 2.5;
    this.camera = camera;
    this.setCamRotWithPos = function (pos) {
        this.needsUpdate = true;
        //This is the position for parallax for any background elements
        this.parallaxPos.x = -pos.x * this.parallaxSensitivity;
        this.parallaxPos.y = pos.y * this.parallaxSensitivity;
        //Convert the pos to a usuable rotation for the camera
        this.rot.x = pos.y * this.sensitivity;
        this.rot.y = -pos.x * this.sensitivity;
    };
    this.updateCam = function () {
        //Need update makes sure that animations are delegated to the animation frame
        //otherwise, constant setCamRotWithPos could slow devices down
        if (!this.needsUpdate) return;
        this.needsUpdate = false;
        //Animate rotation
        gsap.to(this.camera.rotation, { x: this.rot.x, y: this.rot.y, duration: 1, ease: "power2.out", overwrite: "auto" });
        gsap.to(this.parallaxElement, { xPercent: this.parallaxPos.x, yPercent: this.parallaxPos.y, duration: 1, ease: "power2.out", overwrite: "auto" });
    };
}