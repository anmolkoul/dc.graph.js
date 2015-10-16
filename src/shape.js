function point_on_ellipse(A, B, dx, dy) {
    var tansq = Math.tan(Math.atan2(dy, dx));
    tansq = tansq*tansq; // why is this not just dy*dy/dx*dx ? ?
    var ret = {x: A*B/Math.sqrt(B*B + A*A*tansq), y: A*B/Math.sqrt(A*A + B*B/tansq)};
    if(dx<0)
        ret.x = -ret.x;
    if(dy<0)
        ret.y = -ret.y;
    return ret;
}

var eps = 0.0000001;
function between(a, b, c) {
    return a-eps <= b && b <= c+eps;
}

// Adapted from http://stackoverflow.com/questions/563198/how-do-you-detect-where-two-line-segments-intersect/1968345#1968345
function segment_intersection(x1,y1,x2,y2, x3,y3,x4,y4) {
    var x=((x1*y2-y1*x2)*(x3-x4)-(x1-x2)*(x3*y4-y3*x4)) /
            ((x1-x2)*(y3-y4)-(y1-y2)*(x3-x4));
    var y=((x1*y2-y1*x2)*(y3-y4)-(y1-y2)*(x3*y4-y3*x4)) /
            ((x1-x2)*(y3-y4)-(y1-y2)*(x3-x4));
    if (isNaN(x)||isNaN(y)) {
        return false;
    } else {
        if (x1>=x2) {
            if (!between(x2, x, x1)) {return false;}
        } else {
            if (!between(x1, x, x2)) {return false;}
        }
        if (y1>=y2) {
            if (!between(y2, y, y1)) {return false;}
        } else {
            if (!between(y1, y, y2)) {return false;}
        }
        if (x3>=x4) {
            if (!between(x4, x, x3)) {return false;}
        } else {
            if (!between(x3, x, x4)) {return false;}
        }
        if (y3>=y4) {
            if (!between(y4, y, y3)) {return false;}
        } else {
            if (!between(y3, y, y4)) {return false;}
        }
    }
    return {x: x, y: y};
}


function point_on_polygon(points, x0, y0, x1, y1) {
    for(var i = 0; i < points.length; i+=2) {
        var next = i===points.length-2 ? 0 : i+2;
        var isect = segment_intersection(points[i], points[i+1], points[next], points[next+1],
                                         x0, y0, x1, y1);
        if(isect)
            return isect;
    }
    return null;
}

function infer_shape(chart) {
    return function(d) {
        var def = param(chart.nodeShape())(d);
        // as many as we can get from
        // http://www.graphviz.org/doc/info/shapes.html
        switch(def.shape) {
        case 'ellipse':
            d.dcg_shape = {shape: 'ellipse'};
            break;
        case 'egg':
            d.dcg_shape = {shape: 'polygon', sides: 100, distortion: -0.25};
            break;
        case 'triangle':
            d.dcg_shape = {shape: 'polygon', sides: 3};
            break;
        case 'diamond':
            d.dcg_shape = {shape: 'polygon', sides: 4, rotation: 45};
            break;
        case 'trapezium':
            d.dcg_shape = {shape: 'polygon', sides: 4, distortion: -0.5};
            break;
        case 'parallelogram':
            d.dcg_shape = {shape: 'polygon', sides: 4, skew: 0.5};
            break;
        case 'pentagon':
            d.dcg_shape = {shape: 'polygon', sides: 5};
            break;
        case 'hexagon':
            d.dcg_shape = {shape: 'polygon', sides: 6};
            break;
        case 'septagon':
            d.dcg_shape = {shape: 'polygon', sides: 7};
            break;
        case 'octagon':
            d.dcg_shape = {shape: 'polygon', sides: 8};
            break;
        case 'invtriangle':
            d.dcg_shape = {shape: 'polygon', sides: 3, rotation: 180};
            break;
        case 'invtrapezium':
            d.dcg_shape = {shape: 'polygon', sides: 4, distortion: 0.5};
            break;
        case 'square':
            d.dcg_shape = {shape: 'polygon', sides: 4};
            break;
        case 'polygon':
            d.dcg_shape = {
                shape: 'polygon',
                sides: def.sides,
                skew: def.skew,
                distortion: def.distortion,
                rotation: def.rotation
            };
            break;
        default: throw new Error('unknown shape ' + def.shape);
        }
    };
}

function shape_element(chart) {
    return function(d) {
        var shape = d.dcg_shape.shape, elem;
        switch(shape) {
        case 'ellipse':
            elem = 'ellipse';
            break;
        case 'polygon':
            elem = 'path';
            break;
        default:
            throw new Error('unknown shape ' + shape);
        }
        return document.createElementNS("http://www.w3.org/2000/svg", elem);
    };
}

function fit_shape(chart) {
    return function(d) {
        var r = param(chart.nodeRadius())(d);
        var rplus = r*2 + chart.nodePadding();
        var bbox;
        if(param(chart.nodeFitLabel())(d))
            bbox = this.getBBox();
        var fitx = 0;
        if(bbox && bbox.width && bbox.height && param(chart.nodeShape())(d).shape==='ellipse') {
            // solve (x/A)^2 + (y/B)^2) = 1 for A, with B=r, to fit text in ellipse
            // http://stackoverflow.com/a/433438/676195
            var y_over_B = bbox.height/2/r;
            var rx = bbox.width/2/Math.sqrt(1 - y_over_B*y_over_B);
            fitx = rx*2 + chart.nodePadding();
            d.dcg_rx = Math.max(rx, r);
            d.dcg_ry = r;
        }
        else d.dcg_rx = d.dcg_ry = r;
        d.width = Math.max(fitx, rplus);
        d.height = rplus;
    };
}

function ellipse_attrs(chart, d) {
    return {
        rx: function(d) { return d.dcg_rx; },
        ry: function(d) { return d.dcg_ry; }
    };
}

function polygon_attrs(chart, d) {
    return {
        d: function(d) {
            var r = param(chart.nodeRadius())(d),
                def = d.dcg_shape,
                sides = def.sides || 4,
                skew = def.skew || 0,
                distortion = def.distortion || 0,
                rotation = def.rotation || 0,
                align = (sides%2 ? 0 : 0.5), // even-sided horizontal top, odd pointy top
                pts = [];
            rotation = rotation/360 + 0.25; // start at y axis not x
            for(var i = 0; i<sides; ++i) {
                var theta = -((i+align)/sides + rotation)*Math.PI*2; // svg is up-negative
                var x = r*Math.cos(theta),
                    y = r*Math.sin(theta);
                x *= 1 + distortion*((r-y)/r - 1);
                x -= skew*y/2;
                pts.push(x, y);
            }
            d.dcg_points = pts;
            return generate_path(pts, 1, true);
        }
    };
}

function shape_attrs(chart) {
    return function(d) {
        var sel = d3.select(this);
        switch(d.dcg_shape.shape) {
        case 'ellipse':
            sel.attr(ellipse_attrs(chart, d));
            break;
        case 'polygon':
            sel.attr(polygon_attrs(chart, d));
            break;
        default: throw new Error('unknown shape ' + d.dcg_shape.shape);
        }
    };
}

function point_on_shape(chart, d, deltaX, deltaY) {
    switch(d.dcg_shape.shape) {
    case 'ellipse':
        return point_on_ellipse(d.dcg_rx, d.dcg_ry, deltaX, deltaY);
    case 'polygon':
        return point_on_polygon(d.dcg_points, 0,0, deltaX, deltaY);
    }
}

