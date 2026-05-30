! function() {
    "use strict";
    var r = Forest.BARK,
        t = Forest.CANOPY,
        o = Forest.CANOPY_ACCENT,
        a = Forest.mkRng;

    function s(a, s) {
        var e = {
            nx: a(),
            layer: s
        };
        "fg" === s ? (e.trunkW = .045 + .06 * a(), e.baseY = .94 + .14 * a(), e.topY = .1 * a() - .04, e.taper = .55 + .2 * a()) : "mid" === s ? (e.trunkW = .02 + .025 * a(), e.baseY = .76 + .08 * a(), e.topY = .1 + .12 * a(), e.taper = .45 + .25 * a()) : (e.trunkW = .007 + .01 * a(), e.baseY = .66 + .06 * a(), e.topY = .14 + .16 * a(), e.taper = .4 + .2 * a()), e.lean = .035 * (a() - .5), e.curve = .02 * (a() - .5), e.curveFreq = 1 + 1.5 * a(), e.stripes = [];
        for (var h = "fg" === s ? 14 + Math.floor(14 * a()) : "mid" === s ? 9 + Math.floor(10 * a()) : 5 + Math.floor(6 * a()), n = 0; n < h; n++) e.stripes.push({
            pos: a(),
            w: .04 + .22 * a(),
            ci: Math.floor(a() * r.length),
            phase: 6.28 * a(),
            amp: .003 + .01 * a(),
            freq: 3 + 7 * a(),
            alpha: .55 + .4 * a()
        });
        e.branches = [];
        var f = "fg" === s ? 4 + Math.floor(4 * a()) : "mid" === s ? 3 + Math.floor(2 * a()) : 2 + Math.floor(2 * a());
        for (n = 0; n < f; n++) {
            var l = .15 + n / Math.max(f - 1, 1) * .5,
                p = .12 * (a() - .5),
                u = n % 2 == 0 ? 1 : -1;
            a() < .2 && (u = -u);
            for (var i = .6 + 1 * a(), M = 2 + Math.floor(3 * a()), c = [], g = [], v = [], d = [], m = [], b = [], F = [], Y = [], y = 0; y < M; y++) c.push(.3 + .8 * a()), g.push(.4 + .4 * a()), v.push(a() < .5 ? -1 : 1), d.push(Math.floor(a() * r.length)), m.push(.25 + .7 * a()), b.push(.35 + .35 * a()), F.push(a() < .5 ? -1 : 1), Y.push(Math.floor(a() * r.length));
            e.branches.push({
                yFrac: Math.max(.08, Math.min(.65, l + p)),
                dir: u,
                angle: i,
                len: ("fg" === s ? .07 : .045) + .05 * a(),
                w: e.trunkW * (.12 + .22 * a()),
                stripeCI: Math.floor(a() * r.length),
                subCount: M,
                subAngles: c,
                subLens: g,
                subDirs: v,
                subStripes: d,
                tertAngles: m,
                tertLens: b,
                tertDirs: F,
                tertStripes: Y
            })
        }
        e.canopy = [];
        var k = e.baseY - e.topY,
            w = e.topY + .04 * k,
            A = "fg" === s ? .06 + .05 * a() : "mid" === s ? .09 + .07 * a() : .06 + .05 * a(),
            C = "fg" === s ? 14 + Math.floor(8 * a()) : "mid" === s ? 18 + Math.floor(12 * a()) : 10 + Math.floor(8 * a());
        for (n = 0; n < C; n++) {
            var P = 6.28 * a(),
                x = Math.pow(a(), .7) * A,
                q = A * (.2 + .5 * a());
            e.canopy.push({
                ox: Math.cos(P) * x * 1.4,
                oy: Math.sin(P) * x * .6 - .45 * A + w,
                r: q,
                ci: Math.floor(a() * t.length),
                isAccent: a() < .08,
                accentCI: Math.floor(a() * o.length),
                swayPhase: 6.28 * a(),
                swayAmp: .6 + 2 * a(),
                squash: .65 + .45 * a(),
                rot: .6 * (a() - .5),
                depth: a()
            })
        }
        e.vines = [];
        var W = "fg" === s ? 2 + Math.floor(4 * a()) : "mid" === s ? 1 + Math.floor(3 * a()) : Math.floor(2 * a());
        for (n = 0; n < W; n++) e.vines.push({
            branchIdx: Math.floor(a() * f),
            tFrac: .3 + .6 * a(),
            len: .04 + .08 * a(),
            swayPhase: 6.28 * a(),
            swayAmp: 1.5 + 3 * a(),
            thickness: 1 + 2 * a(),
            segments: 5 + Math.floor(5 * a())
        });
        e.roots = [];
        var I = "fg" === s ? 5 + Math.floor(3 * a()) : "mid" === s ? 4 + Math.floor(2 * a()) : 3 + Math.floor(2 * a());
        for (n = 0; n < I; n++) {
            u = a() < .5 ? -1 : 1, m = .25 + .7 * a(), p = .4 + .8 * a(), Y = .6 + 2 * a();
            for (var L = [], N = (x = 2 + Math.floor(4 * a()), 0); N < x; N++) L.push({
                tFrac: .15 + .7 * a(),
                dir: a() < .5 ? -1 : 1,
                len: .15 + .5 * a(),
                width: .25 + .4 * a(),
                snakePhase: 6.28 * a()
            });
            e.roots.push({
                dir: u,
                spread: Y,
                length: m,
                width: p,
                taper: .12 + .2 * a(),
                ci: Math.floor(a() * r.length),
                subRoots: L,
                snakePhase: 6.28 * a(),
                snakeFreq: 2 + 3 * a()
            })
        }
        return e
    }
    Forest.genTree = s, Forest.genLayer = function(r, t, o) {
        for (var e = a(o), h = [], n = 0; n < r; n++) h.push(s(e, t));
        return h
    }
}();