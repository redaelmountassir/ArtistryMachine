const canvas = {
    canvasElement: undefined,
    ctx: undefined,
    bounds: undefined,
    //2k rectangular
    resolution: {
        //Private
        _w: 0,
        _h: 0,
        //Public
        get w() { return this._w },
        get h() { return this._h },
        get aspectRatio() { return this.w / this.h },
        set(w, h) {
            this._w = w;
            this._h = h;
            canvas.canvasElement.width = this.w;
            canvas.canvasElement.height = this.h;
        }
    },
    //Remaps client pos to canvas space
    toCanvasSpace(pos) {
        return {
            x: gsap.utils.mapRange(this.bounds.left, this.bounds.right, 0, this.resolution.w, pos.x),
            y: gsap.utils.mapRange(this.bounds.top, this.bounds.bottom, 0, this.resolution.h, pos.y)
        };
    },
    resizeCanvas(viewport) {
        //Update canvas size (not res)
        const scale = FitRectInRect(viewport.vw, viewport.vh, this.resolution.w, this.resolution.h);
        this.canvasElement.style.width = `${this.resolution.w * scale}px`;
        this.canvasElement.style.height = `${this.resolution.h * scale}px`;

        //Change the bounding client for remap
        this.bounds = this.canvasElement.getBoundingClientRect();
    },
    setReference(img) {
        this.currentRef = img;
        if (!this.currentRef) {
            this.reference.style.backgroundImage = null;
            return gsap.to(this.canvasElement, { autoAlpha: 1, ease: "power2.out", duration: .25 });
        }
        this.reference.style.backgroundImage = `url(${this.currentRef.src})`;
        gsap.to(this.canvasElement, { autoAlpha: .25, ease: "power2.out", duration: .25 });
    },
    clear() {
        //Start with a white canvas
        this.ctx.save();
        this.ctx.fillStyle = "#FFFFFF";
        this.ctx.fillRect(0, 0, this.resolution.w, this.resolution.h);
        viewport.onResize = this.resizeCanvas.bind(this);
        this.ctx.restore();
    },
    defaultStyles() {
        //Default canvas settings
        canvas.ctx.lineCap = "round";
        canvas.ctx.lineJoin = "round";
    },
    init() {
        this.canvasElement = document.getElementsByTagName("canvas")[0];
        this.canvasElement.style.touchAction = "none";
        this.canvasElement.parentElement.style.overflow = "auto";
        sizeQuery.matches ? this.resolution.set(1920, 1080) : this.resolution.set(1080, 1920);

        this.ctx = this.canvasElement.getContext("2d", { alpha: false });
        this.clear();
        this.defaultStyles();

        //Gallery reference system
        this.reference = document.getElementsByClassName("reference")[0];
        const galleryView = document.getElementsByClassName("gallery-view")[0],
            galleryAside = galleryView.parentElement,
            gallery = galleryView.firstElementChild;
        galleryView.previousElementSibling.onclick = () => galleryAside.classList.toggle("unexpand");
        gallery.onclick = (e => {
            if (e.target === gallery) return;
            if (this.currentRef) {
                this.currentRef.classList.remove("selected");
                if (this.currentRef === e.target) return this.setReference(null);
            }
            this.setReference(e.target);
            this.currentRef.classList.add("selected");
        }).bind(this);
        gsap.utils.toArray(gallery.children).forEach(img => {
            gsap.from(img, {
                autoAlpha: 0, ease: "power2.out", duration: .25,
                scrollTrigger: {
                    trigger: img,
                    scroller: galleryView,
                    horizontal: true,
                    start: "center right"
                }
            })
        })
    }
}
const viewport = {
    vw: 0,
    vh: 0,
    onResize: null,
    update() {
        //Update viewport dimensions
        this.vw = window.innerWidth
            || document.documentElement.clientWidth
            || document.body.clientWidth;
        this.vh = window.innerHeight
            || document.documentElement.clientHeight
            || document.body.clientHeight;

        if (typeof this.onResize === "function") this.onResize(this);
    },
    init() {
        window.addEventListener("resize", this.update.bind(this), false);
        this.update();
    }
}
const mouse = {
    down: false,
    pos: { x: 0, y: 0 },
    remapped: { x: 0, y: 0 },
    onStart(e) {
        this.onDown(e);
        document.addEventListener("pointermove", this.onDown);
        document.addEventListener("pointerup", this.onUp);
        document.addEventListener("pointercancel", this.onUp);
    },
    onDown(e) {
        this.down = true;
        if (!this.down) return;
        this.pos.x = e.clientX;
        this.pos.y = e.clientY;
        this.remapped = canvas.toCanvasSpace(this.pos);
        this.moved = true;
    },
    onUp() {
        this.down = false;
        document.removeEventListener("pointermove", this.onDown);
        document.removeEventListener("pointerup", this.onUp);
        document.removeEventListener("pointercancel", this.onUp);
    },
    init() {
        this.onStart = this.onStart.bind(this);
        this.onDown = this.onDown.bind(this);
        this.onUp = this.onUp.bind(this);
        canvas.canvasElement.addEventListener("pointerdown", this.onStart, false);
    }
}
const pen = {
    stroke: 0,
    strokeCol: "",
    fillCol: "",
    tool: undefined,
    history: {
        undoStack: [],
        redoStack: [],
        get canUndo() { return this.undoStack.length !== 0 },
        get canRedo() { return this.redoStack.length !== 0 },
        redo() {
            if (!this.canRedo) return;
            this.undoStack.push(this.redoStack.pop());
            this.redraw();
            this.updateBtns();
        },
        undo() {
            if (!this.canUndo) return;
            this.redoStack.push(this.undoStack.pop());
            this.redraw();
            this.updateBtns();
        },
        clear() {
            this.undoStack = [];
            this.redoStack = [];
            this.updateBtns();
        },
        redraw() {
            canvas.clear();
            canvas.ctx.save();
            this.undoStack.forEach(action => action.redraw());
            canvas.ctx.restore();
        },
        add(event) {
            this.undoStack.push(event);
            if (this.redoStack.length) this.redoStack = [];
            this.updateBtns();
        },
        updateBtns() {
            this.undoButton.disabled = !this.canUndo;
            this.redoButton.disabled = !this.canRedo;
        }
    },
    linkSettingsToPen() {
        const colorPickers = document.getElementsByClassName("color-picker"),
            stroke = document.getElementsByClassName("stroke")[0],
            strokeSlider = stroke.nextElementSibling.nextElementSibling,
            strokeVisual = strokeSlider.nextElementSibling;

        this.fillColorPicker = new Picker(pen, "fillCol", colorPickers[0], colorPickers[0].previousElementSibling, new HSV(0, 1, 0, 0));
        this.strokeColorPicker = new Picker(pen, "strokeCol", colorPickers[1], colorPickers[1].previousElementSibling);

        let lastWidth = 0;
        function setStroke(width) {
            width = parseFloat(width);
            lastWidth = isNaN(width) ? lastWidth : width;
            lastWidth = gsap.utils.clamp(strokeSlider.min, strokeSlider.max, lastWidth);
            stroke.value = lastWidth;
            strokeSlider.value = lastWidth;
            strokeVisual.style.strokeWidth = (lastWidth / strokeSlider.max * 15) + "px";
            pen.stroke = lastWidth;
        };
        setStroke(stroke.value);
        stroke.onchange = () => setStroke(stroke.value);
        strokeSlider.oninput = () => setStroke(strokeSlider.value);

        addTools();

        document.addEventListener("keydown", (e => {
            if (!this.currentAction && e.ctrlKey && e.key.toLowerCase() === "z") e.shiftKey ? this.history.redo() : this.history.undo()
        }).bind(this));
        this.history.undoButton = document.getElementById("undo");
        this.history.redoButton = document.getElementById("redo");
        this.history.undoButton.addEventListener("click", (() => this.history.undo()).bind(this));
        this.history.redoButton.addEventListener("click", (() => this.history.redo()).bind(this));
        document.getElementById("restart").addEventListener("click", () => {
            pen.history.clear();
            new gsap.timeline({ defaults: { duration: .25, ease: "power2.out" } })
                .to(canvas.canvasElement, { scaleY: 0 })
                .call(() => {
                    sizeQuery.matches ? canvas.resolution.set(1920, 1080) : canvas.resolution.set(1080, 1920);
                    canvas.resizeCanvas(viewport);
                    canvas.clear();
                    //Default canvas settings
                    this.defaultStyles();
                })
                .to(canvas.canvasElement, { scaleY: 1, clearProps: "scale" })
                .call(() => canvas.resizeCanvas(viewport));
        });
        document.getElementById("finalize").addEventListener("click", () => {

        });
    },
    update() {
        requestAnimationFrame(this.update);
        if (mouse.down) {
            //On pointer down
            if (!this.currentAction) {
                this.currentAction = new DrawAction(this.tool, this.stroke, this.strokeCol, this.fillCol);

                pen.nav.style.pointerEvents = "none";
                gsap.to(pen.asides, { autoAlpha: 0, delay: 1, ease: "power2.out", duration: .5 });
            };

            //On pointer move
            if (mouse.moved) {
                this.currentAction.draw({ x: mouse.remapped.x, y: mouse.remapped.y });
                mouse.moved = false;
            }
            return;
        }
        //On pointer up
        if (this.currentAction) {
            this.currentAction.up({ x: mouse.remapped.x, y: mouse.remapped.y });
            this.history.add(this.currentAction);
            this.currentAction = null;

            pen.nav.style.pointerEvents = null;
            gsap.to(pen.asides, { autoAlpha: 1, ease: "power2.out", duration: .5, overwrite: true });
        }
    },
    init() {
        //Elements that will block the pen when they are in the way
        this.nav = document.getElementsByTagName("nav")[0];
        this.asides = gsap.utils.toArray("aside");

        this.update = this.update.bind(this);
        this.update();

        this.linkSettingsToPen();
    }
}

