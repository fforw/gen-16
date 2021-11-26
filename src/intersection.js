
export function intersectLinePolygon(lineStartX,lineStartY, lineEndX, lineEndY, points) {
    const length = points.length;

    let prevX = points[length - 1][0]
    let prevY = points[length - 1][1]

    const intersections = [];
    for (let i = 0; i < length; i++)
    {
        const x = points[i][0];
        const y = points[i][1];
        intersectLineLine(lineStartX,lineStartY, lineEndX, lineEndY, prevX, prevY, x, y, intersections);

        prevX = x;
        prevY = y;
    }
    return intersections;
}


export function intersectLineLine(lineStartX,lineStartY, lineEndX, lineEndY, line2StartX, line2StartY, line2EndX, line2EndY, intersections) {
    const dx0 = lineEndX - lineStartX;
    const dy0 = lineEndY - lineStartY;
    const dy1 = line2EndY - line2StartY;
    const dx1 = line2EndX - line2StartX;
    const dx3 = lineStartX - line2StartX;
    const dy3 = lineStartY - line2StartY;

    const ua_t = dx1 * dy3 - dy1 * dx3;
    const ub_t = dx0 * dy3 - dy0 * dx3;
    const u_b = dy1 * dx0 - dx1 * dy0;
    if (u_b !== 0)
    {
        let ua = ua_t / u_b;
        const ub = ub_t / u_b;
        if (0 <= ua && ua <= 1 && 0 <= ub && ub <= 1)
        {
            intersections.push(
                [
                    lineStartX + ua * dx0,
                    lineStartY + ua * dy0
                ]
            )
        }
    }
}
