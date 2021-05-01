gsap.registerPlugin(ScrollToPlugin);
window.addEventListener("load", () => {
    //Scrolling text effect
    const scrollingText = document.getElementsByClassName("scrolling-text")[0];
    const clonedScrollingText = scrollingText ? scrollingText.cloneNode(true) : null;
    if (scrollingText) {
        scrollingText.parentNode.appendChild(clonedScrollingText);

        //Animate the text to scroll infinitely
        const time = 25;
        new gsap.timeline({ defaults: { repeat: -1, ease: "none", duration: time } })
            .fromTo(scrollingText, { yPercent: 0 }, { yPercent: 100 }, "<")
            .fromTo(clonedScrollingText, { yPercent: -100 }, { yPercent: 0 }, "<");
    }

    //Scroll to button and basic scroll effect
    const scrollTo = document.getElementById("scroll-to");
    if (scrollTo) {
        const destination = document.getElementById("destination");
        if (destination) {
            scrollTo.onclick = function () { gsap.to(window, { scrollTo: destination, duration: .5, ease: "power2.out" }) };
            if (scrollingText) {
                const heroText = document.getElementById("hero-text"),
                    letters = splitTextLetters(heroText.firstElementChild);

                //Home intro animation
                LoadingManager.animation.extend = tl => {
                    const stagger = .1;
                    gsap.utils.toArray(letters).forEach((letter, i) => {
                        const rotObject = { ease: "back.out(1.7)", clearProps: "all" };
                        rotObject[gsap.utils.random(["rotateX", "rotateY"])] = gsap.utils.random([180, -180]);
                        tl.from(letter, rotObject, (i === 0 ? ">" : "<") + stagger)
                    });
                    if (sizeQuery.matches) tl.from(heroText, { yPercent: -75, scale: 1.25, clearProps: "all" });

                    //Now start the 3d anim
                    shapeAnim.play();
                }
            }
        }
    }

    const loadWorldEvent = new LoadEvent();
    createScene();
    addRenderer();
    addAnimsAndEffects();
    render();
    loadWorldEvent.finish();
})

//3D TIME
let scene, camera, viewport, plane, material, shapeAnim, mouse = new THREE.Vector2(), objects = [], videos = [];
function createScene() {
    scene = new THREE.Scene();

    addobjects();
    addPlane();

    //Add camera
    const frustumSize = 1;
    camera = new THREE.OrthographicCamera(frustumSize / -2, frustumSize / 2, frustumSize / 2, frustumSize / -2, -5, 100);
    camera.position.set(0, 0, 2);
    scene.add(camera);
}
const spacing = .25;
function addobjects() {
    //The objects are not visible with normal rendering, instead they will be passed to a raymarching shader
    //Creates the shape of my logo
    objects[0] = new THREE.Vector4(-spacing * .75, -spacing, 0, .1);
    objects[1] = new THREE.Vector4(-spacing, spacing * .25, 0, .1);
    objects[2] = new THREE.Vector4(0, spacing, 0, .1);
    objects[3] = new THREE.Vector4(spacing, spacing * .25, 0, .1);
    objects[4] = new THREE.Vector4(spacing * .75, -spacing, 0, .1);
}
let lastVid = null;
function selectVideo() {
    const vid = gsap.utils.random(videos);
    vid.element.play();
    if (material) {
        lastVid.element.pause();
        material.uniforms.video.value = vid.texture;
    }
    lastVid = vid;
    return vid.texture;
}
function addPlane() {
    gsap.utils.toArray("video").forEach((vid, i) => {
        videos[i] = {
            element: vid,
            texture: new THREE.VideoTexture(vid, undefined, THREE.MirroredRepeatWrapping, THREE.MirroredRepeatWrapping)
        };
    });
    material = new THREE.ShaderMaterial({
        uniforms: {
            aspect: { value: 1 },
            mouse: { value: new THREE.Vector2(mouse.x, mouse.y) },
            time: { value: 0 },
            objects: { value: objects },
            blend: { value: 0 },
            globalScale: { value: 1 },
            video: { value: selectVideo() }
        },
        vertexShader: getVertexShader(),
        fragmentShader: getFragmentShader()
    });

    const geometry = new THREE.PlaneBufferGeometry(1, 1, 1, 1);

    plane = new THREE.Mesh(geometry, material);
    scene.add(plane);
}
function addRenderer() {
    renderer = new THREE.WebGLRenderer({ antialias: true, canvas: document.getElementsByTagName("canvas")[0] });
    viewport = {
        update: function () {
            //Update viewport
            this.vw = window.innerWidth
                || document.documentElement.clientWidth
                || document.body.clientWidth;
            this.vh = window.innerHeight
                || document.documentElement.clientHeight
                || document.body.clientHeight;

            //Update camera
            this.aspect = viewport.vw / viewport.vh;
            camera.aspect = this.aspect;
            camera.updateProjectionMatrix();

            //Update renderer
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.setSize(viewport.vw, viewport.vh, false);

            material.uniforms.aspect.value = this.aspect;
        }
    };
    //Update on resize
    window.addEventListener("resize", viewport.update.bind(viewport), false);
    viewport.update();
}
function addAnimsAndEffects() {
    function move(e) {
        //Page is not supported in all browsers
        if (e.pageX !== undefined) {
            mouse.x = (e.pageX / viewport.vw * 2 - 1) * viewport.aspect;
            mouse.y = -(e.pageY / viewport.vh * 2 - 1);
            return;
        }
        mouse.x = (e.clientX / viewport.vw * 2 - 1) * viewport.aspect;
        mouse.y = -(e.clientY / viewport.vh * 2 - 1);
    }
    document.addEventListener("pointermove", move);

    const bounce = new gsap.timeline()
        .to(material.uniforms.globalScale, { value: 1.5, duration: 1, ease: "elastic.out(1.5, .3)" })
        .to(material.uniforms.globalScale, { value: 1, duration: .5, ease: "power2.out" });
    renderer.domElement.addEventListener("click", e => {
        move(e);
        bounce.restart();
    });

    shapeAnim = new gsap.timeline({ repeat: -1, paused: true, defaults: { ease: "power2.out", duration: 2 } })
        .to(objects[0], { x: -1, y: 0, w: .2 }, "2.5")
        .to(objects[1], { x: -.5, y: 0, w: .2 }, "<.1")
        .to(objects[2], { x: 0, y: 0, w: .2 }, "<.1")
        .to(objects[3], { x: .5, y: 0, w: .2 }, "<.1")
        .to(objects[4], { x: 1, y: 0, w: .2 }, "<.1")
        .call(selectVideo)
        .to(objects, { x: 0 })
        .to(material.uniforms.blend, { value: 1 }, "<")
        .to(material.uniforms.blend, { value: 0 }, ">5")
        .to(objects[0], { x: -spacing * .75, y: -spacing, w: .1 }, "<.1")
        .to(objects[1], { x: -spacing, y: spacing * .25, w: .1 }, "<.1")
        .to(objects[2], { x: 0, y: spacing, w: .1 }, "<.1")
        .to(objects[3], { x: spacing, y: spacing * .25, w: .1 }, "<.1")
        .to(objects[4], { x: spacing * .75, y: -spacing, w: .1 }, "<.1");

    gsap.to(objects, {
        z: -2.5, ease: "power2.out", duration: .25, stagger: .05, scrollTrigger: {
            trigger: renderer.domElement,
            scrub: 1,
            start: "top top",
            end: "bottom top"
        }
    });
}
//Main render loop
const clock = new THREE.Clock(), snappiness = 5;
function render() {
    material.uniforms.mouse.value.lerp(mouse, clock.getDelta() * snappiness);
    material.uniforms.time.value = clock.getElapsedTime();

    renderer.render(scene, camera);
    requestAnimationFrame(render);
}

