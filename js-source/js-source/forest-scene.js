! function() {
    "use strict";
    Forest.farTrees = Forest.genLayer(window.innerWidth <= 768 ? 18 : 45, "far", 42), Forest.midTrees = Forest.genLayer(window.innerWidth <= 768 ? 10 : 24, "mid", 137), Forest.fgTrees = Forest.genLayer(window.innerWidth <= 768 ? 5 : 12, "fg", 99),
        function() {
            for (var e = Forest.mkRng(2025), r = 0; r < 2; r++) {
                var s = Forest.genTree(e, "fg");
                s.nx = .04 + .07 * r + .04 * (e() - .5), s.trunkW *= 1.1 + .15 * e(), Forest.fgTrees.push(s)
            }
        }()
}();