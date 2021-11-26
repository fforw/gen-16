import AdaptiveLinearization from "adaptive-linearization";
import { TAU } from "./constants";
import { toLinear } from "./util";

import SimplexNoise from "simplex-noise";
import Color from "./Color";


const bzv0 = [0, 0];
const bzv1 = [0, 0];

const DEFAULT_OPTS = {
    lineStartVariance: 0,
    lineEndVariance: 0,
    cpVariance: 40,
    dryLimit: 200
}

const cp1t = 1 / 3;
const cp2t = 2 / 3;

const linearizationOpts = {
    approximationScale: 0.2
};

const noise = new SimplexNoise()

export default class Brush {

    /**
     * Diameter of the brush
     * @type {number}
     */
    size = 0;
    /**
     * Number of bristles
     * @type {number}
     */
    numBristles = 0;

    /**
     * Array with bristle data. (x,y,r,g,b,ox,oy)
     * @type {Float32Array}
     */
    bristles = null;

    opts = null;

    paintCount = 0;

    constructor(size, config, opts)
    {
        this.size = size
        this.config = config;

        this.opts = {
            ...DEFAULT_OPTS,
            ...opts
        }

        this.paintCount = this.opts.dryLimit

        const numBristles = 0 | (size * size * Math.PI) * 0.2;

        const bristles = new Float32Array(numBristles * 7);
        const h = size / 2
        for (let i = 0; i < numBristles; i += 7)
        {
            const a = Math.random() * TAU;
            const rnd = Math.random();
            const r = Math.pow(rnd, 0.6) * h

            const x = 0 | (Math.cos(a) * r + h);
            const y = 0 | (Math.sin(a) * r + h);
            bristles[i] = x
            bristles[i + 1] = y
            bristles[i + 2] = 0
            bristles[i + 3] = 0
            bristles[i + 4] = 0
            bristles[i + 5] = x
            bristles[i + 6] = y
        }
        this.numBristles = numBristles;
        this.bristles = bristles

        this.nsrx = 0.001+0.001*Math.random();
        this.nsry = 0.001+0.001*Math.random();
        this.nsgx = 0.001+0.001*Math.random();
        this.nsgy = 0.001+0.001*Math.random();
        this.nsbx = 0.001+0.001*Math.random();
        this.nsby = 0.001+0.001*Math.random();
    }


    soak(color)
    {
        this.paintCount = 0;

        const {bristles, numBristles} = this

        let {r, g, b} = color;

        r = toLinear(r)
        g = toLinear(g)
        b = toLinear(b)

        for (let i = 0; i < numBristles; i += 7)
        {
            const r2 = bristles[i + 2];
            const g2 = bristles[i + 3];
            const b2 = bristles[i + 4];

            const f = 0.2 + Math.random() * 0.4

            bristles[i + 2] = r2 + (r - r2) * f
            bristles[i + 3] = g2 + (g - g2) * f
            bristles[i + 4] = b2 + (b - b2) * f
        }
    }


