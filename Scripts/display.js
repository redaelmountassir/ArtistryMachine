gsap.registerPlugin(ScrollToPlugin);
gsap.registerPlugin(EasePack);
gsap.registerPlugin(ScrollTrigger);

//Define some variables early so it can be used
let frame, stand, painting, currentPeriod, panelElement;
window.onload = function () {
    //Get loading variables
    //Loading System (Unique and more complex because it uses a tasks system)
    const loadingSection = document.getElementById("loading-section"),
        loadingValue = loadingSection.querySelector(".progress-value"),
        loadingSystem = {
            progress: 0,
            //Weights for all tasks should add up to 1
            //Tasks internally have their own progress that updates the main progress bar based off of its weight
            tasks: [],
            createTask: function (weight) {
                const task = {
                    _progress: 0,
                    weight,
                    get progress() { return this._progress },
                    set progress(value) {
                        if (value === this._progress) return;
                        this._progress = value;
                        loadingSystem.updateMainProgress();
                    }
                }
                this.tasks.push(task);
                return task;
            },
            updateMainProgress: function () {
                this.progress = this.tasks.reduce((sumProgress, task) => sumProgress + Math.min(100, task.progress) * task.weight, 0);
                loadingValue.textContent = Math.round(this.progress);
                if (this.progress >= 100) this.complete();
            },
            complete: function () {
                loadingValue.textContent = 100;
                this.tasks = null;

                //Animate away (I animate display because it is the main area as well)
                new gsap.timeline({ defaults: { ease: "power2.out", duration: .5 } }, "+=2")
                    .set(document.body, { overflowY: "hidden" })
                    .to(loadingSection, {
                        xPercent: -100, display: "none", ease: "power2.in",
                        onComplete: blockTransition, onCompleteParams: [loadingSection]
                    })
                    .from(display, { xPercent: 100, ease: "power2.in" }, "<")
                    .from([focusLight, spotLight], {
                        intensity: 0, duration: 2,
                        ease: "rough({ template: power2.in, strength: 2, points: 200, taper: 'out', randomize: true, clamp: false})"
                    })
                    .from("nav li", { yPercent: -200, duration: .25, clearProps: "yPercent", stagger: { each: .1, from: "center" } })
                    .from("aside", { opacity: 0, yPercent: "+=100", clearProps: "all" }, "<")
                    .set(document.body, { overflowY: null });
            }
        },
        textureLoader = new THREE.TextureLoader(),
        gltfLoader = new THREE.GLTFLoader();

    function progressFromEvent(event) {
        return event.loaded / event.total * 100;
    }

    //Tell loading system that the dom has loaded
    loadingSystem.createTask(.25).progress = 100;

    //Setup
    const display = document.getElementById("display"),
        background = document.getElementById("display-background");

    //Camera setup
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 100);
    camera.position.z = 3;
    camera.position.y = 2;

    //Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.5;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const viewport = {
        vw: null,
        vh: null,
        update: function (preventCamUpdate) {
            viewport.vw = window.innerWidth
                || document.documentElement.clientWidth
                || document.body.clientWidth;
            viewport.vh = window.innerHeight
                || document.documentElement.clientHeight
                || document.body.clientHeight;

            //Update renderer
            renderer.setSize(viewport.vw, viewport.vh);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

            //Update cam
            if (preventCamUpdate) {
                camera.aspect = viewport.vw / viewport.vh;
                camera.updateProjectionMatrix();
            }

            //Update stand
            adjustStand();
        }
    };
    viewport.update(true);
    window.addEventListener("resize", viewport.update, false);
    background.appendChild(renderer.domElement);

    //Make main scene
    const backgroundScene = new THREE.Scene();

    //Create background shapes with staggered anims
    const shapesGroup = new THREE.Group();

    const sphere = new THREE.SphereBufferGeometry(5, 30, 30);
    const mat = new THREE.MeshLambertMaterial({ color: 0x525251 });

    const sphere1 = new THREE.Mesh(sphere, mat);
    sphere1.position.set(-20, -5, -25);
    shapesGroup.add(sphere1);
    const sphere2 = new THREE.Mesh(sphere, mat);
    sphere2.position.set(75, 30, -65);
    sphere2.scale.set(5, 5, 5);
    shapesGroup.add(sphere2);
    const sphere3 = new THREE.Mesh(sphere, mat);
    sphere3.position.set(-40, 20, -15);
    sphere3.scale.set(2.5, 2.5, 2.5);
    shapesGroup.add(sphere3);
    const sphere4 = new THREE.Mesh(sphere, mat);
    sphere4.position.set(30, -20, -50);
    shapesGroup.add(sphere4);
    const sphere5 = new THREE.Mesh(sphere, mat);
    sphere5.position.set(0, 70, -60);
    shapesGroup.add(sphere5);

    backgroundScene.add(shapesGroup);

    //Animate with random stagger
    const childrenPositions = arrayFromProperty(shapesGroup.children, "position");
    const raiseAmount = "+=5";
    const raiseTime = 1;
    gsap.to(childrenPositions, {
        y: raiseAmount, ease: "power2.inOut", duration: raiseTime,
        stagger: {
            from: "random",
            yoyoEase: "power2.inOut",
            repeat: -1,
            amount: 1
        }
    });

    //Tooltip that provides info about the painting if the painting is hovered over
    const raycaster = new THREE.Raycaster();
    //Painting data tooltip
    const paintingTooltip = {
        domElement: document.getElementById("tooltip"),
        visible: false,
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
            this.domElement = customCursor.addState("painting info", this.domElement, 2, { overrideUseCursor: true, overrideDifference: true });

            //Textcontents for changing content
            this.name = this.domElement.children[0].firstElementChild;
            this.artist = this.domElement.children[1];
            this.painted = this.domElement.children[2];
            this.from = this.domElement.children[3];
        }
    };
    paintingTooltip.init();

    //Add lighting
    //Overall colored light
    const ambientLight = new THREE.AmbientLight(0x404040, .25);
    backgroundScene.add(ambientLight);

    //Lights up the spheres in the back and the back of the painting a little
    const backLight = new THREE.PointLight(0xFFF7F8, 3, 100, 2);
    backLight.position.set(0, 10, -50);
    backgroundScene.add(backLight);

    //Light that goes down on the painting and display
    const spotLight = new THREE.SpotLight(0xFFA3A0, .5);
    spotLight.position.set(0, 10, 0);
    gsap.to(spotLight.position, { y: "+=1", repeat: -1, yoyo: true, duration: 5, ease: "power2.inOut" });
    spotLight.penumbra = 1;
    spotLight.decay = 2;
    spotLight.castShadow = true;
    spotLight.shadow.bias = -0.0001;
    const shadowRes = 1024 * 4;
    spotLight.shadow.mapSize.width = shadowRes;
    spotLight.shadow.mapSize.height = shadowRes;
    backgroundScene.add(spotLight);

    //Light in the direction of the camera somewhat
    //The frame base pos will be the location the light will look at
    const frameBasePos = new THREE.Vector3(0, 2.25, 0);
    const focusLight = new THREE.SpotLight(0xA3AAFF, 1.5);
    focusLight.penumbra = 1;
    focusLight.decay = 2;
    focusLight.position.set(0, 5, 4);
    focusLight.lookAt(frameBasePos);
    backgroundScene.add(focusLight);

    //Render loop
    function render() {
        //Raycast to the painting every render loop for the tooltip
        //Only if a period is defined and the canvas is the currently hovered element
        if (currentPeriod && mouse.lastTarget && renderer.domElement.contains(mouse.lastTarget)) {
            //Send cast
            raycaster.setFromCamera(mouse.normalizedPos, camera);
            //If it hits something show the tooltip, otherwise hide it
            raycaster.intersectObject(frame, true).length ? paintingTooltip.show(currentPeriod.painting) : paintingTooltip.hide();
        }
        else
            paintingTooltip.hide();

        renderer.render(backgroundScene, camera);
        requestAnimationFrame(render);
    };

    //Smoothly sets the camera with a normalized position
    const sensitivity = .2;
    function setCamRotWithPos(x, y) {
        x *= -sensitivity;
        y *= sensitivity;
        gsap.to(camera.rotation, { y: x, x: y, duration: 1, ease: "power2.out", overwrite: "auto" });
    }

    //Move cam with mouse on anything not mobile
    const mouse = {
        normalizedPos: new THREE.Vector2(0, 0),
        pos: new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2),
        lastTarget: null,
        moveEvent: e => {
            //Caches the last target hovered over
            mouse.lastTarget = e.target;

            //Update mouse pos and make sure its normalized (-1 to 1 range)
            mouse.pos.x = e.clientX;
            mouse.pos.y = e.clientY;
            mouse.normalizedPos.x = mouse.pos.x / viewport.vw * 2 - 1;
            mouse.normalizedPos.y = mouse.pos.y / viewport.vh * -2 + 1;
            //Do NOT use the mouse if the gyro should be used
            if (gyro.use) return;
            setCamRotWithPos(mouse.normalizedPos.x, mouse.normalizedPos.y);
        }
    }
    //Add orientation support to look around on mobile
    const gyro = {
        pos: new THREE.Vector2(0, 0),
        supported: window.DeviceOrientationEvent !== undefined,
        _use: false,
        get use() { return this._use },
        set use(value) {
            setCamRotWithPos(0, 0);
            this._use = value && this.supported;
        },
        changeEvent: function (e) {
            gyro.pos.x = e.gamma / 90;
            gyro.pos.y = e.beta / 180;
            setCamRotWithPos(gyro.pos.x, gyro.pos.y);
        }
    }

    //You gotta do both cuz pointermove works very... unusually...
    document.addEventListener("pointermove", mouse.moveEvent, false);
    document.addEventListener("pointerdown", mouse.moveEvent, false);

    //This variable tracks whether you selected the painting (applies only on devices that use gyro)
    gyro.use = !sizeQuery.matches;
    sizeQuery.addEventListener("change", () => gyro.use = !sizeQuery.matches);
    window.addEventListener("deviceorientation", gyro.changeEvent, false);

    //Request the gltf and json files
    //Create loading json files task
    const loadJsonTask = loadingSystem.createTask(.25);
    readJsonFile("info.json", function (artEras) {
        //Needed textures
        const textures = [];
        let roughnessMap, normalMap;
        loadTextures();

        //Go through the steps in order after loading in the time periods
        //Step 1
        function loadTextures() {
            //Create loading textures files task and the value to update progress by
            const loadTexturesTask = loadingSystem.createTask(.25),
                textureLoadIncrement = 100 / (artEras.length + 2);
            //Load roughness map
            textureLoader.load("3D/Textures/fabricRough.png", function (loaded) {
                roughnessMap = loaded;
                //Increase progress
                loadTexturesTask.progress += textureLoadIncrement;
                //Load normal map
                textureLoader.load("3D/Textures/fabricNormal.png", function (loaded) {
                    normalMap = loaded;
                    //Update progress
                    loadTexturesTask.progress += textureLoadIncrement;
                    //Recursively open paintings until done
                    let i = 0;
                    openPainting(artEras[i].painting.fileName);
                    function openPainting(paintingName) {
                        textureLoader.load(`Images/${paintingName}.jpg`, function (loaded) {
                            textures.push(loaded);
                            loadTexturesTask.progress += textureLoadIncrement;
                            ++i < artEras.length ? openPainting(artEras[i].painting.fileName) : loadModels();
                        });
                    }
                });
            });
        }

        //Step 2
        function loadModels() {
            //Initiate loader and loading task
            const loadModelsTask = loadingSystem.createTask(.25);

            //The update function when loading a model
            function updateModelLoad(e) { loadModelsTask.progress = progressFromEvent(e) / 2 };

            //Load frame and painting
            gltfLoader.load("3D/frame.glb", function (loaded) {
                //Create painting (approx. 3:4 ratio for textures, just a little bit of stretching its ok (I hope))
                const paintingGeometry = new THREE.PlaneBufferGeometry(5, 7);
                const paintingMat = new THREE.MeshStandardMaterial({ map: textures[0], normalMap, roughnessMap });
                painting = new THREE.Mesh(paintingGeometry, paintingMat);
                //Shadow support
                painting.receiveShadow = true;
                painting.rotation.y = Math.PI / 2;

                //Set frame
                frame = loaded.scene.children[0];
                frame.rotation.y = Math.PI / -2;
                frame.scale.set(.4, .4, .4);
                frame.position.y = frameBasePos.y - .1;
                gsap.to(frame.position, { y: "+=.2", repeat: -1, yoyo: true, duration: 5, ease: "sine.inOut" })
                //Shadow support
                frame.castShadow = frame.receiveShadow = true;
                frame.add(painting);

                //Add stand
                gltfLoader.load("3D/stand.glb", function (loaded) {
                    stand = loaded.scene.children[0];
                    stand.material = mat;
                    //Shadow support
                    stand.castShadow = stand.receiveShadow = true;
                    //Add to scene
                    backgroundScene.add(stand);
                    stand.add(frame);

                    startDisplay(stand, painting, textures);
                    render();
                }, updateModelLoad)
            }, updateModelLoad);
        }

        //Step 3
        function startDisplay() {
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
                            if (year.length < 4) { const neededZeros = 4 - year.length; for (let i = 0; i < neededZeros; i++) year = "0" + year; }
                            //Add bc
                            if (appendBC) year += "BC";
                        }
                        else
                            year = "Now";

                        //Set all the elements that show time
                        if (timeElement.firstElementChild) timeElement.firstElementChild.textContent = year;
                        if (timeElement.lastElementChild) timeElement.lastElementChild.textContent = currentPeriod.title;
                    }
                }

            //Set up the panel that will display the information about a given period
            panelElement = document.getElementById("info-panel");
            const eraList = document.getElementById("era-list"),
                infoButton = panelElement.children[0],
                period = panelElement.children[1].firstElementChild,
                times = panelElement.children[2],
                info = panelElement.children[3],
                infoPanel = {
                    _mobileMode: null,
                    get mobileMode() { return this._mobileMode },
                    set mobileMode(value) {
                        if (this._mobileMode === value) return;
                        this._mobileMode = value;
                        this.show(true);
                        preventTransition(panelElement);
                        preventTransition(eraList);
                    },
                    visible: false,
                    currentIndex: -1,
                    set: function (index) {
                        if (this.currentIndex === index) return;
                        this.currentIndex = index;
                        currentPeriod = artEras[this.currentIndex];
                        period.textContent = currentPeriod.title;
                        times.textContent = currentPeriod.time;
                        info.textContent = currentPeriod.text;
                        painting.material.map = textures[this.currentIndex];
                    },
                    show: function (override) {
                        //Will not show if already visible or in mobile mode and the cancel isnt overidden
                        //If the panel is open in mobile mode, and there is scrolling, just update
                        if (!override && (this.visible || this.mobileMode)) return eraList.classList.remove("expand");
                        this.visible = true;
                        panelElement.classList.add("expand");
                        if (!this.mobileMode) {
                            gsap.from(panelElement.children, { opacity: 0, y: -100, stagger: .25, ease: "power2.out", clearProps: true });
                            eraList.classList.remove("expand");
                        }
                    },
                    hide: function (override) {
                        //Will not hide if already hidden or in mobile mode and the cancel isnt overidden
                        if (!override && (!this.visible || this.mobileMode)) return eraList.classList.add("expand");
                        this.visible = false;
                        //Hide with anim
                        panelElement.classList.remove("expand");
                        if (!this.mobileMode) eraList.classList.add("expand");
                    },
                    init: function () {
                        this.set(0);
                        this.mobileMode = !sizeQuery.matches;
                        //Open panel on click
                        infoButton.onclick = function () { this.visible ? this.hide(true) : this.show(true) }.bind(this);

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
                                maxY = panelBounds.height - convertRemToPixels(4),
                                startTransform = getComputedStyle(panelElement).transform,
                                startY = e.clientY;
                            let deltaY = 0;

                            //if the user is dragging with their finger, this prevents them from scrolling at the same time
                            panelElement.style.touchAction = "none";

                            //Drag events
                            const draggingPanel = (e => {
                                //Gives the amount the mouse moved by in a 0-1 range
                                deltaY = startY - e.clientY;
                                deltaY = this.visible ? gsap.utils.clamp(-maxY, 0, deltaY) : gsap.utils.clamp(0, maxY, deltaY);
                                //Sets the new transform (without interfering with the original transform if there was one)
                                panelElement.style.transform = startTransform != "none" ? startTransform + ` translateY(${-deltaY}px)` : `translateY(${-deltaY}px)`;
                            }).bind(this);
                            const stopDraggingPanel = (() => {
                                //Remove inline styles
                                panelElement.style.touchAction = null;
                                panelElement.style.transform = null;

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
                        panelElement.addEventListener("pointerdown", dragPanel);

                        //Adjust stand
                        adjustStand();
                    }
                };

            //Initialize panel
            infoPanel.init();

            //Change mode on media query
            sizeQuery.addEventListener("change", () => infoPanel.mobileMode = !sizeQuery.matches, false);

            //The scroll drives the animation
            let scrollingCheck;
            const startingPeriod = artEras[0], len = artEras.length, lenMin1 = len - 1;

            //Go through each time period and add it to the animation (Yes, the first one must be written out seperately)
            //Build the base timeline object driven by scrolling
            const tl = new gsap.timeline({
                scrollTrigger: {
                    trigger: display,
                    end: () => innerHeight * lenMin1,
                    pin: true,
                    scrub: 1,
                    snap: {
                        snapTo: "labels",
                        duration: { min: .1, max: .5 }
                    }
                },
                onUpdate: function () {
                    if (scrollingCheck) scrollingCheck.kill();
                    infoPanel.hide();
                    scrollingCheck = gsap.delayedCall(.5, infoPanel.show.bind(infoPanel));
                    infoPanel.set(Math.round(this.totalProgress() * (artEras.length - 1)));
                }
            });

            //Create a list fragment to append the many era label 
            const listFragment = new DocumentFragment(),
                eraLabelTemplate = document.createElement("li"),
                eraScrollButton = document.createElement("button"),
                labelText = document.createElement("h4");
            //Set up the first era label that will be used as a template for the rest
            labelText.textContent = startingPeriod.title;
            eraScrollButton.classList.add("no-flex");
            eraScrollButton.onpointerdown = () => { gsap.to(window, { scrollTo: 0, ease: "power2.out", duration: .5 }) };
            eraScrollButton.appendChild(labelText);
            eraLabelTemplate.appendChild(eraScrollButton);
            listFragment.appendChild(eraLabelTemplate);

            //Add the initial state (Must be done seperately)
            tl.addLabel("0")
                .set(timeData, { current: startingPeriod.timeStart })
                .set(background, { backgroundColor: startingPeriod.associatedColor })
                .set(eraLabelTemplate, { scale: 2, color: "white" });

            for (let i = 1; i < len; i++) {
                const timePeriod = artEras[i];

                //Duplicate the era label and add it to the fragment list
                const eraLabel = eraLabelTemplate.cloneNode(true);
                eraLabel.firstElementChild.firstElementChild.textContent = timePeriod.title;
                eraLabel.firstElementChild.onpointerdown = () => { gsap.to(window, { scrollTo: i * innerHeight, ease: "power2.out", duration: .5 }) };
                listFragment.appendChild(eraLabel);

                //It is important for labels to be the index so that the correct period is accessed when snapping
                const associatedColorRGB = gsap.utils.splitColor(timePeriod.associatedColor);
                for (let i = 0; i < 3; i++) associatedColorRGB[i] /= 255;
                tl
                    .to(timeData, { current: timePeriod.timeStart === "Current" ? timeData.thisYear : timePeriod.timeStart })
                    .to(background, { backgroundColor: timePeriod.associatedColor }, "<")
                    .to(ambientLight.color, { r: associatedColorRGB[0], g: associatedColorRGB[1], b: associatedColorRGB[2] }, "<")
                    .to(mat.color, { r: associatedColorRGB[0], g: associatedColorRGB[1], b: associatedColorRGB[2] }, "<")
                    .fromTo(stand.rotation, { y: 0 }, { y: Math.PI * 2, ease: "none" }, "<")
                    .fromTo(eraLabel, { opacity: .5 }, { scale: 2, opacity: 1 }, "<")
                    .to(eraLabel.previousSibling, { scale: 1, opacity: .25 }, "<")
                    .addLabel(i);
            }
            //Add fragment to the actual DOM
            eraList.firstElementChild.appendChild(listFragment);

            //You MUST force complete or else progress will never actually hit 100 because of how progress events work
            loadingSystem.complete();
        }
    },
        e => loadJsonTask.progress = progressFromEvent(e));

    //Places the frame in a good location not blocked by the info panel
    const minSpaceTaken = .3, offsetLeftBy = 3;
    function adjustStand() {
        if (!stand || !panelElement) return;

        //Total screen space taken by panel element
        const spaceTaken = panelElement.clientWidth / viewport.vw;
        //If on mobile or theres enough screen space, don't worry about it
        if (!sizeQuery.matches || spaceTaken < minSpaceTaken) return stand.position.x = 0;
        //If there is not enough space, move the frame left on the screen by the needed amount
        stand.position.x = -spaceTaken * offsetLeftBy;
    }
}