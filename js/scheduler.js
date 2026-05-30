window.UI = window.UI || {},
    function() {
        "use strict";
        var n = Object.create(null),
            e = Object.create(null),
            t = !1;

        function i() {
            t = !1;
            var i = n;
            for (var r in n = Object.create(null), i) {
                var c = e[r];
                if (c) try {
                    c()
                } catch (n) {
                    console.warn("[scheduler]", r, n)
                }
            }
        }

        function r(n, t) {
            e[n] = t
        }

        function c(e) {
            n[e] = !0, t || (t = !0, requestAnimationFrame(i))
        }
        UI.scheduler = {
            register: r,
            markDirty: c,
            onScroll: function(n, e) {
                r(n, e), window.addEventListener("scroll", function() {
                    c(n)
                }, {
                    passive: !0
                })
            },
            onResize: function(n, e) {
                r(n, e), window.addEventListener("resize", function() {
                    c(n)
                }, {
                    passive: !0
                })
            }
        }
    }();