    stroke(data, x0, y0, x1, y1, color)
    {
        const {
            lineStartVariance,
            lineEndVariance,
            cpVariance
        } = this.opts

        const { bristles, numBristles, size, nsrx, nsry, nsgx, nsgy, nsbx, nsby } = this

        const hSize = size/2;

        if (this.paintCount >= this.opts.dryLimit)
        {

            const r = 128 + 128 * noise.noise3D(x0 * nsrx, y0 * nsry, 0);
            const g = 128 + 128 * noise.noise3D(x0 * nsgx, y0 * nsgy, 2);
            const b = 128 + 128 * noise.noise3D(x0 * nsbx, y0 * nsby, 2);


            this.soak(new Color(r,g,b))
        }

        x0 = 0 | (x0 + lineStartVariance * Math.random() - lineStartVariance / 2)
        y0 = 0 | (y0 + lineStartVariance * Math.random() - lineStartVariance / 2)
        x1 = 0 | (x1 + lineEndVariance * Math.random() - lineEndVariance / 2)
        y1 = 0 | (y1 + lineEndVariance * Math.random() - lineEndVariance / 2)

        const cp0x = x0 + (x1 - x0) * cp1t + cpVariance * Math.random() - cpVariance / 2
        const cp0y = y0 + (y1 - y0) * cp1t + cpVariance * Math.random() - cpVariance / 2
        const cp1x = x0 + (x1 - x0) * cp2t + cpVariance * Math.random() - cpVariance / 2
        const cp1y = y0 + (y1 - y0) * cp2t + cpVariance * Math.random() - cpVariance / 2

        //console.log("CURVE", {x0 , y0, cp0x , cp0y , cp1x, cp1y, x1, y1})

        const { width, height } = this.config;

        const line = (x0, y0, x1, y1) => {

            x0 |= 0
            y0 |= 0
            x1 |= 0
            y1 |= 0

            const dx = Math.abs(x1 - x0);
            const dy = Math.abs(y1 - y0);

            const sx = (x0 < x1) ? 1 : -1;
            const sy = (y0 < y1) ? 1 : -1;
            let err = dx - dy;

            let px = 0;
            let py = 0;
            while (true)
            {

                const ns = 0.2;
                for (let i = 0; i < numBristles; i += 7)
                {

                    let x = bristles[i    ];
                    let y = bristles[i + 1];
                    let r = bristles[i + 2];
                    let g = bristles[i + 3];
                    let b = bristles[i + 4];
                    let ox = bristles[i + 5];
                    let oy = bristles[i + 6];

                    if (px)
                    {
                        const xd = (x - (x0 - px)) - ox;
                        const yd = (y - (y0 - py)) - oy;
                        const d = Math.sqrt(xd * xd + yd * yd);
                        if (d < hSize)
                        {
                            x -= (x0 - px)
                            y -= (y0 - py)
                        }
                    }

                    const x2 = 0 | (x0 + x);
                    const y2 = 0 | (y0 + y);


                    if (x2 >= 0 && x2 < width && y2 >= 0 && y2 < height)
                    {
                        const off = (y2 * width + x2) * 4;

                        const r2 = data[off]
                        const g2 = data[off + 1]
                        const b2 = data[off + 2]

                        // 1 = original color, 0 = brush color
                        const paintFactor = 0.95;
                        const dirtyFactor = 0.003;

                        r = r + (r2 - r) * dirtyFactor
                        g = g + (g2 - g) * dirtyFactor
                        b = b + (b2 - b) * dirtyFactor

                        const n = 0.2 * + 0.2 * noise.noise3D(x2 * ns, y2 * ns, 0)
                        data[off    ] = r + (r2 - r) * (paintFactor - n);
                        data[off + 1] = g + (g2 - g) * (paintFactor - n);
                        data[off + 2] = b + (b2 - b) * (paintFactor - n);
                    }

                    bristles[i] = x
                    bristles[i + 1] = y
                    bristles[i + 2] = r
                    bristles[i + 3] = g
                    bristles[i + 4] = b
                }

                this.paintCount++;
                px = x0;
                py = y0;

                if ((x0 === x1) && (y0 === y1))
                {
                    break;
                }
                const e2 = 2 * err;
                if (e2 > -dy)
                {
                    err -= dy;
                    x0 += sx;
                }
                if (e2 < dx)
                {
                    err += dx;
                    y0 += sy;
                }
            }

        }

        let prevX = undefined;
        let prevY = undefined;

        const al = new AdaptiveLinearization((x0, y0, x1, y1) => {

                if (prevX !== undefined && prevX !== x0 && prevY !== y0)
                {
                    line(prevX, prevY, x0, y0);
                }
                line(x0, y0, x1, y1);

                prevX = x1;
                prevY = y1;

        }, linearizationOpts)

        al.linearize(x0 , y0, cp0x , cp0y , cp1x, cp1y, x1, y1);

    }
}