function getVertexShader() {
    return `
        varying vec2 vUv;
        varying vec3 vPosition;
        
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
        }
    `
}
function getFragmentShader() {
    return `
        #define MAX_STEPS 100
        #define MAX_DIST 5.
        #define SURF_DIST .001
        
        uniform float aspect;
        uniform vec2 mouse;
        uniform float time;
        uniform vec4 objects[5];
        uniform float blend;
        uniform float globalScale;
        uniform sampler2D video;
        varying vec2 vUv;
        
        float sdSphere(vec3 pos, vec3 sPos, float r) {
            return length(pos - sPos) - r;
        }

        float sdRoundBox(vec3 pos, vec3 b, float r) {
            vec3 q = abs(pos) - b;
            return length(max(q, 0.)) + min(max(q.x, max(q.y, q.z)), 0.) - r;
        }
        
        vec4 smin(vec4 x, vec4 y, float smoothing) {
            float h = clamp(.5 + .5 * (y.w - x.w) / smoothing, 0., 1.);
            float dist = mix(y.w, x.w, h) - smoothing * h * (1. - h);
            vec3 col = mix(y.rgb, x.rgb, h);
            return vec4(col, dist);
        }

        mat4 rotation3d(vec3 axis, float angle) {
            axis = normalize(axis);
            float s = sin(angle);
            float c = cos(angle);
            float oc = 1. - c;
            
            return mat4(
                    oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.,
                oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.,
                oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.,
                    0.,                                0.,                                0.,                                1.
                );
        }
        
        vec4 sdScene(vec3 pos) {
            const float smoothing = .25;
            vec4 dist = vec4(0.);
            
            //Green
            float sphere1Dist = sdSphere(pos, objects[0].xyz, objects[0].w * globalScale);
            vec3 sphere1Col = vec3(120., 192., 145.) / 255.;
            vec4 sphere1 = vec4(sphere1Col, sphere1Dist);
        
            //Blue
            float sphere2Dist = sdSphere(pos, objects[1].xyz, objects[1].w * globalScale);
            vec3 sphere2Col = vec3(112., 228., 239.) / 255.;
            vec4 sphere2 = vec4(sphere2Col, sphere2Dist);
            dist = smin(sphere1, sphere2, smoothing);
        
            //Yellow
            float sphere3Dist = sdSphere(pos, objects[2].xyz, objects[2].w * globalScale);
            vec3 sphere3Col = vec3(229., 237., 161.) / 255.;
            vec4 sphere3 = vec4(sphere3Col, sphere3Dist);
            dist = smin(dist, sphere3, smoothing);
        
            //Red
            float sphere4Dist = sdSphere(pos, objects[3].xyz, objects[3].w * globalScale);
            vec3 sphere4Col = vec3(255., 107., 115.) / 255.;
            vec4 sphere4 = vec4(sphere4Col, sphere4Dist);
            dist = smin(dist, sphere4, smoothing);
        
            //Purple
            float sphere5Dist = sdSphere(pos, objects[4].xyz, objects[4].w * globalScale);
            vec3 sphere5Col = vec3(226., 194., 255.) / 255.;
            vec4 sphere5 = vec4(sphere5Col, sphere5Dist);
            dist = smin(dist, sphere5, smoothing);
            

            //Central cube
            float slowedTime = time / 5.;
            vec3 transformedSpace = pos;
            transformedSpace.z -= objects[0].z;
            transformedSpace = (vec4(transformedSpace, 1.) * rotation3d(vec3(1.), slowedTime)).xyz;
            float boxDist = sdRoundBox(transformedSpace, vec3(.25) * globalScale, .1);
            vec4 box = vec4(vec3(0.), boxDist);
            dist = mix(dist, box, blend);

            //Mouse sphere
            const float displaceAmplitude = .01;
            const float displaceFrequency = 50.;
            const float displaceSpeed = .1;
            float offset = displaceSpeed * time;
            float displace = sin(displaceFrequency * (offset + pos.x)) * cos(displaceFrequency * (offset + pos.y)) * sin(displaceFrequency * (offset + pos.z)) * displaceAmplitude;
            float mouseSphereDist = sdSphere(pos, vec3(mouse.x, mouse.y, 0.), .075 * globalScale) + displace;
            vec3 mouseSphereCol = vec3(10., 10., 10.) / 255.;
            vec4 mouseSphere = vec4(mouseSphereCol, mouseSphereDist);
            dist = smin(dist, mouseSphere, smoothing / 2.);
        
            return dist;
        }
        
        vec3 calcNormal(vec3 pos) {
            const float eps = 0.001;
            const vec2 h = vec2(eps, 0);
            return normalize(vec3(sdScene(pos + h.xyy).w - sdScene(pos - h.xyy).w,
                                sdScene(pos + h.yxy).w - sdScene(pos - h.yxy).w,
                                sdScene(pos + h.yyx).w - sdScene(pos - h.yyx).w));
        }

        vec3 toBlackNWhite(vec4 color) {
            float lightness = (color.r + color.g + color.b) / 3.;
            return vec3(lightness);
        }
        
        vec4 calcColor(vec3 pos, vec3 camDir, vec2 screenUv, vec4 hit) {
            vec4 result = vec4(0);
            if (hit.w < MAX_DIST) {
                const float fresnelPower = 1.;
                const float fresnelStrength = .75;
                const vec3 fresnelCol = vec3(1.);
                const vec3 lightDir = vec3(0, 1, 1);
                const vec4 lightCol = vec4(.75, .75, 1, .9);
                const float aoIntensity = .25;

                vec3 normal = normalize(calcNormal(pos));

                vec3 refracted = refract(camDir, normal, 1. / 3.);
                screenUv += refracted.xy + .5;
                vec3 img = toBlackNWhite(texture2D(video, screenUv / 2.));

                float fresnel = clamp(pow(1. + dot(camDir, normal), fresnelPower) * fresnelStrength, 0., 5.);

                vec3 lightness = (lightCol.rgb * dot(lightDir, normal) * .5 + .5) * lightCol.a;

                vec3 col = mix(hit.rgb, img, blend) * lightness;
                result = vec4(mix(col, fresnelCol, fresnel), 1.);
            }
            return result;
        }

        vec4 rayMarch(vec3 camPos, vec3 camDir, out vec3 pos) {
            vec4 dist = vec4(0.);
            for (int i = 0; i < MAX_STEPS; i++) {
                pos = camPos + camDir * dist.w;
                vec4 sceneDist = sdScene(pos);
                dist.w += sceneDist.w;
                if (sceneDist.w < SURF_DIST || dist.w > MAX_DIST) {
                    dist.rgb = sceneDist.rgb;
                    break;
                }
            }
            return dist;
        }

        float random (vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }

        void main() {
            vec2 screenUv = vUv - .5;
            screenUv.x *= aspect;
            vec3 camPos = vec3(0., 0., 2.);
            vec3 camDir = normalize(vec3(screenUv, -1));
            vec3 hitPos;
            vec4 hit = rayMarch(camPos, camDir, hitPos);
            vec4 sceneCol = calcColor(hitPos, camDir, screenUv, hit);
            float noise = mix(.75, 1., random(screenUv + floor(mod(time, 10.) * 10.)));
            float darkness = max(1. - length(screenUv), 0.3);
            vec4 backgroundCol = vec4(vec3(82., 82., 81.) / 255. * darkness, 1.);
            gl_FragColor = mix(backgroundCol, sceneCol, sceneCol.a) * noise;
        }
    `
}