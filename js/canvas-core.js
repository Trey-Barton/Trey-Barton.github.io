try {
    ! function() {
        "use strict";
        var e = document.getElementById("bg-canvas"),
            r = e.getContext("2d", {
                alpha: !1
            }),
            t = 0,
            a = null;

        function l() {
            Forest.isMobile = window.innerWidth <= 768, Forest.MAX_PARTICLES = Forest.isMobile ? 150 : 400;
            var t = window.innerWidth,
                a = window.innerHeight,
                l = Forest.isMobile ? Math.max(t, 1024) : t,
                o = Forest.isMobile ? Math.round(a * (l / t)) : a;
            e.width = 1 * l, e.height = 1 * o, r.setTransform(1, 0, 0, 1, 0, 0), r.scale(1, 1), ["_sceneCache", "_groundCache", "_hillCache", "_skyGrad", "_horizonCache", "_hazeG", "_midGlow", "_fogG", "_vig", "_fgUG"].forEach(function(e) {
                null != v[e] && (v[e] = null)
            })
        }
        l();
        var o = null;
        window.addEventListener("resize", function() {
            Forest.isMobile = window.innerWidth <= 768, Forest.MAX_PARTICLES = Forest.isMobile ? 150 : 400, o && clearTimeout(o), o = setTimeout(function() {
                o = null, l()
            }, 300)
        });
        for (var i = 0, s = [], n = 0; n <= 100; n++) s[n] = (n / 100).toFixed(3);

        function h(e) {
            var r = Math.round(100 * e);
            return r <= 0 ? "0.000" : r >= 100 ? "1.000" : s[r]
        }
        var f = [];

        function g(e, r, t, a, l) {
            ! function(e) {
                if (!f.length || f[0].W !== e) {
                    f.length = 0;
                    for (var r = 0; r < 16; r++) f.push({
                        W: e,
                        x: Math.random() * e,
                        y: 0,
                        phase: 6.28 * Math.random(),
                        speed: .5 + 1.2 * Math.random()
                    })
                }
            }(r);
            var o = a - .02 * t,
                i = .04 * t;
            e.save();
            for (var s = 0; s < f.length; s++) {
                var n = f[s],
                    h = (n.phase + l * n.speed) % 6.28,
                    g = .5 * Math.max(0, Math.sin(h)),
                    d = 3 + 2 * h;
                e.beginPath(), e.ellipse(n.x, o + i * (.3 + s % 5 * .12), d, .3 * d, 0, 0, 6.28), e.lineWidth = .6, e.strokeStyle = "rgba(200,215,230," + g.toFixed(3) + ")", e.stroke()
            }
            e.restore()
        }
        var d = [];

        function b(e, r, t, a) {
            ! function(e, r) {
                if (!d.length || d[0].W !== e) {
                    d.length = 0;
                    for (var t = 0; t < 6; t++) d.push({
                        W: e,
                        x: (.05 + .17 * t + .05 * (Math.random() - .5)) * e,
                        len: r * (.22 + .18 * Math.random()),
                        phase: 6.28 * Math.random(),
                        speed: .25 + .3 * Math.random(),
                        amp: 4 + 6 * Math.random(),
                        leafN: 4 + Math.floor(5 * Math.random())
                    })
                }
            }(r, t);
            for (var l = 0; l < d.length; l++) {
                var o = d[l];
                e.beginPath();
                for (var i = 0; i <= 18; i++) {
                    var s = i / 18,
                        n = Math.sin(a * o.speed + o.phase + 3 * s) * o.amp * s;
                    e.lineTo(o.x + n, s * o.len)
                }
                e.lineWidth = 1.6, e.strokeStyle = "rgba(45,80,40,0.65)", e.stroke();
                for (var h = 1; h <= o.leafN; h++) {
                    var f = h / o.leafN,
                        g = Math.sin(a * o.speed + o.phase + 3 * f) * o.amp * f,
                        b = o.x + g,
                        v = f * o.len;
                    e.beginPath(), e.ellipse(b + 3, v, 3.5, 1.4, .3, 0, 6.28), e.fillStyle = "rgba(55,100,45,0.65)", e.fill()
                }
            }
        }

        function v(l) {
            if (!window._isPageVisible) return a = null, void requestAnimationFrame(v);
            null === a && (a = l);
            var o = Math.min((l - a) / 1e3, .05);
            a = l, t += o, i += .15 * o;
            var s = e.width / 1,
                n = e.height / 1,
                f = .5 * Math.sin(i) + .2 * Math.sin(2.3 * i);
            if (!v._sceneCache || v._sceneW !== s || v._sceneH !== n) {
                var d = v._sceneCache || document.createElement("canvas");
                d.width = s, d.height = n;
                var y = d.getContext("2d");
                v._skyGrad && v._skyW === s && v._skyH === n || (v._skyGrad = y.createLinearGradient(0, 0, 0, .72 * n), v._skyGrad.addColorStop(0, "rgb(28,48,68)"), v._skyGrad.addColorStop(.2, "rgb(38,68,75)"), v._skyGrad.addColorStop(.4, "rgb(65,100,68)"), v._skyGrad.addColorStop(.6, "rgb(120,140,60)"), v._skyGrad.addColorStop(.8, "rgb(175,170,70)"), v._skyGrad.addColorStop(1, "rgb(215,200,85)"), v._skyW = s, v._skyH = n), y.fillStyle = v._skyGrad, y.fillRect(0, 0, s, n);
                for (var c = 0; c < Forest.stars.length; c++) {
                    var p = Forest.stars[c];
                    y.beginPath(), y.arc(p.nx * s, p.ny * n, p.sz, 0, 6.28), y.fillStyle = "rgba(210,225,255," + (.12 + .08 * Math.sin(.5 * t + p.ph)).toFixed(3) + ")", y.fill()
                }
                if (!v._horizonCache || v._hcW !== s || v._hcH !== n) {
                    v._cenGlow = y.createRadialGradient(.5 * s, .44 * n, 0, .5 * s, .44 * n, .55 * n), v._cenGlow.addColorStop(0, "rgba(250,220,85,0.3)"), v._cenGlow.addColorStop(.25, "rgba(240,210,75,0.15)"), v._cenGlow.addColorStop(.5, "rgba(220,195,65,0.06)"), v._cenGlow.addColorStop(1, "rgba(180,150,50,0)"), v._sideGlows = [];
                    for (var F = 0; F < 4; F++) {
                        var _ = s * (.15 + .23 * F),
                            S = y.createRadialGradient(_, .47 * n, 0, _, .47 * n, .4 * n);
                        S.addColorStop(0, "rgba(245,215,80,0.18)"), S.addColorStop(.3, "rgba(225,200,65,0.07)"), S.addColorStop(1, "rgba(180,150,50,0)"), v._sideGlows.push(S)
                    }
                    v._hBand = y.createLinearGradient(0, .38 * n, 0, .58 * n), v._hBand.addColorStop(0, "rgba(230,210,80,0)"), v._hBand.addColorStop(.4, "rgba(235,215,85,0.08)"), v._hBand.addColorStop(.6, "rgba(230,210,80,0.06)"), v._hBand.addColorStop(1, "rgba(220,200,75,0)"), v._groundGrd = y.createLinearGradient(0, .58 * n, 0, n), v._groundGrd.addColorStop(0, "rgb(165,160,65)"), v._groundGrd.addColorStop(.15, "rgb(130,135,50)"), v._groundGrd.addColorStop(.35, "rgb(80,95,42)"), v._groundGrd.addColorStop(.6, "rgb(50,65,35)"), v._groundGrd.addColorStop(1, "rgb(30,42,25)"), v._horizonCache = !0, v._hcW = s, v._hcH = n
                }
                y.fillStyle = v._cenGlow, y.fillRect(0, 0, s, n);
                for (F = 0; F < 4; F++) y.fillStyle = v._sideGlows[F], y.fillRect(0, 0, s, n);
                y.fillStyle = v._hBand, y.fillRect(0, .38 * n, s, .2 * n);
                var M = .58 * n;
                y.fillStyle = v._groundGrd, y.fillRect(0, M, s, n - M);
                for (F = 0; F < 10; F++) {
                    _ = s * (.04 + .1 * F);
                    var P = M + .01 * n + Math.sin(2.3 * F) * n * .02,
                        m = .14 + .05 * Math.sin(.25 * t + 1.8 * F),
                        x = n * (.05 + .02 * Math.sin(1.1 * F));
                    y.beginPath(), y.arc(_, P, .5 * x, 0, 6.28), y.fillStyle = "rgba(220,210,95," + (.7 * m).toFixed(3) + ")", y.fill(), y.beginPath(), y.arc(_, P, x, 0, 6.28), y.fillStyle = "rgba(210,200,85," + (.2 * m).toFixed(3) + ")", y.fill()
                }
                var C = n - M;
                if (!v._groundCache || v._gcW !== s || v._gcH !== n || v._gcGY !== Math.round(M)) {
                    var u = document.createElement("canvas");
                    u.width = s, u.height = n;
                    var T = u.getContext("2d");
                    v._groundCache = u, v._gcW = s, v._gcH = n, v._gcGY = Math.round(M);
                    for (var G = Forest.mkRng(999), k = 0; k < 50; k++) {
                        var w = G() * s,
                            z = M + G() * C,
                            W = n * (.025 + .07 * G()),
                            O = 95 + 30 * (G() - .5),
                            R = 78 + 24 * (G() - .5),
                            A = 45 + 20 * (G() - .5);
                        T.beginPath(), T.ellipse(w, z, W, W * (.35 + .35 * G()), 3.14 * G(), 0, 6.28), T.fillStyle = "rgba(" + Math.round(O) + "," + Math.round(R) + "," + Math.round(A) + "," + (.12 + .15 * G()).toFixed(3) + ")", T.fill()
                    }
                    for (var N = 0; N < 18; N++) {
                        var Y = G() * s,
                            H = M + G() * C,
                            L = n * (.02 + .05 * G());
                        T.beginPath(), T.ellipse(Y, H, L, .5 * L, 3.14 * G(), 0, 6.28), T.fillStyle = "rgba(35,28,18," + (.18 + .15 * G()).toFixed(3) + ")", T.fill()
                    }
                    for (var U = 0; U < 5; U++) {
                        var E = G() * s,
                            q = M + C * (.2 + .6 * G());
                        T.beginPath(), T.moveTo(E, q);
                        for (var B = 0; B < 4; B++) E += (G() - .3) * s * .15, q += (G() - .5) * C * .1, T.lineTo(E, q);
                        T.lineWidth = 3 + 5 * G(), T.strokeStyle = "rgba(100,82,48," + (.6 + .2 * G()).toFixed(3) + ")", T.stroke(), T.lineWidth = 1 + 2 * G(), T.strokeStyle = "rgba(85,70,40," + (.3 + .15 * G()).toFixed(3) + ")", T.stroke()
                    }
                    for (var I = 0; I < 20; I++) {
                        var j = G() * s,
                            X = M + G() * C,
                            V = 3 + 8 * G();
                        T.beginPath(), T.arc(j, X, V, 0, 6.28), T.fillStyle = "rgba(90,72,42," + (.2 + .15 * G()).toFixed(3) + ")", T.fill()
                    }
                    for (var D = 0; D < 75; D++) {
                        var J = G() * s,
                            K = M + G() * C,
                            Q = 8 + 18 * G(),
                            Z = 3.14 * G();
                        if (T.beginPath(), T.moveTo(J, K), T.lineTo(J + Math.cos(Z) * Q, K + Math.sin(Z) * Q), T.lineWidth = .5 + 1.5 * G(), T.strokeStyle = "rgba(90,70,40," + (.3 + .25 * G()).toFixed(3) + ")", T.stroke(), G() < .4) {
                            var $ = .3 + .4 * G(),
                                ee = J + Math.cos(Z) * Q * $,
                                re = K + Math.sin(Z) * Q * $,
                                te = Z + (G() < .5 ? .5 : -.5) + .3 * (G() - .5),
                                ae = Q * (.3 + .3 * G());
                            T.beginPath(), T.moveTo(ee, re), T.lineTo(ee + Math.cos(te) * ae, re + Math.sin(te) * ae), T.stroke()
                        }
                    }
                    for (var le = 0; le < 55; le++) {
                        var oe = G() * s,
                            ie = M + G() * C,
                            se = 2 + 5 * G(),
                            ne = 80 + Math.floor(60 * G());
                        if (T.beginPath(), T.ellipse(oe, ie, se, se * (.5 + .3 * G()), 3.14 * G(), 0, 6.28), T.fillStyle = "rgba(" + ne + "," + (ne - 5) + "," + (ne - 15) + "," + (.4 + .25 * G()).toFixed(3) + ")", T.fill(), T.beginPath(), T.arc(oe - .3 * se, ie - .2 * se, .4 * se, 0, 6.28), T.fillStyle = "rgba(" + (ne + 35) + "," + (ne + 28) + "," + (ne + 18) + ",0.35)", T.fill(), G() < .25) {
                            var he = G() < .5 ? "rgba(130,150,80,0.55)" : "rgba(175,165,100,0.5)";
                            T.beginPath(), T.ellipse(oe + (G() - .5) * se, ie + (G() - .5) * se * .6, .4 * se, .25 * se, 3.14 * G(), 0, 6.28), T.fillStyle = he, T.fill()
                        }
                    }
                    for (var fe = 0; fe < 32; fe++) {
                        var ge = G() * s,
                            de = M + G() * C,
                            be = 3 + 14 * G();
                        if (T.beginPath(), T.ellipse(ge, de, be, be * (.3 + .2 * G()), 3.14 * G(), 0, 6.28), T.fillStyle = "rgba(" + (35 + Math.round(25 * G())) + "," + (80 + Math.round(30 * G())) + "," + (25 + Math.round(20 * G())) + "," + (.2 + .18 * G()).toFixed(3) + ")", T.fill(), be > 7)
                            for (var ve = 0; ve < 3; ve++) T.beginPath(), T.arc(ge + (G() - .5) * be * 1.5, de + (G() - .5) * be * .6, 1 + 1.5 * G(), 0, 6.28), T.fillStyle = "rgba(80,130,55,0.4)", T.fill()
                    }
                    for (var ye = [
                            [155, 80, 30],
                            [180, 110, 45],
                            [120, 60, 25],
                            [95, 55, 28],
                            [165, 130, 55],
                            [140, 100, 45],
                            [75, 90, 40],
                            [105, 75, 30]
                        ], ce = 0; ce < 90; ce++) {
                        var pe = G() * s,
                            Fe = M + G() * C,
                            _e = 2 + 4 * G(),
                            Se = ye[Math.floor(G() * ye.length)];
                        T.save(), T.translate(pe, Fe), T.rotate(3.14 * G()), T.beginPath(), T.ellipse(0, 0, _e, .45 * _e, 0, 0, 6.28), T.fillStyle = "rgba(" + Se[0] + "," + Se[1] + "," + Se[2] + "," + (.55 + .25 * G()).toFixed(3) + ")", T.fill(), T.restore()
                    }
                    for (var Me = 0; Me < 12; Me++)
                        for (var Pe = G() * s, me = M + G() * C, xe = 8 + Math.floor(10 * G()), Ce = 0; Ce < xe; Ce++) {
                            var ue = Pe + 40 * (G() - .5),
                                Te = me + 18 * (G() - .5),
                                Ge = 4 + 8 * G(),
                                ke = 3.14 * G();
                            T.beginPath(), T.moveTo(ue, Te), T.lineTo(ue + Math.cos(ke) * Ge, Te + Math.sin(ke) * Ge * .2), T.lineWidth = .5, T.strokeStyle = "rgba(" + (75 + Math.round(20 * G())) + "," + (55 + Math.round(15 * G())) + "," + (30 + Math.round(10 * G())) + ",0.55)", T.stroke()
                        }
                    for (var we = 0; we < 40; we++) {
                        var ze = G() * s,
                            We = M + G() * C,
                            Oe = 1.5 + 3 * G();
                        T.save(), T.translate(ze, We), T.rotate(3.14 * G()), T.beginPath(), T.rect(.5 * -Oe, .25 * -Oe, Oe, .5 * Oe), T.fillStyle = "rgba(" + (55 + Math.round(25 * G())) + "," + (38 + Math.round(15 * G())) + "," + (22 + Math.round(10 * G())) + ",0.6)", T.fill(), T.restore()
                    }
                    for (var Re = 0; Re < 18; Re++) {
                        var Ae = G() * s,
                            Ne = M + G() * C,
                            Ye = 1.2 + 1.2 * G();
                        T.beginPath(), T.ellipse(Ae, Ne, Ye, 1.3 * Ye, 0, 0, 6.28), T.fillStyle = "rgba(88,58,28,0.75)", T.fill(), T.beginPath(), T.arc(Ae, Ne - 1.1 * Ye, .6 * Ye, 0, 6.28), T.fillStyle = "rgba(55,35,18,0.85)", T.fill()
                    }
                    for (var He = 0; He < 15; He++) {
                        var Le = G() * s,
                            Ue = M + G() * C * .7,
                            Ee = 2.5 + 3.5 * G();
                        T.beginPath(), T.moveTo(Le, Ue), T.lineTo(Le + 4 * (G() - .5), Ue - 4 * Ee), T.lineWidth = .8, T.strokeStyle = "rgba(55,95,35,0.5)", T.stroke();
                        for (var qe = G() < .3 ? [220, 200, 120] : G() < .5 ? [200, 175, 215] : [215, 175, 155], Be = Ue - 4 * Ee, Ie = 0; Ie < 5; Ie++) {
                            var je = 1.256 * Ie;
                            T.beginPath(), T.arc(Le + Math.cos(je) * Ee * .6, Be + Math.sin(je) * Ee * .6, .5 * Ee, 0, 6.28), T.fillStyle = "rgba(" + qe[0] + "," + qe[1] + "," + qe[2] + "," + (.35 + .2 * G()).toFixed(3) + ")", T.fill()
                        }
                        T.beginPath(), T.arc(Le, Be, .35 * Ee, 0, 6.28), T.fillStyle = "rgba(235,225,100,0.45)", T.fill()
                    }
                    v._grassTufts = [];
                    for (var Xe = Forest.mkRng(9997), Ve = 0; Ve < 70; Ve++) {
                        var De = {
                            bl: []
                        };
                        De.x = Xe() * s, De.y = M + Xe() * C, De.h = 8 + 20 * Xe(), De.col = Forest.FERN_COLORS[Math.floor(Xe() * Forest.FERN_COLORS.length)];
                        for (var Je = 4 + Math.floor(5 * Xe()), Ke = 0; Ke < Je; Ke++) De.bl.push({
                            dx: 2.5 * (Ke - Je / 2),
                            ba: .14 * (Ke - Je / 2)
                        });
                        v._grassTufts.push(De)
                    }
                }
                y.drawImage(v._groundCache, 0, 0);
                var Qe = v._grassTufts;
                for (Ve = 0; Ve < Qe.length; Ve++) {
                    var Ze = Qe[Ve],
                        $e = 1 * Math.sin(.6 * t + 1.3 * Ve),
                        er = .1 * Math.sin(.8 * t + 1.7 * Ve);
                    for (Ke = 0; Ke < Ze.bl.length; Ke++) {
                        var rr = Ze.bl[Ke],
                            tr = rr.ba + .06 * $e,
                            ar = Ze.x + rr.dx;
                        y.beginPath(), y.moveTo(ar, Ze.y), y.quadraticCurveTo(ar + 4 * tr, Ze.y - .6 * Ze.h, ar + Math.sin(tr) * Ze.h * .45, Ze.y - Ze.h), y.lineWidth = 1.2, y.strokeStyle = Forest.rgb(Ze.col, .65 + er), y.stroke()
                    }
                }
                if (!v._hillCache || v._hillW !== s || v._hillH !== n) {
                    var lr = document.createElement("canvas");
                    lr.width = s, lr.height = n;
                    var or = lr.getContext("2d"),
                        ir = Forest.mkRng(7777);
                    or.beginPath(), or.moveTo(0, M + 2);
                    for (var sr = 0; sr <= s; sr += 12) {
                        var nr = M - .055 * n - Math.sin(.0015 * sr + .7) * n * .035 - Math.sin(.004 * sr + 2.4) * n * .018 - Math.sin(.009 * sr + 1.1) * n * .01;
                        or.lineTo(sr, nr)
                    }
                    or.lineTo(s, M + 2), or.closePath(), or.fillStyle = "rgba(45,65,40,0.25)", or.fill(), or.beginPath(), or.moveTo(0, M + 2);
                    for (sr = 0; sr <= s; sr += 8) {
                        nr = M - .04 * n - Math.sin(.003 * sr + 1.2) * n * .025 - Math.sin(.008 * sr + .5) * n * .012;
                        or.lineTo(sr, nr)
                    }
                    or.lineTo(s, M + 2), or.closePath(), or.fillStyle = "rgba(65,85,50,0.35)", or.fill(), or.beginPath(), or.moveTo(0, M + 2);
                    for (sr = 0; sr <= s; sr += 6) {
                        nr = M - .015 * n - Math.sin(.005 * sr + 3.8) * n * .018 - Math.sin(.012 * sr + 1.1) * n * .008;
                        or.lineTo(sr, nr)
                    }
                    or.lineTo(s, M + 2), or.closePath(), or.fillStyle = "rgba(80,100,55,0.3)", or.fill(), or.beginPath(), or.moveTo(0, M + 2);
                    for (sr = 0; sr <= s; sr += 10) {
                        nr = M - .07 * n - Math.sin(.002 * sr + 2.1) * n * .03 - Math.sin(.006 * sr + 1.7) * n * .015;
                        or.lineTo(sr, nr)
                    }
                    or.lineTo(s, M + 2), or.closePath(), or.fillStyle = "rgba(55,75,50,0.28)", or.fill();
                    for (var hr = 0; hr < 550; hr++) {
                        var fr = ir() * s,
                            gr = M - .01 * n - ir() * n * .045,
                            dr = n * (.01 + .045 * ir()),
                            br = n * (.003 + .007 * ir());
                        or.fillStyle = "rgba(50,40,30," + (.12 + .18 * ir()).toFixed(3) + ")", or.fillRect(fr - .3 * br, gr, .6 * br, dr);
                        var vr = br * (1.5 + 2.2 * ir());
                        or.beginPath(), or.arc(fr, gr - .3 * vr, vr, 0, 6.28);
                        var yr = Forest.CANOPY[Math.floor(ir() * Forest.CANOPY.length)];
                        or.fillStyle = Forest.rgb(Forest.mix(yr, [50, 70, 40], .5), .22 + .18 * ir()), or.fill()
                    }
                    for (var cr = 0; cr < 220; cr++) {
                        var pr = ir() * s,
                            Fr = M + ir() * n * .025,
                            _r = n * (.01 + .02 * ir());
                        or.beginPath(), or.moveTo(pr, Fr), or.lineTo(pr + 2 * (ir() - .5), Fr - _r), or.lineWidth = .6, or.strokeStyle = "rgba(58,74,40,0.45)", or.stroke();
                        var Sr = Forest.CANOPY[Math.floor(ir() * Forest.CANOPY.length)];
                        or.beginPath(), or.arc(pr, Fr - _r, .55 * _r, 0, 6.28), or.fillStyle = Forest.rgb(Forest.mix(Sr, [80, 105, 55], .35), .45), or.fill()
                    }
                    for (var Mr = 0; Mr < 200; Mr++) {
                        var Pr = ir() * s,
                            mr = M + ir() * n * .035,
                            xr = n * (.004 + .013 * ir());
                        or.beginPath(), or.ellipse(Pr, mr, 1.8 * xr, xr, 0, 0, 6.28);
                        var Cr = Forest.CANOPY[Math.floor(ir() * Forest.CANOPY.length)];
                        or.fillStyle = Forest.rgb(Forest.mix(Cr, [60, 80, 45], .4), .2 + .18 * ir()), or.fill()
                    }
                    for (var ur = 0; ur < 180; ur++) {
                        var Tr = ir() * s,
                            Gr = M + ir() * n * .02,
                            kr = n * (.005 + .012 * ir()),
                            wr = 1.2 * (ir() - .5);
                        or.beginPath(), or.moveTo(Tr, Gr), or.quadraticCurveTo(Tr + wr, Gr - .5 * kr, Tr + .6 * wr, Gr - kr), or.lineWidth = .5, or.strokeStyle = "rgba(80,105,55," + (.2 + .2 * ir()).toFixed(3) + ")", or.stroke(), ir() < .4 && (or.beginPath(), or.moveTo(Tr, Gr), or.quadraticCurveTo(Tr - .7 * wr, Gr - .4 * kr, Tr - .4 * wr, Gr - .85 * kr), or.strokeStyle = "rgba(70,95,48," + (.18 + .18 * ir()).toFixed(3) + ")", or.stroke())
                    }
                    for (var zr = 0; zr < 140; zr++) {
                        var Wr = ir() * s,
                            Or = M + ir() * n * .018,
                            Rr = n * (.004 + .01 * ir()),
                            Ar = n * (.002 + .004 * ir()),
                            Nr = Forest.CANOPY[Math.floor(ir() * Forest.CANOPY.length)];
                        or.beginPath(), or.moveTo(Wr - Ar, Or), or.lineTo(Wr + (ir() - .5) * Rr * .3, Or - Rr), or.lineTo(Wr + Ar, Or), or.closePath(), or.fillStyle = Forest.rgb(Forest.mix(Nr, [60, 90, 40], .35), .18 + .15 * ir()), or.fill()
                    }! function(e, r, t, a) {
                        var l = a - .02 * t,
                            o = .04 * t,
                            i = e.createLinearGradient(0, l, 0, l + o);
                        i.addColorStop(0, "rgba(45,70,88,0.92)"), i.addColorStop(.5, "rgba(60,95,108,0.92)"), i.addColorStop(1, "rgba(35,55,70,0.95)"), e.beginPath(), e.moveTo(0, l);
                        for (var s = 0; s <= r; s += 20) e.lineTo(s, l + 2 * Math.sin(.012 * s));
                        for (e.lineTo(r, l + o), s = r; s >= 0; s -= 20) e.lineTo(s, l + o + 2 * Math.sin(.011 * s + 1.3));
                        for (e.closePath(), e.fillStyle = i, e.fill(), e.beginPath(), s = 0; s <= r; s += 20) e.lineTo(s, l + 2 * Math.sin(.012 * s));
                        for (e.lineWidth = 1.2, e.strokeStyle = "rgba(20,28,32,0.55)", e.stroke(), e.beginPath(), s = 0; s <= r; s += 15) e.lineTo(s, l + .3 * o + 1.5 * Math.sin(.025 * s));
                        e.lineWidth = .8, e.strokeStyle = "rgba(180,200,220,0.35)", e.stroke()
                    }(or, s, n, M), v._hillCache = lr, v._hillW = s, v._hillH = n
                }
                y.drawImage(v._hillCache, 0, 0), Forest.drawUndergrowth(y, s, n, t, "far");
                var Yr = [];
                for (c = 0; c < Forest.farTrees.length; c++) {
                    Ze = Forest.farTrees[c];
                    (it = s * (1.5 * ((c + .5) / Forest.farTrees.length + .12 * (Ze.nx - .5)) - .25)) < .33 * s && c % 3 == 0 ? Yr.push(null) : (Yr.push(it), Forest.drawTrunk(y, Ze, it, s, n, t))
                }
                for (c = 0; c < Forest.farTrees.length; c++) null !== Yr[c] && Forest.drawCanopy(y, Forest.farTrees[c], Yr[c], s, n, t, .88);
                v._hazeG && v._hazeW === s && v._hazeH === n || (v._hazeG = y.createLinearGradient(0, .15 * n, 0, .7 * n), v._hazeG.addColorStop(0, "rgba(90,110,60,0.03)"), v._hazeG.addColorStop(.3, "rgba(140,140,60,0.045)"), v._hazeG.addColorStop(.5, "rgba(170,160,65,0.04)"), v._hazeG.addColorStop(.7, "rgba(130,130,55,0.03)"), v._hazeG.addColorStop(1, "rgba(90,100,50,0.015)"), v._hazeW = s, v._hazeH = n), y.fillStyle = v._hazeG, y.fillRect(0, 0, s, n), Forest.drawUndergrowth(y, s, n, t, "mid");
                var Hr = [];
                for (c = 0; c < Forest.midTrees.length; c++) {
                    Ze = Forest.midTrees[c];
                    (it = s * (1.4 * ((c + .5) / Forest.midTrees.length + .12 * (Ze.nx - .5)) - .2)) < .33 * s && c % 3 == 0 ? Hr.push(null) : (Hr.push(it), Forest.drawTrunk(y, Ze, it, s, n, t))
                }
                for (c = 0; c < Forest.midTrees.length; c++) null !== Hr[c] && Forest.drawCanopy(y, Forest.midTrees[c], Hr[c], s, n, t, .82);
                if (v._midGlow && v._mgW === s && v._mgH === n || (v._midGlow = y.createLinearGradient(0, .35 * n, 0, .65 * n), v._midGlow.addColorStop(0, "rgba(180,170,60,0)"), v._midGlow.addColorStop(.3, "rgba(200,185,65,0.04)"), v._midGlow.addColorStop(.5, "rgba(210,195,70,0.06)"), v._midGlow.addColorStop(.7, "rgba(200,185,65,0.03)"), v._midGlow.addColorStop(1, "rgba(180,170,60,0)"), v._mgW = s, v._mgH = n), y.save(), y.globalCompositeOperation = "screen", y.fillStyle = v._midGlow, y.fillRect(0, .35 * n, s, .3 * n), y.restore(), v._fogG && v._fogW === s && v._fogH === n || (v._fogG = y.createLinearGradient(0, M - 50, 0, M + 70), v._fogG.addColorStop(0, "rgba(175,170,72,0)"), v._fogG.addColorStop(.2, "rgba(180,175,75,0.06)"), v._fogG.addColorStop(.4, "rgba(185,180,78,0.14)"), v._fogG.addColorStop(.6, "rgba(170,168,70,0.1)"), v._fogG.addColorStop(.8, "rgba(160,158,65,0.05)"), v._fogG.addColorStop(1, "rgba(150,148,60,0)"), v._fogW = s, v._fogH = n), y.fillStyle = v._fogG, y.fillRect(0, M - 50, s, 120), Forest.drawUndergrowth(y, s, n, t, "fg"), !v._fgUG || v._fgUGW !== s || v._fgUGH !== n) {
                    v._fgUG = [];
                    for (var Lr = Forest.mkRng(8888), Ur = .85 * n, Er = n - Ur, qr = 0; qr < 8; qr++) {
                        var Br = Ur + Lr() * Er,
                            Ir = (Br - Ur) / Er;
                        v._fgUG.push({
                            type: "bush",
                            x: Lr() * s,
                            y: Br,
                            depth: Ir,
                            sz: n * (.012 + .03 * Ir + .015 * Lr()),
                            col: Forest.CANOPY[Math.floor(Lr() * Forest.CANOPY.length)],
                            seed: 9999 * Lr()
                        })
                    }
                    for (var jr = 0; jr < 74; jr++) {
                        var Xr = Ur + Lr() * Er;
                        Ir = (Xr - Ur) / Er;
                        v._fgUG.push({
                            type: "grass",
                            x: Lr() * s,
                            y: Xr,
                            depth: Ir,
                            h: 6 + 18 * Ir + 8 * Lr(),
                            blades: 3 + Math.floor(4 * Lr() + 2 * Ir),
                            col: Forest.FERN_COLORS[Math.floor(Lr() * Forest.FERN_COLORS.length)],
                            idx: jr
                        })
                    }
                    for (var Vr = 0; Vr < 25; Vr++) {
                        var Dr = Ur + Lr() * Er;
                        Ir = (Dr - Ur) / Er;
                        v._fgUG.push({
                            type: "stick",
                            x: Lr() * s,
                            y: Dr,
                            depth: Ir,
                            len: 8 + 25 * Ir + 12 * Lr(),
                            angle: 3.14 * Lr(),
                            lw: .8 + 2 * Ir + 1 * Lr(),
                            fork: Lr() < .4,
                            fAngle: 1.5 * (Lr() - .5)
                        })
                    }
                    for (var Jr = 0; Jr < 35; Jr++) {
                        var Kr = Ur + Lr() * Er;
                        Ir = (Kr - Ur) / Er;
                        v._fgUG.push({
                            type: "leaf",
                            x: Lr() * s,
                            y: Kr,
                            depth: Ir,
                            sz: 2 + 6 * Ir + 4 * Lr(),
                            rot: 6.28 * Lr(),
                            col: Forest.LEAF_COLORS[Math.floor(Lr() * Forest.LEAF_COLORS.length)]
                        })
                    }
                    for (var Qr = 0; Qr < 15; Qr++) {
                        var Zr = Ur + Lr() * Er;
                        Ir = (Zr - Ur) / Er;
                        v._fgUG.push({
                            type: "rock",
                            x: Lr() * s,
                            y: Zr,
                            depth: Ir,
                            sz: 2 + 7 * Ir + 4 * Lr(),
                            aspect: .45 + .3 * Lr(),
                            rot: .8 * Lr()
                        })
                    }
                    for (var $r = 0; $r < 10; $r++) {
                        var et = Ur + Lr() * Er * .8,
                            rt = (Ir = (et - Ur) / Er, Lr() < .3 ? [225, 205, 125] : Lr() < .5 ? [205, 180, 218] : [218, 178, 158]);
                        v._fgUG.push({
                            type: "flower",
                            x: Lr() * s,
                            y: et,
                            depth: Ir,
                            sz: 2 + 3 * Ir + 2 * Lr(),
                            petalCol: rt
                        })
                    }
                    for (var tt = 0; tt < 90; tt++) {
                        var at = Ur + Lr() * Er,
                            lt = (Ir = (at - Ur) / Er, Forest.FERN_COLORS[Math.floor(Lr() * Forest.FERN_COLORS.length)]);
                        v._fgUG.push({
                            type: "jungleGrass",
                            x: Lr() * s,
                            y: at,
                            depth: Ir,
                            h: 5 + 14 * Ir + 10 * Lr(),
                            w: 2 + 4 * Lr() + 3 * Ir,
                            lean: 1.2 * (Lr() - .5),
                            col: lt,
                            idx: tt
                        })
                    }
                    v._fgUG.sort(function(e, r) {
                        return e.y - r.y
                    }), v._fgUGW = s, v._fgUGH = n
                }
                var ot = [];
                for (c = 0; c < Forest.fgTrees.length; c++) {
                    var it;
                    Ze = Forest.fgTrees[c];
                    (it = s * (1.6 * ((c + .5) / Forest.fgTrees.length + .12 * (Ze.nx - .5)) - .3)) < .33 * s && c % 3 == 0 || ot.push({
                        tree: Ze,
                        tx: it,
                        y: M + Ze.nx * n * .03
                    })
                }
                ot.sort(function(e, r) {
                    return e.y - r.y
                });
                var st = v._fgUG;
                for (He = 0; He < st.length; He++) {
                    var nt = st[He];
                    if ("bush" === nt.type)
                        for (var ht = Forest.mkRng(Math.floor(nt.seed)), ft = Forest.mix(nt.col, [18, 30, 15], .45), gt = 0; gt < 3 + Math.floor(4 * ht()); gt++) {
                            var dt = nt.x + (ht() - .5) * nt.sz * 2.8,
                                bt = nt.y + (ht() - .5) * nt.sz * .6 - .4 * nt.sz,
                                vt = nt.sz * (.45 + .55 * ht());
                            y.beginPath(), y.arc(dt, bt, vt, 0, 6.28), y.fillStyle = Forest.rgb(Forest.mix(ft, nt.col, .5 * ht()), .55 + .25 * nt.depth), y.fill()
                        } else if ("grass" === nt.type) {
                            var yt = 1.2 * Math.sin(.55 * t + 1.2 * nt.idx);
                            for (Ke = 0; Ke < nt.blades; Ke++) {
                                ar = nt.x + (Ke - nt.blades / 2) * (2 + 1.5 * nt.depth), tr = .15 * (Ke - nt.blades / 2) + .07 * yt;
                                y.beginPath(), y.moveTo(ar, nt.y), y.quadraticCurveTo(ar + 4 * tr, nt.y - .6 * nt.h, ar + Math.sin(tr) * nt.h * .5, nt.y - nt.h), y.lineWidth = .8 + .8 * nt.depth, y.strokeStyle = Forest.rgb(nt.col, .5 + .25 * nt.depth), y.stroke()
                            }
                        } else if ("stick" === nt.type) {
                        var ct = nt.x + Math.cos(nt.angle) * nt.len,
                            pt = nt.y + Math.sin(nt.angle) * nt.len * .2;
                        if (y.beginPath(), y.moveTo(nt.x, nt.y), y.lineTo(ct, pt), y.lineWidth = nt.lw, y.strokeStyle = "rgba(75,58,32," + (.3 + .3 * nt.depth).toFixed(3) + ")", y.stroke(), nt.fork) {
                            var Ft = nt.x + .55 * (ct - nt.x),
                                _t = nt.y + .55 * (pt - nt.y);
                            y.beginPath(), y.moveTo(Ft, _t), y.lineTo(Ft + Math.cos(nt.fAngle + nt.angle) * nt.len * .4, _t + Math.sin(nt.fAngle + nt.angle) * nt.len * .1), y.lineWidth = .6 * nt.lw, y.strokeStyle = "rgba(68,52,30," + (.25 + .25 * nt.depth).toFixed(3) + ")", y.stroke()
                        }
                    } else if ("leaf" === nt.type) y.save(), y.translate(nt.x, nt.y), y.rotate(nt.rot), y.beginPath(), y.ellipse(0, 0, nt.sz, .4 * nt.sz, 0, 0, 6.28), y.fillStyle = Forest.rgb(Forest.mix(nt.col, [35, 45, 22], .2), .4 + .25 * nt.depth), y.fill(), y.restore();
                    else if ("rock" === nt.type) y.beginPath(), y.ellipse(nt.x, nt.y, nt.sz, nt.sz * nt.aspect, nt.rot, 0, 6.28), y.fillStyle = "rgba(80,74,52," + (.3 + .3 * nt.depth).toFixed(3) + ")", y.fill(), y.beginPath(), y.arc(nt.x - .2 * nt.sz, nt.y - .2 * nt.sz, .3 * nt.sz, 0, 6.28), y.fillStyle = "rgba(125,118,88,0.15)", y.fill();
                    else if ("flower" === nt.type) {
                        y.beginPath(), y.moveTo(nt.x, nt.y), y.lineTo(nt.x, nt.y - 4 * nt.sz), y.lineWidth = .6 + .4 * nt.depth, y.strokeStyle = "rgba(50,90,30,0.5)", y.stroke();
                        for (Be = nt.y - 4 * nt.sz, Ie = 0; Ie < 5; Ie++) {
                            je = 1.256 * Ie;
                            y.beginPath(), y.arc(nt.x + Math.cos(je) * nt.sz * .6, Be + Math.sin(je) * nt.sz * .6, .5 * nt.sz, 0, 6.28), y.fillStyle = "rgba(" + nt.petalCol[0] + "," + nt.petalCol[1] + "," + nt.petalCol[2] + "," + (.35 + .25 * nt.depth).toFixed(3) + ")", y.fill()
                        }
                        y.beginPath(), y.arc(nt.x, Be, .35 * nt.sz, 0, 6.28), y.fillStyle = "rgba(240,230,105,0.45)", y.fill()
                    } else if ("jungleGrass" === nt.type) {
                        var St = .6 * Math.sin(.6 * t + .8 * nt.idx);
                        y.beginPath(), y.moveTo(nt.x - nt.w, nt.y), y.lineTo(nt.x + nt.lean + St, nt.y - nt.h), y.lineTo(nt.x + nt.w, nt.y), y.closePath(), y.fillStyle = Forest.rgb(nt.col, .35 + .35 * nt.depth), y.fill(), nt.depth > .3 && (y.beginPath(), y.moveTo(nt.x - .6 * nt.w + .3 * nt.w, nt.y), y.lineTo(nt.x + .7 * nt.lean + .8 * St, nt.y - .75 * nt.h), y.lineTo(nt.x + .6 * nt.w + .3 * nt.w, nt.y), y.closePath(), y.fillStyle = Forest.rgb(Forest.mix(nt.col, [40, 65, 30], .2), .28 + .3 * nt.depth), y.fill())
                    }
                }
                for (He = 0; He < ot.length; He++) {
                    var Mt = ot[He];
                    Forest.drawTrunk(y, Mt.tree, Mt.tx, s, n, t), Forest.drawCanopy(y, Mt.tree, Mt.tx, s, n, t, 1)
                }
                for (var Pt = Forest.mkRng(333), mt = 0; mt < 10; mt++) {
                    var xt = Pt() * s * 1.3 - .15 * s,
                        Ct = Pt() * n * .18 - .04 * n,
                        ut = n * (.05 + .07 * Pt()),
                        Tt = Forest.CANOPY[Math.floor(Pt() * Forest.CANOPY.length)];
                    Tt = Forest.mix(Tt, [35, 60, 35], .2);
                    var Gt = 1.2 * Math.sin(.25 * t + .9 * mt) + 1.5 * f;
                    y.beginPath(), y.ellipse(xt + Gt, Ct, ut * (1 + .4 * Pt()), ut * (.6 + .3 * Pt()), .4 * (Pt() - .5), 0, 6.28), y.fillStyle = Forest.rgb(Tt, .92), y.fill()
                }
                Pt = Forest.mkRng(444);
                for (mt = 0; mt < 18; mt++) {
                    xt = Pt() * s * 1.3 - .15 * s, Ct = Pt() * n * .22 - .02 * n, ut = n * (.03 + .06 * Pt()), Tt = Forest.CANOPY[Math.floor(Pt() * Forest.CANOPY.length)];
                    Pt() < .07 && (Tt = Forest.CANOPY_ACCENT[Math.floor(Pt() * Forest.CANOPY_ACCENT.length)]);
                    Gt = 1.8 * Math.sin(.3 * t + .7 * mt) + 2 * f;
                    y.beginPath(), y.ellipse(xt + Gt, Ct, ut * (.85 + .35 * Pt()), ut * (.55 + .35 * Pt()), .5 * (Pt() - .5), 0, 6.28), y.fillStyle = Forest.rgb(Tt, .88), y.fill(), y.beginPath(), y.arc(xt + Gt - .18 * ut, Ct - .12 * ut, .42 * ut, 0, 6.28), y.fillStyle = Forest.rgb(Forest.mix(Tt, [155, 200, 115], .22), .38), y.fill(), y.beginPath(), y.arc(xt + Gt + .12 * ut, Ct + .14 * ut, .38 * ut, 0, 6.28), y.fillStyle = Forest.rgb(Forest.mix(Tt, [18, 30, 15], .35), .28), y.fill()
                }
                Pt = Forest.mkRng(555);
                for (mt = 0; mt < 12; mt++) {
                    xt = Pt() * s * 1.2 - .1 * s, Ct = Pt() * n * .12 - .01 * n, ut = n * (.015 + .035 * Pt()), Tt = Forest.CANOPY[Math.floor(Pt() * Forest.CANOPY.length)], Gt = 1.2 * Math.sin(.35 * t + 1.1 * mt) + 1.5 * f;
                    y.beginPath(), y.arc(xt + Gt, Ct, ut, 0, 6.28), y.fillStyle = Forest.rgb(Forest.mix(Tt, [120, 170, 90], .15), .85), y.fill()
                }
                Pt = Forest.mkRng(666);
                for (var kt = 0; kt < 8; kt++) {
                    var wt = Pt() * s,
                        zt = n * (.12 + .15 * Pt()),
                        Wt = n * (.02 + .05 * Pt());
                    Tt = Forest.CANOPY[Math.floor(Pt() * Forest.CANOPY.length)], Gt = 1.5 * Math.sin(.4 * t + 1.3 * kt) + f;
                    y.beginPath(), y.moveTo(wt + Gt - 4, zt), y.quadraticCurveTo(wt + Gt, zt + Wt, wt + Gt + 4, zt), y.fillStyle = Forest.rgb(Tt, .7), y.fill()
                }
                y.save(), y.globalCompositeOperation = "overlay", y.fillStyle = "rgba(180,160,60,0.03)", y.fillRect(0, 0, s, n), y.restore(), v._vig && v._vigW === s && v._vigH === n || (v._vig = y.createRadialGradient(s / 2, .38 * n, .12 * n, s / 2, .38 * n, .95 * n), v._vig.addColorStop(0, "rgba(0,0,0,0)"), v._vig.addColorStop(.6, "rgba(8,18,12,0.08)"), v._vig.addColorStop(.8, "rgba(10,20,15,0.18)"), v._vig.addColorStop(1, "rgba(8,16,10,0.35)"), v._vigW = s, v._vigH = n), y.fillStyle = v._vig, y.fillRect(0, 0, s, n), v._sceneCache = d, v._sceneW = s, v._sceneH = n
            }
            r.drawImage(v._sceneCache, 0, 0);
            for (var Ot = .58 * n, Rt = 0; Rt < 5; Rt++) {
                var At = s * (.1 + .2 * Rt),
                    Nt = n * (.4 + .03 * Math.sin(.1 * t + 1.5 * Rt)),
                    Yt = .12 * n,
                    Ht = .06 + .02 * Math.sin(.2 * t + 2 * Rt);
                r.beginPath(), r.arc(At, Nt, .5 * Yt, 0, 6.28), r.fillStyle = "rgba(220,200,80," + (.7 * Ht).toFixed(3) + ")", r.fill(), r.beginPath(), r.arc(At, Nt, Yt, 0, 6.28), r.fillStyle = "rgba(200,185,70," + (.2 * Ht).toFixed(3) + ")", r.fill()
            }
            for (var Lt = 0; Lt < 8; Lt++) {
                var Ut = 1.4 * Lt,
                    Et = s * (.06 + .012 * Lt),
                    qt = .05 + .007 * Lt,
                    Bt = n * (.1 + .022 * Lt),
                    It = (ee = s * (.2 + .08 * Lt) + Math.cos(t * qt + Ut) * Et, re = Bt + Math.sin(t * qt * 1.3 + Ut) * Et * .35, -Math.sin(t * qt + Ut) * Et * qt),
                    jt = Math.cos(t * qt * 1.3 + Ut) * Et * .35 * qt * 1.3,
                    Xt = Math.atan2(jt, It),
                    Vt = 4 + .4 * Lt;
                r.save(), r.translate(ee, re), r.rotate(Xt), r.beginPath(), r.moveTo(0, 0), r.lineTo(-Vt, .35 * -Vt), r.moveTo(0, 0), r.lineTo(-Vt, .35 * Vt), r.lineWidth = .7, r.strokeStyle = "rgba(28,32,22,0.45)", r.stroke(), r.restore()
            }
            for (var Dt = 0; Dt < Forest.mistPuffs.length; Dt++) {
                var Jt = Forest.mistPuffs[Dt],
                    Kt = ((Jt.nx + t * Jt.speed) % 1.8 - .2) * s,
                    Qt = Jt.ny * n + 10 * Math.sin(.2 * t + Jt.phase),
                    Zt = Jt.r * n * 1.2,
                    $t = Jt.alpha * (.75 + .25 * Math.sin(.12 * t + Jt.phase));
                r.beginPath(), r.arc(Kt, Qt, .4 * Zt, 0, 6.28), r.fillStyle = "rgba(185,180,85," + (.7 * $t).toFixed(3) + ")", r.fill(), r.beginPath(), r.arc(Kt, Qt, .7 * Zt, 0, 6.28), r.fillStyle = "rgba(170,165,75," + (.25 * $t).toFixed(3) + ")", r.fill(), r.beginPath(), r.arc(Kt, Qt, Zt, 0, 6.28), r.fillStyle = "rgba(155,150,65," + (.08 * $t).toFixed(3) + ")", r.fill()
            }
            for (He = 0; He < 6; He++) {
                var ea = ((.18 * He + .008 * t * (1 + .3 * He)) % 1.4 - .2) * s,
                    ra = Ot + .01 * n,
                    ta = n * (.04 + .01 * He);
                r.beginPath(), r.arc(ea, ra, ta, 0, 6.28), r.fillStyle = "rgba(185,180,80,0.04)", r.fill()
            }
            r.save(), r.globalCompositeOperation = "screen";
            for (le = 0; le < 8; le++) {
                oe = s * (.05 + .13 * le);
                var aa = Math.sin(.15 * t + 2.1 * le),
                    la = .02 + .015 * aa;
                if (!(la < .005)) {
                    var oa = s * (.025 + .015 * Math.abs(aa));
                    r.beginPath(), r.moveTo(oe - .3 * oa, 0), r.lineTo(oe + .3 * oa, .25 * n), r.lineTo(oe - .5 * oa, .25 * n), r.closePath(), r.fillStyle = "rgba(255,240,130," + la.toFixed(3) + ")", r.fill(), r.beginPath(), r.moveTo(oe - .5 * oa, .25 * n), r.lineTo(oe + 1.5 * oa, .7 * n), r.lineTo(oe - .8 * oa, .7 * n), r.closePath(), r.fillStyle = "rgba(255,230,100," + (.3 * la).toFixed(3) + ")", r.fill()
                }
            }
            r.restore(), g(r, s, n, .58 * n, t),
                function(e, r, t, a, l) {
                    var o = .35 * r,
                        i = a - .006 * t,
                        s = Math.max(.028 * t, 22),
                        n = .5 * (Math.sin(.8 * l) + 1),
                        h = Math.pow(Math.max(0, n - .35) / .65, .9);
                    e.beginPath(), e.ellipse(o, i, s, .22 * s, 0, Math.PI, 0), e.fillStyle = "rgba(45,62,32,0.95)", e.fill();
                    for (var f = -4; f <= 4; f++) e.beginPath(), e.ellipse(o + f * s * .18, i - .18 * s, .08 * s, .05 * s, 0, 0, 6.28), e.fillStyle = "rgba(25,38,18,0.7)", e.fill();
                    var g = o + .9 * s,
                        d = i;
                    e.beginPath(), e.moveTo(g - .2 * s, d), e.lineTo(g + .3 * s, d), e.lineTo(g + .25 * s, d - .13 * s), e.lineTo(g - .2 * s, d - .13 * s), e.closePath(), e.fillStyle = "rgba(45,62,32,0.95)", e.fill(), e.save(), e.translate(g - .2 * s, d - .13 * s), e.rotate(.55 * -h), e.beginPath(), e.moveTo(0, 0), e.lineTo(.5 * s, 0), e.lineTo(.45 * s, .08 * -s), e.lineTo(0, .06 * -s), e.closePath(), e.fillStyle = "rgba(55,75,38,0.95)", e.fill();
                    for (var b = 0; b < 4; b++) e.beginPath(), e.moveTo(.1 * s + b * s * .1, 0), e.lineTo(.1 * s + b * s * .1 + 1, .05 * s), e.lineTo(.1 * s + b * s * .1 + 2, 0), e.closePath(), e.fillStyle = "#eee", e.fill();
                    e.restore(), e.beginPath(), e.arc(o + .35 * s, i - .25 * s, .07 * s, 0, 6.28), e.fillStyle = "rgba(60,78,40,0.95)", e.fill(), e.beginPath(), e.arc(o + .36 * s, i - .27 * s, .03 * s, 0, 6.28), e.fillStyle = "#d6c030", e.fill()
                }(r, s, n, .58 * n, t), b(r, s, n, t), Math.random() < .05 && Forest.spawnP("firefly", s, n), Math.random() < .1 && Forest.spawnP("spore", s, n), Math.random() < .18 && Forest.spawnP("leaf", s, n), Math.random() < .12 && Forest.spawnP("leaf", s, n), Math.random() < .04 && Forest.spawnP("petal", s, n), Math.random() < .08 && Forest.spawnP("dust", s, n);
            for (c = Forest.particles.length - 1; c >= 0; c--) {
                var ia = Forest.particles[c];
                if (ia.life--, ia.life <= 0) Forest.particles[c] = Forest.particles[Forest.particles.length - 1], Forest.particles.pop(), Forest._recycleParticle(ia);
                else {
                    var sa = ia.life / ia.ml,
                        na = sa < .15 ? sa / .15 : sa > .85 ? (1 - sa) / .15 : 1;
                    if ("firefly" === ia.type) {
                        ia.ph += ia.fs, ia.vx += .018 * (Math.random() - .5) + .004 * f, ia.vy += .012 * (Math.random() - .5), ia.x += ia.vx, ia.y += ia.vy;
                        var ha = .25 + .6 * Math.sin(ia.ph);
                        r.beginPath(), r.arc(ia.x, ia.y, 3.2 * ia.r, 0, 6.28), r.fillStyle = "rgba(200,255,100," + h(na * ha * .14) + ")", r.fill(), r.beginPath(), r.arc(ia.x, ia.y, 1.6 * ia.r, 0, 6.28), r.fillStyle = "rgba(220,255,130," + h(na * ha * .35) + ")", r.fill(), r.beginPath(), r.arc(ia.x, ia.y, .8 * ia.r, 0, 6.28), r.fillStyle = "rgba(240,255,180," + h(na * ha * .9) + ")", r.fill()
                    } else "spore" === ia.type ? (ia.x += ia.vx + .45 * Math.sin(.8 * t + ia.ph) + .3 * f, ia.y += ia.vy, r.beginPath(), r.arc(ia.x, ia.y, ia.r, 0, 6.28), r.fillStyle = "rgba(225,225,180," + h(.35 * na) + ")", r.fill()) : "leaf" === ia.type ? (ia.vx += .012 * f, ia.x += ia.vx + Math.sin(t * ia.flutterSpeed + ia.ph) * ia.flutter, ia.y += ia.vy + .15 * Math.sin(.3 * t + 2 * ia.ph), ia.rot += ia.rs + .02 * Math.cos(t * ia.flutterSpeed + ia.ph), ia.y > n + 20 && (ia.life = 0), r.save(), r.translate(ia.x, ia.y), r.rotate(ia.rot), 0 === ia.leafType ? (r.beginPath(), r.ellipse(0, 0, ia.sz, .4 * ia.sz, 0, 0, 6.28), r.fillStyle = Forest.rgb(ia.c, .75 * na), r.fill(), r.beginPath(), r.moveTo(.7 * -ia.sz, 0), r.lineTo(.7 * ia.sz, 0), r.lineWidth = .5, r.strokeStyle = Forest.rgb(Forest.mix(ia.c, [255, 255, 200], .3), .3 * na), r.stroke()) : 1 === ia.leafType ? (r.beginPath(), r.moveTo(-ia.sz, 0), r.quadraticCurveTo(.3 * -ia.sz, .45 * -ia.sz, ia.sz, 0), r.quadraticCurveTo(.3 * -ia.sz, .45 * ia.sz, -ia.sz, 0), r.fillStyle = Forest.rgb(ia.c, .75 * na), r.fill()) : (r.beginPath(), r.arc(0, 0, .5 * ia.sz, 0, 6.28), r.fillStyle = Forest.rgb(ia.c, .7 * na), r.fill()), r.restore()) : "petal" === ia.type ? (ia.x += ia.vx + .8 * Math.sin(.4 * t + ia.ph) + .3 * f, ia.y += ia.vy, ia.rot += ia.rs, ia.y > n + 10 && (ia.life = 0), r.save(), r.translate(ia.x, ia.y), r.rotate(ia.rot), r.beginPath(), r.ellipse(0, 0, ia.sz, .55 * ia.sz, 0, 0, 6.28), r.fillStyle = Forest.rgb(ia.c, .45 * na), r.fill(), r.restore()) : "dust" === ia.type && (ia.x += ia.vx + .15 * Math.sin(.3 * t + ia.ph) + .1 * f, ia.y += ia.vy + .1 * Math.sin(.25 * t + 1.3 * ia.ph), r.beginPath(), r.arc(ia.x, ia.y, ia.r, 0, 6.28), r.fillStyle = "rgba(220,210,150," + h(.2 * na) + ")", r.fill())
                }
            }
            requestAnimationFrame(v)
        }
        requestAnimationFrame(v)
    }()
} catch (e) {
    console.warn("Canvas animation error:", e)
}