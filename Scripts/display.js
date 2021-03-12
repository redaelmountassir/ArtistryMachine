window.onload = function () {
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
                    autoAlpha: 0, delay: 1, ease: "power2.out", duration: 2, onComplete: function () {
                        loadingSection.classList.add("no-anim");
                    }
                });
                this.tasks = null;
            }
        }

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
            renderer.setPixelRatio(window.devicePixelRatio);
            //Update Cam
            if (preventCamUpdate) {
                camera.aspect = viewport.vw / viewport.vh;
                camera.updateProjectionMatrix();
            }
        }
    };
    viewport.update(true);
    window.addEventListener("resize", viewport.update);
    background.appendChild(renderer.domElement);

    //Make main scene
    const backgroundScene = new THREE.Scene();

    //Create background shapes with staggered anims
    const shapesGroup = new THREE.Group();

    const sphere = new THREE.SphereGeometry(5, 25, 25);
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
        domElement: document.getElementById("painting-tooltip"),
        visible: true,
        set: function (pos, paintingObj) {
            //Set pos
            this.xSet(pos.x);
            this.ySet(pos.y);

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
    //Initiate loader
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load("../3D/Textures/backgroundHDRI.hdr", function (loaded) {
        scene.background = loaded;
        scene.environment = loaded;
    });

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

    //Do not show tooltip if the canvas is even being hovered over
    background.onmouseenter = function () { cancelRaycasts = false };
    background.onmouseleave = function () { cancelRaycasts = true };

    //Render loop
    function render() {
        //Raycast to the painting every render loop for the tooltip
        if (currentPeriod && !cancelRaycasts) {
            raycaster.setFromCamera(mouse.normalizedPos, camera);
            raycaster.intersectObject(frame, true).length ? paintingTooltip.set(mouse.pos, currentPeriod.painting) : paintingTooltip.hide();
        }
        else
            paintingTooltip.hide();

        renderer.render(backgroundScene, camera);
        requestAnimationFrame(render);
    };

    //Move cam with mouse
    const mouse = {
        sensitivity: new THREE.Vector2(.25, .5),
        normalizedPos: new THREE.Vector2(0, 0),
        pos: new THREE.Vector2(0, 0)
    }
    document.addEventListener("pointermove", function (e) {
        //Update mouse pos and make sure its normalized (-1 to 1 range)
        mouse.pos.x = e.clientX;
        mouse.pos.y = e.clientY;
        mouse.normalizedPos.x = mouse.pos.x / viewport.vw * 2 - 1;
        mouse.normalizedPos.y = mouse.pos.y / viewport.vh * -2 + 1;
        gsap.to(camera.position, {
            x: mouse.normalizedPos.x * mouse.sensitivity.x,
            y: mouse.normalizedPos.y * mouse.sensitivity.y + camBaseY,
            duration: .75, ease: "power2.out", overwrite: "auto",
            onUpdate: function () { camera.lookAt(frameBasePos) }
        });
    });

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
            const gltfLoader = new THREE.GLTFLoader(),
                loadModelsTask = loadingSystem.createTask("Loading Models...", .25);

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
            //You MUST force complete or else progress will never actually hit 100 because of how progress events work
            loadingSystem.complete();

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
            const panelElement = document.getElementById("info-panel"),
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
                        if (this.panelAnim) {
                            this.visible = false;
                            this.panelAnim.kill();
                            gsap.set(panelElement, { clearProps: "all" });
                            this.mobileMode ? gsap.set(panelElement.children, { clearProps: "all" }) : gsap.set(infoButton, { clearProps: "all" });
                        }
                        if (this.mobileMode) {
                            this.panelAnim = new gsap.timeline({ paused: true, defaults: { ease: "power2.out", duration: .5 } })
                                .from(panelElement, { yPercent: 100, y: "-4rem" })
                                .from(infoButton, { rotation: 180, yPercent: -45 }, "<");
                            infoButton.style.display = null;
                        } else {
                            this.panelAnim = new gsap.timeline({ paused: true, defaults: { ease: "power2.out", duration: .5 } })
                                .from(panelElement, { autoAlpha: 0, xPercent: 100 })
                                .from(panelElement.children, { stagger: .1, autoAlpha: 0, y: -100 });
                            infoButton.style.display = "none";
                        }
                        this.show();
                    },
                    visible: false,
                    currentIndex: -1,
                    panelAnim: null,
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
                        if ((this.visible || this.mobileMode) && !override) return;
                        this.visible = true;
                        //Show with anim
                        this.panelAnim.play();
                    },
                    hide: function (override) {
                        //Will not hide if already hidden or in mobile mode and the cancel isnt overidden
                        if ((!this.visible || this.mobileMode) && !override) return;
                        this.visible = false;
                        //Hide with anim
                        this.panelAnim.reverse();
                    },
                    init: function () {
                        this.set(0);
                        //Mobile-first methodology
                        this.mobileMode = true;
                        //Open panel on click
                        infoButton.onclick = function (e) { this.visible ? this.hide(true) : this.show(true) }.bind(this);
                        //Prevents dragPanel from reacting
                        infoButton.onmousedown = function (e) {
                            e.stopPropagation();
                            e.preventDefault();
                        }
                        infoButton.ontouchstart = function (e) {
                            e.stopPropagation();
                            e.preventDefault();
                        }
                        function dragPanel(e) {
                            //Only drag in mobile mode
                            if (!this.mobileMode) return;
                            //Pause the animation no matter the point (prevents fighting)
                            this.panelAnim.pause();
                            //Define important vars
                            const touchEvents = e.touches != undefined,
                                startY = touchEvents ? e.touches[0].clientY : e.clientY,
                                threshold = window.innerHeight * .75,
                                animTime = this.panelAnim.duration();
                            //Is the panel already at the top (1) or bottom (0)
                            let normalizedDelta = this.visible ? 1 : 0;
                            //Drag events
                            function drag(e) {
                                //Gives the amount the mouse moved by in a 0-1 range
                                const y = touchEvents ? e.touches[0].clientY : e.clientY;
                                normalizedDelta = this.visible ? 1 - ((y - startY) / threshold) : (startY - y) / threshold;
                                normalizedDelta = gsap.utils.clamp(0, 1, normalizedDelta);
                                //Scrub through the animation using that value
                                this.panelAnim.seek(normalizedDelta * animTime);
                            }
                            function stopDrag(e) {
                                //Snap to the closer end
                                normalizedDelta > .5 ? this.show(true) : this.hide(true);
                                //Remove events
                                if (touchEvents) {
                                    document.removeEventListener("touchmove", drag);
                                    document.removeEventListener("touchend", stopDrag);
                                } else {
                                    document.removeEventListener("mousemove", drag);
                                    document.removeEventListener("mouseup", stopDrag);
                                }
                            }
                            //Assign events to correct actions
                            drag = drag.bind(this);
                            stopDrag = stopDrag.bind(this);
                            if (touchEvents) {
                                document.addEventListener("touchmove", drag);
                                document.addEventListener("touchend", stopDrag);
                            } else {
                                document.addEventListener("mousemove", drag);
                                document.addEventListener("mouseup", stopDrag);
                            }
                        };
                        dragPanel = dragPanel.bind(this);
                        //Open panel on drag
                        panelElement.ontouchstart = dragPanel;
                        panelElement.onmousedown = dragPanel;
                    }
                };
            //Initialize panel
            infoPanel.init();

            //Change mode on media query
            const mediaQuery = window.matchMedia("(max-width: 50rem)");
            mediaQuery.onchange = function () { infoPanel.mobileMode = mediaQuery.matches };
            mediaQuery.onchange();

            //The scroll drives the animation
            let scrollingCheck;
            const startingPeriod = artEras[0];

            //Go through each time period and add it to the animation (Yes, the first one must be written out seperately)
            //Build the base timeline object driven by scrolling
            let scrollDuration = 5;
            const tl = new gsap.timeline({
                scrollTrigger: {
                    trigger: display,
                    end: function () { return window.innerHeight * scrollDuration },
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
            //Add the initial state (Must be done seperately)
            tl.addLabel("0")
                .set(timeData, { current: startingPeriod.timeStart })
                .set(background, { backgroundColor: startingPeriod.associatedColor });
            //For each art era, add the nescessary animations (and there are plenty)
            for (let i = 1; i < artEras.length; i++) {
                const timePeriod = artEras[i];
                //It is important for labels to be the index so that the correct period is accessed when snapping
                const associatedColorRGB = gsap.utils.splitColor(timePeriod.associatedColor);
                for (let i = 0; i < 3; i++) associatedColorRGB[i] /= 255;
                tl
                    .to(timeData, { current: timePeriod.timeStart === "Current" ? timeData.thisYear : timePeriod.timeStart })
                    .to(background, { backgroundColor: timePeriod.associatedColor }, "<")
                    .to(ambientLight.color, { r: associatedColorRGB[0], g: associatedColorRGB[1], b: associatedColorRGB[2] }, "<")
                    .to(mat.color, { r: associatedColorRGB[0], g: associatedColorRGB[1], b: associatedColorRGB[2] }, "<")
                    .fromTo(stand.rotation, { y: 0 }, { y: Math.PI * 2, ease: "none" }, "<")
                    .addLabel(i);
            }
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