window.addEventListener("load", () => {
    canvas.init();
    viewport.init();
    mouse.init();
    pen.init();
});


function Picker(obj, prop, picker, pickerButton, initial) {
    const pallete = picker.children[0],
        hueSlider = picker.children[1],
        alphaSlider = picker.children[2],
        hexInput = picker.children[4];

    const palleteSlider = new Slider2D(pallete);
    palleteSlider.oninput = (e => {
        color.s = e.x;
        color.v = 1 - e.y;
        this.updateColor();
    }).bind(this);
    hueSlider.oninput = (() => {
        color.h = parseFloat(hueSlider.value);
        this.updateColor();
    }).bind(this);
    alphaSlider.oninput = (() => {
        color.a = parseFloat(alphaSlider.value);
        this.updateColor();
    }).bind(this);
    hexInput.onchange = (() => {
        rgb = gsap.utils.splitColor(hexInput.value);
        RGBtoHex(rgb[0], rgb[1], rgb[2], rgb[3])
        this.updateColor();
    }).bind(this);

    const color = initial ? initial : new HSV(0, 1, 0);
    this.updateColor = function (updateSliders) {
        const hexColor = color.toHex();
        hexInput.value = hexColor;

        picker.style.setProperty("--current-alpha", color.a);
        picker.style.setProperty("--current-hue", new HSV(color.h, 1, 1).toHex());
        picker.style.setProperty("--current-color", hexColor);
        pickerButton.style.setProperty("--current-color", hexColor);

        if (updateSliders) {
            palleteSlider.set(color.s, 1 - color.v);
            hueSlider.value = color.h;
            alphaSlider.value = color.a;
            hexInput.value = hexColor;
        }
        obj[prop] = hexColor;
    }
    this.updateColor(true);
}

