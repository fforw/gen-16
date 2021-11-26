import domready from "domready"
import { voronoi } from "d3-voronoi"
import "./style.css"
import Color from "./Color";
import { intersectLinePolygon } from "./intersection";
import AABB from "./AABB";

const PHI = (1 + Math.sqrt(5)) / 2;
const TAU = Math.PI * 2;
const DEG2RAD_FACTOR = TAU / 360;

const config = {
    width: 0,
    height: 0
};

function norm(number)
{
    const n = number - (number | 0);
    return n < 0 ? 1 + n : n;
}

/**
 * @type CanvasRenderingContext2D
 */
let ctx;
let canvas;

const numPoints = 60;

function randomPoints()
{
    const {width, height} = config

    const pts = [];
    for (let i = 0; i < numPoints; i++)
    {
        pts.push([
            0 | Math.random() * width,
            0 | Math.random() * height
        ])
    }

    return pts;
}


function getPolygonAABB(polygon)
{
    const aabb = new AABB();
    for (let i = 0; i < polygon.length; i++)
    {
        const [x, y] = polygon[i];
        aabb.add(x, y)
    }
    return aabb;
}


const lineDistance = 16;
const lineWidth = 40;


function findHatchDirection(polygon)
{
    const result = [0,0];
    let maxLen = 0;
    for (let i = 0; i < polygon.length - 1; i++)
    {
        const [x0,y0] = polygon[i];
        for (let j = i + 1; j < polygon.length; j++)
        {
            const [x1,y1] = polygon[j];

            const dx = x1 - x0;
            const dy = y1 - y0;
            const len = Math.sqrt(dx * dx + dy * dy);

            if (len > maxLen)
            {
                maxLen = len;
                result[0] = dy/len;
                result[1] = -dx/len;
            }
        }
    }
    return result;
}


function drawPolygon(linear, brush, color, polygon)
{
    const aabb = getPolygonAABB(polygon);
    aabb.grow(10)

    const [dx,dy] = findHatchDirection(polygon);

    const nx = Math.sign(dy) || -1
    const ny = Math.sign(-dx) || -1

    const hw = aabb.width/2;
    const hh = aabb.height/2;

    const size = Math.max(aabb.width, aabb.height);

    const [cx,cy] = aabb.center;

    let x = cx + nx * hw;
    let y = cy + ny * hh;

    const stepX = lineDistance * -dy;
    const stepY = lineDistance * dx;

    x = (x + stepX/2)|0;
    y = (y + stepY/2)|0;

    //console.log({x,y,nx,ny,dx,dy,stepX,stepY})

    const maxSteps = Math.ceil(Math.sqrt(aabb.width*aabb.width + aabb.height * aabb.height) / lineDistance)


    let didDraw = false;
    let haveIntersections;
    let count = 0;
    do
    {
        let lineStartX = x - dx * size;
        let lineStartY = y - dy * size;
        let lineEndX = x + dx * size;
        let lineEndY = y + dy * size;

        const intersections = intersectLinePolygon(
            lineStartX, lineStartY,
            lineEndX, lineEndY,
            polygon,
            0.03
        );
        haveIntersections = intersections.length === 2;
        if (haveIntersections)
        {
            didDraw = true;
            drawLine(linear, brush, color, intersections[0][0], intersections[0][1], intersections[1][0], intersections[1][1])
        }

        x += stepX;
        y += stepY;

        if (count++ > maxSteps)
        {
            console.warn("abort")
            break;
        }

    } while (!didDraw || haveIntersections)
}


function createLinearFloat32(data)
{
    const linear = new Float32Array(data.length)
    for (let i = 0; i < data.length; i += 4)
    {
        const r = data[i    ];
        const g = data[i + 1];
        const b = data[i + 2];

        linear[i    ] = toLinear(r);
        linear[i + 1] = toLinear(g);
        linear[i + 2] = toLinear(b);
        linear[i + 3] = 255;
    }

    return linear
}



function writeBackLinear(imageData, linear)
{
    for (let i = 0; i < linear.length; i += 4)
    {
        const r = linear[i    ];
        const g = linear[i + 1];
        const b = linear[i + 2];

        imageData.data[i    ] = toRGB(r);
        imageData.data[i + 1] = toRGB(g);
        imageData.data[i + 2] = toRGB(b);
        imageData.data[i + 3] = 255;
    }
}

const toLinearPower = 2.4;
const toRGBPower = 1/toLinearPower;

function toLinear(v)
{
    return Math.pow(v/255, toLinearPower)
}

function toRGB(v)
{
    return Math.pow(v, toRGBPower) * 255
}


