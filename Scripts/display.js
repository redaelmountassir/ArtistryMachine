//Setup
gsap.registerPlugin(ScrollTrigger);
background = document.getElementById("display-background");

//Camera setup
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 100);
camera.position.z = 3;
const camBaseY = 1.5;
camera.position.y = camBaseY;

//Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
const viewport = {
    vw: null,
    vh: null,
    update: function (preventCamUpdate) {
        this.vw = window.innerWidth
            || document.documentElement.clientWidth
            || document.body.clientWidth;
        this.vh = window.innerHeight
            || document.documentElement.clientHeight
            || document.body.clientHeight;
        //Update renderer
        renderer.setSize(this.vw, this.vh);
        renderer.setPixelRatio(window.devicePixelRatio);
        //Update Cam
        if (preventCamUpdate) {
            camera.aspect = this.vw / this.vh;
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
const box = new THREE.BoxGeometry(10, 10, 10);
const lightMat = new THREE.MeshLambertMaterial({ color: 0xfff7f8 });

const sphere1 = new THREE.Mesh(sphere, lightMat);
sphere1.position.set(-20, 0, -25);
shapesGroup.add(sphere1);
const sphere2 = new THREE.Mesh(largeSphere, lightMat);
sphere2.position.set(75, 30, -65);
shapesGroup.add(sphere2);
const sphere3 = new THREE.Mesh(medSphere, lightMat);
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

//Define frame base pos (early for focus light)
const frameBasePos = new THREE.Vector3(0, 2.25, 0);

//Add lighting
const ambience = new THREE.AmbientLight(0x404040, 1);
backgroundScene.add(ambience);
const spotLight = new THREE.SpotLight(0x404040, 2.5);
spotLight.position.set(0, 10, 0);
backgroundScene.add(spotLight);
const intensity = 7.5;
const distance = 0;
const angle = Math.PI / 2;
const penumbra = 1;
const decay = 1;
const focusLight = new THREE.SpotLight(0x404040, intensity, distance, angle, penumbra, decay);
focusLight.position.set(0, 4, 2);
focusLight.lookAt(frameBasePos);
backgroundScene.add(focusLight);

//Render loop
//Set import vars
function render() {
    renderer.render(backgroundScene, camera);
    requestAnimationFrame(render);
};
requestAnimationFrame(render);

//Move cam with mouse
const sensitivity = { x: .25, y: .5 };
let frame = null;
document.addEventListener("mousemove", function (e) {
    gsap.to(camera.position, {
        x: (e.clientX / viewport.vw * 2 - 1) * sensitivity.x,
        y: (e.clientY / viewport.vh * -2 + 1) * sensitivity.y + camBaseY,
        duration: .75, ease: "Power2.easeOut", overwrite: "auto",
        onUpdate: function () { camera.lookAt(frame ? frame.position : frameBasePos) }
    });
});

//Request the gltf and json files
readJsonFile("../info.json", function (timePeriods) {
    //Initiate loader
    const textureLoader = new THREE.TextureLoader();

    //Get needed textures
    let roughnessMap, normalMap, periodIndex = 0;
    const textures = [];
    textureLoader.load("../3D/Textures/fabricRough.png", function (loaded) {
        roughnessMap = loaded;
        textureLoader.load("../3D/Textures/fabricNormal.png", function (loaded) {
            normalMap = loaded;
            openPainting(timePeriods[periodIndex].painting);
            function openPainting(paintingName) {
                textureLoader.load("../Images/" + paintingName + ".jpg", function (loaded) {
                    textures.push(loaded);
                    periodIndex++;
                    periodIndex < timePeriods.length ? openPainting(timePeriods[periodIndex].painting) : startDisplay();
                });
            }
        });
    });

    function startDisplay() {
        //Initiate loader
        const gltfLoader = new THREE.GLTFLoader();

        //Add frame
        gltfLoader.load("../3D/frame.glb", function (frame) {
            //Create painting (approx. 3:4 ratio for textures, just a little bit of stretching its ok (I hope))
            const paintingGeometry = new THREE.PlaneGeometry(5, 7);
            const paintingMat = new THREE.MeshStandardMaterial({ map: textures[0], normalMap, roughnessMap });
            const painting = new THREE.Mesh(paintingGeometry, paintingMat);
            painting.rotation.y = Math.PI / 2;

            //Set frame
            frame = frame.scene;
            frame.rotation.y = Math.PI / -2;
            frame.scale.set(.4, .4, .4);
            frame.position.y = frameBasePos.y;
            frame.add(painting);

            //Add stage
            gltfLoader.load("../3D/stage.glb", function (stand) {
                stand = stand.scene;
                stand.add(frame);
                backgroundScene.add(stand);

                let currentIndex = null, panelVisible;
                const startingPeriod = timePeriods[0],
                    display = document.getElementById("display"),
                    timeElement = document.getElementsByTagName("time")[0],
                    infoPanel = document.getElementById("info-panel"),
                    period = document.getElementById("period"),
                    times = document.getElementById("times"),
                    info = document.getElementById("info"),
                    panelAnim = new gsap.timeline({ paused: true, defaults: { duration: .25, ease: "Power2.easeOut" } })
                        .from(infoPanel, { autoAlpha: 0, x: 100 })
                        .from(infoPanel.children, { autoAlpha: 0, y: -100, stagger: .1 });
                function setPanel(index) {
                    if (currentIndex === index) return;
                    currentIndex = index;
                    painting.material.map = textures[currentIndex];
                }
                function showPanel() {
                    if (panelVisible) return;
                    panelVisible = true;
                    const periodObj = timePeriods[currentIndex];
                    //It should not go here but its easier here
                    timeElement.lastElementChild.textContent = periodObj.title;
                    //Set textContents
                    period.textContent = periodObj.title;
                    times.textContent = periodObj.time;
                    info.textContent = periodObj.text;
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

                //Go through each time period and add it to the animation (Yes, the first one muc be written out seperately)
                timeline.addLabel("0")
                    .set(timeData, { current: startingPeriod.timeStart })
                    .set(document.body, { backgroundColor: startingPeriod.associatedColor });
                for (let i = 1; i < timePeriods.length; i++) {
                    const timePeriod = timePeriods[i];
                    //It is important for labels to be the index so that the correct period is accessed when snapping
                    timeline
                        .to(timeData, { current: timePeriod.timeStart === "Current" ? timeData.thisYear : timePeriod.timeStart })
                        .to(document.body, { backgroundColor: timePeriod.associatedColor }, "<")
                        .fromTo(stand.rotation, { y: 0 }, { y: Math.PI * 2, ease: "none" }, "<")
                        .addLabel(i);
                }
            })
        })
    }
});

/*Commonly Used Functions*/
function readJsonFile(file, callback) {
    const xmlhttp = new XMLHttpRequest();
    xmlhttp.overrideMimeType("application/json");
    xmlhttp.open("GET", file, true);
    xmlhttp.onreadystatechange = function () { if (this.readyState === 4 && this.status == "200") callback(JSON.parse(this.responseText)) };
    xmlhttp.send();
}
function arrayFromProperty(array, property) {
    const newArray = [];
    for (let i = 0; i < array.length; i++) newArray.push(array[i][property]);
    return newArray;
}