//A alternative to input type slider for two dimensions
function Slider2D(slideElement) {
    const knob = slideElement.firstElementChild;
    let bounds = undefined;
    function sliderDown(e) {
        e.preventDefault();

        bounds = slideElement.getBoundingClientRect();
        sliderMove(e);

        document.addEventListener("pointermove", sliderMove);
        document.addEventListener("pointerup", sliderUp);
        document.addEventListener("pointercancel", sliderUp);
    }
    const sliderMove = (e => {
        e.preventDefault();

        let x = e.clientX, y = e.clientY;
        x = gsap.utils.mapRange(bounds.left, bounds.right, 0, 1, x);
        y = gsap.utils.mapRange(bounds.top, bounds.bottom, 0, 1, y);
        this.set(x, y);
    }).bind(this);
    function sliderUp() {
        document.removeEventListener("pointermove", sliderMove);
        document.removeEventListener("pointerup", sliderUp);
        document.removeEventListener("pointercancel", sliderUp);
    }
    slideElement.addEventListener("pointerdown", sliderDown);

    this.set = function (x, y) {
        x = gsap.utils.clamp(0, 1, x);
        y = gsap.utils.clamp(0, 1, y);
        knob.style.left = x * 100 + "%";
        knob.style.top = y * 100 + "%";
        if (this.oninput) this.oninput({ x, y });
    }
}

function DrawAction(tool, strokeWidth, strokeCol, fillCol) {
    this.tool = tool;
    this.strokeWidth = strokeWidth;
    this.strokeCol = strokeCol;
    this.fillCol = fillCol;
    if (this.tool.inbetween) this.points = [];
    this.down({ x: mouse.remapped.x, y: mouse.remapped.y });
}
DrawAction.prototype.down = function (mouse, redraw) {
    canvas.ctx.fillStyle = this.fillCol;
    canvas.ctx.strokeStyle = this.strokeCol;
    canvas.ctx.lineWidth = this.strokeWidth;
    this.start = mouse;
    canvas.ctx.beginPath();
    if (this.tool.down) this.tool.down(this.start, redraw);
}
DrawAction.prototype.draw = function (mouse) {
    //End will always be set to the last value (in draw bc pressure is 0 on up)
    if (this.tool.draw) this.tool.draw(mouse);
    if (this.tool.inbetween) {
        if (!this.end) this.points.push(mouse);
        this.color();
    }
}
DrawAction.prototype.up = function (mouse, redraw) {
    this.end = mouse;
    if (this.tool.up) this.tool.up(this.end, redraw);
    if (!this.tool.inbetween) this.color();
}
DrawAction.prototype.color = function () {
    if (this.strokeCol != "#00000000") canvas.ctx.stroke();
    if (this.strokeCol != "#00000000") canvas.ctx.fill("evenodd");
}
DrawAction.prototype.redraw = function () {
    this.down(this.start, true);
    if (this.tool.inbetween) this.points.forEach((pt => this.draw(pt)).bind(this));
    this.up(this.end, true);
}

