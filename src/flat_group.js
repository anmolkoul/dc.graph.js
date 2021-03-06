/* for the special case where there will be exactly one or zero items in a group,
 a reasonable reduction is just to use the row or null.
 this could be useful outside dc.graph (esp e.g bubble charts, scatter plots where each
 observation is either shown or not) but it would have to be cleaned up a bit */

dc_graph.flat_group = (function() {
    var reduce_01 = {
        add: function(p, v) { return v; },
        remove: function() { return null; },
        init: function() { return null; }
    };
    // now we only really want to see the non-null values, so make a fake group
    function non_null(group) {
        return {
            all: function() {
                return group.all().filter(function(kv) {
                    return kv.value !== null;
                });
            }
        };
    }

    function dim_group(ndx, id_accessor) {
        var dimension = ndx.dimension(id_accessor);
        return {
            crossfilter: ndx,
            dimension: dimension,
            group: non_null(dimension.group().reduce(reduce_01.add,
                                                     reduce_01.remove,
                                                     reduce_01.init))
        };
    }

    return {
        make: function(vec, id_accessor) {
            var ndx = crossfilter(vec);
            return dim_group(ndx, id_accessor);
        },
        another: function(ndx, id_accessor) { // wretched name
            return dim_group(ndx, id_accessor);
        }
    };
})();


