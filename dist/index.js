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
function f(e, t, n) {
	let r = t.width > 0 ? n / t.width : 1;
	return {
		x: (e.x - t.left) * r,
		y: (e.y - t.top) * r
	};
}
function p(e, t, n, r) {
	if (t <= 0 || n <= 0 || e.width <= 0 || e.height <= 0) return null;
	let i = Math.min(e.width / t, e.height / n), a = e.left + (e.width - t * i) / 2, o = e.top + (e.height - n * i) / 2, s = (r.x - a) / i, c = (r.y - o) / i;
	return s < 0 || c < 0 || s > t || c > n ? null : {
		x: s,
		y: c
	};
}
var m = (e, t) => e.x >= t.x && e.y >= t.y && e.x < t.x + t.w && e.y < t.y + t.h;
function h(e, t) {
	let n = t.span / 2, r = Math.max(0, t.centre.x - n), i = Math.max(0, t.centre.y - n), a = Math.min(t.frameWidth, t.centre.x + n), o = Math.min(t.frameHeight, t.centre.y + n);
	return e.x <= r && e.y <= i && e.x + e.width >= a && e.y + e.height >= o;
}
var g = 50, _ = 250;
function v() {
	let e = 0, t = -Infinity;
	return (n, r) => {
		if (r - t > _ && (e = 0), t = r, e += Math.abs(n.deltaX) > Math.abs(n.deltaY) ? n.deltaX : n.deltaY, Math.abs(e) < g) return 0;
		let i = e < 0 ? 1 : -1;
		return e = 0, i;
	};
}
//#endregion
//#region src/ids.ts
var y = "magnifier-loupe", b = `${y}.develop-overlay`, x = `${y}.develop-toolbar`, ee = `${y}.library-toolbar`, S = `${y}.toggle`, te = `${y}.park`, ne = `${y}.magnify-more`, re = `${y}.magnify-less`, C = "magnification", w = "diameter", T, E;
function ie(e) {
	E = e, T = e.react;
}
//#endregion
//#region src/state.ts
var D = null, O = null, k = {
	develop: null,
	library: null
};
function A() {
	if (!D) throw Error("[magnifier-loupe] loupeStore() called before activate()");
	return D;
}
function j() {
	let t = E.settings.get(C, 2);
	return e.includes(t) ? t : 2;
}
function M() {
	let e = E.settings.get(w, 240);
	return Number.isFinite(e) ? Math.min(480, Math.max(120, e)) : 240;
}
function ae() {
	k.develop = null, k.library = null, D = E.stores.create((e, t) => ({
		on: !1,
		magnification: j(),
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
		stepMagnification: (e) => E.settings.set(C, i(t().magnification, e)),
		stepDiameter: (e) => E.settings.set(w, o(t().diameter, e))
	}));
	let e = D;
	O = E.settings.onChange(() => e.setState({
		magnification: j(),
		diameter: M()
	}));
}
function oe() {
	O?.(), O = null, D = null;
}
function N(e, t) {
	k[e] = t;
}
function P() {
	let e = new URLSearchParams(window.location.search).get("detached");
	if (e === "develop") return E.stores.useDevelopStore.getState().photoId ? "develop" : null;
	if (e) return null;
	let t = E.stores.useUIStore.getState().activeModule;
	return t === "library" ? "library" : t === "develop" && E.stores.useDevelopStore.getState().photoId ? "develop" : null;
}
function se() {
	P() && A().getState().toggle();
}
function ce() {
	let e = P(), t = A().getState();
	e && t.on && (t.parked[e] ? t.setParked(e, null) : k[e] && t.setParked(e, k[e]));
}
function F(e) {
	let t = A().getState();
	t.on && P() && t.stepMagnification(e);
}
//#endregion
//#region src/input.ts
function le(e) {
	return (e.target instanceof Element ? e.target : null)?.closest(".sl-floating-panel, [role='dialog'], [role='menu'], [role='listbox']") ? null : {
		x: e.clientX,
		y: e.clientY
	};
}
function I(e) {
	let t = e.getBoundingClientRect().width;
	return t > 0 && e.offsetWidth > 0 ? t / e.offsetWidth : 1;
}
var L = null, R = /* @__PURE__ */ new Set();
function z(e) {
	L = e;
	for (let t of R) t(e);
}
var B = (e) => z(le(e)), V = (e) => {
	e.relatedTarget || z(null);
}, H = () => z(null);
function ue() {
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
	let t = v(), n = (n) => {
		let r = s(n);
		if (!r || !e({
			x: n.clientX,
			y: n.clientY
		})) return;
		n.preventDefault(), n.stopPropagation();
		let i = t(n, n.timeStamp);
		if (i === 0) return;
		let a = A().getState();
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
	let { diameter: t, magnification: n, parked: r, onDrag: i } = e, { tokens: o } = E.ui, s = t / 2, c = T.useRef(null), l = (e) => {
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
	return /* @__PURE__ */ T.createElement("div", {
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
	}, /* @__PURE__ */ T.createElement("canvas", {
		key: e.colorSpace ?? "srgb",
		ref: e.canvasRef,
		style: {
			display: "block",
			width: "100%",
			height: "100%",
			borderRadius: "50%",
			background: o.surface0
		}
	}), /* @__PURE__ */ T.createElement("svg", {
		width: t,
		height: t,
		style: {
			position: "absolute",
			left: 0,
			top: 0,
			overflow: "visible",
			pointerEvents: "none"
		}
	}, /* @__PURE__ */ T.createElement("circle", {
		cx: s,
		cy: s,
		r: s,
		fill: "none",
		stroke: q,
		strokeWidth: 3
	}), /* @__PURE__ */ T.createElement("circle", {
		cx: s,
		cy: s,
		r: s,
		fill: "none",
		stroke: J,
		strokeWidth: 1
	}), r && /* @__PURE__ */ T.createElement("circle", {
		"data-loupe-grip": "",
		cx: s,
		cy: s,
		r: s,
		fill: "none",
		stroke: "transparent",
		strokeWidth: 12,
		style: {
			pointerEvents: "stroke",
			cursor: E.cursors.resolve("pan")
		},
		onPointerDown: l,
		onPointerMove: u,
		onPointerUp: d,
		onPointerCancel: d
	}, /* @__PURE__ */ T.createElement("title", null, "Drag to move the loupe"))), /* @__PURE__ */ T.createElement("span", { style: {
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
function de() {
	return A()((e) => e.on) ? /* @__PURE__ */ T.createElement(fe, null) : null;
}
function fe() {
	let e = A(), t = e((e) => e.magnification), n = e((e) => e.diameter), r = e((e) => e.parked.develop), i = e((e) => e.setParked), { rect: a, imageRect: o, nonce: s, region: c, zoomScale: u } = E.develop.useDevelopOverlay(), d = c ? `${c.x} ${c.y} ${c.width} ${c.height}` : "", f = l(n, t * u, window.devicePixelRatio || 1), [p, m] = T.useState("srgb"), h = T.useRef(null), g = T.useRef(null), _ = T.useRef(null), v = T.useRef({
		rect: a,
		imageRect: o,
		diameter: f,
		magnification: t,
		zoomScale: u,
		parkedAt: r
	});
	v.current = {
		rect: a,
		imageRect: o,
		diameter: f,
		magnification: t,
		zoomScale: u,
		parkedAt: r
	};
	let [y] = T.useState(() => pe(() => v.current, m));
	return T.useEffect(() => {
		let e = h.current, t = g.current;
		if (e && t) return y.start(e, t, _);
	}, [y]), T.useEffect(() => y.changed(), [y, p]), T.useEffect(() => y.stale(), [y, d]), T.useEffect(() => y.changed(), [
		y,
		s,
		a,
		o,
		f,
		t,
		u,
		r
	]), /* @__PURE__ */ T.createElement("div", {
		ref: h,
		"data-loupe-root": "",
		style: {
			position: "absolute",
			inset: 0,
			pointerEvents: "none",
			overflow: "hidden"
		}
	}, /* @__PURE__ */ T.createElement(Y, {
		diameter: f,
		magnification: t,
		parked: !!r,
		colorSpace: p,
		lensRef: g,
		canvasRef: _,
		onDrag: (e) => {
			let t = v.current.parkedAt;
			t && i("develop", {
				x: t.x + e.x,
				y: t.y + e.y
			});
		}
	}));
}
function pe(e, t) {
	let n = null, r = null, i = null, a = 0, o = -1, s = -1, l = "", u = !1, d = 0, p = () => {
		let t = e();
		return t.parkedAt ? t.parkedAt : r && t.rect && m(r, t.rect) ? r : null;
	}, g = (t) => {
		let n = e().imageRect;
		return n && n.w > 0 && n.h > 0 ? {
			x: (t.x - n.x) / n.w,
			y: (t.y - n.y) / n.h
		} : null;
	};
	function _() {
		if (d = 0, !n) return;
		let t = e(), r = p();
		if (N("develop", r), K(n.lens, r, t.diameter), !r) return;
		let a = g(r), o = window.devicePixelRatio || 1, s = {
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
		l && G(l, s, c, c?.colorSpace), a && v(a, o);
	}
	function v(r, d) {
		let f = E.develop.captureRegion;
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
			if (h(i.rect, t)) return;
		}
		let m = c(p.diameter, p.magnification * p.zoomScale, d), g = `${a} ${m} ${r.x} ${r.y}`;
		if (g === l) return;
		l = g;
		let _ = a, v = r.x >= 0 && r.x <= 1 && r.y >= 0 && r.y <= 1;
		u = !0, f({
			x: r.x,
			y: r.y,
			width: m,
			height: m
		}).then((e) => {
			n ? (i?.bitmap.close(), i = e, o = _, !e && v && (s = _), e && t(e.colorSpace)) : e?.bitmap.close();
		}, (e) => console.warn("[magnifier-loupe] couldn't draw the patch:", e)).finally(() => {
			u = !1, y();
		});
	}
	function y() {
		!d && n && (d = requestAnimationFrame(_));
	}
	function b(e) {
		n && (r = e && f(e, n.root.getBoundingClientRect(), n.root.offsetWidth), y());
	}
	function x(t) {
		if (!n) return !1;
		let r = e();
		if (!r.parkedAt) return !!p();
		let i = f(t, n.root.getBoundingClientRect(), n.root.offsetWidth);
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
				E.stores.useDevelopStore.subscribe((e, t) => {
					e.photoId !== t.photoId && (i?.bitmap.close(), i = null), (e.photoId !== t.photoId || e.params !== t.params || e.paramBag !== t.paramBag || e.previewParams !== t.previewParams || e.previewParamBag !== t.previewParamBag || e.histogram !== t.histogram || e.sourceSize !== t.sourceSize) && (a++, y());
				})
			];
			return y(), () => {
				for (let e of o) e();
				d && cancelAnimationFrame(d), d = 0, n = null, i?.bitmap.close(), i = null, N("develop", null);
			};
		},
		changed() {
			y();
		},
		stale() {
			a++, y();
		}
	};
}
//#endregion
//#region src/LibraryLoupe.tsx
function me() {
	let e = A()((e) => e.on), t = E.stores.useUIStore((e) => e.activeModule === "library");
	return e && t ? E.reactDom.createPortal(/* @__PURE__ */ T.createElement(he, null), document.body) : null;
}
function he() {
	let e = A(), t = e((e) => e.magnification), n = e((e) => e.diameter), r = e((e) => e.parked.library), i = e((e) => e.setParked), a = T.useRef(null), o = T.useRef(null), s = T.useRef(null), c = T.useRef({
		diameter: n,
		magnification: t,
		parkedAt: r
	});
	c.current = {
		diameter: n,
		magnification: t,
		parkedAt: r
	};
	let [l] = T.useState(() => ge(() => c.current));
	return T.useEffect(() => {
		let e = a.current, t = o.current, n = s.current;
		if (e && t && n) return l.start(e, t, n);
	}, [l]), T.useEffect(() => l.changed(), [
		l,
		n,
		t,
		r
	]), /* @__PURE__ */ T.createElement("div", {
		ref: a,
		"data-loupe-root": "",
		style: {
			position: "fixed",
			inset: 0,
			zIndex: 40,
			pointerEvents: "none",
			overflow: "hidden"
		}
	}, /* @__PURE__ */ T.createElement(Y, {
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
	let n = p(t.getBoundingClientRect(), t.naturalWidth, t.naturalHeight, e);
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
function ge(e) {
	let t = null, n = null, r = 0, i = (e, t) => f(t, e.getBoundingClientRect(), e.offsetWidth), a = (e, t) => {
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
				E.stores.useCatalogStore.subscribe((e, t) => {
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
	let e = (e) => E.keybindings.getBinding(e), t = e(S), n = e(te), r = e(ne), i = e(re);
	return [
		`Magnifier loupe${t ? ` (${t})` : ""}: a closer look at the photo under the pointer`,
		`Magnification: Alt+wheel${r && i ? `, ${r} and ${i}` : ""}`,
		"Size: Shift+wheel",
		`Park it where it is${n ? ` (${n})` : ""}, then drag its ring to move it`
	].join("\n");
}
function _e() {
	let e = A()((e) => e.on), t = A()((e) => e.toggle), [n, r] = T.useState(!1), { tokens: i } = E.ui, a = Z();
	return /* @__PURE__ */ T.createElement("button", {
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
function ve() {
	let e = A()((e) => e.on), t = A()((e) => e.toggle), { tokens: n } = E.ui, r = Z();
	return /* @__PURE__ */ T.createElement("button", {
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
function ye() {
	return /* @__PURE__ */ T.createElement(T.Fragment, null, /* @__PURE__ */ T.createElement(ve, null), /* @__PURE__ */ T.createElement(me, null));
}
var Q = null, $ = null;
function be(e) {
	ie(e), ae(), $ = ue(), Q = e, e.registerSlot({
		id: b,
		slot: "develop-canvas-overlay",
		component: de,
		order: 200
	}), e.registerSlot({
		id: x,
		slot: "develop-toolbar",
		component: _e
	}), e.registerSlot({
		id: ee,
		slot: "library-toolbar",
		component: ye
	}), e.registerKeybinding({
		id: S,
		label: "Magnifier loupe",
		category: "General",
		defaultCombo: "`",
		handler: se
	}), e.registerKeybinding({
		id: te,
		label: "Park or free the loupe",
		category: "General",
		defaultCombo: "Shift+`",
		handler: ce
	}), e.registerKeybinding({
		id: ne,
		label: "Loupe: more magnification",
		category: "General",
		defaultCombo: "Alt+=",
		handler: () => F(1)
	}), e.registerKeybinding({
		id: re,
		label: "Loupe: less magnification",
		category: "General",
		defaultCombo: "Alt+-",
		handler: () => F(-1)
	});
}
function xe() {
	Q && (Q = null, $?.(), $ = null, oe());
}
//#endregion
export { y as EXTENSION_ID, be as activate, xe as deactivate };

//# sourceMappingURL=index.js.map