function Tool(toolElement, down, draw, up, onchange, inbetween) {
    this.down = down;
    this.draw = draw;
    this.up = up;
    this.onchange = onchange;
    this.element = toolElement;
    //Record the points inbetween (The only time this is false is if the end product does not depend on the steps between)
    this.inbetween = inbetween === undefined ? true : inbetween;
    if (this.element) this.element.addEventListener("click", this.select.bind(this));
}
Tool.prototype.select = function () {
    if (pen.tool) {
        if (pen.tool.element) pen.tool.element.disabled = false;
        if (pen.tool.onchange) pen.tool.onchange(false);
    }
    pen.tool = this;
    if (pen.tool.element) pen.tool.element.disabled = true;
    if (pen.tool.onchange) pen.tool.onchange(true);
}
function addTools() {
    const tools = document.getElementById("tool-panel");
    //Pen
    new Tool(tools.children[0],
        undefined,
        mouse => canvas.ctx.lineTo(mouse.x, mouse.y)
    ).select();
    //Eraser
    new Tool(tools.children[1],
        () => {
            canvas.ctx.save();
            canvas.ctx.fillStyle = "#00000000";
            canvas.ctx.strokeStyle = "#ffffff";
        },
        pos => canvas.ctx.lineTo(pos.x, pos.y),
        () => canvas.ctx.restore()
    );

    //Shape tools
    const visualizers = document.getElementsByClassName("visualizers")[0],
        boxVisualizer = visualizers.children[0],
        ellipseVisualizer = visualizers.children[1];
    //Box
    new Tool(tools.children[2],
        function (start, redraw) {
            this.start = start;
            if (redraw) return;
            this.mStart = { x: mouse.pos.x, y: mouse.pos.y };
            visualizers.setAttribute("viewBox", `0 0 ${viewport.vw} ${viewport.vh}`);
            gsap.to(boxVisualizer, { autoAlpha: 1, stroke: pen.strokeCol, fill: pen.fillCol, ease: "power2.out", duration: .25 });
        },
        function () {
            let x = this.mStart.x,
                y = this.mStart.y,
                width = mouse.pos.x - this.mStart.x,
                height = mouse.pos.y - this.mStart.y;
            if (width < 0) {
                width *= -1;
                x -= width;
            }
            if (height < 0) {
                height *= -1;
                y -= height;
            }
            boxVisualizer.setAttribute("x", x);
            boxVisualizer.setAttribute("y", y);
            boxVisualizer.setAttribute("width", width);
            boxVisualizer.setAttribute("height", height);
        },
        function (end, redraw) {
            canvas.ctx.rect(this.start.x, this.start.y, end.x - this.start.x, end.y - this.start.y);
            if (redraw) return;
            gsap.to(boxVisualizer, { autoAlpha: 0, ease: "power2.out", duration: .25 });
        },
        undefined,
        false
    )
    //Ellispe
    new Tool(tools.children[3],
        function (start, redraw) {
            this.start = start;
            if (redraw) return;
            this.mStart = { x: mouse.pos.x, y: mouse.pos.y };
            visualizers.setAttribute("viewBox", `0 0 ${viewport.vw} ${viewport.vh}`);
            gsap.to(ellipseVisualizer, { autoAlpha: 1, stroke: pen.strokeCol, fill: pen.fillCol, strokeWidth: Math.min(50, pen.stroke) / 2, ease: "power2.out", duration: .25 });
        },
        function () {
            ellipseVisualizer.setAttribute("cx", (this.mStart.x + mouse.pos.x) / 2);
            ellipseVisualizer.setAttribute("cy", (this.mStart.y + mouse.pos.y) / 2);
            ellipseVisualizer.setAttribute("rx", Math.abs(mouse.pos.x - this.mStart.x) / 2);
            ellipseVisualizer.setAttribute("ry", Math.abs(mouse.pos.y - this.mStart.y) / 2);
        },
        function (end, redraw) {
            canvas.ctx.ellipse(
                (this.start.x + end.x) / 2, (this.start.y + end.y) / 2,
                Math.abs(end.x - this.start.x) / 2, Math.abs(end.y - this.start.y) / 2,
                0, 0, 2 * Math.PI
            );

            if (redraw) return;
            gsap.to(ellipseVisualizer, { autoAlpha: 0, ease: "power2.out", duration: .25 });
        },
        undefined,
        false
    )
}