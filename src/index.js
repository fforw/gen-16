import domready from "domready"
import { voronoi } from "d3-voronoi"
import "./style.css"
import Color from "./Color";
import { intersectLinePolygon } from "./intersection";
import AABB from "./AABB";
import { TAU } from "./constants";
import { toLinear, toRGB } from "./util";
import Brush from "./Brush";
import AdaptiveLinearization from "adaptive-linearization";


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

const numPoints = 20;

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


const lineDistance = 20;
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

    let didDraw = false;
    let haveIntersections;
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
            brush.stroke(linear, intersections[0][0], intersections[0][1], intersections[1][0], intersections[1][1], color)
        }

        x += stepX;
        y += stepY;


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

            ctx.fillStyle = Color.fromHSL(opposite, 0.7, 0.1).toRGBHex();
            ctx.fillRect(0, 0, width, height);

            const pts = randomPoints()

            const v = voronoi().extent([ [0, 0], [width, height] ])

            const diagram = v(pts);

            const polygons = diagram.polygons();

            const imageData = ctx.getImageData(0, 0, width, height);
            const linear = createLinearFloat32(imageData.data);

            const brush = new Brush(lineWidth, config)
            for (let i = 0; i < polygons.length; i++)
            {
                const color = null;
                drawPolygon(linear, brush, color, polygons[i])
            }

            writeBackLinear(imageData, linear)
            ctx.putImageData(imageData, 0, 0)
        };


        generate();

        window.addEventListener("click", generate, true)
    }
);
