window.onload = function () {
    //Media Query for small screen
    const mediaQuery = window.matchMedia("(max-width: 50rem)");

    //Get loading variables
    //Loading System (Unique and more complex because it uses a tasks system)
    const loadingSection = document.getElementById("loading-section"),
        loadingBar = loadingSection.querySelector(".progress-bar"),
        progressCompleted = loadingBar.querySelector(".progress-completed"),
        loadingContext = document.getElementById("loading-context"),
        loadingSystem = {
            progress: loadingBar.value,
            //Weights for all tasks should add up to 1
            //Tasks internally have their own progress that updates the main progress bar based off of its weight
            tasks: [],
            createTask: function (context, weight) {
                const task = {
                    _progress: 0,
                    weight,
                    context,
                    get progress() { return this._progress },
                    set progress(value) {
                        if (value === this._progress) return;
                        this._progress = value;
                        loadingContext.textContent = this.context;
                        loadingSystem.updateMainProgress();
                    }
                }
                this.tasks.push(task);
                return task;
            },
            updateMainProgress: function () {
                this.progress = 0;
                for (let i = 0; i < this.tasks.length; i++) {
                    const task = this.tasks[i];
                    this.progress += task.progress * task.weight;
                }
                progressCompleted.style.width = this.progress + "%";
                if (this.progress >= 100) this.complete();
            },
            complete: function () {
                progressCompleted.style.width = 100 + "%";
                gsap.to(loadingSection, {
                    autoAlpha: 0, pointerEvents: "none",
                    delay: 1, ease: "power2.out", duration: 2, onComplete: blockTransition, onCompleteParams: [loadingSection]
                });
                this.tasks = null;
            }
        },
        textureLoader = new THREE.TextureLoader(),
        gltfLoader = new THREE.GLTFLoader();

    //Tell loading system that the dom has loaded
    loadingSystem.createTask("Loading Website...", .25).progress = 100;


    //Setup
    gsap.registerPlugin(ScrollTrigger);
    const display = document.getElementById("display"),
        background = document.getElementById("display-background");

    //Camera setup
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 100);
    camera.position.z = 3;
    const camBaseY = 1.5;
    camera.position.y = camBaseY;

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
            //Update Cam
            if (preventCamUpdate) {
                camera.aspect = viewport.vw / viewport.vh;
                camera.updateProjectionMatrix();
            }
        }
    };
    viewport.update(true);
    window.addEventListener("resize", viewport.update, false);
    background.appendChild(renderer.domElement);

    //Make main scene
    const backgroundScene = new THREE.Scene();

    //Create background shapes with staggered anims
    const shapesGroup = new THREE.Group();

    const sphere = new THREE.SphereGeometry(5, 30, 30);
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

    //Define frame base pos (early for focus light) and painting data raycast
    let frame, stand, painting, currentPeriod, cancelRaycasts = true;
    const raycaster = new THREE.Raycaster();
    const frameBasePos = new THREE.Vector3(0, 2.25, 0);
    //Painting data tooltip
    const paintingTooltip = {
        domElement: document.getElementsByTagName("figcaption")[0],
        visible: true,
        set: function (pos) {
            //Set pos
            this.xSet(pos.x);
            this.ySet(pos.y);
        },
        show: function (paintingObj) {
            //Set visibility
            if (!this.visible) {
                this.visible = true;
                paintingTooltip.hideAnim.reverse();
            }
            //Set content
            if (paintingObj.name != this.name.textContent) {
                this.name.textContent = paintingObj.name;
                this.artist.textContent = paintingObj.artist;
                this.painted.textContent = paintingObj.painted;
                this.from.textContent = paintingObj.from;
            }
        },
        hide: function () {
            //Set visibilty
            if (this.visible) {
                this.visible = false;
                paintingTooltip.hideAnim.play();
            }
        },
        init: function () {
            //Hide and add animation
            this.visible = false;
            this.hideAnim = gsap.to(this.domElement, { autoAlpha: 0, transformOrigin: "top left", scale: .5, ease: "power2.inOut", duration: .25 });
            //Init position setters
            this.xSet = gsap.quickSetter(this.domElement, "x", "px");
            this.ySet = gsap.quickSetter(this.domElement, "y", "px");
            //Textcontents for changing content
            this.name = this.domElement.children[0];
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
    const focusLight = new THREE.SpotLight(0xA3AAFF, 1.5);
    focusLight.penumbra = 1;
    focusLight.decay = 2;
    focusLight.position.set(0, 5, 4);
    focusLight.lookAt(frameBasePos);
    backgroundScene.add(focusLight);

    //Do not show tooltip if the canvas is even being hovered over (applies only to non-mobile devices)
    background.onmouseenter = function () { cancelRaycasts = false };
    background.onmouseleave = function () { cancelRaycasts = true };

    //Render loop
    function render() {
        //Raycast to the painting every render loop for the tooltip
        paintingTooltip.set(mouse.pos);
        if (currentPeriod && gyro.use ? paintingSelected : !cancelRaycasts) {
            raycaster.setFromCamera(mouse.normalizedPos, camera);
            raycaster.intersectObject(frame, true).length ? paintingTooltip.show(currentPeriod.painting) : paintingTooltip.hide();
        }
        else
            paintingTooltip.hide();

        renderer.render(backgroundScene, camera);
        requestAnimationFrame(render);
    };

    //Move cam with mouse on anything not mobile
    const mouse = {
        sensitivity: new THREE.Vector2(.25, .5),
        normalizedPos: new THREE.Vector2(0, 0),
        pos: new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2),
        moveEvent: function (e) {
            //Update mouse pos and make sure its normalized (-1 to 1 range)
            mouse.pos.x = e.clientX;
            mouse.pos.y = e.clientY;
            mouse.normalizedPos.x = mouse.pos.x / viewport.vw * 2 - 1;
            mouse.normalizedPos.y = mouse.pos.y / viewport.vh * -2 + 1;
            //Do NOT use the mouse if the gyro should be used
            if (gyro.use) return;
            setCamPos(mouse.normalizedPos.x * mouse.sensitivity.x, mouse.normalizedPos.y * mouse.sensitivity.y);
        }
    }
    document.addEventListener("mousemove", mouse.moveEvent, false);

    //Add orientation support to look around on mobile
    const gyro = {
        supported: window.DeviceOrientationEvent !== undefined,
        _use: false,
        sensitivity: new THREE.Vector2(1, 1),
        get use() { return this._use },
        set use(value) { this._use = value && this.supported },
        changeEvent: function (e) {
            const x = e.gamma / 90;
            const y = e.beta / 180;
            setCamPos(x * gyro.sensitivity.x, y * gyro.sensitivity.y);
        }
    }
    //This variable tracks whether you selected the painting (applies only on devices that use gyro)
    let paintingSelected = false;
    gyro.use = mediaQuery.matches;
    mediaQuery.addEventListener("change", function () { gyro.use = mediaQuery.matches });
    window.addEventListener("deviceorientation", gyro.changeEvent, false);
    window.addEventListener("click", function (e) { paintingSelected = background.contains(e.target) }, false);

    function setCamPos(x, y) {
        y += camBaseY;
        gsap.to(camera.position, {
            x, y, duration: .75, ease: "power2.out", overwrite: "auto",
            onUpdate: function () { camera.lookAt(frameBasePos) }
        });
    }

    //Request the gltf and json files
    //Create loading json files task
    const loadJsonTask = loadingSystem.createTask("Fetching Data...", .25);
    readJsonFile("../info.json", function (artEras) {
        //Needed textures
        const textures = [];
        let roughnessMap, normalMap;
        loadTextures();

        //Go through the steps in order after loading in the time periods
        //Step 1
        function loadTextures() {
            //Create loading textures files task and the value to update progress by
            const loadTexturesTask = loadingSystem.createTask("Loading Textures...", .25),
                textureLoadIncrement = 100 / (artEras.length + 2);
            //Load roughness map
            textureLoader.load("../3D/Textures/fabricRough.png", function (loaded) {
                roughnessMap = loaded;
                //Increase progress
                loadTexturesTask.progress += textureLoadIncrement;
                //Load normal map
                textureLoader.load("../3D/Textures/fabricNormal.png", function (loaded) {
                    normalMap = loaded;
                    //Update progress
                    loadTexturesTask.progress += textureLoadIncrement;
                    //Recursively open paintings until done
                    let i = 0;
                    openPainting(artEras[i].painting.fileName);
                    function openPainting(paintingName) {
                        textureLoader.load("../Images/" + paintingName + ".jpg", function (loaded) {
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
            const loadModelsTask = loadingSystem.createTask("Loading Models...", .25);

            //The update function when loading a model
            function updateModelLoad(e) { loadModelsTask.progress = progressFromEvent(e) / 2 };

            //Load frame and painting
            gltfLoader.load("../3D/frame.glb", function (loaded) {
                //Create painting (approx. 3:4 ratio for textures, just a little bit of stretching its ok (I hope))
                const paintingGeometry = new THREE.PlaneGeometry(5, 7);
                const paintingMat = new THREE.MeshStandardMaterial({ map: textures[0], normalMap, roughnessMap });
                painting = new THREE.Mesh(paintingGeometry, paintingMat);
                //Shadow support
                painting.traverse(function (n) { if (n.isMesh) n.receiveShadow = true });
                painting.rotation.y = Math.PI / 2;

                //Set frame
                frame = loaded.scene.children[0];
                frame.rotation.y = Math.PI / -2;
                frame.scale.set(.4, .4, .4);
                frame.position.y = frameBasePos.y - .1;
                gsap.to(frame.position, { y: "+=.2", repeat: -1, yoyo: true, duration: 5, ease: "sine.inOut" })
                //Shadow support
                frame.traverse(function (n) { if (n.isMesh) n.castShadow = n.receiveShadow = true });
                frame.add(painting);

                //Add stage
                gltfLoader.load("../3D/stage.glb", function (loaded) {
                    stand = loaded.scene.children[0];
                    //Shadow support
                    stand.traverse(function (n) {
                        if (n.isMesh) n.castShadow = n.receiveShadow = true;
                        if (n.material.map) n.material.map.anisotrophy = 16;
                    });
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
            const eraList = document.getElementById("era-list"),
                panelElement = document.getElementById("info-panel"),
                infoButton = panelElement.children[0],
                period = panelElement.children[1],
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
                        this.mobileMode = mediaQuery.matches;
                        //Open panel on click
                        infoButton.onclick = function () { this.visible ? this.hide(true) : this.show(true) }.bind(this);
                        //Prevents dragPanel from reacting
                        infoButton.ontouchstart = infoButton.onmousedown = function (e) { e.stopPropagation() }
                        function dragPanel(e) {
                            //User must click on the container. Not the paragraphs, the buttons, etc.
                            if (panelElement !== e.target) return;

                            //The click event will not reach the window so I manually tell paintingSelected its false
                            paintingSelected = false;
                            e.preventDefault();

                            //Only drag in mobile mode
                            if (!this.mobileMode) return;
                            //Define important vars
                            const touchEvents = e.touches != undefined,
                                panelBounds = panelElement.getBoundingClientRect(),
                                threshold = window.innerHeight * .5,
                                maxY = panelBounds.height - convertRemToPixels(4),
                                startTransform = getComputedStyle(panelElement).transform,
                                startY = touchEvents ? e.touches[0].clientY : e.clientY;
                            let deltaY = 0;
                            //This prevents panel element from transitioning during forced transformations
                            blockTransition(panelElement);
                            //Drag events
                            function drag(e) {
                                e.preventDefault();

                                //Gives the amount the mouse moved by in a 0-1 range
                                deltaY = startY - (touchEvents ? e.touches[0].clientY : e.clientY);
                                deltaY = this.visible ? gsap.utils.clamp(-maxY, 0, deltaY) : gsap.utils.clamp(0, maxY, deltaY);
                                //Sets the new transform (without interfering with the original transform if there was one)
                                panelElement.style.transform = startTransform != "none" ? startTransform + ` translateY(${-deltaY}px)` : `translateY(${-deltaY}px)`;
                            }
                            function stopDrag(e) {
                                e.preventDefault();

                                //Remove inline styles
                                panelElement.style.transform = null;
                                //Snap to the swipe end
                                this.visible ?
                                    -deltaY > threshold ? this.hide(true) : this.show(true) :
                                    deltaY > threshold ? this.show(true) : this.hide(true);
                                //Remove events
                                if (touchEvents) {
                                    document.removeEventListener("touchmove", drag, false);
                                    document.removeEventListener("touchend", stopDrag, false);
                                    document.addEventListener("touchcancel", stopDrag, false);
                                } else {
                                    document.removeEventListener("mousemove", drag, false);
                                    document.removeEventListener("mouseup", stopDrag, false);
                                }
                                allowTransition(panelElement);
                            }
                            //Assign events to correct actions
                            drag = drag.bind(this);
                            stopDrag = stopDrag.bind(this);
                            if (touchEvents) {
                                document.addEventListener("touchmove", drag, { passive: false });
                                document.addEventListener("touchend", stopDrag, { passive: false });
                                document.addEventListener("touchcancel", stopDrag, { passive: false });
                            } else {
                                document.addEventListener("mousemove", drag, false);
                                document.addEventListener("mouseup", stopDrag, false);
                            }
                        };
                        dragPanel = dragPanel.bind(this);
                        //Open panel on drag
                        panelElement.addEventListener("mousedown", dragPanel, false);
                        panelElement.addEventListener("touchstart", dragPanel, { passive: false });
                    }
                };
            //Initialize panel
            infoPanel.init();

            //Change mode on media query
            mediaQuery.addEventListener("change", function () { infoPanel.mobileMode = mediaQuery.matches }, false);

            //The scroll drives the animation
            let scrollingCheck;
            const startingPeriod = artEras[0];

            //Go through each time period and add it to the animation (Yes, the first one must be written out seperately)
            //Build the base timeline object driven by scrolling
            let scrollDuration = 3000;
            const tl = new gsap.timeline({
                scrollTrigger: {
                    trigger: display,
                    end: scrollDuration,
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
                labelText = document.createElement("h4");
            //Set up the first era label that will be used as a template for the rest
            labelText.textContent = startingPeriod.title;
            eraLabelTemplate.appendChild(labelText);
            listFragment.appendChild(eraLabelTemplate);

            //Add the initial state (Must be done seperately)
            tl.addLabel("0")
                .set(timeData, { current: startingPeriod.timeStart })
                .set(background, { backgroundColor: startingPeriod.associatedColor })
                .set(eraLabelTemplate, { scale: 2, transformOrigin: "right", color: "white" });


            for (let i = 1; i < artEras.length; i++) {
                const timePeriod = artEras[i];

                //Duplicate the era label and add it to the fragment list
                const eraLabel = eraLabelTemplate.cloneNode(true);
                eraLabel.firstElementChild.textContent = timePeriod.title;
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
                    .fromTo(eraLabel, { opacity: .5 }, { scale: 2, transformOrigin: "right", opacity: 1 }, "<")
                    .to(eraLabel.previousSibling, { scale: 1, transformOrigin: "right", opacity: .25 }, "<")
                    .addLabel(i);
            }
            //Add fragment to the actual DOM
            eraList.firstElementChild.appendChild(listFragment);

            //You MUST force complete or else progress will never actually hit 100 because of how progress events work
            loadingSystem.complete();
        }
    },
        function (e) { loadJsonTask.progress = progressFromEvent(e) });
}

/*Used Functions*/
function readJsonFile(file, callback, progressCallback) {
    const xmlhttp = new XMLHttpRequest();
    xmlhttp.overrideMimeType("application/json");
    xmlhttp.onreadystatechange = function () { if (this.readyState === 4 && this.status == "200") callback(JSON.parse(this.responseText)) };
    xmlhttp.onprogress = progressCallback;
    xmlhttp.open("GET", file, true);
    xmlhttp.send();
}
function progressFromEvent(event) {
    return event.loaded / event.total * 100;
}
function arrayFromProperty(array, property) {
    const newArray = [];
    for (let i = 0; i < array.length; i++) newArray.push(array[i][property]);
    return newArray;
}
function convertRemToPixels(rem) {
    return rem * parseFloat(getComputedStyle(document.documentElement).fontSize);
}