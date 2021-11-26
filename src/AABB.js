export default class AABB {

    minX = Infinity;
    minY = Infinity;
    maxX = -Infinity;
    maxY = -Infinity;

    add(x, y)
    {
        this.minX = Math.min(this.minX, x);
        this.minY = Math.min(this.minY, y);
        this.maxX = Math.max(this.maxX, x);
        this.maxY = Math.max(this.maxY, y);
    }

    get width()
    {
        return (this.maxX - this.minX) | 0;
    }


    get height()
    {
        return (this.maxY - this.minY) | 0;
    }

    get center()
    {
        return [(this.minX + this.maxX)/2, (this.minY + this.maxY)/2 ]
    }

    grow(n)
    {
        this.minX -= n;
        this.minY -= n;
        this.maxY += n;
        this.maxY += n;
    }
}