function soakBrush(brush, color)
{
    soakCounter = 0;
    const h = (lineWidth-2)/2

    const numPixel = 0| (h * h * Math.PI)

    let { r,g,b } = color;

    r = toLinear(r)
    g = toLinear(g)
    b = toLinear(b)

    for (let i = 0; i < brush.length; i+=4)
    {
        brush[i + 3] = 0;

    }

    for (let i = 0; i < numPixel; i++)
    {
        const a = Math.random() * TAU;
        const rnd = Math.random();
        const radius = rnd * rnd * h;

        const x = Math.cos(a) * radius;
        const y = Math.sin(a) * radius;
        const x0 = 0 | (h + x)
        const y0 = 0 | (h + y)

        const off = (y0 * lineWidth + x0 ) * 4

        let f = Math.sqrt(x * x + y * y) / h;

        brush[off] = r
        brush[off+1] = g
        brush[off+2] = b
        brush[off+3] = 0.001 + f;
        brush[off+3 +4] = 0;
    }

    //console.log(brush)
}

function paint(linear, brush, x0, y0)
{
    const {width, height} = config

    const h = lineWidth/2

    for (let y = -h; y < h; y++)
    {
        for (let x = -h; x < h; x++)
        {
            const x1 = 0|(x0 + x)
            const y1 = 0|(y0 + y)

            const rotation = 0|Math.random()*4;

            let x2,y2;

            switch (rotation)
            {
                default:
                    x2 = 0|(h + x);
                    y2 = 0|(h + y);
                    break;
                case 1:
                    x2 = 0|(h - x);
                    y2 = 0|(h + y);
                    break;
                case 2:
                    x2 = 0|(h - x);
                    y2 = 0|(h - y);
                    break;
                case 3:
                    x2 = 0|(h + x);
                    y2 = 0|(h - y);
                    break;

            }

            if (x1 > 0 && x1 < width && y1 > 0 && y1 < height)
            {
                const brushOff = 0| (y2 * lineWidth + x2 ) * 4;
                const screenOff = 0|(y1 * width + x1 ) * 4;

                const f = brush[brushOff + 3];
                if (f)
                {
                    const f2 = (1-f) * 0.05

                    const r0 = brush[brushOff    ]
                    const g0 = brush[brushOff + 1]
                    const b0 = brush[brushOff + 2]
                    const r1 = linear[screenOff    ]
                    const g1 = linear[screenOff + 1]
                    const b1 = linear[screenOff + 2]

                    brush[brushOff    ] = r0 + (r1 - r0) * f2
                    brush[brushOff + 1] = g0 + (g1 - g0) * f2
                    brush[brushOff + 2] = b0 + (b1 - b0) * f2
                    linear[screenOff    ] = r0 + (r1 - r0) * f
                    linear[screenOff + 1] = g0 + (g1 - g0) * f
                    linear[screenOff + 2] = b0 + (b1 - b0) * f
                }
            }
        }
    }

}

const resoak = 50;

let soakCounter = 0


function drawLine(linear, brush, color, x0, y0, x1, y1)
{
    let dx = (x1 - x0);
    let dy = (y1 - y0);

    const len = Math.sqrt(dx * dx + dy * dy);

    const brushStep = lineWidth * 0.2;
    const d = brushStep / len;

    const count = Math.floor(len/brushStep)

    //console.log({dx,dy,d,count})

    dx *= d;
    dy *= d;

    for (let i=0; i < count; i++)
    {
        soakCounter++
        paint(linear, brush, x0, y0)
        x0 += dx
        y0 += dy
    }

    if (soakCounter++ > resoak * 0.8)
    {
        soakCounter = 0
        soakBrush(brush, color)
    }
}


domready(
    () => {



        canvas = document.getElementById("screen");
        ctx = canvas.getContext("2d");

        const width = (window.innerWidth) | 0;
        const height = (window.innerHeight) | 0;

        config.width = width;
        config.height = height;

        canvas.width = width;
        canvas.height = height;


        const generate = () => {

            const rnd = Math.random();
            const opposite = norm(rnd + 0.5);
            const col = Color.fromHSL(rnd, 0.8, 0.6)

            ctx.fillStyle = Color.fromHSL(opposite, 1, 0.1).toRGBHex();
            ctx.fillRect(0, 0, width, height);

            //for (let j=0; j < 2; j++)
            {
                const pts = randomPoints()

                const v = voronoi().extent([ [0, 0], [width, height] ])

                const diagram = v(pts);

                const polygons = diagram.polygons();


                const imageData = ctx.getImageData(0, 0, width, height);
                const linear = createLinearFloat32(imageData.data);

                const brush = new Float32Array( lineWidth * lineWidth * 4 );

                const { data } = imageData;


                const hw = width/2;
                const hh = height/2;

                for (let i = 0; i < polygons.length; i++)
                {
                    if (Math.random() < 0.8)
                    {
                        const color = Color.fromHSL(Math.random(), 1, 0.6).mix(col, 0.35);
                        soakBrush(brush, color)
                        drawPolygon(linear, brush, color, polygons[i])
                    }
                }

                writeBackLinear(imageData, linear)
                ctx.putImageData(imageData, 0, 0)

            }



        };


        generate();

    }
);
