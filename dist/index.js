//#region src/model.ts
var e = [
	1,
	2,
	4,
	8
], t = 1.5, n = 1024;
function r(t) {
	if (!Number.isFinite(t)) return 0;
	let n = 0;
	for (let r = 1; r < e.length; r++) Math.abs(e[r] - t) < Math.abs(e[n] - t) && (n = r);
	return n;
}
function i(t, n) {
	return e[Math.min(e.length - 1, Math.max(0, r(t) + n))];
}
var a = (e) => `${Math.round(e * 100)}%`;
function o(e, t) {
	return Math.min(480, Math.max(120, (Number.isFinite(e) ? e : 240) + t * 40));
}
function s(e) {
	return e.ctrlKey || e.metaKey || e.altKey === e.shiftKey ? null : e.altKey ? "magnification" : "diameter";
}
function c(e, r, i) {
	return Math.min(n, Math.ceil(e * i / r * t));
}
function l(e, t, n) {
	return Math.min(e, Math.floor(1022 * t / n));
}
var u = (e, t) => e * t;
function d(e, t, n, r) {
	let i = r / 2;
	return {
		dx: i + (e.x - t.x) * n,
		dy: i + (e.y - t.y) * n,
		dw: e.width * n,
		dh: e.height * n
	};
}
function f(e, t, n, r) {
	if (t <= 0 || n <= 0 || e.width <= 0 || e.height <= 0) return null;
	let i = Math.min(e.width / t, e.height / n), a = e.left + (e.width - t * i) / 2, o = e.top + (e.height - n * i) / 2, s = (r.x - a) / i, c = (r.y - o) / i;
	return s < 0 || c < 0 || s > t || c > n ? null : {
		x: s,
		y: c
	};
}
var p = (e, t) => e.x >= t.x && e.y >= t.y && e.x < t.x + t.w && e.y < t.y + t.h;
function m(e, t) {
	let n = t.span / 2, r = Math.max(0, t.centre.x - n), i = Math.max(0, t.centre.y - n), a = Math.min(t.frameWidth, t.centre.x + n), o = Math.min(t.frameHeight, t.centre.y + n);
	return e.x <= r && e.y <= i && e.x + e.width >= a && e.y + e.height >= o;
}
var h = 50, g = 250;
function _() {
	let e = 0, t = -Infinity;
	return (n, r) => {
		if (r - t > g && (e = 0), t = r, e += Math.abs(n.deltaX) > Math.abs(n.deltaY) ? n.deltaX : n.deltaY, Math.abs(e) < h) return 0;
		let i = e < 0 ? 1 : -1;
		return e = 0, i;
	};
}
//#endregion
//#region src/rt.ts
var v, y;
function b(e) {
	y = e, v = e.react;
}
//#endregion
//#region src/ids.ts
var x = "magnifier-loupe", ee = `${x}.develop-overlay`, te = `${x}.develop-toolbar`, ne = `${x}.library-toolbar`, S = `${x}.toggle`, C = `${x}.park`, w = `${x}.magnify-more`, T = `${x}.magnify-less`, E = "magnification", D = "diameter", O = null, k = null, A = {
	develop: null,
	library: null
};
function j() {
	if (!O) throw Error("[magnifier-loupe] loupeStore() called before activate()");
	return O;
}
function re() {
	let t = y.settings.get(E, 2);
	return e.includes(t) ? t : 2;
}
function M() {
	let e = y.settings.get(D, 240);
	return Number.isFinite(e) ? Math.min(480, Math.max(120, e)) : 240;
}
function ie() {
	A.develop = null, A.library = null, O = y.stores.create((e, t) => ({
		on: !1,
		magnification: re(),
		diameter: M(),
		parked: {
			develop: null,
			library: null
		},
		toggle: () => e({ on: !t().on }),
		setParked: (n, r) => e({ parked: {
			...t().parked,
			[n]: r
		} }),
		stepMagnification: (e) => y.settings.set(E, i(t().magnification, e)),
		stepDiameter: (e) => y.settings.set(D, o(t().diameter, e))
	}));
	let e = O;
	k = y.settings.onChange(() => e.setState({
		magnification: re(),
		diameter: M()
	}));
}
function ae() {
	k?.(), k = null, O = null;
}
function N(e, t) {
	A[e] = t;
}
function P() {
	let e = y.navigation.current();
	return e === "library" ? "library" : e === "develop" && y.stores.useDevelopStore.getState().photoId ? "develop" : null;
}
function oe() {
	P() && j().getState().toggle();
}
function se() {
	let e = P(), t = j().getState();
	e && t.on && (t.parked[e] ? t.setParked(e, null) : A[e] && t.setParked(e, A[e]));
}
function F(e) {
	let t = j().getState();
	t.on && P() && t.stepMagnification(e);
}
//#endregion
//#region src/input.ts
function ce(e) {
	return (e.target instanceof Element ? e.target : null)?.closest(".sl-floating-panel, [role='dialog'], [role='menu'], [role='listbox']") ? null : {
		x: e.clientX,
		y: e.clientY
	};
}
function I(e) {
	let t = e.getBoundingClientRect(), n = y.develop.framePoint(e, t.right, t.top).x - y.develop.framePoint(e, t.left, t.top).x;
	return t.width > 0 && n > 0 ? t.width / n : 1;
}
var L = null, R = /* @__PURE__ */ new Set();
function z(e) {
	L = e;
	for (let t of R) t(e);
}
var B = (e) => z(ce(e)), V = (e) => {
	e.relatedTarget || z(null);
}, H = () => z(null);
function le() {
	return window.addEventListener("pointermove", B, {
		capture: !0,
		passive: !0
	}), window.addEventListener("pointerdown", B, {
		capture: !0,
		passive: !0
	}), document.addEventListener("mouseout", V, !0), window.addEventListener("blur", H), () => {
		window.removeEventListener("pointermove", B, !0), window.removeEventListener("pointerdown", B, !0), document.removeEventListener("mouseout", V, !0), window.removeEventListener("blur", H), L = null, R.clear();
	};
}
function U(e) {
	return R.add(e), e(L), () => void R.delete(e);
}
function W(e) {
	let t = _(), n = (n) => {
		let r = s(n);
		if (!r || !e({
			x: n.clientX,
			y: n.clientY
		})) return;
		n.preventDefault(), n.stopPropagation();
		let i = t(n, n.timeStamp);
		if (i === 0) return;
		let a = j().getState();
		r === "magnification" ? a.stepMagnification(i) : a.stepDiameter(i);
	};
	return window.addEventListener("wheel", n, {
		capture: !0,
		passive: !1
	}), () => window.removeEventListener("wheel", n, !0);
}
//#endregion
//#region src/Lens.tsx
function G(e, t, n, r = "srgb") {
	let i = Math.max(1, Math.round(t.diameter * t.dpr * t.uiZoom));
	e.width !== i && (e.width = i), e.height !== i && (e.height = i);
	let a = e.getContext("2d", { colorSpace: r });
	if (!a || (a.clearRect(0, 0, i, i), !n)) return;
	let o = u(t.zoom, t.uiZoom);
	a.imageSmoothingEnabled = o < 2;
	let { dx: s, dy: c, dw: l, dh: f } = d(n.rect, n.centre, o, i);
	a.drawImage(n.image, s, c, l, f);
}
function K(e, t, n) {
	t ? (e.style.display = "block", e.style.transform = `translate(${t.x - n / 2}px, ${t.y - n / 2}px)`) : e.style.display = "none";
}
var q = "rgba(0, 0, 0, 0.55)", J = "rgba(255, 255, 255, 0.9)";
function Y(e) {
	let { diameter: t, magnification: n, parked: r, onDrag: i } = e, { tokens: o } = y.ui, s = t / 2, c = v.useRef(null), l = (e) => {
		if (e.button !== 0) return;
		e.preventDefault(), e.stopPropagation();
		let n = e.currentTarget;
		n.setPointerCapture?.(e.pointerId);
		let r = n.ownerSVGElement?.getBoundingClientRect(), i = r && r.width > 0 ? t / r.width : 1;
		c.current = {
			id: e.pointerId,
			x: e.clientX,
			y: e.clientY,
			ratio: i
		};
	}, u = (e) => {
		let t = c.current;
		t && t.id === e.pointerId && (i({
			x: (e.clientX - t.x) * t.ratio,
			y: (e.clientY - t.y) * t.ratio
		}), t.x = e.clientX, t.y = e.clientY);
	}, d = (e) => {
		c.current?.id === e.pointerId && (c.current = null, e.currentTarget.releasePointerCapture?.(e.pointerId));
	};
	return /* @__PURE__ */ v.createElement("div", {
		ref: e.lensRef,
		"data-loupe-lens": "",
		style: {
			position: "absolute",
			left: 0,
			top: 0,
			width: t,
			height: t,
			display: "none",
			pointerEvents: "none",
			willChange: "transform"
		}
	}, /* @__PURE__ */ v.createElement("canvas", {
		key: e.colorSpace ?? "srgb",
		ref: e.canvasRef,
		style: {
			display: "block",
			width: "100%",
			height: "100%",
			borderRadius: "50%",
			background: o.surface0
		}
	}), /* @__PURE__ */ v.createElement("svg", {
		width: t,
		height: t,
		style: {
			position: "absolute",
			left: 0,
			top: 0,
			overflow: "visible",
			pointerEvents: "none"
		}
	}, /* @__PURE__ */ v.createElement("circle", {
		cx: s,
		cy: s,
		r: s,
		fill: "none",
		stroke: q,
		strokeWidth: 3
	}), /* @__PURE__ */ v.createElement("circle", {
		cx: s,
		cy: s,
		r: s,
		fill: "none",
		stroke: J,
		strokeWidth: 1
	}), r && /* @__PURE__ */ v.createElement("circle", {
		"data-loupe-grip": "",
		cx: s,
		cy: s,
		r: s,
		fill: "none",
		stroke: "transparent",
		strokeWidth: 12,
		style: {
			pointerEvents: "stroke",
			cursor: y.cursors.resolve("pan")
		},
		onPointerDown: l,
		onPointerMove: u,
		onPointerUp: d,
		onPointerCancel: d
	}, /* @__PURE__ */ v.createElement("title", null, "Drag to move the loupe"))), /* @__PURE__ */ v.createElement("span", { style: {
		position: "absolute",
		left: "50%",
		bottom: 8,
		transform: "translateX(-50%)",
		padding: "1px 5px",
		borderRadius: 3,
		fontSize: 10,
		lineHeight: "14px",
		background: q,
		color: J,
		whiteSpace: "nowrap"
	} }, a(n)));
}
//#endregion
//#region src/DevelopLoupe.tsx
function ue() {
	return j()((e) => e.on) ? /* @__PURE__ */ v.createElement(de, null) : null;
}
function de() {
	let e = j(), t = e((e) => e.magnification), n = e((e) => e.diameter), r = e((e) => e.parked.develop), i = e((e) => e.setParked), { rect: a, imageRect: o, nonce: s, region: c, zoomScale: u } = y.develop.useDevelopOverlay(), d = c ? `${c.x} ${c.y} ${c.width} ${c.height}` : "", f = l(n, t * u, window.devicePixelRatio || 1), [p, m] = v.useState("srgb"), h = v.useRef(null), g = v.useRef(null), _ = v.useRef(null), b = v.useRef({
		rect: a,
		imageRect: o,
		diameter: f,
		magnification: t,
		zoomScale: u,
		parkedAt: r
	});
	b.current = {
		rect: a,
		imageRect: o,
		diameter: f,
		magnification: t,
		zoomScale: u,
		parkedAt: r
	};
	let [x] = v.useState(() => fe(() => b.current, m));
	return v.useEffect(() => {
		let e = h.current, t = g.current;
		if (e && t) return x.start(e, t, _);
	}, [x]), v.useEffect(() => x.changed(), [x, p]), v.useEffect(() => x.stale(), [x, d]), v.useEffect(() => x.changed(), [
		x,
		s,
		a,
		o,
		f,
		t,
		u,
		r
	]), /* @__PURE__ */ v.createElement("div", {
		ref: h,
		"data-loupe-root": "",
		style: {
			position: "absolute",
			inset: 0,
			pointerEvents: "none",
			overflow: "hidden"
		}
	}, /* @__PURE__ */ v.createElement(Y, {
		diameter: f,
		magnification: t,
		parked: !!r,
		colorSpace: p,
		lensRef: g,
		canvasRef: _,
		onDrag: (e) => {
			let t = b.current.parkedAt;
			t && i("develop", {
				x: t.x + e.x,
				y: t.y + e.y
			});
		}
	}));
}
function fe(e, t) {
	let n = null, r = null, i = null, a = 0, o = -1, s = -1, l = "", u = !1, d = 0, f = () => {
		let t = e();
		return t.parkedAt ? t.parkedAt : r && t.rect && p(r, t.rect) ? r : null;
	}, h = (t) => {
		let n = e().imageRect;
		return n && n.w > 0 && n.h > 0 ? {
			x: (t.x - n.x) / n.w,
			y: (t.y - n.y) / n.h
		} : null;
	};
	function g() {
		if (d = 0, !n) return;
		let t = e(), r = f();
		if (N("develop", r), K(n.lens, r, t.diameter), !r) return;
		let a = h(r), o = window.devicePixelRatio || 1, s = {
			diameter: t.diameter,
			zoom: t.magnification * t.zoomScale,
			uiZoom: I(n.root),
			dpr: o
		}, c = i && a ? {
			image: i.bitmap,
			rect: i.rect,
			centre: {
				x: a.x * i.frameWidth,
				y: a.y * i.frameHeight
			},
			colorSpace: i.colorSpace
		} : null, l = n.canvas.current;
		l && G(l, s, c, c?.colorSpace), a && _(a, o);
	}
	function _(r, d) {
		let f = y.develop.captureRegion;
		if (!f || u || !i && s === a) return;
		let p = e();
		if (i && o === a) {
			let e = p.diameter * d / (p.magnification * p.zoomScale), t = {
				centre: {
					x: r.x * i.frameWidth,
					y: r.y * i.frameHeight
				},
				span: e,
				frameWidth: i.frameWidth,
				frameHeight: i.frameHeight
			};
			if (m(i.rect, t)) return;
		}
		let h = c(p.diameter, p.magnification * p.zoomScale, d), g = `${a} ${h} ${r.x} ${r.y}`;
		if (g === l) return;
		l = g;
		let _ = a, b = r.x >= 0 && r.x <= 1 && r.y >= 0 && r.y <= 1;
		u = !0, f({
			x: r.x,
			y: r.y,
			width: h,
			height: h
		}).then((e) => {
			n ? (i?.bitmap.close(), i = e, o = _, !e && b && (s = _), e && t(e.colorSpace)) : e?.bitmap.close();
		}, (e) => console.warn("[magnifier-loupe] couldn't draw the patch:", e)).finally(() => {
			u = !1, v();
		});
	}
	function v() {
		!d && n && (d = requestAnimationFrame(g));
	}
	function b(e) {
		n && (r = e && y.develop.framePoint(n.root, e.x, e.y), v());
	}
	function x(t) {
		if (!n) return !1;
		let r = e();
		if (!r.parkedAt) return !!f();
		let i = y.develop.framePoint(n.root, t.x, t.y);
		return Math.hypot(i.x - r.parkedAt.x, i.y - r.parkedAt.y) <= r.diameter / 2;
	}
	return {
		start(e, t, r) {
			n = {
				root: e,
				lens: t,
				canvas: r
			};
			let o = [
				U(b),
				W(x),
				y.stores.useDevelopStore.subscribe((e, t) => {
					e.photoId !== t.photoId && (i?.bitmap.close(), i = null), (e.photoId !== t.photoId || e.params !== t.params || e.paramBag !== t.paramBag || e.previewParams !== t.previewParams || e.previewParamBag !== t.previewParamBag || e.histogram !== t.histogram || e.sourceSize !== t.sourceSize) && (a++, v());
				})
			];
			return v(), () => {
				for (let e of o) e();
				d && cancelAnimationFrame(d), d = 0, n = null, i?.bitmap.close(), i = null, N("develop", null);
			};
		},
		changed() {
			v();
		},
		stale() {
			a++, v();
		}
	};
}
//#endregion
//#region src/LibraryLoupe.tsx
function pe() {
	let e = j()((e) => e.on), t = y.navigation.useCurrent() === "library";
	return e && t ? y.reactDom.createPortal(/* @__PURE__ */ v.createElement(me, null), document.body) : null;
}
function me() {
	let e = j(), t = e((e) => e.magnification), n = e((e) => e.diameter), r = e((e) => e.parked.library), i = e((e) => e.setParked), a = v.useRef(null), o = v.useRef(null), s = v.useRef(null), c = v.useRef({
		diameter: n,
		magnification: t,
		parkedAt: r
	});
	c.current = {
		diameter: n,
		magnification: t,
		parkedAt: r
	};
	let [l] = v.useState(() => he(() => c.current));
	return v.useEffect(() => {
		let e = a.current, t = o.current, n = s.current;
		if (e && t && n) return l.start(e, t, n);
	}, [l]), v.useEffect(() => l.changed(), [
		l,
		n,
		t,
		r
	]), /* @__PURE__ */ v.createElement("div", {
		ref: a,
		"data-loupe-root": "",
		style: {
			position: "fixed",
			inset: 0,
			zIndex: 40,
			pointerEvents: "none",
			overflow: "hidden"
		}
	}, /* @__PURE__ */ v.createElement(Y, {
		diameter: n,
		magnification: t,
		parked: !!r,
		lensRef: o,
		canvasRef: s,
		onDrag: (e) => {
			let t = c.current.parkedAt;
			t && i("library", {
				x: t.x + e.x,
				y: t.y + e.y
			});
		}
	}));
}
function X(e) {
	let t = (document.elementFromPoint?.(e.x, e.y))?.closest("[data-photo-id]")?.querySelector("img");
	if (!t || !t.complete || t.naturalWidth <= 0) return null;
	let n = f(t.getBoundingClientRect(), t.naturalWidth, t.naturalHeight, e);
	return n && {
		image: t,
		rect: {
			x: 0,
			y: 0,
			width: t.naturalWidth,
			height: t.naturalHeight
		},
		centre: n,
		colorSpace: "srgb"
	};
}
function he(e) {
	let t = null, n = null, r = 0, i = (e, t) => y.develop.framePoint(e, t.x, t.y), a = (e, t) => {
		let n = e.getBoundingClientRect(), r = I(e);
		return {
			x: n.left + t.x * r,
			y: n.top + t.y * r
		};
	};
	function o() {
		if (r = 0, !t) return;
		let { root: o } = t, s = e(), c = s.parkedAt ? a(o, s.parkedAt) : n, l = c && X(c), u = s.parkedAt ?? (l && c ? i(o, c) : null);
		if (N("library", u), K(t.lens, u, s.diameter), !u) return;
		let d = {
			diameter: s.diameter,
			zoom: s.magnification,
			uiZoom: I(o),
			dpr: window.devicePixelRatio || 1
		};
		G(t.canvas, d, l ?? null);
	}
	function s() {
		!r && t && (r = requestAnimationFrame(o));
	}
	function c(n) {
		if (!t) return !1;
		let r = e();
		if (!r.parkedAt) return !!X(n);
		let a = i(t.root, n);
		return Math.hypot(a.x - r.parkedAt.x, a.y - r.parkedAt.y) <= r.diameter / 2;
	}
	return {
		start(e, i, a) {
			t = {
				root: e,
				lens: i,
				canvas: a
			};
			let o = () => s(), l = [
				U((e) => {
					n = e, s();
				}),
				W(c),
				y.stores.useCatalogStore.subscribe((e, t) => {
					e.photos !== t.photos && s();
				}),
				() => window.removeEventListener("scroll", o, !0),
				() => document.removeEventListener("load", o, !0)
			];
			return window.addEventListener("scroll", o, {
				capture: !0,
				passive: !0
			}), document.addEventListener("load", o, !0), s(), () => {
				for (let e of l) e();
				r && cancelAnimationFrame(r), r = 0, t = null, N("library", null);
			};
		},
		changed() {
			s();
		}
	};
}
//#endregion
//#region src/Toolbar.tsx
function Z() {
	let e = (e) => y.keybindings.getBinding(e), t = e(S), n = e(C), r = e(w), i = e(T);
	return [
		`Magnifier loupe${t ? ` (${t})` : ""}: a closer look at the photo under the pointer`,
		`Magnification: Alt+wheel${r && i ? `, ${r} and ${i}` : ""}`,
		"Size: Shift+wheel",
		`Park it where it is${n ? ` (${n})` : ""}, then drag its ring to move it`
	].join("\n");
}
function ge() {
	let e = j()((e) => e.on), t = j()((e) => e.toggle), [n, r] = v.useState(!1), { tokens: i } = y.ui, a = Z();
	return /* @__PURE__ */ v.createElement("button", {
		type: "button",
		onClick: t,
		onMouseEnter: () => r(!0),
		onMouseLeave: () => r(!1),
		title: a,
		"aria-label": "Toggle magnifier loupe",
		"aria-pressed": e,
		style: {
			fontSize: 10,
			color: e || n ? i.textPrimary : i.textMuted
		}
	}, "Loupe");
}
function _e() {
	let e = j()((e) => e.on), t = j()((e) => e.toggle), { tokens: n } = y.ui, r = Z();
	return /* @__PURE__ */ v.createElement("button", {
		type: "button",
		onClick: t,
		title: r,
		"aria-label": "Toggle magnifier loupe",
		"aria-pressed": e,
		className: "sl-library-toolbar-action",
		style: e ? {
			background: n.surface4,
			color: n.textPrimary
		} : void 0
	}, "Loupe");
}
//#endregion
//#region src/index.tsx
function ve() {
	return /* @__PURE__ */ v.createElement(v.Fragment, null, /* @__PURE__ */ v.createElement(_e, null), /* @__PURE__ */ v.createElement(pe, null));
}
var Q = null, $ = null;
function ye(e) {
	b(e), ie(), $ = le(), Q = e, e.registerSlot({
		id: ee,
		slot: "develop-canvas-overlay",
		component: ue,
		order: 200
	}), e.registerSlot({
		id: te,
		slot: "develop-toolbar",
		component: ge
	}), e.registerSlot({
		id: ne,
		slot: "library-toolbar",
		component: ve
	}), e.registerKeybinding({
		id: S,
		label: "Magnifier loupe",
		category: "General",
		defaultCombo: "`",
		handler: oe
	}), e.registerKeybinding({
		id: C,
		label: "Park or free the loupe",
		category: "General",
		defaultCombo: "Shift+`",
		handler: se
	}), e.registerKeybinding({
		id: w,
		label: "Loupe: more magnification",
		category: "General",
		defaultCombo: "Alt+=",
		handler: () => F(1)
	}), e.registerKeybinding({
		id: T,
		label: "Loupe: less magnification",
		category: "General",
		defaultCombo: "Alt+-",
		handler: () => F(-1)
	});
}
function be() {
	Q && (Q = null, $?.(), $ = null, ae());
}
//#endregion
export { x as EXTENSION_ID, ye as activate, be as deactivate };

//# sourceMappingURL=index.js.map