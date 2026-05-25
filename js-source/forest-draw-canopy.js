! function() {
    "use strict";
    var a = Forest.CANOPY,
        t = Forest.CANOPY_ACCENT,
        e = Forest.rgb,
        s = Forest.mix;
    Forest.drawCanopy = function(l, i, r, n, h, o, c) {
        for (var y = 0; y < i.canopy.length; y++) {
            var f = i.canopy[y],
                P = r + f.ox * n + Math.sin(.35 * o + f.swayPhase) * f.swayAmp,
                w = f.oy * h + Math.sin(.28 * o + 1.3 * f.swayPhase) * f.swayAmp * .5,
                g = f.r * h,
                b = f.isAccent ? t[f.accentCI] : a[f.ci];
            if (b = s(b, [25, 40, 30], 1 - c), l.save(), l.translate(P, w), l.rotate(f.rot + .04 * Math.sin(.22 * o + f.swayPhase)), l.scale(1, f.squash), f.depth > .5 && (l.beginPath(), l.arc(.1 * g, .15 * g, 1.05 * g, 0, 6.28), l.fillStyle = e(s(b, [15, 25, 15], .5), .25), l.fill()), l.beginPath(), l.arc(0, 0, g, 0, 6.28), l.fillStyle = e(b, .9), l.fill(), l.beginPath(), l.arc(.22 * -g, .2 * -g, .5 * g, 0, 6.28), l.fillStyle = e(s(b, [175, 210, 130], .22), .4), l.fill(), l.beginPath(), l.arc(.18 * g, .22 * g, .55 * g, 0, 6.28), l.fillStyle = e(s(b, [15, 30, 15], .35), .28), l.fill(), g > 10 && c > .7)
                for (var p = 0; p < 4; p++) {
                    var v = Math.sin(2.1 * p + f.swayPhase) * g * .4,
                        A = Math.cos(1.7 * p + f.swayPhase) * g * .3;
                    l.beginPath(), l.arc(v, A, .12 * g, 0, 6.28), l.fillStyle = e(s(b, [140, 180, 100], .15), .3), l.fill()
                }
            l.restore()
        }
    }
}();