window.onload = function () {
    //Get loading variables
    const loadingSection = document.getElementById("loading-section");
    const loadingBar = loadingSection.querySelector(".progress-bar");
    const progressCompleted = loadingBar.querySelector(".progress-completed");
    const loadingCube = loadingSection.querySelector(".cube");
    const loadingContext = document.getElementById("loading-context");

    //Loading System (Unique and more complex because it uses a tasks system)
    const loadingSystem = {
        loadingBar,
        progressCompleted,
        loadingSection,
        loadingContext,
        loadingCube,
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
                    loadingSystem.loadingContext.textContent = this.context;
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
            this.progressCompleted.style.width = this.progress + "%";
            if (this.progress >= 100) this.complete();
        },
        complete: function () {
            this.progressCompleted.style.width = 100 + "%";
            gsap.to(this.loadingSection, { autoAlpha: 0, delay: 1, ease: "power2.out", duration: 2 });
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
    const medSphere = new THREE.SphereGeometry(10, 25, 25);
    const largeSphere = new THREE.SphereGeometry(25, 25, 25);
    const mat = new THREE.MeshLambertMaterial({ color: 0x525251 });

    const sphere1 = new THREE.Mesh(sphere, mat);
    sphere1.position.set(-20, -5, -25);
    shapesGroup.add(sphere1);
    const sphere2 = new THREE.Mesh(largeSphere, mat);
    sphere2.position.set(75, 30, -65);
    shapesGroup.add(sphere2);
    const sphere3 = new THREE.Mesh(medSphere, mat);
    sphere3.position.set(-40, 20, -15);
    shapesGroup.add(sphere3);

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
    let frame = null, cancelRaycasts = true, currentPeriod = null;
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

    background.onmouseenter = function () { cancelRaycasts = false };
    background.onmouseleave = function () { cancelRaycasts = true };

    //Render loop
    function render() {
        //Raycast to the painting every render loop for the tooltip
        if (currentPeriod && frame && !cancelRaycasts) {
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
    document.addEventListener("mousemove", function (e) {
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
    readJsonFile("../info.json", function (timePeriods) {
        //Create loading textures files task
        const loadTexturesTask = loadingSystem.createTask("Loading Textures...", .25);

        //Get needed textures
        let roughnessMap, normalMap, periodIndex = 0;
        const textures = [];
        //Value to increase the loading progress by every time a texture is loaded (plus 2 for the roughness and normal maps)
        const textureLoadProgress = 100 / (timePeriods.length + 2);
        textureLoader.load("../3D/Textures/fabricRough.png", function (loaded) {
            roughnessMap = loaded;
            loadTexturesTask.progress += textureLoadProgress;
            textureLoader.load("../3D/Textures/fabricNormal.png", function (loaded) {
                normalMap = loaded;
                loadTexturesTask.progress += textureLoadProgress;
                openPainting(timePeriods[periodIndex].painting.fileName);
                function openPainting(paintingName) {
                    textureLoader.load("../Images/" + paintingName + ".jpg", function (loaded) {
                        textures.push(loaded);
                        periodIndex++;
                        loadTexturesTask.progress += textureLoadProgress;
                        periodIndex < timePeriods.length ? openPainting(timePeriods[periodIndex].painting.fileName) : startDisplay();
                    });
                }
            });
        });

        function startDisplay() {
            //Initiate loader
            const gltfLoader = new THREE.GLTFLoader();

            //Create loading models task
            const loadModelsTask = loadingSystem.createTask("Loading Models...", .25);

            //Add frame
            gltfLoader.load("../3D/frame.glb", function (loaded) {
                //Create painting (approx. 3:4 ratio for textures, just a little bit of stretching its ok (I hope))
                const paintingGeometry = new THREE.PlaneGeometry(5, 7);
                const paintingMat = new THREE.MeshStandardMaterial({ map: textures[0], normalMap, roughnessMap });
                const painting = new THREE.Mesh(paintingGeometry, paintingMat);
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
                gltfLoader.load("../3D/stage.glb", function (stand) {
                    stand = stand.scene.children[0];
                    //Shadow support
                    stand.traverse(function (n) {
                        if (n.isMesh) n.castShadow = n.receiveShadow = true;
                        if (n.material.map) n.material.map.anisotrophy = 16;
                    });
                    backgroundScene.add(stand);
                    stand.add(frame);

                    let currentIndex = null, panelVisible;
                    const startingPeriod = timePeriods[0],
                        timeElement = document.getElementsByTagName("time")[0],
                        infoPanel = document.getElementById("info-panel"),
                        period = document.getElementById("period"),
                        times = document.getElementById("times"),
                        info = document.getElementById("info"),
                        panelAnim = new gsap.timeline({ paused: true, defaults: { duration: .25, ease: "power2.out" } })
                            .from(infoPanel, { autoAlpha: 0, x: 100 })
                            .from(infoPanel.children, { autoAlpha: 0, y: -100, stagger: .1 });
                    function setPanel(index) {
                        if (currentIndex === index) return;
                        currentIndex = index;
                        currentPeriod = timePeriods[currentIndex];
                        painting.material.map = textures[currentIndex];
                    }
                    function showPanel() {
                        if (panelVisible) return;
                        panelVisible = true;
                        //It should not go here but its easier here
                        timeElement.lastElementChild.textContent = currentPeriod.title;
                        //Set textContents
                        period.textContent = currentPeriod.title;
                        times.textContent = currentPeriod.time;
                        info.textContent = currentPeriod.text;
                        //Play anim
                        panelAnim.play();
                    }
                    function hidePanel() {
                        if (!panelVisible) return;
                        panelVisible = false;
                        panelAnim.reverse();
                    }
                    //Init panel
                    setPanel(0);
                    showPanel();

                    //Properly displays the time period on the nescessary elements
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
                        }
                    }

                    const animationDuration = 10000;
                    let scrollingCheck = null;
                    const timeline = new gsap.timeline({
                        scrollTrigger: {
                            trigger: display,
                            end: animationDuration,
                            pin: true,
                            scrub: true,
                            snap: {
                                snapTo: "labels",
                                duration: { min: .1, max: .5 }
                            }
                        },
                        onUpdate: function () {
                            if (scrollingCheck) scrollingCheck.kill();
                            hidePanel();
                            scrollingCheck = gsap.delayedCall(.5, showPanel);
                            setPanel(Math.round(timeline.totalProgress() * (timePeriods.length - 1)));
                        }
                    });

                    //Go through each time period and add it to the animation (Yes, the first one must be written out seperately)
                    timeline.addLabel("0")
                        .set(timeData, { current: startingPeriod.timeStart })
                        .set(background, { backgroundColor: startingPeriod.associatedColor });
                    for (let i = 1; i < timePeriods.length; i++) {
                        const timePeriod = timePeriods[i];
                        //It is important for labels to be the index so that the correct period is accessed when snapping
                        const associatedColorRGB = gsap.utils.splitColor(timePeriod.associatedColor);
                        for (let i = 0; i < 3; i++) associatedColorRGB[i] /= 255;
                        timeline
                            .to(timeData, { current: timePeriod.timeStart === "Current" ? timeData.thisYear : timePeriod.timeStart })
                            .to(background, { backgroundColor: timePeriod.associatedColor }, "<")
                            .to(ambientLight.color, { r: associatedColorRGB[0], g: associatedColorRGB[1], b: associatedColorRGB[2] }, "<")
                            .to(mat.color, { r: associatedColorRGB[0], g: associatedColorRGB[1], b: associatedColorRGB[2] }, "<")
                            .fromTo(stand.rotation, { y: 0 }, { y: Math.PI * 2, ease: "none" }, "<")
                            .addLabel(i);
                    }

                    //You MUST force complete or else progress will never actually hit 100 because of how progress events work
                    loadingSystem.complete();
                    render();
                },
                    function (e) {
                        //Divide by two because their are two models to load
                        loadModelsTask.progress = progressFromEvent(e) / 2;
                    })
            }, function (e) {
                //Divide by two because their are two models to load
                loadModelsTask.progress = progressFromEvent(e) / 2;
            })
        }
    },
        function (e) {
            //Add progress for json
            loadJsonTask.progress = progressFromEvent(e);
        });
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