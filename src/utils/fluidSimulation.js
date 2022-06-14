/*
MIT License

Copyright (c) 2017 Pavel Dobryakov

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

let properties = {};

let config = {
    SIM_RESOLUTION: 128,
    DYE_RESOLUTION: 1024,
    CAPTURE_RESOLUTION: 512,
    DENSITY_DISSIPATION: 1,
    VELOCITY_DISSIPATION: 0.2,
    PRESSURE: 0.8,
    PRESSURE_ITERATIONS: 20,
    CURL: 30,
    SPLAT_RADIUS: 0.25,
    SPLAT_FORCE: 6000,
    SHADING: true,
    COLORFUL: true,
    COLOR_UPDATE_SPEED: 10,
    PAUSED: false,
    BACK_COLOR: { r: 0, g: 0, b: 0 },
    TRANSPARENT: false,
    BLOOM: true,
    BLOOM_ITERATIONS: 8,
    BLOOM_RESOLUTION: 256,
    BLOOM_INTENSITY: 0.8,
    BLOOM_THRESHOLD: 0.6,
    BLOOM_SOFT_KNEE: 0.7,
    SUNRAYS: true,
    SUNRAYS_RESOLUTION: 196,
    SUNRAYS_WEIGHT: 1.0,
};

function pointerPrototype() {
    this.id = -1;
    this.texcoordX = 0;
    this.texcoordY = 0;
    this.prevTexcoordX = 0;
    this.prevTexcoordY = 0;
    this.deltaX = 0;
    this.deltaY = 0;
    this.down = false;
    this.moved = false;
    this.color = [30, 0, 300];
}

let pointers = [];
pointers.push(new pointerPrototype());

let gl = null,
    ext = null;
let splatStack = [];
let canvas = null;

export const initializeSimulation = canvasElement => {
    canvas = canvasElement;
    resizeCanvas();

    const { gl: graphicLib, ext: external } = getWebGLContext(canvas);
    gl = graphicLib;
    ext = external;
    console.log(gl);

    if (isMobile()) {
        config.DYE_RESOLUTION = 512;
    }
    if (!ext.supportLinearFiltering) {
        config.DYE_RESOLUTION = 512;
        config.SHADING = false;
        config.BLOOM = false;
        config.SUNRAYS = false;
    }

    startGUI();
    initializeShaders();
    initializeEventListeners();
};

function initializeShaders() {
    const baseVertexShader = compileShader(
        gl.VERTEX_SHADER,
        `
        precision highp float;
    
        attribute vec2 aPosition;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform vec2 texelSize;
    
        void main () {
            vUv = aPosition * 0.5 + 0.5;
            vL = vUv - vec2(texelSize.x, 0.0);
            vR = vUv + vec2(texelSize.x, 0.0);
            vT = vUv + vec2(0.0, texelSize.y);
            vB = vUv - vec2(0.0, texelSize.y);
            gl_Position = vec4(aPosition, 0.0, 1.0);
        }
    `
    );

    const blurVertexShader = compileShader(
        gl.VERTEX_SHADER,
        `
        precision highp float;
    
        attribute vec2 aPosition;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        uniform vec2 texelSize;
    
        void main () {
            vUv = aPosition * 0.5 + 0.5;
            float offset = 1.33333333;
            vL = vUv - texelSize * offset;
            vR = vUv + texelSize * offset;
            gl_Position = vec4(aPosition, 0.0, 1.0);
        }
    `
    );

    const blurShader = compileShader(
        gl.FRAGMENT_SHADER,
        `
        precision mediump float;
        precision mediump sampler2D;
    
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        uniform sampler2D uTexture;
    
        void main () {
            vec4 sum = texture2D(uTexture, vUv) * 0.29411764;
            sum += texture2D(uTexture, vL) * 0.35294117;
            sum += texture2D(uTexture, vR) * 0.35294117;
            gl_FragColor = sum;
        }
    `
    );

    const copyShader = compileShader(
        gl.FRAGMENT_SHADER,
        `
        precision mediump float;
        precision mediump sampler2D;
    
        varying highp vec2 vUv;
        uniform sampler2D uTexture;
    
        void main () {
            gl_FragColor = texture2D(uTexture, vUv);
        }
    `
    );

    const clearShader = compileShader(
        gl.FRAGMENT_SHADER,
        `
        precision mediump float;
        precision mediump sampler2D;
    
        varying highp vec2 vUv;
        uniform sampler2D uTexture;
        uniform float value;
    
        void main () {
            gl_FragColor = value * texture2D(uTexture, vUv);
        }
    `
    );

    const colorShader = compileShader(
        gl.FRAGMENT_SHADER,
        `
        precision mediump float;
    
        uniform vec4 color;
    
        void main () {
            gl_FragColor = color;
        }
    `
    );

    const checkerboardShader = compileShader(
        gl.FRAGMENT_SHADER,
        `
        precision highp float;
        precision highp sampler2D;
    
        varying vec2 vUv;
        uniform sampler2D uTexture;
        uniform float aspectRatio;
    
        #define SCALE 25.0
    
        void main () {
            vec2 uv = floor(vUv * SCALE * vec2(aspectRatio, 1.0));
            float v = mod(uv.x + uv.y, 2.0);
            v = v * 0.1 + 0.8;
            gl_FragColor = vec4(vec3(v), 1.0);
        }
    `
    );

    const displayShaderSource = `
        precision highp float;
        precision highp sampler2D;
    
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform sampler2D uTexture;
        uniform sampler2D uBloom;
        uniform sampler2D uSunrays;
        uniform sampler2D uDithering;
        uniform vec2 ditherScale;
        uniform vec2 texelSize;
    
        vec3 linearToGamma (vec3 color) {
            color = max(color, vec3(0));
            return max(1.055 * pow(color, vec3(0.416666667)) - 0.055, vec3(0));
        }
    
        void main () {
            vec3 c = texture2D(uTexture, vUv).rgb;
    
        #ifdef SHADING
            vec3 lc = texture2D(uTexture, vL).rgb;
            vec3 rc = texture2D(uTexture, vR).rgb;
            vec3 tc = texture2D(uTexture, vT).rgb;
            vec3 bc = texture2D(uTexture, vB).rgb;
    
            float dx = length(rc) - length(lc);
            float dy = length(tc) - length(bc);
    
            vec3 n = normalize(vec3(dx, dy, length(texelSize)));
            vec3 l = vec3(0.0, 0.0, 1.0);
    
            float diffuse = clamp(dot(n, l) + 0.7, 0.7, 1.0);
            c *= diffuse;
        #endif
    
        #ifdef BLOOM
            vec3 bloom = texture2D(uBloom, vUv).rgb;
        #endif
    
        #ifdef SUNRAYS
            float sunrays = texture2D(uSunrays, vUv).r;
            c *= sunrays;
        #ifdef BLOOM
            bloom *= sunrays;
        #endif
        #endif
    
        #ifdef BLOOM
            float noise = texture2D(uDithering, vUv * ditherScale).r;
            noise = noise * 2.0 - 1.0;
            bloom += noise / 255.0;
            bloom = linearToGamma(bloom);
            c += bloom;
        #endif
    
            float a = max(c.r, max(c.g, c.b));
            gl_FragColor = vec4(c, a);
        }
    `;

    const bloomPrefilterShader = compileShader(
        gl.FRAGMENT_SHADER,
        `
        precision mediump float;
        precision mediump sampler2D;
    
        varying vec2 vUv;
        uniform sampler2D uTexture;
        uniform vec3 curve;
        uniform float threshold;
    
        void main () {
            vec3 c = texture2D(uTexture, vUv).rgb;
            float br = max(c.r, max(c.g, c.b));
            float rq = clamp(br - curve.x, 0.0, curve.y);
            rq = curve.z * rq * rq;
            c *= max(rq, br - threshold) / max(br, 0.0001);
            gl_FragColor = vec4(c, 0.0);
        }
    `
    );

    const bloomBlurShader = compileShader(
        gl.FRAGMENT_SHADER,
        `
        precision mediump float;
        precision mediump sampler2D;
    
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform sampler2D uTexture;
    
        void main () {
            vec4 sum = vec4(0.0);
            sum += texture2D(uTexture, vL);
            sum += texture2D(uTexture, vR);
            sum += texture2D(uTexture, vT);
            sum += texture2D(uTexture, vB);
            sum *= 0.25;
            gl_FragColor = sum;
        }
    `
    );

    const bloomFinalShader = compileShader(
        gl.FRAGMENT_SHADER,
        `
        precision mediump float;
        precision mediump sampler2D;
    
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform sampler2D uTexture;
        uniform float intensity;
    
        void main () {
            vec4 sum = vec4(0.0);
            sum += texture2D(uTexture, vL);
            sum += texture2D(uTexture, vR);
            sum += texture2D(uTexture, vT);
            sum += texture2D(uTexture, vB);
            sum *= 0.25;
            gl_FragColor = sum * intensity;
        }
    `
    );

    const sunraysMaskShader = compileShader(
        gl.FRAGMENT_SHADER,
        `
        precision highp float;
        precision highp sampler2D;
    
        varying vec2 vUv;
        uniform sampler2D uTexture;
    
        void main () {
            vec4 c = texture2D(uTexture, vUv);
            float br = max(c.r, max(c.g, c.b));
            c.a = 1.0 - min(max(br * 20.0, 0.0), 0.8);
            gl_FragColor = c;
        }
    `
    );

    const sunraysShader = compileShader(
        gl.FRAGMENT_SHADER,
        `
        precision highp float;
        precision highp sampler2D;
    
        varying vec2 vUv;
        uniform sampler2D uTexture;
        uniform float weight;
    
        #define ITERATIONS 16
    
        void main () {
            float Density = 0.3;
            float Decay = 0.95;
            float Exposure = 0.7;
    
            vec2 coord = vUv;
            vec2 dir = vUv - 0.5;
    
            dir *= 1.0 / float(ITERATIONS) * Density;
            float illuminationDecay = 1.0;
    
            float color = texture2D(uTexture, vUv).a;
    
            for (int i = 0; i < ITERATIONS; i++)
            {
                coord -= dir;
                float col = texture2D(uTexture, coord).a;
                color += col * illuminationDecay * weight;
                illuminationDecay *= Decay;
            }
    
            gl_FragColor = vec4(color * Exposure, 0.0, 0.0, 1.0);
        }
    `
    );

    const splatShader = compileShader(
        gl.FRAGMENT_SHADER,
        `
        precision highp float;
        precision highp sampler2D;
    
        varying vec2 vUv;
        uniform sampler2D uTarget;
        uniform float aspectRatio;
        uniform vec3 color;
        uniform vec2 point;
        uniform float radius;
    
        void main () {
            vec2 p = vUv - point.xy;
            p.x *= aspectRatio;
            vec3 splat = exp(-dot(p, p) / radius) * color;
            vec3 base = texture2D(uTarget, vUv).xyz;
            gl_FragColor = vec4(base + splat, 1.0);
        }
    `
    );

    const advectionShader = compileShader(
        gl.FRAGMENT_SHADER,
        `
        precision highp float;
        precision highp sampler2D;
    
        varying vec2 vUv;
        uniform sampler2D uVelocity;
        uniform sampler2D uSource;
        uniform vec2 texelSize;
        uniform vec2 dyeTexelSize;
        uniform float dt;
        uniform float dissipation;
    
        vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
            vec2 st = uv / tsize - 0.5;
    
            vec2 iuv = floor(st);
            vec2 fuv = fract(st);
    
            vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
            vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
            vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
            vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);
    
            return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
        }
    
        void main () {
        #ifdef MANUAL_FILTERING
            vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
            vec4 result = bilerp(uSource, coord, dyeTexelSize);
        #else
            vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
            vec4 result = texture2D(uSource, coord);
        #endif
            float decay = 1.0 + dissipation * dt;
            gl_FragColor = result / decay;
        }`,
        ext.supportLinearFiltering ? null : ["MANUAL_FILTERING"]
    );

    const divergenceShader = compileShader(
        gl.FRAGMENT_SHADER,
        `
        precision mediump float;
        precision mediump sampler2D;
    
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
        uniform sampler2D uVelocity;
    
        void main () {
            float L = texture2D(uVelocity, vL).x;
            float R = texture2D(uVelocity, vR).x;
            float T = texture2D(uVelocity, vT).y;
            float B = texture2D(uVelocity, vB).y;
    
            vec2 C = texture2D(uVelocity, vUv).xy;
            if (vL.x < 0.0) { L = -C.x; }
            if (vR.x > 1.0) { R = -C.x; }
            if (vT.y > 1.0) { T = -C.y; }
            if (vB.y < 0.0) { B = -C.y; }
    
            float div = 0.5 * (R - L + T - B);
            gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
        }
    `
    );

    const curlShader = compileShader(
        gl.FRAGMENT_SHADER,
        `
        precision mediump float;
        precision mediump sampler2D;
    
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
        uniform sampler2D uVelocity;
    
        void main () {
            float L = texture2D(uVelocity, vL).y;
            float R = texture2D(uVelocity, vR).y;
            float T = texture2D(uVelocity, vT).x;
            float B = texture2D(uVelocity, vB).x;
            float vorticity = R - L - T + B;
            gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
        }
    `
    );

    const vorticityShader = compileShader(
        gl.FRAGMENT_SHADER,
        `
        precision highp float;
        precision highp sampler2D;
    
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform sampler2D uVelocity;
        uniform sampler2D uCurl;
        uniform float curl;
        uniform float dt;
    
        void main () {
            float L = texture2D(uCurl, vL).x;
            float R = texture2D(uCurl, vR).x;
            float T = texture2D(uCurl, vT).x;
            float B = texture2D(uCurl, vB).x;
            float C = texture2D(uCurl, vUv).x;
    
            vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
            force /= length(force) + 0.0001;
            force *= curl * C;
            force.y *= -1.0;
    
            vec2 vel = texture2D(uVelocity, vUv).xy;
            gl_FragColor = vec4(vel + force * dt, 0.0, 1.0);
        }
    `
    );

    const pressureShader = compileShader(
        gl.FRAGMENT_SHADER,
        `
        precision mediump float;
        precision mediump sampler2D;
    
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
        uniform sampler2D uPressure;
        uniform sampler2D uDivergence;
    
        void main () {
            float L = texture2D(uPressure, vL).x;
            float R = texture2D(uPressure, vR).x;
            float T = texture2D(uPressure, vT).x;
            float B = texture2D(uPressure, vB).x;
            float C = texture2D(uPressure, vUv).x;
            float divergence = texture2D(uDivergence, vUv).x;
            float pressure = (L + R + B + T - divergence) * 0.25;
            gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
        }
    `
    );

    const gradientSubtractShader = compileShader(
        gl.FRAGMENT_SHADER,
        `
        precision mediump float;
        precision mediump sampler2D;
    
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
        uniform sampler2D uPressure;
        uniform sampler2D uVelocity;
    
        void main () {
            float L = texture2D(uPressure, vL).x;
            float R = texture2D(uPressure, vR).x;
            float T = texture2D(uPressure, vT).x;
            float B = texture2D(uPressure, vB).x;
            vec2 velocity = texture2D(uVelocity, vUv).xy;
            velocity.xy -= vec2(R - L, T - B);
            gl_FragColor = vec4(velocity, 0.0, 1.0);
        }
    `
    );

    properties.blit = (() => {
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]),
            gl.STATIC_DRAW
        );
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(
            gl.ELEMENT_ARRAY_BUFFER,
            new Uint16Array([0, 1, 2, 0, 2, 3]),
            gl.STATIC_DRAW
        );
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(0);

        return destination => {
            gl.bindFramebuffer(gl.FRAMEBUFFER, destination);
            gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
        };
    })();

    properties.bloomFramebuffers = [];

    properties.ditheringTexture = createTextureAsync("LDR_LLL1_0.png");

    properties.blurProgram = new Program(blurVertexShader, blurShader);
    properties.copyProgram = new Program(baseVertexShader, copyShader);
    properties.clearProgram = new Program(baseVertexShader, clearShader);
    properties.colorProgram = new Program(baseVertexShader, colorShader);
    properties.checkerboardProgram = new Program(
        baseVertexShader,
        checkerboardShader
    );
    properties.bloomPrefilterProgram = new Program(
        baseVertexShader,
        bloomPrefilterShader
    );
    properties.bloomBlurProgram = new Program(
        baseVertexShader,
        bloomBlurShader
    );
    properties.bloomFinalProgram = new Program(
        baseVertexShader,
        bloomFinalShader
    );
    properties.sunraysMaskProgram = new Program(
        baseVertexShader,
        sunraysMaskShader
    );
    properties.sunraysProgram = new Program(baseVertexShader, sunraysShader);
    properties.splatProgram = new Program(baseVertexShader, splatShader);
    properties.advectionProgram = new Program(
        baseVertexShader,
        advectionShader
    );
    properties.divergenceProgram = new Program(
        baseVertexShader,
        divergenceShader
    );
    properties.curlProgram = new Program(baseVertexShader, curlShader);
    properties.vorticityProgram = new Program(
        baseVertexShader,
        vorticityShader
    );
    properties.pressureProgram = new Program(baseVertexShader, pressureShader);
    properties.gradienSubtractProgram = new Program(
        baseVertexShader,
        gradientSubtractShader
    );

    properties.displayMaterial = new Material(
        baseVertexShader,
        displayShaderSource
    );

    updateKeywords();
    initFramebuffers();
    multipleSplats(parseInt(Math.random() * 20) + 5);

    properties.lastUpdateTime = Date.now();
    properties.colorUpdateTimer = 0.0;
    update();
}

function initializeEventListeners() {
    canvas.addEventListener("mousedown", e => {
        let posX = scaleByPixelRatio(e.offsetX);
        let posY = scaleByPixelRatio(e.offsetY);
        let pointer = pointers.find(p => p.id === -1);
        if (pointer == null) pointer = new pointerPrototype();
        updatePointerDownData(pointer, -1, posX, posY);
    });

    canvas.addEventListener("mousemove", e => {
        let pointer = pointers[0];
        if (!pointer.down) return;
        let posX = scaleByPixelRatio(e.offsetX);
        let posY = scaleByPixelRatio(e.offsetY);
        updatePointerMoveData(pointer, posX, posY);
    });

    window.addEventListener("mouseup", () => {
        updatePointerUpData(pointers[0]);
    });

    canvas.addEventListener("touchstart", e => {
        e.preventDefault();
        const touches = e.targetTouches;
        while (touches.length >= pointers.length)
            pointers.push(new pointerPrototype());
        for (let i = 0; i < touches.length; i++) {
            let posX = scaleByPixelRatio(touches[i].pageX);
            let posY = scaleByPixelRatio(touches[i].pageY);
            updatePointerDownData(
                pointers[i + 1],
                touches[i].identifier,
                posX,
                posY
            );
        }
    });

    canvas.addEventListener(
        "touchmove",
        e => {
            e.preventDefault();
            const touches = e.targetTouches;
            for (let i = 0; i < touches.length; i++) {
                let pointer = pointers[i + 1];
                if (!pointer.down) continue;
                let posX = scaleByPixelRatio(touches[i].pageX);
                let posY = scaleByPixelRatio(touches[i].pageY);
                updatePointerMoveData(pointer, posX, posY);
            }
        },
        false
    );

    window.addEventListener("touchend", e => {
        const touches = e.changedTouches;
        for (let i = 0; i < touches.length; i++) {
            let pointer = pointers.find(p => p.id === touches[i].identifier);
            if (pointer == null) continue;
            updatePointerUpData(pointer);
        }
    });

    window.addEventListener("keydown", e => {
        if (e.code === "KeyP") config.PAUSED = !config.PAUSED;
        if (e.key === " ") splatStack.push(parseInt(Math.random() * 20) + 5);
    });
}

function getWebGLContext(canvas) {
    const params = {
        alpha: true,
        depth: false,
        stencil: false,
        antialias: false,
        preserveDrawingBuffer: false,
    };

    let gl = canvas.getContext("webgl2", params);
    const isWebGL2 = !!gl;
    if (!isWebGL2)
        gl =
            canvas.getContext("webgl", params) ||
            canvas.getContext("experimental-webgl", params);

    let halfFloat;
    let supportLinearFiltering;
    if (isWebGL2) {
        gl.getExtension("EXT_color_buffer_float");
        supportLinearFiltering = gl.getExtension("OES_texture_float_linear");
    } else {
        halfFloat = gl.getExtension("OES_texture_half_float");
        supportLinearFiltering = gl.getExtension(
            "OES_texture_half_float_linear"
        );
    }

    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    const halfFloatTexType = isWebGL2
        ? gl.HALF_FLOAT
        : halfFloat.HALF_FLOAT_OES;
    let formatRGBA;
    let formatRG;
    let formatR;

    if (isWebGL2) {
        formatRGBA = getSupportedFormat(
            gl,
            gl.RGBA16F,
            gl.RGBA,
            halfFloatTexType
        );
        formatRG = getSupportedFormat(gl, gl.RG16F, gl.RG, halfFloatTexType);
        formatR = getSupportedFormat(gl, gl.R16F, gl.RED, halfFloatTexType);
    } else {
        formatRGBA = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
        formatRG = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
        formatR = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
    }

    // ga('send', 'event', isWebGL2 ? 'webgl2' : 'webgl', formatRGBA == null ? 'not supported' : 'supported');

    return {
        gl,
        ext: {
            formatRGBA,
            formatRG,
            formatR,
            halfFloatTexType,
            supportLinearFiltering,
        },
    };
}

function getSupportedFormat(gl, internalFormat, format, type) {
    if (!supportRenderTextureFormat(gl, internalFormat, format, type)) {
        switch (internalFormat) {
            case gl.R16F:
                return getSupportedFormat(gl, gl.RG16F, gl.RG, type);
            case gl.RG16F:
                return getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, type);
            default:
                return null;
        }
    }

    return {
        internalFormat,
        format,
    };
}

function supportRenderTextureFormat(gl, internalFormat, format, type) {
    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        internalFormat,
        4,
        4,
        0,
        format,
        type,
        null
    );

    let fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        texture,
        0
    );

    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    return status === gl.FRAMEBUFFER_COMPLETE;
}

function startGUI() {
    var gui = new window.dat.GUI({ width: 300 });
    gui.add(config, "DYE_RESOLUTION", {
        high: 1024,
        medium: 512,
        low: 256,
        "very low": 128,
    })
        .name("quality")
        .onFinishChange(initFramebuffers);
    gui.add(config, "SIM_RESOLUTION", { 32: 32, 64: 64, 128: 128, 256: 256 })
        .name("sim resolution")
        .onFinishChange(initFramebuffers);
    gui.add(config, "DENSITY_DISSIPATION", 0, 4.0).name("density diffusion");
    gui.add(config, "VELOCITY_DISSIPATION", 0, 4.0).name("velocity diffusion");
    gui.add(config, "PRESSURE", 0.0, 1.0).name("pressure");
    gui.add(config, "CURL", 0, 50).name("vorticity").step(1);
    gui.add(config, "SPLAT_RADIUS", 0.01, 1.0).name("splat radius");
    gui.add(config, "SHADING").name("shading").onFinishChange(updateKeywords);
    gui.add(config, "COLORFUL").name("colorful");
    gui.add(config, "PAUSED").name("paused").listen();

    gui.add(
        {
            fun: () => {
                splatStack.push(parseInt(Math.random() * 20) + 5);
            },
        },
        "fun"
    ).name("Random splats");

    let bloomFolder = gui.addFolder("Bloom");
    bloomFolder
        .add(config, "BLOOM")
        .name("enabled")
        .onFinishChange(updateKeywords);
    bloomFolder.add(config, "BLOOM_INTENSITY", 0.1, 2.0).name("intensity");
    bloomFolder.add(config, "BLOOM_THRESHOLD", 0.0, 1.0).name("threshold");

    let sunraysFolder = gui.addFolder("Sunrays");
    sunraysFolder
        .add(config, "SUNRAYS")
        .name("enabled")
        .onFinishChange(updateKeywords);
    sunraysFolder.add(config, "SUNRAYS_WEIGHT", 0.3, 1.0).name("weight");

    let captureFolder = gui.addFolder("Capture");
    captureFolder.addColor(config, "BACK_COLOR").name("background color");
    captureFolder.add(config, "TRANSPARENT").name("transparent");
    captureFolder
        .add({ fun: captureScreenshot }, "fun")
        .name("take screenshot");

    if (isMobile()) gui.close();
}

function isMobile() {
    return /Mobi|Android/i.test(navigator.userAgent);
}

function captureScreenshot() {
    let res = getResolution(config.CAPTURE_RESOLUTION);
    let target = createFBO(
        res.width,
        res.height,
        ext.formatRGBA.internalFormat,
        ext.formatRGBA.format,
        ext.halfFloatTexType,
        gl.NEAREST
    );
    render(target);

    let texture = framebufferToTexture(target);
    texture = normalizeTexture(texture, target.width, target.height);

    let captureCanvas = textureToCanvas(texture, target.width, target.height);
    let datauri = captureCanvas.toDataURL();
    downloadURI("fluid.png", datauri);
    URL.revokeObjectURL(datauri);
}

function framebufferToTexture(target) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    let length = target.width * target.height * 4;
    let texture = new Float32Array(length);
    gl.readPixels(
        0,
        0,
        target.width,
        target.height,
        gl.RGBA,
        gl.FLOAT,
        texture
    );
    return texture;
}

function normalizeTexture(texture, width, height) {
    let result = new Uint8Array(texture.length);
    let id = 0;
    for (let i = height - 1; i >= 0; i--) {
        for (let j = 0; j < width; j++) {
            let nid = i * width * 4 + j * 4;
            result[nid + 0] = clamp01(texture[id + 0]) * 255;
            result[nid + 1] = clamp01(texture[id + 1]) * 255;
            result[nid + 2] = clamp01(texture[id + 2]) * 255;
            result[nid + 3] = clamp01(texture[id + 3]) * 255;
            id += 4;
        }
    }
    return result;
}

function clamp01(input) {
    return Math.min(Math.max(input, 0), 1);
}

function textureToCanvas(texture, width, height) {
    let captureCanvas = document.createElement("canvas");
    let ctx = captureCanvas.getContext("2d");
    captureCanvas.width = width;
    captureCanvas.height = height;

    let imageData = ctx.createImageData(width, height);
    imageData.data.set(texture);
    ctx.putImageData(imageData, 0, 0);

    return captureCanvas;
}

function downloadURI(filename, uri) {
    let link = document.createElement("a");
    link.download = filename;
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

class Material {
    constructor(vertexShader, fragmentShaderSource) {
        this.vertexShader = vertexShader;
        this.fragmentShaderSource = fragmentShaderSource;
        this.programs = [];
        this.activeProgram = null;
        this.uniforms = [];
    }

    setKeywords(keywords) {
        let hash = 0;
        for (let i = 0; i < keywords.length; i++) hash += hashCode(keywords[i]);

        let program = this.programs[hash];
        if (program == null) {
            let fragmentShader = compileShader(
                gl.FRAGMENT_SHADER,
                this.fragmentShaderSource,
                keywords
            );
            program = createProgram(this.vertexShader, fragmentShader);
            this.programs[hash] = program;
        }

        if (program === this.activeProgram) return;

        this.uniforms = getUniforms(program);
        this.activeProgram = program;
    }

    bind() {
        gl.useProgram(this.activeProgram);
    }
}

class Program {
    constructor(vertexShader, fragmentShader) {
        this.uniforms = {};
        this.program = createProgram(vertexShader, fragmentShader);
        this.uniforms = getUniforms(this.program);
    }

    bind() {
        gl.useProgram(this.program);
    }
}

function createProgram(vertexShader, fragmentShader) {
    let program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        throw gl.getProgramInfoLog(program);

    return program;
}

function getUniforms(program) {
    let uniforms = [];
    let uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < uniformCount; i++) {
        let uniformName = gl.getActiveUniform(program, i).name;
        uniforms[uniformName] = gl.getUniformLocation(program, uniformName);
    }
    return uniforms;
}

function compileShader(type, source, keywords) {
    source = addKeywords(source, keywords);

    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw gl.getShaderInfoLog(shader);

    return shader;
}

function addKeywords(source, keywords) {
    if (keywords == null) return source;
    let keywordsString = "";
    keywords.forEach(keyword => {
        keywordsString += "#define " + keyword + "\n";
    });
    return keywordsString + source;
}

function initFramebuffers() {
    let simRes = getResolution(config.SIM_RESOLUTION);
    let dyeRes = getResolution(config.DYE_RESOLUTION);

    const texType = ext.halfFloatTexType;
    const rgba = ext.formatRGBA;
    const rg = ext.formatRG;
    const r = ext.formatR;
    const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    if (properties.dye == null)
        properties.dye = createDoubleFBO(
            dyeRes.width,
            dyeRes.height,
            rgba.internalFormat,
            rgba.format,
            texType,
            filtering
        );
    else
        properties.dye = resizeDoubleFBO(
            properties.dye,
            dyeRes.width,
            dyeRes.height,
            rgba.internalFormat,
            rgba.format,
            texType,
            filtering
        );

    if (properties.velocity == null)
        properties.velocity = createDoubleFBO(
            simRes.width,
            simRes.height,
            rg.internalFormat,
            rg.format,
            texType,
            filtering
        );
    else
        properties.velocity = resizeDoubleFBO(
            properties.velocity,
            simRes.width,
            simRes.height,
            rg.internalFormat,
            rg.format,
            texType,
            filtering
        );

    properties.divergence = createFBO(
        simRes.width,
        simRes.height,
        r.internalFormat,
        r.format,
        texType,
        gl.NEAREST
    );
    properties.curl = createFBO(
        simRes.width,
        simRes.height,
        r.internalFormat,
        r.format,
        texType,
        gl.NEAREST
    );
    properties.pressure = createDoubleFBO(
        simRes.width,
        simRes.height,
        r.internalFormat,
        r.format,
        texType,
        gl.NEAREST
    );

    initBloomFramebuffers();
    initSunraysFramebuffers();
}

function initBloomFramebuffers() {
    let res = getResolution(config.BLOOM_RESOLUTION);

    const texType = ext.halfFloatTexType;
    const rgba = ext.formatRGBA;
    const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    properties.bloom = createFBO(
        res.width,
        res.height,
        rgba.internalFormat,
        rgba.format,
        texType,
        filtering
    );

    properties.bloomFramebuffers.length = 0;
    for (let i = 0; i < config.BLOOM_ITERATIONS; i++) {
        let width = res.width >> (i + 1);
        let height = res.height >> (i + 1);

        if (width < 2 || height < 2) break;

        let fbo = createFBO(
            width,
            height,
            rgba.internalFormat,
            rgba.format,
            texType,
            filtering
        );
        properties.bloomFramebuffers.push(fbo);
    }
}

function initSunraysFramebuffers() {
    let res = getResolution(config.SUNRAYS_RESOLUTION);

    const texType = ext.halfFloatTexType;
    const r = ext.formatR;
    const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    properties.sunrays = createFBO(
        res.width,
        res.height,
        r.internalFormat,
        r.format,
        texType,
        filtering
    );
    properties.sunraysTemp = createFBO(
        res.width,
        res.height,
        r.internalFormat,
        r.format,
        texType,
        filtering
    );
}

function createFBO(w, h, internalFormat, format, type, param) {
    gl.activeTexture(gl.TEXTURE0);
    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        internalFormat,
        w,
        h,
        0,
        format,
        type,
        null
    );

    let fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        texture,
        0
    );
    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);

    let texelSizeX = 1.0 / w;
    let texelSizeY = 1.0 / h;

    return {
        texture,
        fbo,
        width: w,
        height: h,
        texelSizeX,
        texelSizeY,
        attach(id) {
            gl.activeTexture(gl.TEXTURE0 + id);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            return id;
        },
    };
}

function createDoubleFBO(w, h, internalFormat, format, type, param) {
    let fbo1 = createFBO(w, h, internalFormat, format, type, param);
    let fbo2 = createFBO(w, h, internalFormat, format, type, param);

    return {
        width: w,
        height: h,
        texelSizeX: fbo1.texelSizeX,
        texelSizeY: fbo1.texelSizeY,
        get read() {
            return fbo1;
        },
        set read(value) {
            fbo1 = value;
        },
        get write() {
            return fbo2;
        },
        set write(value) {
            fbo2 = value;
        },
        swap() {
            let temp = fbo1;
            fbo1 = fbo2;
            fbo2 = temp;
        },
    };
}

function resizeFBO(target, w, h, internalFormat, format, type, param) {
    let newFBO = createFBO(w, h, internalFormat, format, type, param);
    properties.copyProgram.bind();
    gl.uniform1i(properties.copyProgram.uniforms.uTexture, target.attach(0));
    properties.blit(newFBO.fbo);
    return newFBO;
}

function resizeDoubleFBO(target, w, h, internalFormat, format, type, param) {
    if (target.width === w && target.height === h) return target;
    target.read = resizeFBO(
        target.read,
        w,
        h,
        internalFormat,
        format,
        type,
        param
    );
    target.write = createFBO(w, h, internalFormat, format, type, param);
    target.width = w;
    target.height = h;
    target.texelSizeX = 1.0 / w;
    target.texelSizeY = 1.0 / h;
    return target;
}

function createTextureAsync(url) {
    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGB,
        1,
        1,
        0,
        gl.RGB,
        gl.UNSIGNED_BYTE,
        new Uint8Array([255, 255, 255])
    );

    let obj = {
        texture,
        width: 1,
        height: 1,
        attach(id) {
            gl.activeTexture(gl.TEXTURE0 + id);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            return id;
        },
    };

    let image = new Image();
    image.onload = () => {
        obj.width = image.width;
        obj.height = image.height;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGB,
            gl.RGB,
            gl.UNSIGNED_BYTE,
            image
        );
    };
    image.src = url;

    return obj;
}

function updateKeywords() {
    let displayKeywords = [];
    if (config.SHADING) displayKeywords.push("SHADING");
    if (config.BLOOM) displayKeywords.push("BLOOM");
    if (config.SUNRAYS) displayKeywords.push("SUNRAYS");
    properties.displayMaterial.setKeywords(displayKeywords);
}

function update() {
    const dt = calcDeltaTime();
    if (resizeCanvas()) initFramebuffers();
    updateColors(dt);
    applyInputs();
    if (!config.PAUSED) step(dt);
    render(null);
    requestAnimationFrame(update);
}

function calcDeltaTime() {
    let now = Date.now();
    let dt = (now - properties.lastUpdateTime) / 1000;
    dt = Math.min(dt, 0.016666);
    properties.lastUpdateTime = now;
    return dt;
}

function resizeCanvas() {
    let width = scaleByPixelRatio(canvas.clientWidth);
    let height = scaleByPixelRatio(canvas.clientHeight);
    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        return true;
    }
    return false;
}

function updateColors(dt) {
    if (!config.COLORFUL) return;

    properties.colorUpdateTimer += dt * config.COLOR_UPDATE_SPEED;
    if (properties.colorUpdateTimer >= 1) {
        properties.colorUpdateTimer = wrap(properties.colorUpdateTimer, 0, 1);
        pointers.forEach(p => {
            p.color = generateColor();
        });
    }
}

function applyInputs() {
    if (splatStack.length > 0) multipleSplats(splatStack.pop());

    pointers.forEach(p => {
        if (p.moved) {
            p.moved = false;
            splatPointer(p);
        }
    });
}

function step(dt) {
    gl.disable(gl.BLEND);
    gl.viewport(0, 0, properties.velocity.width, properties.velocity.height);

    properties.curlProgram.bind();
    gl.uniform2f(
        properties.curlProgram.uniforms.texelSize,
        properties.velocity.texelSizeX,
        properties.velocity.texelSizeY
    );
    gl.uniform1i(
        properties.curlProgram.uniforms.uVelocity,
        properties.velocity.read.attach(0)
    );
    properties.blit(properties.curl.fbo);

    properties.vorticityProgram.bind();
    gl.uniform2f(
        properties.vorticityProgram.uniforms.texelSize,
        properties.velocity.texelSizeX,
        properties.velocity.texelSizeY
    );
    gl.uniform1i(
        properties.vorticityProgram.uniforms.uVelocity,
        properties.velocity.read.attach(0)
    );
    gl.uniform1i(
        properties.vorticityProgram.uniforms.uCurl,
        properties.curl.attach(1)
    );
    gl.uniform1f(properties.vorticityProgram.uniforms.curl, config.CURL);
    gl.uniform1f(properties.vorticityProgram.uniforms.dt, dt);
    properties.blit(properties.velocity.write.fbo);
    properties.velocity.swap();

    properties.divergenceProgram.bind();
    gl.uniform2f(
        properties.divergenceProgram.uniforms.texelSize,
        properties.velocity.texelSizeX,
        properties.velocity.texelSizeY
    );
    gl.uniform1i(
        properties.divergenceProgram.uniforms.uVelocity,
        properties.velocity.read.attach(0)
    );
    properties.blit(properties.divergence.fbo);

    properties.clearProgram.bind();
    gl.uniform1i(
        properties.clearProgram.uniforms.uTexture,
        properties.pressure.read.attach(0)
    );
    gl.uniform1f(properties.clearProgram.uniforms.value, config.PRESSURE);
    properties.blit(properties.pressure.write.fbo);
    properties.pressure.swap();

    properties.pressureProgram.bind();
    gl.uniform2f(
        properties.pressureProgram.uniforms.texelSize,
        properties.velocity.texelSizeX,
        properties.velocity.texelSizeY
    );
    gl.uniform1i(
        properties.pressureProgram.uniforms.uDivergence,
        properties.divergence.attach(0)
    );
    for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
        gl.uniform1i(
            properties.pressureProgram.uniforms.uPressure,
            properties.pressure.read.attach(1)
        );
        properties.blit(properties.pressure.write.fbo);
        properties.pressure.swap();
    }

    properties.gradienSubtractProgram.bind();
    gl.uniform2f(
        properties.gradienSubtractProgram.uniforms.texelSize,
        properties.velocity.texelSizeX,
        properties.velocity.texelSizeY
    );
    gl.uniform1i(
        properties.gradienSubtractProgram.uniforms.uPressure,
        properties.pressure.read.attach(0)
    );
    gl.uniform1i(
        properties.gradienSubtractProgram.uniforms.uVelocity,
        properties.velocity.read.attach(1)
    );
    properties.blit(properties.velocity.write.fbo);
    properties.velocity.swap();

    properties.advectionProgram.bind();
    gl.uniform2f(
        properties.advectionProgram.uniforms.texelSize,
        properties.velocity.texelSizeX,
        properties.velocity.texelSizeY
    );
    if (!ext.supportLinearFiltering)
        gl.uniform2f(
            properties.advectionProgram.uniforms.dyeTexelSize,
            properties.velocity.texelSizeX,
            properties.velocity.texelSizeY
        );
    let velocityId = properties.velocity.read.attach(0);
    gl.uniform1i(properties.advectionProgram.uniforms.uVelocity, velocityId);
    gl.uniform1i(properties.advectionProgram.uniforms.uSource, velocityId);
    gl.uniform1f(properties.advectionProgram.uniforms.dt, dt);
    gl.uniform1f(
        properties.advectionProgram.uniforms.dissipation,
        config.VELOCITY_DISSIPATION
    );
    properties.blit(properties.velocity.write.fbo);
    properties.velocity.swap();

    gl.viewport(0, 0, properties.dye.width, properties.dye.height);

    if (!ext.supportLinearFiltering)
        gl.uniform2f(
            properties.advectionProgram.uniforms.dyeTexelSize,
            properties.dye.texelSizeX,
            properties.dye.texelSizeY
        );
    gl.uniform1i(
        properties.advectionProgram.uniforms.uVelocity,
        properties.velocity.read.attach(0)
    );
    gl.uniform1i(
        properties.advectionProgram.uniforms.uSource,
        properties.dye.read.attach(1)
    );
    gl.uniform1f(
        properties.advectionProgram.uniforms.dissipation,
        config.DENSITY_DISSIPATION
    );
    properties.blit(properties.dye.write.fbo);
    properties.dye.swap();
}

function render(target) {
    if (config.BLOOM) applyBloom(properties.dye.read, properties.bloom);
    if (config.SUNRAYS) {
        applySunrays(
            properties.dye.read,
            properties.dye.write,
            properties.sunrays
        );
        blur(properties.sunrays, properties.sunraysTemp, 1);
    }

    if (target == null || !config.TRANSPARENT) {
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.enable(gl.BLEND);
    } else {
        gl.disable(gl.BLEND);
    }

    let width = target == null ? gl.drawingBufferWidth : target.width;
    let height = target == null ? gl.drawingBufferHeight : target.height;
    gl.viewport(0, 0, width, height);

    let fbo = target == null ? null : target.fbo;
    if (!config.TRANSPARENT) drawColor(fbo, normalizeColor(config.BACK_COLOR));
    if (target == null && config.TRANSPARENT) drawCheckerboard(fbo);
    drawDisplay(fbo, width, height);
}

function drawColor(fbo, color) {
    properties.colorProgram.bind();
    gl.uniform4f(
        properties.colorProgram.uniforms.color,
        color.r,
        color.g,
        color.b,
        1
    );
    properties.blit(fbo);
}

function drawCheckerboard(fbo) {
    properties.checkerboardProgram.bind();
    gl.uniform1f(
        properties.checkerboardProgram.uniforms.aspectRatio,
        canvas.width / canvas.height
    );
    properties.blit(fbo);
}

function drawDisplay(fbo, width, height) {
    properties.displayMaterial.bind();
    if (config.SHADING)
        gl.uniform2f(
            properties.displayMaterial.uniforms.texelSize,
            1.0 / width,
            1.0 / height
        );
    gl.uniform1i(
        properties.displayMaterial.uniforms.uTexture,
        properties.dye.read.attach(0)
    );
    if (config.BLOOM) {
        gl.uniform1i(
            properties.displayMaterial.uniforms.uBloom,
            properties.bloom.attach(1)
        );
        gl.uniform1i(
            properties.displayMaterial.uniforms.uDithering,
            properties.ditheringTexture.attach(2)
        );
        let scale = getTextureScale(properties.ditheringTexture, width, height);
        gl.uniform2f(
            properties.displayMaterial.uniforms.ditherScale,
            scale.x,
            scale.y
        );
    }
    if (config.SUNRAYS)
        gl.uniform1i(
            properties.displayMaterial.uniforms.uSunrays,
            properties.sunrays.attach(3)
        );
    properties.blit(fbo);
}

function applyBloom(source, destination) {
    if (properties.bloomFramebuffers.length < 2) return;

    let last = destination;

    gl.disable(gl.BLEND);
    properties.bloomPrefilterProgram.bind();
    let knee = config.BLOOM_THRESHOLD * config.BLOOM_SOFT_KNEE + 0.0001;
    let curve0 = config.BLOOM_THRESHOLD - knee;
    let curve1 = knee * 2;
    let curve2 = 0.25 / knee;
    gl.uniform3f(
        properties.bloomPrefilterProgram.uniforms.curve,
        curve0,
        curve1,
        curve2
    );
    gl.uniform1f(
        properties.bloomPrefilterProgram.uniforms.threshold,
        config.BLOOM_THRESHOLD
    );
    gl.uniform1i(
        properties.bloomPrefilterProgram.uniforms.uTexture,
        source.attach(0)
    );
    gl.viewport(0, 0, last.width, last.height);
    properties.blit(last.fbo);

    properties.bloomBlurProgram.bind();
    for (let i = 0; i < properties.bloomFramebuffers.length; i++) {
        let dest = properties.bloomFramebuffers[i];
        gl.uniform2f(
            properties.bloomBlurProgram.uniforms.texelSize,
            last.texelSizeX,
            last.texelSizeY
        );
        gl.uniform1i(
            properties.bloomBlurProgram.uniforms.uTexture,
            last.attach(0)
        );
        gl.viewport(0, 0, dest.width, dest.height);
        properties.blit(dest.fbo);
        last = dest;
    }

    gl.blendFunc(gl.ONE, gl.ONE);
    gl.enable(gl.BLEND);

    for (let i = properties.bloomFramebuffers.length - 2; i >= 0; i--) {
        let baseTex = properties.bloomFramebuffers[i];
        gl.uniform2f(
            properties.bloomBlurProgram.uniforms.texelSize,
            last.texelSizeX,
            last.texelSizeY
        );
        gl.uniform1i(
            properties.bloomBlurProgram.uniforms.uTexture,
            last.attach(0)
        );
        gl.viewport(0, 0, baseTex.width, baseTex.height);
        properties.blit(baseTex.fbo);
        last = baseTex;
    }

    gl.disable(gl.BLEND);
    properties.bloomFinalProgram.bind();
    gl.uniform2f(
        properties.bloomFinalProgram.uniforms.texelSize,
        last.texelSizeX,
        last.texelSizeY
    );
    gl.uniform1i(
        properties.bloomFinalProgram.uniforms.uTexture,
        last.attach(0)
    );
    gl.uniform1f(
        properties.bloomFinalProgram.uniforms.intensity,
        config.BLOOM_INTENSITY
    );
    gl.viewport(0, 0, destination.width, destination.height);
    properties.blit(destination.fbo);
}

function applySunrays(source, mask, destination) {
    gl.disable(gl.BLEND);
    properties.sunraysMaskProgram.bind();
    gl.uniform1i(
        properties.sunraysMaskProgram.uniforms.uTexture,
        source.attach(0)
    );
    gl.viewport(0, 0, mask.width, mask.height);
    properties.blit(mask.fbo);

    properties.sunraysProgram.bind();
    gl.uniform1f(
        properties.sunraysProgram.uniforms.weight,
        config.SUNRAYS_WEIGHT
    );
    gl.uniform1i(properties.sunraysProgram.uniforms.uTexture, mask.attach(0));
    gl.viewport(0, 0, destination.width, destination.height);
    properties.blit(destination.fbo);
}

function blur(target, temp, iterations) {
    properties.blurProgram.bind();
    for (let i = 0; i < iterations; i++) {
        gl.uniform2f(
            properties.blurProgram.uniforms.texelSize,
            target.texelSizeX,
            0.0
        );
        gl.uniform1i(
            properties.blurProgram.uniforms.uTexture,
            target.attach(0)
        );
        properties.blit(temp.fbo);

        gl.uniform2f(
            properties.blurProgram.uniforms.texelSize,
            0.0,
            target.texelSizeY
        );
        gl.uniform1i(properties.blurProgram.uniforms.uTexture, temp.attach(0));
        properties.blit(target.fbo);
    }
}

function splatPointer(pointer) {
    let dx = pointer.deltaX * config.SPLAT_FORCE;
    let dy = pointer.deltaY * config.SPLAT_FORCE;
    splat(pointer.texcoordX, pointer.texcoordY, dx, dy, pointer.color);
}

function multipleSplats(amount) {
    for (let i = 0; i < amount; i++) {
        const color = generateColor();
        color.r *= 10.0;
        color.g *= 10.0;
        color.b *= 10.0;
        const x = Math.random();
        const y = Math.random();
        const dx = 1000 * (Math.random() - 0.5);
        const dy = 1000 * (Math.random() - 0.5);
        splat(x, y, dx, dy, color);
    }
}

function splat(x, y, dx, dy, color) {
    gl.viewport(0, 0, properties.velocity.width, properties.velocity.height);
    properties.splatProgram.bind();
    gl.uniform1i(
        properties.splatProgram.uniforms.uTarget,
        properties.velocity.read.attach(0)
    );
    gl.uniform1f(
        properties.splatProgram.uniforms.aspectRatio,
        canvas.width / canvas.height
    );
    gl.uniform2f(properties.splatProgram.uniforms.point, x, y);
    gl.uniform3f(properties.splatProgram.uniforms.color, dx, dy, 0.0);
    gl.uniform1f(
        properties.splatProgram.uniforms.radius,
        correctRadius(config.SPLAT_RADIUS / 100.0)
    );
    properties.blit(properties.velocity.write.fbo);
    properties.velocity.swap();

    gl.viewport(0, 0, properties.dye.width, properties.dye.height);
    gl.uniform1i(
        properties.splatProgram.uniforms.uTarget,
        properties.dye.read.attach(0)
    );
    gl.uniform3f(
        properties.splatProgram.uniforms.color,
        color.r,
        color.g,
        color.b
    );
    properties.blit(properties.dye.write.fbo);
    properties.dye.swap();
}

function correctRadius(radius) {
    let aspectRatio = canvas.width / canvas.height;
    if (aspectRatio > 1) radius *= aspectRatio;
    return radius;
}

function updatePointerDownData(pointer, id, posX, posY) {
    pointer.id = id;
    pointer.down = true;
    pointer.moved = false;
    pointer.texcoordX = posX / canvas.width;
    pointer.texcoordY = 1.0 - posY / canvas.height;
    pointer.prevTexcoordX = pointer.texcoordX;
    pointer.prevTexcoordY = pointer.texcoordY;
    pointer.deltaX = 0;
    pointer.deltaY = 0;
    pointer.color = generateColor();
}

function updatePointerMoveData(pointer, posX, posY) {
    pointer.prevTexcoordX = pointer.texcoordX;
    pointer.prevTexcoordY = pointer.texcoordY;
    pointer.texcoordX = posX / canvas.width;
    pointer.texcoordY = 1.0 - posY / canvas.height;
    pointer.deltaX = correctDeltaX(pointer.texcoordX - pointer.prevTexcoordX);
    pointer.deltaY = correctDeltaY(pointer.texcoordY - pointer.prevTexcoordY);
    pointer.moved =
        Math.abs(pointer.deltaX) > 0 || Math.abs(pointer.deltaY) > 0;
}

function updatePointerUpData(pointer) {
    pointer.down = false;
}

function correctDeltaX(delta) {
    let aspectRatio = canvas.width / canvas.height;
    if (aspectRatio < 1) delta *= aspectRatio;
    return delta;
}

function correctDeltaY(delta) {
    let aspectRatio = canvas.width / canvas.height;
    if (aspectRatio > 1) delta /= aspectRatio;
    return delta;
}

function generateColor() {
    let c = HSVtoRGB(Math.random(), 1.0, 1.0);
    c.r *= 0.15;
    c.g *= 0.15;
    c.b *= 0.15;
    return c;
}

function HSVtoRGB(h, s, v) {
    let r, g, b, i, f, p, q, t;
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);

    switch (i % 6) {
        case 0:
            r = v;
            g = t;
            b = p;
            break;
        case 1:
            r = q;
            g = v;
            b = p;
            break;
        case 2:
            r = p;
            g = v;
            b = t;
            break;
        case 3:
            r = p;
            g = q;
            b = v;
            break;
        case 4:
            r = t;
            g = p;
            b = v;
            break;
        default:
            r = v;
            g = p;
            b = q;
            break;
    }

    return {
        r,
        g,
        b,
    };
}

function normalizeColor(input) {
    let output = {
        r: input.r / 255,
        g: input.g / 255,
        b: input.b / 255,
    };
    return output;
}

function wrap(value, min, max) {
    let range = max - min;
    if (range === 0) return min;
    return ((value - min) % range) + min;
}

function getResolution(resolution) {
    let aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
    if (aspectRatio < 1) aspectRatio = 1.0 / aspectRatio;

    let min = Math.round(resolution);
    let max = Math.round(resolution * aspectRatio);

    if (gl.drawingBufferWidth > gl.drawingBufferHeight)
        return { width: max, height: min };
    else return { width: min, height: max };
}

function getTextureScale(texture, width, height) {
    return {
        x: width / texture.width,
        y: height / texture.height,
    };
}

function scaleByPixelRatio(input) {
    let pixelRatio = window.devicePixelRatio || 1;
    return Math.floor(input * pixelRatio);
}

function hashCode(s) {
    if (s.length === 0) return 0;
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
        hash = (hash << 5) - hash + s.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}
