document.documentElement.classList.add("js-ready"),
    function() {
        "use strict";
        var e = document.getElementById("year");
        e && (e.textContent = (new Date).getFullYear());
        var t = document.getElementById("nav"),
            n = !1;

        function r() {
            var e = window.scrollY > 40;
            e !== n && (n = e, t.classList.toggle("scrolled", e))
        }
        UI.scheduler.onScroll("nav", r), r(), window.location.hash && history.replaceState(null, "", window.location.pathname), window.scrollTo(0, 0), document.querySelectorAll('a[href^="#"]').forEach(function(e) {
            e.addEventListener("click", function(t) {
                var n = document.querySelector(e.getAttribute("href"));
                if (n) {
                    t.preventDefault();
                    var h = e.getAttribute("href"),
                        r = "#projects" === h ? 170 : "#about" === h ? 30 : 70,
                        o = n.getBoundingClientRect().top + window.scrollY - r;
                    window.scrollTo({
                        top: o,
                        behavior: "smooth"
                    })
                }
            })
        });
        var o = document.querySelector(".profile-video");
        if (o) {
            var L = !1;

            function s() {
                if (!L) return;
                if (o.paused) try {
                    var e = o.play();
                    e && e.catch && e.catch(function() {})
                } catch (e) {}
            }

            function i() {
                L = !0;
                var e = o.querySelectorAll("source");
                e.forEach(function(e) {
                    var t = e.getAttribute("data-src");
                    t && (e.src = t)
                });
                o.muted = !0, o.defaultMuted = !0, o.playsInline = !0, o.setAttribute("muted", ""), o.setAttribute("playsinline", ""), o.setAttribute("webkit-playsinline", ""), o.controls = !1, o.removeAttribute("controls");
                try {
                    o.load()
                } catch (l) {} ["loadedmetadata", "loadeddata", "canplay", "canplaythrough"].forEach(function(e) {
                    o.addEventListener(e, s)
                }), s(), setTimeout(s, 100), setTimeout(s, 600), setTimeout(s, 1500);
                var a = function() {
                    s(), o.paused || (document.removeEventListener("touchstart", a), document.removeEventListener("click", a), document.removeEventListener("scroll", a))
                };
                document.addEventListener("touchstart", a, {
                    passive: !0
                }), document.addEventListener("click", a), document.addEventListener("scroll", a, {
                    passive: !0
                })
            }
            var v = document.querySelector(".about-card");
            v ? new IntersectionObserver(function(e, t) {
                e[0].isIntersecting && !L && (i(), t.unobserve(v)), e[0].isIntersecting && L ? s() : L && o.pause()
            }, {
                threshold: .1,
                rootMargin: "400px"
            }).observe(v) : (i(), new IntersectionObserver(function(e) {
                e.forEach(function(e) {
                    e.isIntersecting ? s() : o.pause()
                })
            }, {
                threshold: .1
            }).observe(o))
        }
        var i = document.querySelectorAll(".reveal-section"),
            c = new IntersectionObserver(function(e) {
                e.forEach(function(e) {
                    if (e.isIntersecting) {
                        var t = e.target.parentElement.querySelectorAll(".reveal-section"),
                            n = 0;
                        t.forEach(function(t, r) {
                            t === e.target && (n = 100 * r)
                        }), setTimeout(function() {
                            e.target.classList.add("visible")
                        }, n), c.unobserve(e.target)
                    }
                })
            }, {
                threshold: .12,
                rootMargin: "0px 0px -40px 0px"
            });
        i.forEach(function(e) {
            c.observe(e)
        }), document.querySelectorAll('a[target="_blank"]').forEach(function(e) {
            e.addEventListener("click", function(t) {
                t.preventDefault(), window.open(e.href, "_blank")
            })
        })
    }(),
    function() {
        "use strict";

        function e(e, t) {
            var n = e.getBoundingClientRect();
            return "T" === t ? {
                x: n.left + n.width / 2,
                y: n.top
            } : "B" === t ? {
                x: n.left + n.width / 2,
                y: n.bottom
            } : {
                x: "l" === t[1] ? n.left : "r" === t[1] ? n.right : n.left + n.width / 2,
                y: "t" === t[0] ? n.top : "b" === t[0] ? n.bottom : n.top + n.height / 2
            }
        }
        var t = document.getElementById("cube-scene"),
            n = 0,
            r = document.getElementById("cube-prev"),
            o = document.getElementById("cube-next"),
            a = document.querySelectorAll(".cube-dot"),
            i = document.querySelectorAll(".cube-face"),
            c = document.getElementById("projects-heading-scene"),
            s = 0,
            l = 0,
            d = document.querySelector(".cube-viewport"),
            u = 280;

        function h() {
            var e = d.offsetWidth;
            u = e / 2;
            var t = Math.min(window.innerWidth <= 768 ? 1.2 * e : .89 * e, 495),
                n = 2.2 * e;
            d.style.height = t + "px", d.style.perspective = n + "px";
            var r = [0, 90, 180, -90];
            i.forEach(function(e, t) {
                e.style.transform = "rotateY(" + r[t] + "deg) translateZ(" + u + "px)"
            })
        }

        function f() {
            l = 90 * -n, t.style.transform = "translateZ(-" + u + "px) rotateY(" + l + "deg)";
            var e = (n % 4 + 4) % 4;
            a.forEach(function(t, n) {
                t.classList.toggle("active", n === e)
            })
        }
        h(), UI.scheduler.onResize("cube-geom", function() {
            h(), f()
        });
        var v = Math.min(85, .12 * window.innerWidth),
            m = null,
            p = !1,
            g = window.matchMedia("(prefers-reduced-motion: reduce)");
        new IntersectionObserver(function(e) {
                (p = e[0].isIntersecting) && (m = null)
            }, {
                threshold: 0
            }).observe(document.querySelector(".heading-viewport")), requestAnimationFrame(function e(t) {
                if (g.matches) return c.style.transform = "translateZ(-" + v + "px) rotateY(0deg)", void requestAnimationFrame(e);
                if (p) {
                    null === m && (m = t);
                    var n = (t - m) / 1e3;
                    m = t, s += 21 * n, c.style.transform = "translateZ(-" + v + "px) rotateY(" + s + "deg)", requestAnimationFrame(e)
                } else requestAnimationFrame(e)
            }), r && r.addEventListener("click", function() {
                n--, f()
            }), o && o.addEventListener("click", function() {
                n++, f()
            }), a.forEach(function(e) {
                e.addEventListener("click", function() {
                    var t = parseInt(e.getAttribute("data-face")) - (n % 4 + 4) % 4;
                    t > 2 && (t -= 4), t < -2 && (t += 4), n += t, f()
                })
            }), f(),
            function() {
                if (d) {
                    var e = 0,
                        t = 0,
                        r = !1;
                    d.addEventListener("touchstart", function(n) {
                        e = n.touches[0].clientX, t = n.touches[0].clientY, r = !0
                    }, {
                        passive: !0
                    }), d.addEventListener("touchmove", function(n) {
                        if (r) {
                            var o = n.touches[0].clientX - e,
                                a = n.touches[0].clientY - t;
                            Math.abs(o) > Math.abs(a) && Math.abs(o) > 30 && n.preventDefault()
                        }
                    }, {
                        passive: !1
                    }), d.addEventListener("touchend", function(o) {
                        if (r) {
                            r = !1;
                            var a = o.changedTouches[0].clientX - e,
                                i = o.changedTouches[0].clientY - t;
                            Math.abs(a) > 40 && Math.abs(a) > Math.abs(i) && (a < 0 ? n++ : n--, f())
                        }
                    }, {
                        passive: !0
                    })
                }
            }();
        var x = {
                from: "B",
                on: ".about-card",
                bCornerSpreadPx: 0,
                bCornerDropPx: 8
            },
            y = {
                from: "B",
                on: ".about-card",
                cornerSpread: 0,
                cornerYShift: 0
            },
            b = {
                to: "T",
                on: ".contact-card",
                cornerSpread: 0,
                cornerYShift: -8
            };

        function w(e, t, n, r, o) {
            var a = d.offsetHeight / 2,
                i = u - 14,
                c = r || 0,
                s = o || 0;
            [{
                x: i + c,
                z: i + c
            }, {
                x: i + c,
                z: -(i + c)
            }, {
                x: -(i + c),
                z: -(i + c)
            }, {
                x: -(i + c),
                z: i + c
            }].forEach(function(r, o) {
                var i, c, l, d, u, h, f;
                if ("top" === n) i = r.x, c = -(a + s) - t, l = r.z, d = Math.sqrt(i * i + c * c + l * l), u = Math.sqrt(i * i + l * l), h = Math.atan2(-r.x, -r.z) * (180 / Math.PI), f = Math.atan2(u, c) * (180 / Math.PI), e[o].style.height = d + 5 + "px", e[o].style.transform = "translate3d(0px," + t + "px,0px) rotateY(" + h.toFixed(1) + "deg) rotateX(" + f.toFixed(1) + "deg)";
                else {
                    i = -r.x, c = t - (a + s), l = -r.z, d = Math.sqrt(i * i + c * c + l * l), u = Math.sqrt(i * i + l * l), h = Math.atan2(i, l) * (180 / Math.PI), f = Math.atan2(u, c) * (180 / Math.PI);
                    var v = -i / d,
                        m = -c / d,
                        p = -l / d,
                        g = r.x + 5 * v,
                        x = a + s + 5 * m,
                        y = r.z + 5 * p;
                    e[o].style.height = d + 5 + "px", e[o].style.transform = "translate3d(" + g.toFixed(1) + "px," + x.toFixed(1) + "px," + y.toFixed(1) + "px) rotateY(" + h.toFixed(1) + "deg) rotateX(" + f.toFixed(1) + "deg)"
                }
            })
        }
        var E = document.querySelector(".heading-viewport");

        function M() {
            var t = document.querySelectorAll(".chandelier-wire"),
                n = y,
                r = document.querySelector(n.on);
            if (d && r && !(t.length < 4)) {
                var o, a, i, c, s, l, h = e(r, n.from);
                w(t, (o = h, i = (a = d).getBoundingClientRect(), c = i.top + i.height / 2, s = parseFloat(a.style.perspective) || 1200, l = a.offsetHeight > 0 ? i.height / a.offsetHeight : 1, -(c - o.y) / (s / (s + u)) / l), "top", n.cornerSpread || 0, n.cornerYShift || 0)
            }
        }

        function S() {
            ! function() {
                var t = document.querySelectorAll(".heading-wire"),
                    n = x,
                    r = document.querySelector(n.on);
                if (r && E && !(t.length < 4)) {
                    var o = e(r, n.from),
                        a = E.getBoundingClientRect(),
                        i = E.offsetHeight > 0 ? a.height / E.offsetHeight : 1,
                        c = -(a.top + a.height / 2 - o.y) / (800 / (800 + v)) / i,
                        s = E.offsetHeight / 2,
                        l = 14,
                        d = getComputedStyle(E),
                        u = parseFloat(d.getPropertyValue("--heading-half-width")) || v,
                        h = parseFloat(d.getPropertyValue("--heading-half-depth")) || v,
                        f = Math.max(0, u - l),
                        m = Math.max(0, h - Math.min(l, .5 * h)),
                        p = [{
                            x: f,
                            z: m
                        }, {
                            x: f,
                            z: -m
                        }, {
                            x: -f,
                            z: -m
                        }, {
                            x: -f,
                            z: m
                        }],
                        g = n.bCornerSpreadPx || 0,
                        y = n.bCornerDropPx || 0;
                    p.forEach(function(e, n) {
                        var r = Math.sqrt(e.x * e.x + e.z * e.z) || 1,
                            o = e.x / r,
                            a = e.z / r,
                            i = e.x + o * g,
                            l = e.z + a * g,
                            d = i,
                            u = -s + y - c,
                            h = l,
                            f = Math.sqrt(d * d + u * u + h * h),
                            v = Math.atan2(-d, -h) * (180 / Math.PI),
                            m = Math.sqrt(d * d + h * h),
                            p = Math.atan2(m, u) * (180 / Math.PI);
                        t[n].style.height = f + "px", t[n].style.transform = "translate3d(0px," + c.toFixed(2) + "px,0px) rotateY(" + v.toFixed(1) + "deg) rotateX(" + p.toFixed(1) + "deg)"
                    })
                }
            }(), M(),
                function() {
                    var t = document.querySelectorAll(".chandelier-wire-bottom"),
                        n = b,
                        r = document.querySelector(n.on);
                    if (d && r && !(t.length < 4)) {
                        var o = e(r, n.to),
                            a = d.getBoundingClientRect(),
                            i = a.top + a.height / 2,
                            c = parseFloat(d.style.perspective) || 1200,
                            s = d.offsetHeight > 0 ? a.height / d.offsetHeight : 1;
                        w(t, (o.y - i) / (c / (c + u)) / s, "bottom", n.cornerSpread || 0, n.cornerYShift || 0)
                    }
                }()
        }
        if (S(), UI.scheduler.onResize("wires", S), window.innerWidth > 768) {
            var q = !1;
            new IntersectionObserver(function(e) {
                (q = e[0].isIntersecting) && S()
            }, {
                rootMargin: "200px"
            }).observe(document.querySelector("#projects")), UI.scheduler.register("wires-scroll", function() {
                q && S()
            }), window.addEventListener("scroll", function() {
                q && UI.scheduler.markDirty("wires-scroll")
            }, {
                passive: !0
            })
        }
    }();