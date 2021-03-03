let support3D = true;
try {
    gsap.registerPlugin(ScrollTrigger);
    background = document.getElementById("display-background");

    //Camera setup
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 100);
    camera.position.z = 7.5;
    const camBaseY = 4;
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

    //Animaate with random stagger
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

    //Stand and painting
    const standGeometry = new THREE.CylinderGeometry(5, 5, 1, 10, 10);
    const standMat = new THREE.MeshLambertMaterial({ color: 0xfff7f8 });
    const stand = new THREE.Mesh(standGeometry, standMat);
    const frameGeometry = new THREE.BoxGeometry(5, 7, .1);
    const frameMat = new THREE.MeshLambertMaterial({ color: 0x522700 });
    const frame = new THREE.Mesh(frameGeometry, frameMat);
    frame.position.set(0, 5, 0);
    stand.add(frame);
    backgroundScene.add(stand);

    //Add lighting
    const ambience = new THREE.AmbientLight(0x404040, 1);
    backgroundScene.add(ambience);
    const spotLight = new THREE.SpotLight(0x404040);
    spotLight.position.set(0, 10, 0);
    backgroundScene.add(spotLight);

    //Render loop
    //Set import vars
    function render() {
        renderer.render(backgroundScene, camera);
        requestAnimationFrame(render);
    };
    requestAnimationFrame(render);

    //Move cam with mouse
    const sensitivity = { x: 1, y: 1 };
    document.addEventListener("mousemove", function (e) {
        gsap.to(camera.position, {
            x: ((e.clientX / viewport.vw) * 2 - 1) * sensitivity.x,
            y: ((e.clientY / viewport.vh) * -2 + 1) * sensitivity.y + camBaseY,
            duration: .75, ease: "Power2.easeOut", overwrite: "auto",
            onUpdate: function () { camera.lookAt(frame.position); }
        });
    });

    //Animations
    readJsonFile("../info.json", function (timePeriods) {
        const timeElement = document.getElementsByTagName("time")[0];
        const infoPanel = document.getElementById("info-panel");
        const period = document.getElementById("period");
        const times = document.getElementById("times");
        const info = document.getElementById("info");
        const panelAnim = new gsap.timeline()
            .from(infoPanel, { autoAlpha: 0, x: 100, duration: .25, ease: "Power2.easeOut" })
            .from(infoPanel.children, { autoAlpha: 0, y: -100, stagger: .1, duration: .25, ease: "Power2.easeOut" });
        let panelVisible = true;

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

        const startingPeriod = timePeriods[0];
        let currentIndex = null;
        let currentObj;
        function setPanel(index) {
            if (currentIndex === index) return;
            currentIndex = index;
            currentObj = timePeriods[currentIndex];
        }
        function showPanel() {
            if (panelVisible) return;
            panelVisible = true;
            //Set textContents
            period.textContent = currentObj.title;
            times.textContent = currentObj.time;
            info.textContent = currentObj.text;
            //Play anim
            panelAnim.play();
        }
        function hidePanel() {
            if (!panelVisible) return;
            panelVisible = false;
            panelAnim.reverse();
        }
        setPanel(0);

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
    });
    const display = document.getElementById("display");
    const animationDuration = 10000;
}
catch (error) {
    console.log(error);
    support3D = false;
}

/*Used Functions*/
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